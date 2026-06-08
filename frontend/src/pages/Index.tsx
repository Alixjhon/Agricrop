import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Camera, MessageCircle, Clock, MapPin } from "lucide-react";
import heroImg from "@/assets/hero-farm.jpg";
import logo from "@/assets/logo.png";

const cards = [
  { icon: Leaf, label: "Enter Soil Data", desc: "Get crop recommendations", path: "/soil-input", color: "bg-primary" },
  { icon: MapPin, label: "Pick Location", desc: "Crops for your place", path: "/location-input", color: "bg-secondary" },
  { icon: Camera, label: "Upload Image", desc: "Detect plant diseases", path: "/disease", color: "bg-accent" },
  { icon: MessageCircle, label: "Ask AI", desc: "Farming advice chatbot", path: "/chat", color: "bg-primary" },
  { icon: Clock, label: "View History", desc: "Saved results & scans", path: "/history", color: "bg-muted" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <img src={heroImg} alt="Farm field" width={1024} height={576} className="h-48 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="absolute bottom-4 left-4 flex items-center gap-3">
          <img src={logo} alt="Logo" width={40} height={40} className="rounded-xl" />
          <div>
            <h1 className="text-xl font-extrabold text-foreground">AI Crop Advisor</h1>
            <p className="text-xs text-muted-foreground">Smart farming assistant</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 pt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {cards.map(({ icon: Icon, label, desc, path, color }, i) => (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-start gap-3 rounded-2xl bg-card p-4 text-left card-shadow transition-shadow hover:elevated-shadow"
            >
              <div className={`rounded-xl ${color} p-2.5`}>
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="px-4 pt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Today's Tip
        </h2>
        <div className="rounded-2xl bg-primary/10 p-4">
          <p className="text-sm font-medium text-primary">🌱 Test your soil pH before planting season</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Optimal pH ranges help nutrients absorb better. Most crops prefer 6.0–7.0 pH.
          </p>
        </div>
      </div>
    </div>
  );
}
