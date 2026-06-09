import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sprout, Calendar, Lightbulb, ChevronRight, MapPinned } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CropRecommendation } from "@/lib/api";

export default function CropResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const recommendations: CropRecommendation[] = location.state?.recommendations || [];
  const selectedLocation = location.state?.location as { country?: string; province?: string; city?: string } | undefined;
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => ({ ...prev, [index]: true }));
  };

  const handleImageError = (index: number) => {
    setFailedImages(prev => ({ ...prev, [index]: true }));
  };

  if (!recommendations.length) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Crop Recommendations" />
        <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
          <Sprout className="mb-4 h-16 w-16 text-muted-foreground" />
          <p className="text-muted-foreground">No recommendations yet.</p>
          <Button onClick={() => navigate("/soil-input")} className="mt-4 rounded-xl gradient-primary text-primary-foreground">
            Enter Soil Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Crop Recommendations" />
      <div className="space-y-4 px-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Top {recommendations.length} crops for {selectedLocation?.city ? `${selectedLocation.city}, ${selectedLocation.province}, ${selectedLocation.country}` : "your soil"}
        </p>
        {recommendations.map((crop, i) => {
          // Use image_url from backend if available, otherwise use Wikimedia default
          const imageUrl = crop.image_url || 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Plant_cell_wall.svg/320px-Plant_cell_wall.svg.png';
          const imageAlt = crop.image_alt || crop.crop_name;
          const isLoaded = loadedImages[i];
          const isFailed = failedImages[i];

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              onClick={() => navigate("/crop-detail", {
                state: {
                  cropName: crop.crop_name,
                  reason: crop.reason,
                  plantingMonth: crop.planting_month,
                  careTips: crop.care_tips,
                  imageUrl: imageUrl,
                  imageAlt: imageAlt
                }
              })}
              className="cursor-pointer rounded-2xl bg-card p-0 card-shadow transition-all hover:shadow-lg hover:border-primary/30 overflow-hidden"
            >
              <div className="flex">
                {/* Image Section */}
                <div className="relative w-28 h-28 shrink-0 overflow-hidden bg-muted">
                  {!isFailed ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={imageAlt}
                        className={cn(
                          "h-full w-full object-cover transition-all duration-300",
                          !isLoaded && "blur-sm scale-105"
                        )}
                        onLoad={() => handleImageLoad(i)}
                        onError={() => handleImageError(i)}
                        loading="lazy"
                      />
                      {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10">
                      <Sprout className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/20 to-transparent" />
                </div>

                {/* Content Section */}
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-card-foreground">{crop.crop_name}</h3>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{crop.reason}</p>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-medium text-foreground">{crop.planting_month}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md bg-accent/20 px-2 py-1">
                      <Lightbulb className="h-3 w-3 text-accent-foreground" />
                      <span className="text-[10px] font-medium text-foreground line-clamp-1 max-w-[100px]">{crop.care_tips}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom hint + Start Planting shortcut */}
              <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-2">
                <p className="flex-1 text-[10px] text-muted-foreground">
                  Tap for detailed farming guide and nearby stores
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate("/crop-detail", {
                      state: {
                        cropName: crop.crop_name,
                        reason: crop.reason,
                        plantingMonth: crop.planting_month,
                        careTips: crop.care_tips,
                        imageUrl,
                        imageAlt,
                        openPlanting: true,
                      },
                    });
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <MapPinned className="h-3 w-3" />
                  Start planting
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
