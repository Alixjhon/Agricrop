import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Shield,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Info,
  ClipboardList,
  Bug,
  Stethoscope,
  Leaf,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import type { DiseaseResult } from "@/lib/api";

interface UploadedImagePreview {
  id: string;
  preview: string;
  originalPreview: string;
  enhanced: boolean;
  name: string;
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function isHealthy(diseaseName: string) {
  return diseaseName.toLowerCase().includes("healthy");
}

function getConfidenceColor(confidence: string) {
  const conf = confidence.toLowerCase();
  if (conf === "high" || conf === "healthy") {
    return { bg: "bg-emerald-500/15", text: "text-emerald-700", border: "border-emerald-500/30" };
  }
  if (conf === "medium") {
    return { bg: "bg-amber-500/15", text: "text-amber-700", border: "border-amber-500/30" };
  }
  if (conf === "low") {
    return { bg: "bg-rose-500/15", text: "text-rose-700", border: "border-rose-500/30" };
  }
  return { bg: "bg-slate-500/15", text: "text-slate-700", border: "border-slate-500/30" };
}

function getSeverityColor(severity?: string) {
  if (!severity) return null;
  const sev = severity.toLowerCase();
  if (sev === "mild") return { bg: "bg-emerald-500/15", text: "text-emerald-700" };
  if (sev === "moderate") return { bg: "bg-amber-500/15", text: "text-amber-700" };
  if (sev === "severe") return { bg: "bg-rose-500/15", text: "text-rose-700" };
  return { bg: "bg-slate-500/15", text: "text-slate-700" };
}

export default function DiseaseResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const results: DiseaseResult[] = location.state?.results || [];
  const wasEnhanced: boolean = location.state?.enhanced || false;
  const imagesAnalyzed: number = location.state?.imagesAnalyzed || 1;
  const uploadedImages: UploadedImagePreview[] = location.state?.uploadedImages || [];

  if (!results.length) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Disease Results" />
        <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
          <Shield className="mb-4 h-16 w-16 text-muted-foreground" />
          <p className="text-muted-foreground">No scan results yet.</p>
          <Button onClick={() => navigate("/disease")} className="mt-4 rounded-xl gradient-primary text-primary-foreground">
            Scan a Plant
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_42%),linear-gradient(180deg,_rgba(248,250,252,1)_0%,_rgba(241,245,249,0.7)_100%)] pb-24">
      <PageHeader title="Analysis Results" />
      <div className="space-y-5 px-4 pt-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[28px] border border-emerald-200/60 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="bg-[linear-gradient(135deg,_rgba(22,163,74,0.12),_rgba(251,191,36,0.12))] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700/80">Plant Health Report</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Detailed disease review</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {imagesAnalyzed} image{imagesAnalyzed > 1 ? "s" : ""} analyzed with AI guidance for likely cause and treatment.
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 px-4 py-3 text-right shadow-sm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Result Count</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{results.length}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {results.map((result, index) => (
                <span
                  key={`${result.plant_name}-${index}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                    isHealthy(result.disease_name) ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/12 text-rose-700"
                  )}
                >
                  {isHealthy(result.disease_name) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {result.plant_name}
                </span>
              ))}
            </div>
          </div>
        </motion.section>

        {wasEnhanced && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-2xl border border-emerald-300/50 bg-emerald-50/80 px-4 py-3"
          >
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <span className="text-sm font-medium text-emerald-800">Enhanced images were used to improve detection clarity.</span>
          </motion.div>
        )}

        {results.map((result, index) => {
          const confidenceColors = getConfidenceColor(result.confidence);
          const severityColors = getSeverityColor(result.severity);
          const healthy = isHealthy(result.disease_name);
          const image = uploadedImages[index] || uploadedImages[0];
          const treatmentSteps =
            result.treatment_steps && result.treatment_steps.length > 0
              ? result.treatment_steps
              : result.treatment
                  .split(/(?<=[.])\s+/)
                  .map((step) => step.trim())
                  .filter(Boolean)
                  .slice(0, 5);

          return (
            <motion.section
              key={`${result.plant_name}-${result.disease_name}-${index}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
              className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
            >
              <div className="grid gap-0 md:grid-cols-[1.05fr_1.2fr]">
                <div className="relative min-h-[260px] bg-slate-100">
                  {image ? (
                    <>
                      <img
                        src={image.preview}
                        alt={image.name || `${result.plant_name} upload`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-900">
                            Image {Math.min(index + 1, uploadedImages.length || 1)}
                          </span>
                          {image.enhanced && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/85 px-3 py-1 text-[11px] font-semibold text-white">
                              <Sparkles className="h-3 w-3" />
                              Enhanced
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm font-medium text-white/90">{image.name}</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Leaf className="h-12 w-12" />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Diagnosis</p>
                      <h3 className="mt-2 text-2xl font-bold text-slate-900">{result.plant_name}</h3>
                      <p className={cn("mt-1 text-base font-semibold", healthy ? "text-emerald-700" : "text-rose-700")}>
                        {result.disease_name}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", confidenceColors.bg, confidenceColors.text, confidenceColors.border)}>
                        Confidence: {result.confidence}
                      </span>
                      {severityColors && (
                        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", severityColors.bg, severityColors.text)}>
                          Severity: {result.severity}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-emerald-700" />
                        <p className="text-sm font-semibold text-slate-900">Treatment Overview</p>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{result.treatment}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-sky-700" />
                        <p className="text-sm font-semibold text-slate-900">Prevention</p>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {result.prevention || "Keep the crop clean, monitor plant stress early, and maintain balanced irrigation and nutrition."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4">
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-amber-700" />
                      <p className="text-sm font-semibold text-slate-900">Likely Causes</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(result.causes && result.causes.length > 0
                        ? result.causes
                        : ["Visible symptoms may come from infection, pest pressure, environmental stress, or nutrient imbalance."]).map((cause) => (
                        <div key={cause} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-600" />
                          <p className="text-sm text-slate-700">{cause}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-emerald-700" />
                      <p className="text-sm font-semibold text-slate-900">Treatment Step By Step</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {treatmentSteps.map((step, stepIndex) => (
                        <div key={`${step}-${stepIndex}`} className="flex items-start gap-3 rounded-2xl bg-white/85 p-3 shadow-sm">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                            {stepIndex + 1}
                          </div>
                          <p className="text-sm leading-relaxed text-slate-700">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.additional_info && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-slate-600" />
                        <p className="text-sm font-semibold text-slate-900">Additional Notes</p>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{result.additional_info}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: results.length * 0.08 + 0.2 }}
          className="flex gap-3 pt-2"
        >
          <Button onClick={() => navigate("/disease")} variant="outline" className="flex-1 rounded-2xl border-slate-300 bg-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Scan
          </Button>
          <Button onClick={() => navigate("/history")} variant="outline" className="flex-1 rounded-2xl border-slate-300 bg-white">
            <Clock className="mr-2 h-4 w-4" />
            History
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: results.length * 0.08 + 0.25 }}
          className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center"
        >
          <p className="text-xs leading-relaxed text-slate-500">
            <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
            This AI analysis is a decision-support tool. Confirm serious disease outbreaks with a local plant expert before applying major treatment changes.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
