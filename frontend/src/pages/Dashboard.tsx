import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudSun,
  Droplets,
  Wind,
  MapPin,
  Loader2,
  Search,
  AlertCircle,
  Sprout,
  Leaf,
  MessageCircle,
  TrendingUp,
  Sun,
  Cloud,
  CloudRain,
  ArrowUpRight,
  Bell,
  RefreshCw,
  ChevronRight,
  X,
  Thermometer,
  Eye,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Info,
  Upload,
  FileText,
  History,
  Settings,
  MapPinned,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { api, type HistoryRecord } from "@/lib/api";
import { getCurrentDeviceLocation } from "@/lib/location";
import type { HarvestSummary, Plantation } from "@/types/planting";

interface WeatherData {
  temp: number;
  humidity: number;
  description: string;
  location: string;
  windSpeed: number;
  icon: string;
  accuracy?: number;
  feelsLike?: number;
  pressure?: number;
  visibility?: number;
}

interface ForecastDay {
  day: string;
  temp: number;
  icon: string;
  description: string;
  humidity: number;
}

interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: "warning" | "success" | "info";
}

interface DailyAdvice {
  headline: string;
  summary: string;
  tasks: string[];
  notificationType: DashboardNotification["type"];
}

interface DashboardStats {
  cropsAnalyzed: number;
  diseasesDetected: number;
  aiConversations: number;
  yieldImprovement: number;
}

type WeatherSource =
  | { type: "coords"; lat: number; lon: number; accuracy?: number }
  | { type: "city"; city: string }
  | null;

