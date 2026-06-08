import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title?: string;
  location?: string;
  userImage?: string;
  showBack?: boolean;
  showLogout?: boolean;
}

export default function PageHeader({ title, location, userImage, showBack = true, showLogout = false }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("cropwise_chat_state");
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="rounded-lg p-1 text-foreground hover:bg-muted" title="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          {title && <h1 className="text-lg font-bold text-foreground">{title}</h1>}
          {location && <p className="text-sm text-muted-foreground flex items-center gap-1">{location}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {userImage && (
          <img
            src={userImage}
            alt="User avatar"
            className="h-8 w-8 rounded-full object-cover border border-border"
          />
        )}
        {showLogout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}
