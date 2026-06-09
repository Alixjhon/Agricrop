import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, Crosshair, Loader2, MapPinned, Save, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useGpsLocation } from "@/hooks/useGpsLocation";
import { api } from "@/lib/api";
import { formatArea, getPolygonCenter, parsePolygonGeoJson } from "@/lib/geo";
import type { GeoJsonPolygon, Plantation } from "@/types/planting";
import FarmBoundaryMap from "./FarmBoundaryMap";

interface PlantingWorkspaceProps {
  cropName: string;
  recommendationId?: string | number | null;
  onCreated?: (plantation: Plantation) => void;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function PlantingWorkspace({ cropName, recommendationId, onCreated }: PlantingWorkspaceProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const gps = useGpsLocation();
  const [farmName, setFarmName] = useState(`${cropName} Farm`);
  const [plantingDate, setPlantingDate] = useState(todayString());
  const [polygon, setPolygon] = useState<GeoJsonPolygon | null>(null);
  const [areaSqm, setAreaSqm] = useState(0);
  const [saving, setSaving] = useState(false);
  const [prefilledFrom, setPrefilledFrom] = useState<{ cropName: string; status: string } | null>(null);
  const [polygonLocked, setPolygonLocked] = useState(false);

  // Auto-fill from the user's most recent plantation so they don't have to
  // re-draw the same farm boundary for every new crop cycle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.listPlantations();
        const list = ((response.plantations || []) as unknown as Plantation[]).filter(
          (p) => p && p.farm,
        );
        if (cancelled || !list.length) return;
        const latest = list[0];
        const farm = latest.farm;
        if (!farm) return;

        const parsedPolygon = parsePolygonGeoJson(farm.polygon_geojson);
        if (parsedPolygon) {
          setPolygon(parsedPolygon);
          const center = getPolygonCenter(parsedPolygon);
          if (center) {
            // Seed the GPS display so the "Request GPS" requirement is bypassed.
            // We derive coordinates from the polygon center if the device has
            // not yet granted a GPS fix.
            // The save function will also derive lat/lng from the polygon, so
            // this is purely cosmetic for the display.
          }
          setAreaSqm(Number(farm.area_sqm) || 0);
          setPolygonLocked(true);
        }
        if (farm.farm_name) {
          setFarmName(String(farm.farm_name));
        }
        setPrefilledFrom({
          cropName: String(latest.crop_name ?? "previous"),
          status: String(latest.status ?? ""),
        });
      } catch (error) {
        // Silent — if we cannot prefill, the user can still draw manually.
        console.warn("Could not auto-fill farm boundary:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const polygonCenter = useMemo(
    () => (polygon ? getPolygonCenter(polygon) : null),
    [polygon],
  );

  const center = useMemo(
    () => ({
      lat: polygonCenter?.lat ?? gps.location?.latitude ?? 14.5995,
      lng: polygonCenter?.lng ?? gps.location?.longitude ?? 120.9842,
    }),
    [polygonCenter, gps.location],
  );

  const requestGps = async () => {
    try {
      await gps.requestLocation();
      toast({
        title: "GPS location ready",
        description: "Satellite map centered on your current location.",
      });
    } catch {
      toast({
        title: "GPS permission needed",
        description: "Allow location access so CropWise can center the farm map.",
        variant: "destructive",
      });
    }
  };

  const handlePolygonChange = useCallback((nextPolygon: GeoJsonPolygon, nextAreaSqm: number) => {
    setPolygon(nextPolygon);
    setAreaSqm(nextAreaSqm);
    setPolygonLocked(false);
  }, []);

  const handleRedraw = useCallback(() => {
    setPolygon(null);
    setAreaSqm(0);
    setPolygonLocked(false);
    setPrefilledFrom(null);
  }, []);

  // Resolve latitude/longitude from the polygon center if the user has not
  // (or no longer needs to) request live GPS. This makes the auto-fill flow
  // possible without device permission.
  const resolvedCoords = useMemo(() => {
    if (polygonCenter) {
      return { latitude: polygonCenter.lat, longitude: polygonCenter.lng };
    }
    if (gps.location) {
      return { latitude: gps.location.latitude, longitude: gps.location.longitude };
    }
    return null;
  }, [polygonCenter, gps.location]);

  const savePlantation = async () => {
    if (!polygon || areaSqm <= 0) {
      toast({
        title: "Draw your farm boundary",
        description: "Use the polygon tool on the satellite map before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!resolvedCoords) {
      // Last-resort fallback: ask the device for GPS so the user can still
      // continue if the polygon center is somehow unavailable.
      await requestGps();
      return;
    }

    try {
      setSaving(true);
      const response = await api.createPlantation({
        farmName: farmName.trim() || `${cropName} Farm`,
        latitude: resolvedCoords.latitude,
        longitude: resolvedCoords.longitude,
        areaSqm,
        areaHectares: areaSqm / 10000,
        polygonGeojson: polygon,
        recommendationId,
        cropName,
        plantingDate,
      });

      toast({
        title: "Plantation created",
        description: "Farm boundary, calendar, and cost estimate were saved.",
      });

      const merged: Plantation = {
        ...(response.plantation as unknown as Omit<Plantation, "farm" | "costs" | "calendarEvents" | "next_activity">),
        farm: response.farm as unknown as Plantation["farm"],
        costs: response.costs as unknown as Plantation["costs"],
        calendarEvents: response.calendarEvents as unknown as Plantation["calendarEvents"],
        next_activity: (response.calendarEvents[0] ?? null) as unknown as Plantation["next_activity"],
      };

      onCreated?.(merged);

      // Notify any other open pages (e.g. the dashboard) to re-fetch plantations.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("plantation:created", { detail: merged }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      const isActivePlantationError =
        message.toLowerCase().includes("already have an active") ||
        message.toLowerCase().includes("active plantation");
      if (isActivePlantationError) {
        toast({
          title: "You already have an active plantation",
          description: `${message} Finish or harvest it before starting a new one.`,
          variant: "destructive",
          action: (
            <button
              type="button"
              onClick={() => navigate("/plantation")}
              className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              View plantation
            </button>
          ),
        });
      } else {
        toast({
          title: "Could not start planting",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl bg-card p-4 card-shadow sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="farm-name">Farm name</Label>
          <Input
            id="farm-name"
            value={farmName}
            onChange={(event) => setFarmName(event.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="planting-date">Planting date</Label>
          <div className="relative mt-1">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="planting-date"
              type="date"
              value={plantingDate}
              onChange={(event) => setPlantingDate(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card card-shadow">
        {prefilledFrom && polygonLocked && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Using your {prefilledFrom.cropName} farm boundary automatically
              {prefilledFrom.status
                ? ` (status: ${prefilledFrom.status})`
                : ""}
              . You can redraw if it changed.
            </span>
            <button
              type="button"
              onClick={handleRedraw}
              className="rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Redraw boundary
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-card-foreground">Farm Boundary</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap the polygon tool, then tap each corner of your farm on the satellite map.
              You can add as many points as you need. Finish by clicking the first point
              or double-clicking the last point. Area is calculated automatically.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={requestGps} disabled={gps.loading}>
            {gps.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
            Request GPS
          </Button>
        </div>

        <FarmBoundaryMap
          center={center}
          polygon={polygon}
          editable
          onPolygonChange={handlePolygonChange}
          className="h-[420px]"
        />

        {polygon && (
          <div className="border-t border-border bg-emerald-50/60 px-4 py-2 text-xs text-emerald-900">
            Boundary captured with {polygon.geometry.coordinates[0]?.length ?? 0} points.
            Use the edit/delete buttons on the map to adjust the shape, then save again.
          </div>
        )}

        <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-3">
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">GPS</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {gps.location
                ? `${gps.location.latitude.toFixed(5)}, ${gps.location.longitude.toFixed(5)}`
                : polygonCenter
                  ? `${polygonCenter.lat.toFixed(5)}, ${polygonCenter.lng.toFixed(5)} (from boundary)`
                  : "Not requested"}
            </p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">Boundary area</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{areaSqm ? formatArea(areaSqm) : "Draw boundary"}</p>
          </div>
          <Button onClick={savePlantation} disabled={saving} className="h-full min-h-[64px] gradient-primary">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Start Planting
          </Button>
        </div>

        {gps.error && (
          <p className="border-t border-border px-4 py-3 text-xs text-destructive">{gps.error}</p>
        )}
      </div>

      <div className="rounded-2xl bg-muted/60 p-4">
        <div className="flex items-start gap-2">
          <Sprout className="mt-0.5 h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            Saving creates the farm, plantation, weather-aware smart calendar, GeoJSON boundary, and cost estimate.
          </p>
        </div>
      </div>
    </div>
  );
}
