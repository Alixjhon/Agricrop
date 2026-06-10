import { Capacitor } from '@capacitor/core';

// API Base URL configuration
// - In development: Use VITE_API_BASE_URL or default to localhost
// - In production with nginx proxy: Use empty string for relative URLs
// - In production without proxy (e.g., Render): Use VITE_API_BASE_URL
function normalizeApiBaseUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, "");

  // Accept values like http://localhost:5001/api in env
  if (normalized.endsWith("/api")) {
    normalized = normalized.slice(0, -4);
  }

  return normalized;
}

const isDevelopment = import.meta.env.DEV;
const configuredApiUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const isNativePlatform = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';

const defaultNativeProdApiUrl = 'https://agricrop-backend-y7ml.onrender.com';

// Use the configured URL if available, otherwise use relative path for nginx proxy
// For Android builds, always use Render backend as requested.
const API_BASE = normalizeApiBaseUrl(
  isAndroid
    ? defaultNativeProdApiUrl
    : isDevelopment
    ? (configuredApiUrl || "https://agricrop-backend-y7ml.onrender.com")
      : (configuredApiUrl || (isNativePlatform ? defaultNativeProdApiUrl : ""))
);

function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const apiEndpoint = normalizedEndpoint === "/api" || normalizedEndpoint.startsWith("/api/")
    ? normalizedEndpoint
    : `/api${normalizedEndpoint}`;

  if (!API_BASE) {
    return apiEndpoint;
  }

  // Prevent duplicate "/api/api/..." when the base URL already includes "/api"
  if (API_BASE.endsWith("/api")) {
    return `${API_BASE}${apiEndpoint.slice(4)}`;
  }

  return `${API_BASE}${apiEndpoint}`;
}

