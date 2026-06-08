import { Home, Leaf, MessageCircle, Clock, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Leaf, label: "Scan", path: "/disease" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: User, label: "Profile", path: "/settings" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/splash") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="flex w-full items-center justify-around px-4 py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
