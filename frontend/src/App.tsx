import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import SoilInput from "./pages/SoilInput";
import LocationInput from "./pages/LocationInput";
import CropResults from "./pages/CropResults";
import DiseaseDetection from "./pages/DiseaseDetection";
import DiseaseResults from "./pages/DiseaseResults";
import Chat from "./pages/Chat";
import History from "./pages/History";
import Settings from "./pages/Settings";
import CropDetail from "./pages/CropDetail";
import Profile from "./pages/Profile";
import Plantation from "./pages/Plantation";
import HarvestSummaryPage from "./pages/postharvest/HarvestSummaryPage";
import YieldPage from "./pages/postharvest/YieldPage";
import ProfitPage from "./pages/postharvest/ProfitPage";
import RotationPage from "./pages/postharvest/RotationPage";
import ArchivePage from "./pages/postharvest/ArchivePage";
import FarmHistoryPage from "./pages/postharvest/FarmHistoryPage";
import NewPlantationPage from "./pages/postharvest/NewPlantationPage";
import FarmAnalyticsComparisonPage from "./pages/FarmAnalyticsComparisonPage";
import NotFound from "./pages/NotFound";
import { Navigate, useParams } from "react-router-dom";

/**
 * Redirects /plantation/:id/postharvest to the first step in the
 * guided post-harvest flow. We use Navigate with `replace` so the
 * browser back button doesn't bounce through the old URL.
 */
function PostHarvestRedirect() {
  const params = useParams<{ plantationId: string }>();
  const id = params.plantationId ?? "";
  return <Navigate to={`/plantation/${id}/postharvest/summary`} replace />;
}

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  return (user && token) ? <>{children}</> : <Auth />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <div className="w-full">
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <>
                  <Dashboard />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/home" element={
              <ProtectedRoute>
                <>
                  <Index />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/soil-input" element={
              <ProtectedRoute>
                <>
                  <SoilInput />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/location-input" element={
              <ProtectedRoute>
                <>
                  <LocationInput />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/crop-results" element={
              <ProtectedRoute>
                <>
                  <CropResults />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/disease" element={
              <ProtectedRoute>
                <>
                  <DiseaseDetection />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/disease-results" element={
              <ProtectedRoute>
                <>
                  <DiseaseResults />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <>
                  <Chat />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <>
                  <History />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <>
                  <Settings />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <>
                  <Profile />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/crop-detail" element={
              <ProtectedRoute>
                <>
                  <CropDetail />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/plantation" element={
              <ProtectedRoute>
                <>
                  <Plantation />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/plantation/:plantationId/postharvest" element={
              <ProtectedRoute>
                <PostHarvestRedirect />
              </ProtectedRoute>
            } />
            <Route path="/plantation/:plantationId/postharvest/summary" element={
              <ProtectedRoute>
                <>
                  <HarvestSummaryPage />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/plantation/:plantationId/postharvest/yield" element={
              <ProtectedRoute>
                <>
                  <YieldPage />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/plantation/:plantationId/postharvest/profit" element={
              <ProtectedRoute>
                <>
                  <ProfitPage />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/plantation/:plantationId/postharvest/rotation" element={
              <ProtectedRoute>
                <>
                  <RotationPage />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/plantation/:plantationId/postharvest/archive" element={
              <ProtectedRoute>
                <>
                  <ArchivePage />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/plantation/:plantationId/postharvest/history" element={
              <ProtectedRoute>
                <>
                  <FarmHistoryPage />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/plantation/:plantationId/postharvest/new-plantation" element={
              <ProtectedRoute>
                <>
                  <NewPlantationPage />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="/farm-analytics-comparison" element={
              <ProtectedRoute>
                <>
                  <FarmAnalyticsComparisonPage />
                  <BottomNav />
                </>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