export function getApiBaseUrl(): string {
  return API_BASE;
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const token = getAuthToken();

  const url = buildApiUrl(endpoint);

  const res = await fetch(url, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  // Get response text first to handle non-JSON responses safely
  const text = await res.text();

  // Handle error responses first
  if (!res.ok) {
    // Try to parse as JSON for error message
    let errorMessage = `API error: ${res.status} ${res.statusText}`;
    try {
      if (text) {
        const errorData = JSON.parse(text);
        errorMessage = errorData?.error || errorData?.message || errorMessage;
      }
    } catch {
      // If parsing fails, check if it's an HTML response (e.g., 404 page)
      if (text && (text.startsWith('<!DOCTYPE') || text.startsWith('<html'))) {
        errorMessage = `Server returned HTML instead of JSON (status ${res.status}). This may indicate a wrong API endpoint.`;
      } else if (text) {
        errorMessage = text.substring(0, 200);
      }
    }
    throw new Error(errorMessage);
  }

  // For successful responses, parse JSON
  if (!text) {
    console.warn(`Request to ${url} returned no data`);
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('Failed to parse JSON response:', {
      url: url,
      status: res.status,
      contentType: res.headers.get('content-type'),
      bodyPreview: text.substring(0, 200),
    });
    throw new Error('Server returned invalid JSON response');
  }
}

export interface SoilData {
  ph: number;
  moisture: number;
  temperature: number;
  sunlight_hours: number;
  soil_type: string;
}

export interface LocationData {
  country: string;
  province: string;
  city: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface CropRecommendation {
  crop_name: string;
  reason: string;
  planting_month: string;
  care_tips: string;
  image_url?: string;
  image_alt?: string;
}

export interface FarmingGuideStep {
  step: number;
  title: string;
  description: string;
  duration?: string;
}

export interface FarmingGuide {
  cropName: string;
  overview: string;
  climate: string;
  soilPreparation: string;
  steps: FarmingGuideStep[];
  tips: string[];
  harvestTime: string;
  expectedYield: string;
}

export interface DiseaseResult {
  plant_name: string;
  disease_name: string;
  confidence: string;
  treatment: string;
  prevention?: string;
  severity?: string;
  causes?: string[];
  treatment_steps?: string[];
  additional_info?: string;
}

export interface HistoryRecord {
  id: string;
  conversationId?: string;
  type: "recommendation" | "disease" | "chat";
  created_at: string;
  status?: string;
  data: unknown;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHistoryResponse {
  success: boolean;
  messages: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
}

export const api = {
  // Auth
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  register: (payload: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getProfile: (token: string) =>
    request<{ user: AuthUser }>("/auth/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  updateProfile: (
    payload: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
      image_url?: string;
    },
    token?: string | null,
  ) =>
    request<{ message: string; user: AuthUser & { phone?: string; location?: string; image_url?: string; image?: string } }>(
      "/auth/profile",
      {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: JSON.stringify(payload),
      }
    ),

  // Crop recommendations
  getCropRecommendations: () =>
    request<CropRecommendation[]>("/crop-recommendations"),

  submitSoilData: (data: SoilData) =>
    request<{ crop_recommendations: CropRecommendation[]; saved_result?: unknown }>(
      "/crop-recommendations",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  submitLocationData: (data: LocationData) =>
    request<{ crop_recommendations: CropRecommendation[]; saved_result?: unknown }>(
      "/location-crop-recommendations",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getCountries: () =>
    request<{ countries: LocationOption[] }>("/locations/countries"),

  getRegions: (countryCode: string) =>
    request<{ regions: LocationOption[] }>(`/locations/regions?countryCode=${encodeURIComponent(countryCode)}`),

  getCities: (countryCode: string, regionCode: string) =>
    request<{ cities: LocationOption[] }>(
      `/locations/cities?countryCode=${encodeURIComponent(countryCode)}&regionCode=${encodeURIComponent(regionCode)}`
    ),

  getCropGuide: (payload: {
    cropName: string;
    reason?: string;
    plantingMonth?: string;
    careTips?: string;
  }) =>
    request<{ guide: FarmingGuide }>("/crop-guides", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Disease detection
  getDiseaseResults: () =>
    request<DiseaseResult[]>("/disease-detection"),

  submitImage: (formData: FormData) =>
    request<{
      disease_detection: DiseaseResult[];
      images_analyzed?: number;
      enhanced?: boolean;
      saved_result?: unknown
    }>(
      "/disease-detection",
      {
        method: "POST",
        body: formData,
      }
    ),

  // Farming advice (legacy endpoint)
  askQuestion: (question: string) =>
    request<{ farming_advice: string; saved_result?: unknown }>("/farming-advice", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  // Chat (new endpoints with conversation support)
  sendMessage: (message: string, conversationId?: string) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversationId }),
    }),

  getChatHistory: (conversationId: string) =>
    request<ChatHistoryResponse>(`/chat/history/${conversationId}`),

  // History
  getHistory: () =>
    request<{ history: HistoryRecord[] }>("/history"),

  getStats: () =>
    request<{ cropsAnalyzed: number; diseasesDetected: number; aiConversations: number; yieldImprovement: number }>("/history/stats"),

  deleteConversation: (conversationId: string) =>
    request<{ success: boolean; message: string }>(`/history/chat/${conversationId}`, {
      method: "DELETE",
    }),

  deleteRecommendation: (id: string) =>
    request<{ success: boolean; message: string }>(`/history/recommendation/${id}`, {
      method: "DELETE",
    }),

  deleteDiseaseDetection: (id: string) =>
    request<{ success: boolean; message: string }>(`/history/disease/${id}`, {
      method: "DELETE",
    }),

  // Plantations
  listPlantations: () =>
    request<{ plantations: unknown[] }>("/plantations"),

  getPlantation: (id: string) =>
    request<{ plantation: unknown }>(`/plantations/${id}`),

  createPlantation: (payload: unknown) =>
    request<unknown>("/plantations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  markCalendarEventDone: (eventId: string) =>
    request<{ event: unknown }>(`/plantations/calendar/${eventId}/done`, {
      method: "PATCH",
    }),

  skipCalendarEvent: (eventId: string) =>
    request<{ event: unknown }>(`/plantations/calendar/${eventId}/skip`, {
      method: "PATCH",
    }),

  rescheduleCalendarEvent: (
    eventId: string,
    payload: { newDate: string; reason: string | null },
  ) =>
    request<{ event: unknown }>(`/plantations/calendar/${eventId}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  addEventCosts: (
    eventId: string,
    payload: { seed_cost: number; fertilizer_cost: number; labor_cost: number; irrigation_cost: number },
  ) =>
    request<{ costs: unknown }>(`/plantations/calendar/${eventId}/costs`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCostProfile: (cropName: string) =>
    request<{
      cropName: string;
      profile: { seedCostPerHa: number; fertilizerCostPerHa: number; laborCostPerHa: number; irrigationCostPerHa: number };
    }>(`/plantations/cost-profile?cropName=${encodeURIComponent(cropName)}`),

  updateCostRates: (
    plantationId: string,
    payload: { seedCostPerHa: number; fertilizerCostPerHa: number; laborCostPerHa: number; irrigationCostPerHa: number },
  ) =>
    request<{ costs: unknown }>(`/plantations/${plantationId}/cost-rates`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // ----- Post-harvest workflow -----

  getHarvestSummary: (plantationId: string) =>
    request<{ summary: import("@/types/planting").HarvestSummary }>(
      `/plantations/${plantationId}/summary`,
    ),

  getHarvest: (plantationId: string) =>
    request<{ record: import("@/types/planting").HarvestRecord | null }>(
      `/plantations/${plantationId}/harvest`,
    ),

  recordHarvest: (
    plantationId: string,
    payload: {
      actualHarvestDate: string;
      actualYield: number;
      yieldUnit: string;
      notes?: string | null;
    },
  ) =>
    request<{ record: import("@/types/planting").HarvestRecord }>(
      `/plantations/${plantationId}/harvest`,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  getProfit: (plantationId: string) =>
    request<{ record: import("@/types/planting").ProfitRecord | null }>(
      `/plantations/${plantationId}/profit`,
    ),

  recordProfit: (
    plantationId: string,
    payload: { sellingPricePerUnit: number; yieldUnit: string },
  ) =>
    request<{ record: import("@/types/planting").ProfitRecord }>(
      `/plantations/${plantationId}/profit`,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  getRotationRecommendations: (plantationId: string) =>
    request<{
      previous_crop: string;
      recommendations: import("@/types/planting").RotationRecommendation[];
    }>(`/plantations/${plantationId}/rotation`),

  archivePlantation: (plantationId: string) =>
    request<{ status: string; archivedAt: string }>(
      `/plantations/${plantationId}/archive`,
      { method: "PATCH" },
    ),

  getFarmHistory: (farmId: string) =>
    request<{ history: import("@/types/planting").FarmHistoryEntry[] }>(
      `/farms/${farmId}/history`,
    ),

  startNewPlantationCycle: (
    farmId: string,
    payload: import("@/types/planting").NewPlantationCycleInput,
  ) =>
    request<unknown>(`/farms/${farmId}/new-plantation`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /**
   * Re-checks whether every Smart Calendar event on a plantation is in a
   * terminal state and, if so, promotes the plantation to `harvested` on
   * the server. Returns the new status and the number of remaining open
   * events (0 when promoted).
   *
   * The backend already auto-promotes on every calendar-event mutation,
   * but the frontend calls this as a safety net after a batch of changes
   * (e.g. after the cost dialog closes) to make sure the UI reflects the
   * server state.
   */
  finalizePlantationIfAllDone: (plantationId: string) =>
    request<{
      status: string;
      remaining: number;
      promoted: boolean;
    }>(`/plantations/${plantationId}/finalize-if-all-done`, {
      method: "POST",
    }),
};
