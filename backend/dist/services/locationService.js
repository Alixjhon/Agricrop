"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCountries = getCountries;
exports.getRegions = getRegions;
exports.getCities = getCities;
const COUNTRIES_NOW_API_BASE_URL = 'https://countriesnow.space/api/v0.1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const optionCache = new Map();
function readCache(key) {
    const cached = optionCache.get(key);
    if (!cached)
        return null;
    if (cached.expiresAt < Date.now()) {
        optionCache.delete(key);
        return null;
    }
    return cached.options;
}
function writeCache(key, options) {
    optionCache.set(key, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        options,
    });
}
function uniqueOptions(options) {
    const seen = new Set();
    return options.filter((option) => {
        const key = option.value.toLowerCase();
        if (!option.value || !option.label || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
async function getJson(path) {
    const response = await fetch(`${COUNTRIES_NOW_API_BASE_URL}${path}`);
    if (!response.ok) {
        throw new Error(`CountriesNow request failed: ${response.status}`);
    }
    const payload = await response.json();
    if (payload.error) {
        throw new Error(payload.msg || 'CountriesNow returned an error');
    }
    return payload.data;
}
async function postJson(path, body) {
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
    const payload = await response.json();
    if (payload.error) {
        throw new Error(payload.msg || 'CountriesNow returned an error');
    }
    return payload.data;
}
async function getCountries() {
    const cacheKey = 'countries';
    const cached = readCache(cacheKey);
    if (cached)
        return cached;
    const countries = await getJson('/countries');
    const options = uniqueOptions(countries
        .map((country) => ({
        value: country.country || '',
        label: country.country || '',
    }))
        .sort((a, b) => a.label.localeCompare(b.label)));
    writeCache(cacheKey, options);
    return options;
}
async function getRegions(country) {
    const cacheKey = `regions:${country}`;
    const cached = readCache(cacheKey);
    if (cached)
        return cached;
    const result = await postJson('/countries/states', { country });
    const options = uniqueOptions((result.states || [])
        .map((state) => ({
        value: state.name || state.state_code || '',
        label: state.name || state.state_code || '',
    }))
        .sort((a, b) => a.label.localeCompare(b.label)));
    writeCache(cacheKey, options);
    return options;
}
async function getCities(country, region) {
    const cacheKey = `cities:${country}:${region}`;
    const cached = readCache(cacheKey);
    if (cached)
        return cached;
    const cities = await postJson('/countries/state/cities', {
        country,
        state: region,
    });
    const options = uniqueOptions(cities
        .map((city) => ({
        value: city,
        label: city,
    }))
        .sort((a, b) => a.label.localeCompare(b.label)));
    writeCache(cacheKey, options);
    return options;
}
//# sourceMappingURL=locationService.js.map