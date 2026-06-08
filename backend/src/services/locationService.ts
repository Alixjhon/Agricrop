const COUNTRIES_NOW_API_BASE_URL = 'https://countriesnow.space/api/v0.1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

interface CountriesNowResponse<T> {
  error?: boolean;
  msg?: string;
  data?: T;
}

interface CountryWithCities {
  country?: string;
  cities?: string[];
  iso2?: string;
  iso3?: string;
}

interface CountryStates {
  name?: string;
  states?: Array<{
    name?: string;
    state_code?: string;
  }>;
}

export interface LocationOption {
  value: string;
  label: string;
}

const optionCache = new Map<string, { expiresAt: number; options: LocationOption[] }>();

function readCache(key: string): LocationOption[] | null {
  const cached = optionCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    optionCache.delete(key);
    return null;
  }
  return cached.options;
}

function writeCache(key: string, options: LocationOption[]) {
  optionCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    options,
  });
}

function uniqueOptions(options: LocationOption[]): LocationOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.value.toLowerCase();
    if (!option.value || !option.label || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${COUNTRIES_NOW_API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`CountriesNow request failed: ${response.status}`);
  }

  const payload = await response.json() as CountriesNowResponse<T>;
  if (payload.error) {
    throw new Error(payload.msg || 'CountriesNow returned an error');
  }

  return payload.data as T;
}

async function postJson<T>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(`${COUNTRIES_NOW_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`CountriesNow request failed: ${response.status}`);
  }

  const payload = await response.json() as CountriesNowResponse<T>;
  if (payload.error) {
    throw new Error(payload.msg || 'CountriesNow returned an error');
  }

  return payload.data as T;
}

export async function getCountries(): Promise<LocationOption[]> {
  const cacheKey = 'countries';
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const countries = await getJson<CountryWithCities[]>('/countries');
  const options = uniqueOptions(
    countries
      .map((country) => ({
        value: country.country || '',
        label: country.country || '',
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  writeCache(cacheKey, options);
  return options;
}

export async function getRegions(country: string): Promise<LocationOption[]> {
  const cacheKey = `regions:${country}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const result = await postJson<CountryStates>('/countries/states', { country });
  const options = uniqueOptions(
    (result.states || [])
      .map((state) => ({
        value: state.name || state.state_code || '',
        label: state.name || state.state_code || '',
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  writeCache(cacheKey, options);
  return options;
}

export async function getCities(country: string, region: string): Promise<LocationOption[]> {
  const cacheKey = `cities:${country}:${region}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const cities = await postJson<string[]>('/countries/state/cities', {
    country,
    state: region,
  });

  const options = uniqueOptions(
    cities
      .map((city) => ({
        value: city,
        label: city,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  writeCache(cacheKey, options);
  return options;
}
