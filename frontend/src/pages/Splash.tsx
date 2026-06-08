import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/", { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-primary">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        <img src={logo} alt="AI Crop Advisor" width={96} height={96} className="rounded-2xl" />
        <h1 className="text-3xl font-extrabold text-primary-foreground">AI Crop Advisor</h1>
        <p className="text-sm text-primary-foreground/80">Smart farming, better harvests</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12"
      >
        <div className="h-1 w-24 overflow-hidden rounded-full bg-primary-foreground/20">
          <motion.div
            className="h-full rounded-full bg-primary-foreground"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.8, delay: 0.5 }}
          />
        </div>
      </motion.div>
    </div>
  );
}
