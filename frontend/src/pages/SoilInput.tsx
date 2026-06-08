import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const soilTypes = ["Clay", "Sandy", "Loamy", "Silt", "Peat", "Chalky"];

export default function SoilInput() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ph: 6.5,
    moisture: 50,
    temperature: 25,
    sunlight_hours: 6,
    soil_type: "Loamy",
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await api.submitSoilData(form);
      navigate("/crop-results", { state: { recommendations: result.crop_recommendations } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not get recommendations. Please try again.";
      console.error("Soil submission error:", error);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Soil Data" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 px-4 pt-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Soil pH</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="14"
            value={form.ph}
            onChange={(e) => setForm({ ...form, ph: parseFloat(e.target.value) || 0 })}
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">Range: 0-14 (neutral = 7)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Moisture (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={form.moisture}
            onChange={(e) => setForm({ ...form, moisture: parseFloat(e.target.value) || 0 })}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Temperature (C)</Label>
          <Input
            type="number"
            value={form.temperature}
            onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) || 0 })}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Sunlight Hours per Day</Label>
          <Select value={form.sunlight_hours.toString()} onValueChange={(v) => setForm({ ...form, sunlight_hours: parseInt(v) })}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <SelectItem key={h} value={h.toString()}>{h} hours</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Average daily sunlight exposure</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Soil Type</Label>
          <Select value={form.soil_type} onValueChange={(v) => setForm({ ...form, soil_type: v })}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {soilTypes.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl py-6 text-base font-semibold gradient-primary text-primary-foreground"
        >
          {loading ? "Analyzing..." : "Get Recommendations"}
        </Button>
      </motion.div>
    </div>
  );
}
