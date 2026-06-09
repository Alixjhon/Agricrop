import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  Moon,
  Sun,
  Shield,
  HelpCircle,
  LogOut,
  Camera,
  MapPin,
  Mail,
  Phone,
  Edit3,
  ChevronRight,
  Sprout,
  Award,
  Calendar,
  X,
  Save,
  ArrowLeft,
  Send,
  FileText,
  BarChart3,
  CircleDollarSign,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { HarvestSummary, Plantation } from "@/types/planting";
const SETTINGS_STORAGE_KEY = "cropwise_settings";

type ActivePanel = "notifications" | "appearance" | "privacy" | "help" | null;
type ActiveResource = "policy" | "faq" | "guide" | "support" | null;

interface SettingsPreferences {
  notifications: boolean;
  emailAlerts: boolean;
  darkMode: boolean;
  weatherAlerts: boolean;
  cropReminders: boolean;
}

interface SettingsStats {
  cropsAnalyzed: number;
  daysActive: number;
  aiConversations: number;
}

interface LocalUser {
  name?: string;
  email?: string;
  image?: string;
  image_url?: string;
  phone?: string;
  location?: string;
}

const menuItems = [
  { icon: User, label: "Edit Profile", color: "bg-blue-100", textColor: "text-blue-600" },
  { icon: Bell, label: "Notifications", color: "bg-amber-100", textColor: "text-amber-600" },
  { icon: Moon, label: "Appearance", color: "bg-purple-100", textColor: "text-purple-600" },
  { icon: Shield, label: "Privacy & Security", color: "bg-green-100", textColor: "text-green-600" },
  { icon: HelpCircle, label: "Help & Support", color: "bg-cyan-100", textColor: "text-cyan-600" },
];

const defaultUser: LocalUser = {
  name: "Farmer User",
  email: "farmer@example.com",
  image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  phone: "+1 234 567 890",
  location: "California, USA",
};

const defaultSettings: SettingsPreferences = {
  notifications: true,
  emailAlerts: true,
  darkMode: false,
  weatherAlerts: true,
  cropReminders: true,
};

function normalizeUser(user: LocalUser | null | undefined): LocalUser {
  if (!user) return defaultUser;

  return {
    ...defaultUser,
    ...user,
    image: user.image || user.image_url || defaultUser.image,
  };
}

function loadStoredSettings(): SettingsPreferences {
  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!saved) return defaultSettings;

  try {
    return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {
    return defaultSettings;
  }
}