function dashboardNumber(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function dashboardMoney(value: string | number | null | undefined): string {
  return `₱${dashboardNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function hasDashboardAnalytics(summary: HarvestSummary | null): boolean {
  if (!summary) return false;
  const status = String(summary.status ?? "").toLowerCase();
  return Boolean(
    summary.profit ||
      dashboardNumber(summary.harvest?.actual_yield) > 0 ||
      status === "archived" ||
      status === "completed",
  );
}

interface ExtendedHistoryRecord extends HistoryRecord {
  conversationId?: string;
}

const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather";
const GEO_API_URL = "https://api.openweathermap.org/geo/1.0/reverse";
const DASHBOARD_POLL_INTERVAL_MS = 5000;
const ACTIVITY_REFRESH_INTERVAL_MS = 15000;
const WEATHER_REFRESH_INTERVAL_MS = 300000;

const heroImage =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80";

const weatherIconMap: Record<string, typeof CloudSun> = {
  "01d": Sun,
  "01n": Sun,
  "02d": CloudSun,
  "02n": Cloud,
  "03d": Cloud,
  "03n": Cloud,
  "04d": Cloud,
  "04n": Cloud,
  "09d": CloudRain,
  "09n": CloudRain,
  "10d": CloudSun,
  "10n": CloudRain,
  "11d": CloudRain,
  "11n": CloudRain,
  "13d": Cloud,
  "13n": Cloud,
  "50d": Cloud,
  "50n": Cloud,
};

const mockForecast: ForecastDay[] = [
  { day: "Today", temp: 28, icon: "01d", description: "Sunny", humidity: 65 },
  { day: "Tomorrow", temp: 26, icon: "02d", description: "Partly cloudy", humidity: 70 },
  { day: "Wed", temp: 24, icon: "04d", description: "Cloudy", humidity: 75 },
  { day: "Thu", temp: 22, icon: "09d", description: "Rain", humidity: 85 },
  { day: "Fri", temp: 25, icon: "02d", description: "Partly cloudy", humidity: 68 },
];

const typeIcon = {
  recommendation: Sprout,
  disease: AlertTriangle,
  chat: MessageCircle,
};

const typeColor = {
  recommendation: "bg-primary/10 text-primary",
  disease: "bg-destructive/10 text-destructive",
  chat: "bg-accent/20 text-accent-foreground",
};

const typeLabels = {
  recommendation: "Crop Recommendation",
  disease: "Disease Detection",
  chat: "Chat Conversation",
};

function extractRecommendationPreview(data: unknown): string {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as { crop_name?: string };
    return first.crop_name || "Crop recommendation";
  }

  if (data && typeof data === "object") {
    const recommendationData = data as { recommendations?: { crop_name?: string }[] };
    if (recommendationData.recommendations && recommendationData.recommendations.length > 0) {
      return recommendationData.recommendations[0].crop_name || "Crop recommendation";
    }
  }

  return "Crop recommendation";
}

function extractDiseasePreview(data: unknown): string {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as { plant_name?: string; disease_name?: string };
    return `${first.plant_name || 'Unknown'} - ${first.disease_name || 'Unknown'}`;
  }

  if (data && typeof data === "object") {
    const diseaseData = data as { results?: { plant_name?: string; disease_name?: string }[] };
    if (diseaseData.results && diseaseData.results.length > 0) {
      return `${diseaseData.results[0].plant_name || 'Unknown'} - ${diseaseData.results[0].disease_name || 'Unknown'}`;
    }
  }

  return "Disease detection";
}

function getDailyAdvice(weather: WeatherData | null): DailyAdvice | null {
  if (!weather) return null;

  const description = weather.description.toLowerCase();
  const isRainy = ["rain", "drizzle", "thunderstorm"].some((term) =>
    description.includes(term),
  );
  const isWindy = weather.windSpeed >= 25;
  const isHumid = weather.humidity >= 80;
  const isHot = (weather.feelsLike ?? weather.temp) >= 35;
  const isCool = weather.temp <= 20;
  const isDry = weather.humidity <= 45 && !isRainy;

  if (isRainy) {
    return {
      headline: "Protect fields from excess water",
      summary: "Rainy conditions favor drainage work and disease prevention over spraying or fertilizer application.",
      tasks: [
        "Open drainage paths and remove standing water near roots.",
        "Delay foliar spraying or fertilizer until leaves dry out.",
        "Inspect low areas for fungal disease after the rain passes.",
      ],
      notificationType: "warning",
    };
  }

  if (isHot) {
    return {
      headline: "Reduce heat stress on crops",
      summary: "The day is hot enough to shift work toward water management and avoiding midday field stress.",
      tasks: [
        "Irrigate early morning or late afternoon to limit evaporation.",
        "Postpone transplanting or pruning during peak sun hours.",
        "Check mulch and shade protection for young plants.",
      ],
      notificationType: "warning",
    };
  }

  if (isWindy) {
    return {
      headline: "Use the day for field checks, not spraying",
      summary: "Strong wind lowers spray accuracy and can damage young plants if support is weak.",
      tasks: [
        "Delay pesticide or foliar spray until wind drops.",
        "Tie or support young plants and greenhouse covers.",
        "Walk the field edges for broken stems and dry patches.",
      ],
      notificationType: "info",
    };
  }

  if (isHumid) {
    return {
      headline: "Focus on disease prevention today",
      summary: "High humidity increases fungal pressure, so crop scouting and airflow management matter more than extra watering.",
      tasks: [
        "Scout for leaf spots, mildew, and soft rot in dense areas.",
        "Avoid unnecessary evening irrigation.",
        "Clear weeds or excess canopy to improve airflow.",
      ],
      notificationType: "info",
    };
  }

  if (isCool) {
    return {
      headline: "Use the cooler weather for prep work",
      summary: "Cool conditions are better for soil preparation and gentle maintenance than pushing warm-season crops.",
      tasks: [
        "Prepare beds, compost, and tools for the next planting window.",
        "Check seedling vigor before transplanting sensitive crops.",
        "Monitor soil moisture instead of adding excess water.",
      ],
      notificationType: "info",
    };
  }

  if (isDry) {
    return {
      headline: "Good day for watering and soil work",
      summary: "Dry air favors controlled irrigation, weeding, and fertilizer placement with less risk of wash-off.",
      tasks: [
        "Water seedlings and recently transplanted crops first.",
        "Apply compost or side-dress fertilizer, then irrigate lightly.",
        "Remove weeds while the soil surface is workable.",
      ],
      notificationType: "success",
    };
  }

  return {
    headline: "Balanced weather for field progress",
    summary: "Today looks stable enough for planting, weeding, and routine crop care with low weather risk.",
    tasks: [
      "Handle transplanting, pruning, or weeding during the morning.",
      "Apply fertilizer or compost and follow with light irrigation if needed.",
      "Use time later in the day to scout crop health and pest activity.",
    ],
    notificationType: "success",
  };
}

function buildWeatherNotifications(weather: WeatherData | null): DashboardNotification[] {
  if (!weather) return [];

  const advice = getDailyAdvice(weather);
  if (!advice) return [];

  return [
    {
      id: 1,
      title: "AI Daily Farm Focus",
      message: advice.headline,
      time: "Today",
      type: advice.notificationType,
    },
    {
      id: 2,
      title: "Weather Summary",
      message: `${weather.temp}°C, ${weather.description}, humidity ${weather.humidity}%. ${advice.summary}`,
      time: "Live weather",
      type: "info",
    },
    {
      id: 3,
      title: "Best Task Right Now",
      message: advice.tasks[0],
      time: weather.location,
      type: advice.notificationType,
    },
  ];
}

function areStatsEqual(a: DashboardStats, b: DashboardStats) {
  return (
    a.cropsAnalyzed === b.cropsAnalyzed &&
    a.diseasesDetected === b.diseasesDetected &&
    a.aiConversations === b.aiConversations &&
    a.yieldImprovement === b.yieldImprovement
  );
}

function areWeatherEqual(a: WeatherData | null, b: WeatherData | null) {
  if (!a || !b) return a === b;

  return (
    a.temp === b.temp &&
    a.humidity === b.humidity &&
    a.description === b.description &&
    a.location === b.location &&
    a.windSpeed === b.windSpeed &&
    a.icon === b.icon &&
    a.accuracy === b.accuracy &&
    a.feelsLike === b.feelsLike &&
    a.pressure === b.pressure &&
    a.visibility === b.visibility
  );
}

function areActivitiesEqual(a: ExtendedHistoryRecord[], b: ExtendedHistoryRecord[]) {
  if (a.length !== b.length) return false;

  return a.every((item, index) => {
    const other = b[index];
    return (
      item.id === other.id &&
      item.type === other.type &&
      item.created_at === other.created_at &&
      item.conversationId === other.conversationId
    );
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [showCityInput, setShowCityInput] = useState(false);
  const [cityName, setCityName] = useState("");
  const [fetchingCity, setFetchingCity] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    cropsAnalyzed: 0,
    diseasesDetected: 0,
    aiConversations: 0,
    yieldImprovement: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ExtendedHistoryRecord[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [forecast, setForecast] = useState<ForecastDay[]>(mockForecast);
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : {};
  });
  const [plantation, setPlantation] = useState<Plantation | null>(null);
  const [plantationSummary, setPlantationSummary] =
    useState<HarvestSummary | null>(null);
  const [plantationLoading, setPlantationLoading] = useState(true);
  const inFlightRef = useRef({
    stats: false,
    activity: false,
    weather: false,
    plantation: false,
  });
  const lastRefreshRef = useRef({
    stats: 0,
    activity: 0,
    weather: 0,
  });
  const weatherSourceRef = useRef<WeatherSource>(null);

  // Track whether the plantation has analytics so we can persist it across
  // remounts and skip the plantation fetch on the dashboard if the user has
  // already loaded the analytics once.
  const [plantationHasAnalytics, setPlantationHasAnalytics] = useState<boolean>(
    () => {
      try {
        return localStorage.getItem("dashboard:plantationHasAnalytics") === "1";
      } catch {
        return false;
      }
    },
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // If we already have analytics cached, mark the loader as done immediately
  // so the plantation card is not stuck in its loading skeleton on remount.
  useEffect(() => {
    if (plantationHasAnalytics) {
      setPlantationLoading(false);
    }
  }, [plantationHasAnalytics]);

  // Whenever the freshly fetched summary is evaluated, persist the analytics
  // flag and the actual data so the next dashboard mount can render the
  // card without re-fetching.
  useEffect(() => {
    const next = hasDashboardAnalytics(plantationSummary);
    setPlantationHasAnalytics((prev) => {
      if (prev === next) return prev;
      try {
        localStorage.setItem(
          "dashboard:plantationHasAnalytics",
          next ? "1" : "0",
        );
        if (next) {
          localStorage.setItem(
            "dashboard:plantationSummary",
            JSON.stringify(plantationSummary),
          );
        }
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, [plantationSummary]);


  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/auth");
    }
  }, [navigate]);

  // Listen for storage changes to update profile image across pages
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("user");
      if (saved) {
        setUserData(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener("focus", handleStorageChange);
    document.addEventListener("visibilitychange", handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
      document.removeEventListener("visibilitychange", handleStorageChange);
    };
  }, []);

  const user = userData;

  const getReadableLocationName = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `${GEO_API_URL}?lat=${lat}&lon=${lon}&limit=1&appid=${WEATHER_API_KEY}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const place = data[0];
      const parts = [place.name, place.state, place.country].filter(Boolean);
      return parts.join(", ");
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return null;
    }
  };

  const fetchWeatherByCoords = useCallback(async (
    lat: number,
    lon: number,
    accuracy?: number,
  ) => {
    if (!WEATHER_API_KEY) {
      throw new Error("Missing OpenWeather API key");
    }

    const weatherResponse = await fetch(
      `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`,
    );

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.error("Weather API error:", errorText);
      throw new Error("Failed to fetch weather data");
    }

    const weatherJson = await weatherResponse.json();
    const readableLocation = await getReadableLocationName(lat, lon);

    const nextWeather: WeatherData = {
      temp: Math.round(weatherJson.main?.temp ?? 0),
      humidity: weatherJson.main?.humidity ?? 0,
      description: weatherJson.weather?.[0]?.description ?? "Unknown",
      location: readableLocation || weatherJson.name || "Current Location",
      windSpeed: Math.round((weatherJson.wind?.speed ?? 0) * 3.6),
      icon: weatherJson.weather?.[0]?.icon ?? "01d",
      accuracy,
      feelsLike: Math.round(weatherJson.main?.feels_like ?? 0),
      pressure: weatherJson.main?.pressure ?? 0,
      visibility: weatherJson.visibility ? Math.round(weatherJson.visibility / 1000) : 10,
    };

    weatherSourceRef.current = { type: "coords", lat, lon, accuracy };
    lastRefreshRef.current.weather = Date.now();
    setWeather((currentWeather) =>
      areWeatherEqual(currentWeather, nextWeather) ? currentWeather : nextWeather,
    );
    return nextWeather;
  }, []);

  const fetchWeatherByCity = useCallback(async (
    city: string,
    options?: { silent?: boolean },
  ) => {
    if (!city.trim()) {
      if (!options?.silent) {
        toast({
          title: "Please enter a city name",
          description: "City name cannot be empty.",
          variant: "destructive",
        });
      }
      return;
    }

    if (!options?.silent) {
      setFetchingCity(true);
    }

    try {
      if (!WEATHER_API_KEY) {
        throw new Error("Missing OpenWeather API key");
      }

      const weatherResponse = await fetch(
        `${WEATHER_API_URL}?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`,
      );

      if (!weatherResponse.ok) {
        if (weatherResponse.status === 404) {
          if (!options?.silent) {
            toast({
              title: "City not found",
              description:
                "Could not find weather data for that city. Please check the name.",
              variant: "destructive",
            });
          }
          return;
        }

        const errorText = await weatherResponse.text();
        console.error("Weather API error:", errorText);
        throw new Error("Failed to fetch weather data");
      }

      const data = await weatherResponse.json();
      const nextWeather = {
        temp: Math.round(data.main?.temp ?? 0),
        humidity: data.main?.humidity ?? 0,
        description: data.weather?.[0]?.description ?? "Unknown",
        location: data.name || city,
        windSpeed: Math.round((data.wind?.speed ?? 0) * 3.6),
        icon: data.weather?.[0]?.icon ?? "01d",
        feelsLike: Math.round(data.main?.feels_like ?? 0),
        pressure: data.main?.pressure ?? 0,
        visibility: data.visibility ? Math.round(data.visibility / 1000) : 10,
      };

      weatherSourceRef.current = { type: "city", city };
      lastRefreshRef.current.weather = Date.now();
      setWeather((currentWeather) =>
        areWeatherEqual(currentWeather, nextWeather) ? currentWeather : nextWeather,
      );

      setLocationError(false);
      if (!options?.silent) {
        setShowCityInput(false);
        setCityName("");
        toast({
          title: "Weather updated",
          description: `Showing weather for ${data.name || city}`,
        });
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
      if (!options?.silent) {
        toast({
          title: "Error",
          description: "Failed to fetch weather data. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      if (!options?.silent) {
        setFetchingCity(false);
      }
    }
  }, [toast]);

  const requestUserLocationAndWeather = useCallback(async () => {
    try {
      setLoading(true);
      setLocationError(false);

      if (!WEATHER_API_KEY) {
        throw new Error("OpenWeather API key is missing");
      }

      const { latitude, longitude, accuracy } = await getCurrentDeviceLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
      weatherSourceRef.current = { type: "coords", lat: latitude, lon: longitude, accuracy };
      const result = await fetchWeatherByCoords(latitude, longitude, accuracy);

      setLocationError(false);
      setShowCityInput(false);
      toast({
        title: "Location detected",
        description:
          accuracy <= 100
            ? `Live weather for ${result.location}`
            : `Weather loaded, but GPS accuracy is about ${Math.round(accuracy)} meters`,
      });
    } catch (error: unknown) {
      console.error("Location detection failed:", error);
      setLocationError(true);
      setShowCityInput(true);

      let description =
        "Please allow location access or enter your city manually.";

      if (typeof error === 'object' && error !== null) {
        const err = error as { code?: number; message?: string };
        if (err.code === 1) {
          description =
            "Location permission denied by the browser. Reset the site's location permission and try again.";
        } else if (err.code === 2) {
          description = "Location unavailable. Turn on GPS and try again.";
        } else if (err.code === 3) {
          description =
            "Location request timed out. Try again outdoors or with stronger signal.";
        } else if (err.message) {
          description = err.message;
        }
      } else if (typeof error === 'string') {
        description = error;
      }

      toast({
        title: "Could not get your location",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchWeatherByCoords, toast]);

  const fetchStats = useCallback(async (options?: { silent?: boolean }) => {
    if (inFlightRef.current.stats) return;

    inFlightRef.current.stats = true;
    try {
      const data = await api.getStats();
      lastRefreshRef.current.stats = Date.now();
      setStats((currentStats) =>
        areStatsEqual(currentStats, data) ? currentStats : data,
      );
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      inFlightRef.current.stats = false;
      if (!options?.silent) {
        setStatsLoading(false);
      }
    }
  }, []);

  const fetchRecentActivity = useCallback(async (options?: { silent?: boolean }) => {
    if (inFlightRef.current.activity) return;

    inFlightRef.current.activity = true;
    try {
      const response = await api.getHistory();
      if (response.history) {
        const nextActivity = response.history.slice(0, 5);
        lastRefreshRef.current.activity = Date.now();
        setRecentActivity((currentActivity) =>
          areActivitiesEqual(currentActivity, nextActivity)
            ? currentActivity
            : nextActivity,
        );
      }
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
    } finally {
      inFlightRef.current.activity = false;
      if (!options?.silent) {
        setActivityLoading(false);
      }
    }
  }, []);

  const fetchActivePlantation = useCallback(async (options?: { silent?: boolean }) => {
    if (inFlightRef.current.plantation) return;
    inFlightRef.current.plantation = true;
    try {
      const response = await api.listPlantations();
      const list = ((response.plantations || []) as unknown as Plantation[]).filter(
        (p) => p && p.farm,
      );
      const active =
        list.find((p) => String(p.status).toLowerCase() === "active") ?? list[0] ?? null;
      if (active && active.farm) {
        try {
          const detail = await api.getPlantation(String(active.id));
          const detailPlantation = detail.plantation as unknown as Plantation;
          const merged: Plantation = {
            ...active,
            ...(detailPlantation ?? {}),
            farm: detailPlantation?.farm ?? active.farm,
            costs: detailPlantation?.costs ?? active.costs,
            calendarEvents:
              detailPlantation?.calendarEvents ?? active.calendarEvents,
            next_activity:
              detailPlantation?.next_activity ?? active.next_activity,
          };
          setPlantation(merged);
          try {
            const summary = await api.getHarvestSummary(String(merged.id));
            setPlantationSummary(summary.summary);
          } catch (summaryError) {
            console.warn("Falling back without plantation analytics", summaryError);
            setPlantationSummary(null);
          }
        } catch (detailError) {
          console.warn("Falling back to list row for plantation", detailError);
          setPlantation(active);
          try {
            const summary = await api.getHarvestSummary(String(active.id));
            setPlantationSummary(summary.summary);
          } catch (summaryError) {
            console.warn("Falling back without plantation analytics", summaryError);
            setPlantationSummary(null);
          }
        }
      } else {
        setPlantation(null);
        setPlantationSummary(null);
      }
    } catch (error) {
      console.error("Failed to load plantation:", error);
      if (!options?.silent) {
        setPlantation(null);
        setPlantationSummary(null);
      }
    } finally {
      inFlightRef.current.plantation = false;
      if (!options?.silent) {
        setPlantationLoading(false);
      }
    }
  }, []);

  const refreshWeatherSilently = useCallback(async () => {
    if (inFlightRef.current.weather || !weatherSourceRef.current) return;

    inFlightRef.current.weather = true;
    try {
      const source = weatherSourceRef.current;

      if (source?.type === "coords") {
        await fetchWeatherByCoords(source.lat, source.lon, source.accuracy);
      } else if (source?.type === "city") {
        await fetchWeatherByCity(source.city, { silent: true });
      }
    } catch (error) {
      console.error("Silent weather refresh failed:", error);
    } finally {
      inFlightRef.current.weather = false;
    }
  }, [fetchWeatherByCity, fetchWeatherByCoords]);

  useEffect(() => {
    void requestUserLocationAndWeather();
    void fetchStats();
    void fetchRecentActivity();
    // Only fetch the plantation on mount when we don't already have analytics
    // (i.e. don't refetch/refresh plantation data on the dashboard once analytics exist).
    if (!plantationHasAnalytics) {
      void fetchActivePlantation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - remove dependencies to prevent infinite loop

  // Refresh plantation when the user returns to the dashboard or when a new
  // plantation was just created (e.g. on the crop detail screen).
  // Skip the re-fetch entirely once analytics are already available, so the
  // plantation data is not repeatedly fetched on the dashboard view.
  useEffect(() => {
    if (plantationHasAnalytics) return;

    const handleRefreshPlantation = () => {
      inFlightRef.current.plantation = false;
      void fetchActivePlantation({ silent: true });
    };

    window.addEventListener("focus", handleRefreshPlantation);
    document.addEventListener("visibilitychange", handleRefreshPlantation);
    window.addEventListener("plantation:created", handleRefreshPlantation);

    return () => {
      window.removeEventListener("focus", handleRefreshPlantation);
      document.removeEventListener("visibilitychange", handleRefreshPlantation);
      window.removeEventListener("plantation:created", handleRefreshPlantation);
    };
  }, [fetchActivePlantation, plantationHasAnalytics]);

  useEffect(() => {
    let timeoutId: number | undefined;
    let disposed = false;

    const scheduleNextTick = () => {
      if (disposed) return;
      timeoutId = window.setTimeout(runPollingCycle, DASHBOARD_POLL_INTERVAL_MS);
    };

    const runPollingCycle = async (force = false) => {
      if (disposed) return;

      if (document.hidden || !navigator.onLine) {
        scheduleNextTick();
        return;
      }

      const now = Date.now();
      const tasks: Promise<unknown>[] = [];

      if (force || now - lastRefreshRef.current.stats >= DASHBOARD_POLL_INTERVAL_MS) {
        tasks.push(fetchStats({ silent: true }));
      }

      if (force || now - lastRefreshRef.current.activity >= ACTIVITY_REFRESH_INTERVAL_MS) {
        tasks.push(fetchRecentActivity({ silent: true }));
      }

      if (force || now - lastRefreshRef.current.weather >= WEATHER_REFRESH_INTERVAL_MS) {
        tasks.push(refreshWeatherSilently());
      }

      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }

      scheduleNextTick();
    };

    const handleVisibilityOrOnline = () => {
      if (document.hidden || !navigator.onLine) return;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      void runPollingCycle(true);
    };

    scheduleNextTick();
    document.addEventListener("visibilitychange", handleVisibilityOrOnline);
    window.addEventListener("online", handleVisibilityOrOnline);

    return () => {
      disposed = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityOrOnline);
      window.removeEventListener("online", handleVisibilityOrOnline);
    };
  }, [fetchRecentActivity, fetchStats, refreshWeatherSilently]);

  useEffect(() => {
    const nextNotifications = buildWeatherNotifications(weather);
    setNotifications(nextNotifications);
    setUnreadCount(nextNotifications.length);
  }, [weather]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      weekday: "short",
    }).format(new Date());
  }, []);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, [currentTime]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const WeatherIcon = weather?.icon
    ? weatherIconMap[weather.icon] || CloudSun
    : CloudSun;

  const dailyAdvice = useMemo(() => getDailyAdvice(weather), [weather]);

  const statsCards = [
    {
      label: "Crops Analyzed",
      value: statsLoading ? "-" : stats.cropsAnalyzed,
      icon: Sprout,
      gradient: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      trend: "+12%",
      trendColor: "text-emerald-600",
    },
    {
      label: "Diseases Detected",
      value: statsLoading ? "-" : stats.diseasesDetected,
      icon: Leaf,
      gradient: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      trend: "+5%",
      trendColor: "text-blue-600",
    },
    {
      label: "AI Conversations",
      value: statsLoading ? "-" : stats.aiConversations,
      icon: MessageCircle,
      gradient: "from-violet-500 to-purple-600",
      bgColor: "bg-violet-50",
      iconColor: "text-violet-600",
      trend: "+23%",
      trendColor: "text-violet-600",
    },
    {
      label: "Yield Improvement",
      value: statsLoading ? "-" : `+${stats.yieldImprovement}%`,
      icon: TrendingUp,
      gradient: "from-orange-500 to-amber-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      trend: "+8%",
      trendColor: "text-orange-600",
    },
  ];

  const goToFarmHistory = useCallback(() => {
    navigate("/farm-analytics-comparison");
  }, [navigate]);

  const quickActions = [
    {
      label: "Enter Soil Data",
      description: "Input soil parameters",
      icon: FileText,
      gradient: "from-emerald-500 to-teal-600",
      path: "/soil-input",
    },
    {
      label: "Pick Location",
      description: "Find crops by place",
      icon: MapPin,
      gradient: "from-lime-500 to-emerald-600",
      path: "/location-input",
    },
    {
      label: "Upload Image",
      description: "Analyze crop images",
      icon: Upload,
      gradient: "from-blue-500 to-cyan-600",
      path: "/disease",
    },
    {
      label: "Ask AI",
      description: "Get instant answers",
      icon: MessageCircle,
      gradient: "from-violet-500 to-purple-600",
      path: "/chat",
    },
    {
      label: "Farm Analytics Comparison",
      description: "Compare cycles side by side",
      icon: BarChart3,
      gradient: "from-pink-500 to-rose-600",
      path: "__farm_history__",
    },
    {
      label: "View History",
      description: "Past records & analytics",
      icon: History,
      gradient: "from-orange-500 to-amber-600",
      path: "/history",
    },
  ];

  const weatherDetails = [
    { label: "Feels Like", value: `${weather?.feelsLike || weather?.temp || 0}°`, icon: Thermometer },
    { label: "Pressure", value: `${weather?.pressure || 1013} hPa`, icon: Gauge },
    { label: "Visibility", value: `${weather?.visibility || 10} km`, icon: Eye },
    { label: "Wind", value: `${weather?.windSpeed || 0} km/h`, icon: Wind },
  ];

  const handleRefresh = () => {
    setLoading(true);
    requestUserLocationAndWeather();
  };

  const dismissNotification = (id: number) => {
    const remainingNotifications = notifications.filter((notification) => notification.id !== id);
    setNotifications(remainingNotifications);
    setUnreadCount(remainingNotifications.length);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning": return AlertTriangle;
      case "success": return CheckCircle2;
      case "info": return Info;
      default: return Bell;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-100">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
                <Sprout className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">CropWise AI</span>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-14 z-50 w-80 rounded-2xl bg-white shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b p-4">
                      <h3 className="font-semibold">Notifications</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNotifications([]);
                          setUnreadCount(0);
                        }}
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const NotifIcon = getNotificationIcon(notification.type);
                          return (
                            <div
                              key={notification.id}
                              className="flex items-start gap-3 border-b p-4 last:border-0 hover:bg-slate-50"
                            >
                              <NotifIcon className={`mt-0.5 h-4 w-4 ${
                                notification.type === "warning" ? "text-amber-500" :
                                notification.type === "success" ? "text-green-500" :
                                "text-blue-500"
                              }`} />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {notification.message}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {notification.time}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => dismissNotification(notification.id)}
                                className="h-6 w-6"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Image with dropdown trigger */}
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 rounded-full bg-white/80 p-1 shadow-md hover:shadow-lg transition-all"
              title="Go to profile"
              aria-label="Go to profile"
            >
              <img
                src={user.image || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80"}
                alt="User"
                className="h-9 w-9 rounded-full object-cover"
              />
            </button>
          </motion.div>
        </header>

        {/* Hero Weather Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 shadow-2xl"
        >
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -right-10 -bottom-10 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
          
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          
          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm"
                >
                  <MapPin className="h-4 w-4 text-white/90" />
                  <span className="text-sm font-medium text-white/90">
                    {weather?.location || "Detecting location..."}
                  </span>
                </motion.div>

                {loading ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Fetching weather data...</span>
                  </div>
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className="text-lg font-medium text-white/80">
                        {greeting}, {user.name?.split(" ")[0] || "Farmer"}!
                      </p>
                      <div className="mt-2 flex items-baseline gap-4">
                        <span className="text-7xl font-bold tracking-tight text-white">
                          {weather?.temp ?? 0}°
                        </span>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-white/95">
                            <WeatherIcon className="h-8 w-8" />
                            <span className="capitalize text-xl font-medium">
                              {weather?.description || "Partly cloudy"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-white/70">
                            <span className="flex items-center gap-1">
                              <Wind className="h-3 w-3" />
                              {weather?.windSpeed ?? 0} km/h
                            </span>
                            <span className="flex items-center gap-1">
                              <Droplets className="h-3 w-3" />
                              {weather?.humidity ?? 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}

                {/* Weather Details Grid */}
                {!loading && weather && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-2 gap-2 pt-4 sm:grid-cols-4"
                  >
                    {weatherDetails.map((detail) => (
                      <div key={detail.label} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                        <detail.icon className="h-4 w-4 text-white/70" />
                        <div>
                          <p className="text-[10px] text-white/60">{detail.label}</p>
                          <p className="text-sm font-medium text-white">{detail.value}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {!loading && dailyAdvice && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="rounded-2xl border border-white/20 bg-slate-950/20 p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white/15 p-2">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                          Cropwise Daily Notification
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-white">
                          {dailyAdvice.headline}
                        </h3>
                        <p className="mt-1 text-sm text-white/80">
                          {dailyAdvice.summary}
                        </p>
                        <p className="mt-3 text-xs font-medium text-white/70">
                          Best to do today:
                        </p>
                        <ul className="mt-2 space-y-2 text-sm text-white/90">
                          {dailyAdvice.tasks.map((task) => (
                            <li key={task} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/80" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="relative">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm shadow-2xl">
                    <WeatherIcon className="h-16 w-16 text-white/90" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-sm">
                    Feels like {weather?.feelsLike || weather?.temp || 0}°
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </motion.div>
            </div>

            {showCityInput && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex gap-2 rounded-2xl bg-white/20 p-2 backdrop-blur-sm"
              >
                <Input
                  type="text"
                  placeholder="Enter city name..."
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && fetchWeatherByCity(cityName)
                  }
                  className="border-white/20 bg-transparent text-white placeholder:text-white/70"
                  disabled={fetchingCity}
                />
                <Button
                  onClick={() => fetchWeatherByCity(cityName)}
                  disabled={fetchingCity}
                  className="rounded-xl bg-white text-emerald-600 hover:bg-white/90"
                >
                  {fetchingCity ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </motion.div>
            )}

            {!showCityInput && !loading && (
              <Button
                variant="ghost"
                onClick={() => setShowCityInput(true)}
                className="mt-4 rounded-full bg-white/10 text-white hover:bg-white/20"
                size="sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Change location
              </Button>
            )}

            {locationError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-2xl bg-amber-500/90 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-white" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      Could not detect your location.
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      Please allow location access or enter your city manually.
                    </p>
                  </div>
                  <Button
                    onClick={requestUserLocationAndWeather}
                    className="shrink-0 rounded-full bg-white text-emerald-600 hover:bg-white/90"
                    size="sm"
                  >
                    Retry
                  </Button>
                </div>
              </motion.div>
            )}

            <div className="mt-6 flex items-center gap-4 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <Sun className="h-3 w-3" />
                {formattedTime}
              </span>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </motion.section>

        {/* Weather Forecast */}
        <section className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold text-foreground">
              5-Day Forecast
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">
              Full Forecast
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </motion.div>
          
          <div className="flex gap-3 overflow-x-auto pb-2">
            {forecast.map((day, index) => {
              const DayIcon = weatherIconMap[day.icon] || Sun;
              return (
                <motion.div
                  key={day.day}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ y: -6, scale: 1.05 }}
                  className="min-w-[130px] rounded-2xl bg-white p-4 text-center shadow-md hover:shadow-xl transition-all"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {day.day}
                  </p>
                  <div className="my-2 flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-orange-50">
                      <DayIcon className="h-6 w-6 text-amber-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {day.temp}°C
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500">
                    <Droplets className="h-3 w-3 text-blue-400" />
                    {day.humidity}%
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold text-foreground">
              Farm Overview
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">
              See All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </motion.div>
          
          <div className="flex gap-3 overflow-x-auto pb-2">
            {statsCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -6, scale: 1.05 }}
                className="min-w-[180px] rounded-2xl bg-white p-4 shadow-md hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-xl ${stat.bgColor} p-2.5 shadow-sm`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <span className={`text-xs font-semibold ${stat.trendColor}`}>
                    {stat.trend}
                  </span>
                </div>
                
                <div className="mt-4">
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
                
                <div className={`mt-3 h-1.5 w-full rounded-full bg-gradient-to-r ${stat.gradient} opacity-20`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "70%" }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                    className={`h-full rounded-full bg-gradient-to-r ${stat.gradient}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold text-foreground">
              Quick Actions
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">
              <Settings className="mr-1 h-4 w-4" />
              Customize
            </Button>
          </motion.div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {quickActions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ y: -6, scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="min-w-[180px] cursor-pointer transition-all duration-300 hover:shadow-xl group"
                    onClick={() =>
                      action.path === "__farm_history__"
                        ? goToFarmHistory()
                        : navigate(action.path)
                    }
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg group-hover:shadow-xl transition-all`}>
                        <ActionIcon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {action.label}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground text-center">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* My Plantation quick action */}
        <section className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-4 flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold text-foreground">My Plantation</h2>
            {plantationHasAnalytics && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Analytics ready
              </span>
            )}
          </motion.div>

          {plantationLoading ? (
            <div className="h-32 animate-pulse rounded-2xl bg-white" />
          ) : (
            <Card
              className={[
                "overflow-hidden border-0 shadow-md transition-all",
                plantationHasAnalytics
                  ? "group cursor-pointer hover:shadow-xl"
                  : "cursor-default",
              ].join(" ")}
              onClick={
                plantationHasAnalytics ? () => navigate("/plantation") : undefined
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
                    {plantationHasAnalytics ? (
                      <TrendingUp className="h-7 w-7 text-white" />
                    ) : (
                      <MapPinned className="h-7 w-7 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">
                      {plantation?.crop_name ?? "No active plantation yet"}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {plantation
                        ? `${plantation.farm?.farm_name ?? "Your farm"} • ${plantation.calendarEvents?.filter((event) => String(event.status).toLowerCase() === "done").length ?? 0}/${plantation.calendarEvents?.length ?? 0} activities done`
                        : "Track progress, costs, and weather-aware activities on its own page."}
                    </p>
                  </div>
                  {plantationHasAnalytics && (
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  )}
                </div>
                {plantationHasAnalytics && plantationSummary && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-emerald-50 p-2">
                      <p className="text-[10px] font-medium uppercase text-emerald-700">
                        Yield
                      </p>
                      <p className="truncate text-xs font-bold text-emerald-950">
                        {plantationSummary.harvest
                          ? `${dashboardNumber(plantationSummary.harvest.actual_yield).toLocaleString()} ${plantationSummary.harvest.yield_unit}`
                          : "Done"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-sky-50 p-2">
                      <p className="text-[10px] font-medium uppercase text-sky-700">
                        Profit
                      </p>
                      <p className="truncate text-xs font-bold text-sky-950">
                        {dashboardMoney(plantationSummary.profit?.net_profit)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-2">
                      <p className="text-[10px] font-medium uppercase text-amber-700">
                        ROI
                      </p>
                      <p className="truncate text-xs font-bold text-amber-950">
                        {dashboardNumber(plantationSummary.profit?.roi_percent).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                        %
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Recent Activity */}
        <section className="mt-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-4 flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold text-foreground">
              Recent Activity
            </h2>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/history")}>
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </motion.div>

          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="flex flex-col items-center pt-8 text-center">
              <History className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
              <p className="mt-1 text-xs text-muted-foreground">Your scans, recommendations, and chats will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((record, index) => {
                const Icon = typeIcon[record.type];
                const color = typeColor[record.type];
                const isChat = record.type === "chat";

                const getPreview = (record: ExtendedHistoryRecord) => {
                  if (record.type === "chat" && record.data) {
                    const data = record.data as { title?: string; preview?: string; messageCount?: number; topic?: string };
                    return data.preview || data.title || "Chat conversation";
                  }
                  if (record.type === "recommendation" && record.data) {
                    return extractRecommendationPreview(record.data);
                  }
                  if (record.type === "disease" && record.data) {
                    return extractDiseasePreview(record.data);
                  }
                  return "";
                };

                return (
                  <motion.div
                    key={`${record.id}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className={`flex items-center gap-3 rounded-2xl bg-card p-4 card-shadow ${
                      isChat ? "cursor-pointer hover:bg-accent/10 transition-colors" : ""
                    }`}
                    onClick={() => isChat && record.conversationId && navigate(`/chat?id=${record.conversationId}`)}
                  >
                    <div className={`rounded-xl p-2 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-card-foreground">
                          {typeLabels[record.type]}
                        </p>
                        {isChat && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {getPreview(record) || "No preview available"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(record.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
