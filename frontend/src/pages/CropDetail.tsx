import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sprout,
  MapPin,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Navigation,
  Phone,
  Clock3,
  Star,
  Leaf,
  Thermometer,
  Shovel,
  CheckCircle2,
  Info,
  MapPinned
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, type FarmingGuide } from "@/lib/api";
import {
  getCurrentLocation,
  searchNearbyStores,
  getStoresForCrop,
  getDirectionsUrl,
  formatDistance,
  getStoreTypeLabel,
  getStoreTypeIcon,
  type Store,
  type UserLocation
} from "@/lib/storeLocator";
import PlantingWorkspace from "@/components/planting/PlantingWorkspace";
import type { Plantation } from "@/types/planting";
import "./CropDetail.css";

interface CropDetailLocationState {
  cropName: string;
  reason?: string;
  plantingMonth?: string;
  careTips?: string;
  imageUrl?: string;
  imageAlt?: string;
  openPlanting?: boolean;
  recommendationId?: string;
}

export default function CropDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const cropData = location.state as CropDetailLocationState;

  const [guide, setGuide] = useState<FarmingGuide | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [loadingStores, setLoadingStores] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<"guide" | "stores" | "planting">("guide");
  const [plantation, setPlantation] = useState<Plantation | null>(null);
  const [startingPlanting, setStartingPlanting] = useState(false);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = new URLSearchParams(window.location.search);
    const tab = search.get("tab");
    if (tab === "planting") setActiveTab("planting");
    const recId = search.get("recommendationId");
    if (recId) setRecommendationId(recId);
  }, []);

  useEffect(() => {
    if (cropData?.openPlanting) {
      setActiveTab("planting");
    }
    if (cropData?.recommendationId) {
      setRecommendationId(cropData.recommendationId);
    }
  }, [cropData?.openPlanting, cropData?.recommendationId]);

  useEffect(() => {
    if (!cropData?.cropName) {
      setLoading(false);
      setGuideError("Missing crop information.");
      return;
    }

    void loadGuide(cropData);
    void loadNearbyStores(cropData.cropName);
  }, [cropData?.cropName, cropData?.reason, cropData?.plantingMonth, cropData?.careTips]);

  const loadGuide = async (detail: CropDetailLocationState) => {
    try {
      setLoading(true);
      setGuideError(null);
      const response = await api.getCropGuide({
        cropName: detail.cropName,
        reason: detail.reason,
        plantingMonth: detail.plantingMonth,
        careTips: detail.careTips,
      });
      setGuide(response.guide);
    } catch (error) {
      console.error("Failed to load AI farming guide:", error);
      setGuide(null);
      setGuideError("We couldn't generate an AI farming guide right now.");
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyStores = async (cropName: string) => {
    try {
      const loc = await getCurrentLocation();
      setUserLocation(loc);

      if (loc) {
        const allStores = await searchNearbyStores(loc, 15);
        const filteredStores = getStoresForCrop(cropName, allStores);
        setStores(filteredStores);
      }
    } catch (error) {
      console.error("Failed to load stores:", error);
    } finally {
      setLoadingStores(false);
    }
  };

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }));
  };

  const expandAllSteps = () => {
    if (guide) {
      const allExpanded: Record<number, boolean> = {};
      guide.steps.forEach((step) => {
        allExpanded[step.step] = true;
      });
      setExpandedSteps(allExpanded);
    }
  };

  const collapseAllSteps = () => {
    setExpandedSteps({});
  };

  const allExpanded = guide && guide.steps.every((step) => expandedSteps[step.step]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Loading..." />
        <div className="flex items-center justify-center pt-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Crop Details" />
        <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
          <Info className="mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">No Guide Available</h2>
          <p className="mt-2 text-muted-foreground">
            {guideError || "Sorry, we couldn't generate detailed farming instructions for this crop right now."}
          </p>
          <Button onClick={() => navigate(-1)} className="mt-6 gradient-primary">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-1 text-foreground hover:bg-muted"
          title="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{guide.cropName}</h1>
          <p className="text-xs text-muted-foreground">Farming Guide</p>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={cropData?.imageUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Plant_cell_wall.svg/640px-Plant_cell_wall.svg.png'}
          alt={cropData?.imageAlt || cropData?.cropName || "Crop"}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-2xl font-bold text-foreground drop-shadow-lg">{guide.cropName}</h1>
          <p className="text-sm text-foreground/80 drop-shadow">Complete Farming Guide</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Tab Navigation */}
        <div className="mb-4 flex rounded-xl bg-muted p-1">
          <button
            onClick={() => setActiveTab("guide")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
              activeTab === "guide"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <Leaf className="h-4 w-4" />
              Farming Guide
            </span>
          </button>
          <button
            onClick={() => setActiveTab("stores")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
              activeTab === "stores"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4" />
              Nearby Stores
              {stores.length > 0 && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                  {stores.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("planting")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
              activeTab === "planting"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <MapPinned className="h-4 w-4" />
              Plant
            </span>
          </button>
        </div>

        {activeTab === "guide" ? (
          <div className="space-y-4">
            {/* Start Planting Call-to-Action */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-5 text-white shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white/20 p-2">
                  <MapPinned className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold">Ready to grow {guide.cropName}?</h2>
                  <p className="mt-1 text-sm text-white/85">
                    Map your farm on a satellite layer, request GPS, draw the boundary, and we will
                    generate a weather-aware calendar and cost estimate for you.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setActiveTab("planting")}
                className="mt-4 w-full rounded-xl bg-white text-emerald-700 hover:bg-white/90"
                size="lg"
              >
                <MapPinned className="mr-2 h-5 w-5" />
                Start planting — Request GPS location
              </Button>
            </motion.div>

            {/* Overview Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card p-5 card-shadow"
            >
              <h2 className="text-base font-bold text-card-foreground">Overview</h2>
              <p className="mt-2 text-sm text-muted-foreground">{guide.overview}</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Harvest Time
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {guide.harvestTime}
                  </p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Expected Yield
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {guide.expectedYield}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Climate Requirements */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl bg-card p-5 card-shadow"
            >
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-card-foreground">Climate Requirements</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{guide.climate}</p>
            </motion.div>

            {/* Soil Preparation */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-card p-5 card-shadow"
            >
              <div className="flex items-center gap-2">
                <Shovel className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-card-foreground">Soil Preparation</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{guide.soilPreparation}</p>
            </motion.div>

            {/* Step by Step Guide */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl bg-card p-5 card-shadow"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-card-foreground">
                  Step-by-Step Guide
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={allExpanded ? collapseAllSteps : expandAllSteps}
                    className="text-xs text-primary hover:underline"
                    title={allExpanded ? "Collapse all steps" : "Expand all steps"}
                  >
                    {allExpanded ? "Collapse All" : "Expand All"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {guide.steps.map((step, index) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.02 * index }}
                    className="rounded-xl border border-border bg-muted/50 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleStep(step.step)}
                      className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-foreground">
                          {step.title}
                        </h3>
                        {step.duration && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            <Clock3 className="inline h-3 w-3 mr-1" />
                            {step.duration}
                          </p>
                        )}
                      </div>
                      {expandedSteps[step.step] ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {expandedSteps[step.step] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 pl-14"
                      >
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-card p-5 card-shadow"
            >
              <div className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-card-foreground">Pro Tips</h2>
              </div>
              <ul className="mt-3 space-y-2">
                {guide.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        ) : activeTab === "stores" ? (
          <div className="space-y-4">
            {/* Location Info */}
            {userLocation && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-4 card-shadow"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Showing stores near your location</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Coordinates: {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}
                </p>
              </motion.div>
            )}

            {/* Stores List */}
            {loadingStores ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : stores.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-8 text-center card-shadow"
              >
                <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-bold text-foreground">No Stores Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We couldn't find any agricultural stores near your location.
                  Try adjusting your search radius or check back later.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {stores.map((store, index) => (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="rounded-2xl bg-card p-4 card-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {getStoreTypeIcon(store.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-bold text-card-foreground">
                              {store.name}
                            </h3>
                            <span className="inline-block mt-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {getStoreTypeLabel(store.type)}
                            </span>
                          </div>
                          {store.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{store.rating}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{store.address}</span>
                          </div>
                          {store.distance !== undefined && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Navigation className="h-3.5 w-3.5 shrink-0" />
                              <span>{formatDistance(store.distance)} away</span>
                            </div>
                          )}
                          {store.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span>{store.phone}</span>
                            </div>
                          )}
                          {store.openingHours && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>{store.openingHours}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (userLocation) {
                                const url = getDirectionsUrl(userLocation, store);
                                window.open(url, "_blank");
                              }
                            }}
                            className="flex-1"
                          >
                            <Navigation className="mr-1.5 h-3.5 w-3.5" />
                            Get Directions
                          </Button>
                          {store.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={`tel:${store.phone}`} className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                Call
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-muted/50 p-4"
            >
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Store information is sourced from OpenStreetMap and may not always be up to date.
                  Please call ahead to confirm store hours and product availability.
                  If you don't see any stores, try enabling location services or check back later.
                </p>
              </div>
            </motion.div>
          </div>
        ) : activeTab === "planting" ? (
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card p-4 card-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <MapPinned className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-card-foreground">
                    Plant {guide.cropName} on your farm
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Request GPS to center the satellite map on your farm, draw the boundary, and
                    we will save the GeoJSON plus a weather-aware smart calendar.
                  </p>
                </div>
              </div>
            </motion.div>

            {plantation ? (
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900"
                >
                  <p className="font-semibold">Plantation created for {plantation.crop_name}.</p>
                  <p className="mt-1 text-xs">
                    Farm area: {plantation.farm?.area_hectares ?? "-"} ha. View the dashboard for the
                    full smart calendar and cost summary.
                  </p>
                </motion.div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => navigate("/plantation")}
                  >
                    Go to my plantation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPlantation(null);
                    }}
                  >
                    Start another
                  </Button>
                </div>
              </div>
            ) : (
              <PlantingWorkspace
                cropName={guide.cropName}
                recommendationId={recommendationId}
                onCreated={(created) => setPlantation(created)}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