function getPanelSummary(panel: ActivePanel, settings: SettingsPreferences) {
  switch (panel) {
    case "notifications":
      return settings.notifications ? "Alerts and reminders are active" : "Notifications are currently muted";
    case "appearance":
      return settings.darkMode ? "Dark mode is enabled" : "Light mode is active";
    case "privacy":
      return "Review privacy and account protections";
    case "help":
      return "Support, FAQ, and user guidance";
    default:
      return "Choose what you want to manage";
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatCurrency(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "$0";
  return numeric.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return normalizeUser(saved ? JSON.parse(saved) : defaultUser);
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    location: user.location || "",
    image: user.image || "",
  });

  const [settings, setSettings] = useState<SettingsPreferences>(loadStoredSettings);

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [activeResource, setActiveResource] = useState<ActiveResource>(null);
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [stats, setStats] = useState<SettingsStats>({
    cropsAnalyzed: 0,
    daysActive: 0,
    aiConversations: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [plantations, setPlantations] = useState<Plantation[]>([]);
  const [selectedPlantationId, setSelectedPlantationId] = useState("");
  const [analyticsSummary, setAnalyticsSummary] = useState<HarvestSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const activePath = useMemo(() => {
    const params = new URLSearchParams();
    if (activePanel) params.set("section", activePanel);
    if (activeResource) params.set("resource", activeResource);
    const query = params.toString();
    return `/settings${query ? `?${query}` : ""}`;
  }, [activePanel, activeResource]);

  const updateSettingsPath = useCallback((panel: ActivePanel, resource: ActiveResource = null) => {
    const params = new URLSearchParams();
    if (panel) params.set("section", panel);
    if (resource) params.set("resource", resource);
    const query = params.toString();
    navigate(query ? `/settings?${query}` : "/settings", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextPanel = params.get("section");
    const nextResource = params.get("resource");

    setActivePanel(
      nextPanel === "notifications" ||
      nextPanel === "appearance" ||
      nextPanel === "privacy" ||
      nextPanel === "help"
        ? nextPanel
        : null,
    );

    setActiveResource(
      nextResource === "policy" ||
      nextResource === "faq" ||
      nextResource === "guide" ||
      nextResource === "support"
        ? nextResource
        : null,
    );
    setShowHelpForm(nextResource === "support");
  }, [location.search]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings]);

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        const token = localStorage.getItem("token");
        const requests = await Promise.allSettled([
          token ? api.getProfile(token) : Promise.resolve(null),
          api.getStats(),
          api.getHistory(),
          api.listPlantations(),
        ]);

        const [profileResult, statsResult, historyResult, plantationsResult] = requests;

        if (profileResult.status === "fulfilled" && profileResult.value?.user) {
          const normalizedUser = normalizeUser(profileResult.value.user as LocalUser);
          setUser(normalizedUser);
          setEditForm({
            name: normalizedUser.name || "",
            email: normalizedUser.email || "",
            phone: normalizedUser.phone || "",
            location: normalizedUser.location || "",
            image: normalizedUser.image || "",
          });
          localStorage.setItem("user", JSON.stringify(normalizedUser));
        }

        if (statsResult.status === "fulfilled") {
          const nextStats = statsResult.value;
          let daysActive = 0;

          if (historyResult.status === "fulfilled" && historyResult.value.history.length > 0) {
            const timestamps = historyResult.value.history.map((item) =>
              new Date(item.created_at).getTime(),
            );
            const oldest = Math.min(...timestamps);
            daysActive = Math.max(
              1,
              Math.ceil((Date.now() - oldest) / (1000 * 60 * 60 * 24)),
            );
          }

          setStats({
            cropsAnalyzed: nextStats.cropsAnalyzed,
            aiConversations: nextStats.aiConversations,
            daysActive,
          });
        }

        if (plantationsResult.status === "fulfilled") {
          const nextPlantations = (plantationsResult.value.plantations || []) as Plantation[];
          setPlantations(nextPlantations);
          setSelectedPlantationId((current) =>
            current || (nextPlantations[0] ? String(nextPlantations[0].id) : ""),
          );
        }
      } catch (error) {
        console.error("Failed to load settings data:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    void loadSettingsData();
  }, []);

  useEffect(() => {
    if (!selectedPlantationId) {
      setAnalyticsSummary(null);
      setAnalyticsLoading(false);
      return;
    }

    let cancelled = false;
    setAnalyticsLoading(true);

    (async () => {
      try {
        const response = await api.getHarvestSummary(selectedPlantationId);
        if (!cancelled) setAnalyticsSummary(response.summary);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load farm analytics:", error);
          setAnalyticsSummary(null);
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPlantationId]);

  const selectedPlantation = useMemo(
    () =>
      plantations.find(
        (plantation) => String(plantation.id) === String(selectedPlantationId),
      ) ?? null,
    [plantations, selectedPlantationId],
  );

  // Handler functions for each button
  const handleBack = () => {
    navigate(-1);
  };

  const handleEditProfile = () => {
    navigate("/profile");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;

        setEditForm((currentForm) => ({ ...currentForm, image: base64Image }));

        const updatedUser = { ...user, image: base64Image };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        try {
          const token = localStorage.getItem("token");
          const data = await api.updateProfile(
            { image_url: base64Image },
            token,
          );

          if (data?.user) {
            const dbUpdatedUser = data?.user
              ? { ...user, ...data.user, image: base64Image }
              : { ...user, image: base64Image };
            setUser(dbUpdatedUser);
            localStorage.setItem("user", JSON.stringify(dbUpdatedUser));

            toast({
              title: "Profile image updated",
              description: "Your profile image has been saved.",
            });
          } else {
            throw new Error("Failed to save image to database");
          }
        } catch (error: unknown) {
          console.error("Error saving image:", error);
          toast({
            title: "Image saved locally",
            description: "Profile image saved. Database sync may require login.",
          });
        }
      };

      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read the image file.",
          variant: "destructive",
        });
      };

      reader.readAsDataURL(file);
    }

    e.target.value = "";
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const data = await api.updateProfile(
        {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          location: editForm.location,
        },
        token,
      );

      const updatedUser = data?.user
        ? { ...user, ...data.user, image: data.user.image || data.user.image_url || user.image }
        : { ...user, ...editForm };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);
      setActivePanel(null);

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved to the database.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      // Fallback to local storage update
      const updatedUser = { ...user, ...editForm };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);
      setActivePanel(null);

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved locally.",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setActivePanel(null);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      location: user.location || "",
      image: user.image || "",
    });
  };

  const handleNotificationsClick = () => {
    updateSettingsPath(activePanel === "notifications" ? null : "notifications");
  };

  const handleAppearanceClick = () => {
    updateSettingsPath(activePanel === "appearance" ? null : "appearance");
  };

  const handlePrivacyClick = () => {
    updateSettingsPath(activePanel === "privacy" ? null : "privacy");
  };

  const handleHelpClick = () => {
    updateSettingsPath(activePanel === "help" ? null : "help");
  };

  const handleToggleSetting = (key: keyof typeof settings) => {
    const nextValue = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: nextValue }));
    toast({
      title: "Setting Updated",
      description: `${key.replace(/([A-Z])/g, " $1").trim()} has been ${nextValue ? "enabled" : "disabled"}.`,
    });
  };

  const handleLogout = () => {
    // Clear all authentication-related storage
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("cropwise_chat_state");
    
    // Clear any cached data that might cause issues on re-login
    sessionStorage.clear();
    
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
    
    // Navigate to auth page
    navigate("/auth", { replace: true });
  };

  const handleContactSupport = () => {
    const nextVisible = !(activePanel === "help" && activeResource === "support" && showHelpForm);
    setShowHelpForm(nextVisible);
    setActiveResource(nextVisible ? "support" : null);
    updateSettingsPath("help", nextVisible ? "support" : null);
  };

  const handleSendSupportMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:support@cropwise.ai?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportMessage)}`;
    window.location.href = mailtoUrl;
    toast({
      title: "Message Sent",
      description: "Your email app has been opened with the support message.",
    });
    setShowHelpForm(false);
    setSupportSubject("");
    setSupportMessage("");
    setActiveResource(null);
    updateSettingsPath("help");
  };

  const handleViewPrivacyPolicy = () => {
    setActiveResource("policy");
    updateSettingsPath("privacy", "policy");
  };

  const handleViewFAQ = () => {
    setActiveResource("faq");
    updateSettingsPath("help", "faq");
  };

  const handleViewUserGuide = () => {
    setActiveResource("guide");
    updateSettingsPath("help", "guide");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-100 pb-24">
      {/* Custom Header with Back Button */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
        <button
          onClick={handleBack}
          className="rounded-lg p-1 text-foreground hover:bg-muted transition-colors"
          title="Go back"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
      </header>

      <div className="px-4 pt-4">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-800 text-white shadow-xl"
        >
          <div className="relative p-5">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
                Settings Center
              </div>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Manage your account your way</h2>
                  <p className="mt-2 max-w-xl text-sm text-white/75">
                    Update profile details, control alerts, adjust app appearance, and reach support from one place.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">Current section</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {activePanel ? activePanel.replace(/^\w/, (char) => char.toUpperCase()) : "Overview"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-5 pb-5 pt-6">
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={user.image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"}
                    alt="Profile"
                    className="h-24 w-24 rounded-3xl border-4 border-white/80 shadow-lg object-cover"
                  />
                  <input
                    type="file"
                    id="settings-profile-image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    title="Upload profile image"
                    aria-label="Upload profile image"
                  />
                  <button
                    onClick={() => document.getElementById("settings-profile-image-upload")?.click()}
                    className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-md transition-colors hover:bg-slate-50"
                    title="Change profile photo"
                    aria-label="Change profile photo"
                  >
                    <Camera className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
                <div className="min-w-0 flex-1 text-white">
                  <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                    Account owner
                  </div>
                  <h2 className="mt-3 truncate text-2xl font-semibold">{user.name || "Farmer User"}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-white/80">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{user.email || "farmer@example.com"}</span>
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{user.location || "California, USA"}</span>
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">Profile path</p>
                <p className="mt-1 truncate text-sm font-semibold text-emerald-900">{activePath}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Phone</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{user.phone || "Not added yet"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Ready to customize</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 grid grid-cols-3 gap-3"
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="mb-2 flex justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100">
                  <Sprout className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.cropsAnalyzed}</p>
              <p className="text-xs text-muted-foreground">Crops Analyzed</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="mb-2 flex justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{statsLoading ? "-" : stats.daysActive}</p>
              <p className="text-xs text-muted-foreground">Days Active</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="mb-2 flex justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
                  <Award className="h-5 w-5 text-violet-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.aiConversations}</p>
              <p className="text-xs text-muted-foreground">AI Chats</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
          className="mb-4"
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardHeader className="border-b border-border/60 bg-white/80 pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardDescription className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-foreground">My Farm Analytics</span>
                </CardDescription>
                <div className="w-full sm:w-72">
                  <Select
                    value={selectedPlantationId}
                    onValueChange={setSelectedPlantationId}
                    disabled={plantations.length === 0}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Choose plantation" />
                    </SelectTrigger>
                    <SelectContent>
                      {plantations.map((plantation) => (
                        <SelectItem
                          key={String(plantation.id)}
                          value={String(plantation.id)}
                        >
                          {plantation.farm?.farm_name || "Farm"} - {plantation.crop_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {plantations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
                  No plantations found yet. Create a plantation first, then your
                  postharvest yield and profit analytics will appear here.
                </div>
              ) : analyticsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : analyticsSummary ? (
                <>
                  <div className="flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">
                        {analyticsSummary.farm_name || selectedPlantation?.farm?.farm_name || "Farm"}
                      </p>
                      <p className="text-xs text-emerald-800/80">
                        {analyticsSummary.crop_name} plantation - status:{" "}
                        {analyticsSummary.status || selectedPlantation?.status || "active"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/plantation/${selectedPlantationId}/postharvest/summary`,
                        )
                      }
                      className="w-full border-emerald-200 bg-white/70 sm:w-auto"
                    >
                      View postharvest
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AnalyticsTile
                      icon={Sprout}
                      label="Actual Yield"
                      value={
                        analyticsSummary.harvest
                          ? `${formatNumber(analyticsSummary.harvest.actual_yield)} ${analyticsSummary.harvest.yield_unit}`
                          : "Not recorded"
                      }
                      tone="emerald"
                    />
                    <AnalyticsTile
                      icon={CircleDollarSign}
                      label="Revenue"
                      value={formatCurrency(analyticsSummary.profit?.total_revenue)}
                      tone="cyan"
                    />
                    <AnalyticsTile
                      icon={TrendingUp}
                      label="Net Profit"
                      value={formatCurrency(analyticsSummary.profit?.net_profit)}
                      tone="amber"
                    />
                    <AnalyticsTile
                      icon={Award}
                      label="ROI"
                      value={
                        analyticsSummary.profit
                          ? `${formatNumber(analyticsSummary.profit.roi_percent)}%`
                          : "0%"
                      }
                      tone="violet"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AnalyticsDetail
                      label="Harvest date"
                      value={formatDate(analyticsSummary.actual_harvest_date)}
                    />
                    <AnalyticsDetail
                      label="Expected harvest"
                      value={formatDate(analyticsSummary.expected_harvest_date)}
                    />
                    <AnalyticsDetail
                      label="Total expenses"
                      value={formatCurrency(analyticsSummary.profit?.total_expenses)}
                    />
                    <AnalyticsDetail
                      label="Activities done"
                      value={`${analyticsSummary.activities.completed}/${analyticsSummary.activities.total}`}
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800">
                  Analytics could not be loaded for this plantation. Make sure
                  postharvest data is available, then try again.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4"
        >
          <Card className="border-0 shadow-md">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Settings Overview</p>
                <p className="text-xs text-muted-foreground">{getPanelSummary(activePanel, settings)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Notifications {settings.notifications ? "On" : "Off"}
                </span>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                  {settings.darkMode ? "Dark Mode" : "Light Mode"}
                </span>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                  {activeResource ? `Resource: ${activeResource}` : "General settings"}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Profile Form */}
        {activePanel === "editProfile" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  <span className="font-semibold">Edit Profile</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="Enter your location"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Settings Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {/* Edit Profile Menu Item */}
          <Card className="overflow-hidden border-0 shadow-md transition-shadow hover:shadow-lg">
            <CardContent
              className="flex items-center justify-between p-4"
              onClick={handleEditProfile}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${menuItems[0].color}`}>
                  <User className={`h-5 w-5 ${menuItems[0].textColor}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">Edit Profile</p>
                  <p className="text-xs text-muted-foreground">Open the dedicated profile editor</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="overflow-hidden border-0 shadow-md transition-shadow hover:shadow-lg">
            <CardContent
              className="flex items-center justify-between p-4"
              onClick={handleNotificationsClick}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${menuItems[1].color}`}>
                  <Bell className={`h-5 w-5 ${menuItems[1].textColor}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.notifications ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${settings.notifications ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {settings.notifications ? "On" : "Off"}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
            {activePanel === "notifications" && (
              <div className="border-t border-border/50 bg-slate-50/70 px-4 pb-4 pt-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive push notifications</p>
                    </div>
                    <Switch
                      checked={settings.notifications}
                      onCheckedChange={() => handleToggleSetting("notifications")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email Alerts</p>
                      <p className="text-xs text-muted-foreground">Receive email updates</p>
                    </div>
                    <Switch
                      checked={settings.emailAlerts}
                      onCheckedChange={() => handleToggleSetting("emailAlerts")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Weather Alerts</p>
                      <p className="text-xs text-muted-foreground">Get weather warnings</p>
                    </div>
                    <Switch
                      checked={settings.weatherAlerts}
                      onCheckedChange={() => handleToggleSetting("weatherAlerts")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Crop Reminders</p>
                      <p className="text-xs text-muted-foreground">Task reminders</p>
                    </div>
                    <Switch
                      checked={settings.cropReminders}
                      onCheckedChange={() => handleToggleSetting("cropReminders")}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Appearance */}
          <Card className="overflow-hidden border-0 shadow-md transition-shadow hover:shadow-lg">
            <CardContent
              className="flex items-center justify-between p-4"
              onClick={handleAppearanceClick}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${menuItems[2].color}`}>
                  {settings.darkMode ? (
                    <Moon className={`h-5 w-5 ${menuItems[2].textColor}`} />
                  ) : (
                    <Sun className={`h-5 w-5 ${menuItems[2].textColor}`} />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">Appearance</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.darkMode ? "Dark Mode" : "Light Mode"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                  {settings.darkMode ? "Dark" : "Light"}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
            {activePanel === "appearance" && (
              <div className="border-t border-border/50 bg-slate-50/70 px-4 pb-4 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                  </div>
                  <Switch
                    checked={settings.darkMode}
                    onCheckedChange={() => handleToggleSetting("darkMode")}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Privacy & Security */}
          <Card className="overflow-hidden border-0 shadow-md transition-shadow hover:shadow-lg">
            <CardContent
              className="flex items-center justify-between p-4"
              onClick={handlePrivacyClick}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${menuItems[3].color}`}>
                  <Shield className={`h-5 w-5 ${menuItems[3].textColor}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">Privacy & Security</p>
                  <p className="text-xs text-muted-foreground">Manage your privacy settings</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">Protected</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
            {activePanel === "privacy" && (
              <div className="border-t border-border/50 bg-slate-50/70 px-4 pb-4 pt-3">
                <div className="space-y-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-medium text-foreground">Data Privacy</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your data is stored securely and never shared with third parties.
                      All personal information is encrypted.
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-medium text-foreground">Account Security</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your account is protected with secure authentication.
                      Last login: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={handleViewPrivacyPolicy}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Privacy Policy
                  </Button>
                  {activeResource === "policy" && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-sm font-medium text-foreground">Privacy Policy</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        CropWise AI stores your profile, activity history, and preferences to personalize the app.
                        Uploaded profile photos are stored with your account. You can delete saved recommendations,
                        chat records, and detections from the history section at any time.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Help & Support */}
          <Card className="overflow-hidden border-0 shadow-md transition-shadow hover:shadow-lg">
            <CardContent
              className="flex items-center justify-between p-4"
              onClick={handleHelpClick}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${menuItems[4].color}`}>
                  <HelpCircle className={`h-5 w-5 ${menuItems[4].textColor}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">Help & Support</p>
                  <p className="text-xs text-muted-foreground">Get help and support</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-700">Support</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
            {activePanel === "help" && (
              <div className="border-t border-border/50 bg-slate-50/70 px-4 pb-4 pt-3">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={handleContactSupport}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={handleViewFAQ}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    FAQ Section
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={handleViewUserGuide}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    User Guide
                  </Button>
                  <div className="rounded-lg bg-slate-50 p-3 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Need help? Contact us at support@cropwise.ai or call +1 (555) 123-4567
                    </p>
                  </div>
                  {activeResource === "faq" && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-sm font-medium text-foreground">FAQ</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use Dashboard for weather and farm overview, Disease Detection to scan crops, Soil Input for crop recommendations,
                        and History to review saved results.
                      </p>
                    </div>
                  )}
                  {activeResource === "guide" && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-sm font-medium text-foreground">User Guide</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        1. Add soil data. 2. Scan plant images. 3. Review dashboard weather advice. 4. Use chat for questions.
                        5. Track records in history.
                      </p>
                    </div>
                  )}
                </div>

                {/* Support Contact Form */}
                {showHelpForm && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSendSupportMessage}
                    className="mt-4 space-y-3"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="support-subject">Subject</Label>
                      <Input
                        id="support-subject"
                        value={supportSubject}
                        onChange={(e) => setSupportSubject(e.target.value)}
                        placeholder="What do you need help with?"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support-message">Message</Label>
                      <textarea
                        id="support-message"
                        rows={4}
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Describe your issue..."
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowHelpForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.form>
                )}
              </div>
            )}
          </Card>

          {/* Logout Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </motion.div>
        </motion.div>

        {/* Version Info */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          CropWise AI v1.0 • Built with ❤️ for Farmers
        </p>
      </div>
    </div>
  );
}

const analyticsToneClasses: Record<string, string> = {
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
};

function AnalyticsTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: keyof typeof analyticsToneClasses;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${analyticsToneClasses[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function AnalyticsDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
