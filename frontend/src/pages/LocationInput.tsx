import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type LocationOption } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface LocationForm {
  countryCode: string;
  country: string;
  regionCode: string;
  province: string;
  city: string;
}

const initialForm: LocationForm = {
  countryCode: "",
  country: "",
  regionCode: "",
  province: "",
  city: "",
};

export default function LocationInput() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [form, setForm] = useState<LocationForm>(initialForm);
  const [manualEntry, setManualEntry] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCountries() {
      setCountriesLoading(true);
      try {
        const result = await api.getCountries();
        if (!active) return;
        setCountries(result.countries);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Could not load countries.";
        toast({ title: "Location Error", description: errorMessage, variant: "destructive" });
        setManualEntry(true);
      } finally {
        if (active) setCountriesLoading(false);
      }
    }

    loadCountries();
    return () => {
      active = false;
    };
  }, [toast]);

  const handleCountryChange = async (countryCode: string) => {
    const country = countries.find((item) => item.value === countryCode);
    setForm({
      countryCode,
      country: country?.label || "",
      regionCode: "",
      province: "",
      city: "",
    });
    setRegions([]);
    setCities([]);
    setRegionsLoading(true);

    try {
      const result = await api.getRegions(countryCode);
      setRegions(result.regions);
      if (!result.regions.length) {
        toast({
          title: "No regions found",
          description: "You can type the region manually instead.",
        });
        setManualEntry(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not load regions.";
      toast({ title: "Location Error", description: errorMessage, variant: "destructive" });
      setManualEntry(true);
    } finally {
      setRegionsLoading(false);
    }
  };

  const handleRegionChange = async (regionCode: string) => {
    const region = regions.find((item) => item.value === regionCode);
    setForm((current) => ({
      ...current,
      regionCode,
      province: region?.label || "",
      city: "",
    }));
    setCities([]);
    setCitiesLoading(true);

    try {
      const result = await api.getCities(form.countryCode, regionCode);
      setCities(result.cities);
      if (!result.cities.length) {
        toast({
          title: "No cities found",
          description: "You can type the city manually instead.",
        });
        setManualEntry(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not load cities.";
      toast({ title: "Location Error", description: errorMessage, variant: "destructive" });
      setManualEntry(true);
    } finally {
      setCitiesLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const selectedLocation = {
        country: form.country,
        province: form.province,
        city: form.city,
      };
      const result = await api.submitLocationData(selectedLocation);
      navigate("/crop-results", {
        state: {
          recommendations: result.crop_recommendations,
          location: selectedLocation,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not get recommendations. Please try again.";
      console.error("Location submission error:", error);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(form.country && form.province && form.city) && !loading;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Farm Location" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 px-4 pt-6">
        <div className="rounded-2xl bg-primary/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            <h2 className="text-base font-semibold">Location-Based Crops</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose your farm location to find crops that match the local climate and planting season.
          </p>
        </div>

        {manualEntry ? (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Country</Label>
              <Input
                value={form.country}
                onChange={(event) => setForm((current) => ({ ...current, country: event.target.value, countryCode: "" }))}
                placeholder="Type country"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Province / State / Region</Label>
              <Input
                value={form.province}
                onChange={(event) => setForm((current) => ({ ...current, province: event.target.value, regionCode: "" }))}
                placeholder="Type province, state, or region"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">City</Label>
              <Input
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                placeholder="Type city"
                className="rounded-xl"
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Country</Label>
              <Select value={form.countryCode} onValueChange={handleCountryChange} disabled={countriesLoading}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Province / State / Region</Label>
              <Select
                value={form.regionCode}
                onValueChange={handleRegionChange}
                disabled={!form.countryCode || regionsLoading}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue
                    placeholder={
                      regionsLoading
                        ? "Loading regions..."
                        : form.countryCode
                          ? "Select province, state, or region"
                          : "Choose a country first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">City</Label>
              <Select
                value={form.city}
                onValueChange={(city) => setForm((current) => ({ ...current, city }))}
                disabled={!form.regionCode || citiesLoading}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue
                    placeholder={
                      citiesLoading
                        ? "Loading cities..."
                        : form.regionCode
                          ? "Select city"
                          : "Choose a region first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={`${city.value}-${city.label}`} value={city.label}>{city.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-xl py-6 text-base font-semibold gradient-primary text-primary-foreground"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding Crops...
            </span>
          ) : (
            "Find Crops for This Place"
          )}
        </Button>
      </motion.div>
    </div>
  );
}
