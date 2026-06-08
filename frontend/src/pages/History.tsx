import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Sprout, AlertTriangle, MessageCircle, Calendar, Trash2, ChevronRight, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { api, type HistoryRecord } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const typeIcon = {
  recommendation: Sprout,
  disease: AlertTriangle,
  chat: MessageCircle,
};

const typeColor = {
  recommendation: "bg-primary/10 text-primary",
  disease: "bg-destructive/10 text-destructive",
  chat: "bg-accent/20 text-accent-foreground",
};

const typeLabels = {
  recommendation: "Crop Recommendation",
  disease: "Disease Detection",
  chat: "Chat Conversation",
};

interface ExtendedHistoryRecord extends HistoryRecord {
  conversationId?: string;
}

function extractRecommendationPreview(data: unknown): string {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as { crop_name?: string };
    return first.crop_name || "Crop recommendation";
  }

  if (data && typeof data === "object") {
    const recommendationData = data as { recommendations?: { crop_name?: string }[] };
    if (recommendationData.recommendations && recommendationData.recommendations.length > 0) {
      return recommendationData.recommendations[0].crop_name || "Crop recommendation";
    }
  }

  return "Crop recommendation";
}

function extractDiseasePreview(data: unknown): string {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as { plant_name?: string; disease_name?: string };
    return `${first.plant_name || 'Unknown'} - ${first.disease_name || 'Unknown'}`;
  }

  if (data && typeof data === "object") {
    const diseaseData = data as { results?: { plant_name?: string; disease_name?: string }[] };
    if (diseaseData.results && diseaseData.results.length > 0) {
      return `${diseaseData.results[0].plant_name || 'Unknown'} - ${diseaseData.results[0].disease_name || 'Unknown'}`;
    }
  }

  return "Disease detection";
}

export default function History() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [records, setRecords] = useState<ExtendedHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'recommendation' | 'disease' | 'chat'>('all');

  const loadHistory = useCallback(() => {
    setLoading(true);
    api.getHistory()
      .then((response) => setRecords(response.history || []))
      .catch((err) => {
        console.error("Failed to load history:", err);
        toast({ title: "Error", description: "Failed to load history", variant: "destructive" });
        setRecords([]);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - remove dependencies to prevent infinite loop

  const handleDelete = async (e: React.MouseEvent, record: ExtendedHistoryRecord) => {
    e.stopPropagation();

    const deleteKey = record.type === "chat" ? (record.conversationId || record.id) : record.id;

    if (!deleteKey) {
      toast({ title: "Error", description: "Cannot delete this item", variant: "destructive" });
      return;
    }

    const labelMap = { chat: "conversation", recommendation: "recommendation", disease: "disease detection" };
    if (!confirm(`Are you sure you want to delete this ${labelMap[record.type]}?`)) {
      return;
    }

    setDeleting(String(deleteKey));
    try {
      if (record.type === "chat" && record.conversationId) {
        await api.deleteConversation(record.conversationId);
      } else if (record.type === "recommendation") {
        await api.deleteRecommendation(String(record.id));
      } else if (record.type === "disease") {
        await api.deleteDiseaseDetection(String(record.id));
      }
      toast({ title: "Success", description: "Record deleted" });
      loadHistory();
    } catch (err) {
      console.error("Failed to delete record:", err);
      toast({ title: "Error", description: "Failed to delete record", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const handleClick = (record: ExtendedHistoryRecord) => {
    if (record.type === "chat" && record.conversationId) {
      navigate(`/chat?id=${record.conversationId}`);
    }
  };

  const filteredRecords = useMemo(() => {
    if (filterType === 'all') return records;
    return records.filter(record => record.type === filterType);
  }, [records, filterType]);

  const getPreview = (record: ExtendedHistoryRecord) => {
    if (record.type === "chat" && record.data) {
      const data = record.data as { title?: string; preview?: string; messageCount?: number; topic?: string };
      return data.preview || data.title || "Chat conversation";
    }
    if (record.type === "recommendation" && record.data) {
      return extractRecommendationPreview(record.data);
    }
    if (record.type === "disease" && record.data) {
      return extractDiseasePreview(record.data);
    }
    return "";
  };

  const filterButtons = [
    { type: 'all' as const, label: 'All', icon: null },
    { type: 'recommendation' as const, label: 'Crops', icon: Sprout },
    { type: 'disease' as const, label: 'Diseases', icon: AlertTriangle },
    { type: 'chat' as const, label: 'Chats', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="History" showBack={false} />

      <div className="px-4 pt-6">
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {filterButtons.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filterType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center pt-20 text-center">
            <Calendar className="mb-4 h-16 w-16 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {filterType === 'all' ? 'No saved results yet' : `No ${filterType} records found`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filterType === 'all'
                ? 'Your scans, recommendations, and chats will appear here'
                : `Your ${filterType} records will appear here`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((r, i) => {
              const Icon = typeIcon[r.type];
              const color = typeColor[r.type];
              const deleteKey = r.type === "chat" ? (r.conversationId || r.id) : r.id;
              const isDeleting = deleting === String(deleteKey);
              const isChat = r.type === "chat";

              return (
                <motion.div
                  key={`${r.id}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`flex items-center gap-3 rounded-2xl bg-card p-4 card-shadow ${
                    isChat ? "cursor-pointer hover:bg-accent/10 transition-colors" : ""
                  }`}
                  onClick={() => isChat && handleClick(r)}
                >
                  <div className={`rounded-xl p-2.5 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {typeLabels[r.type]}
                      </p>
                      {isChat && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {getPreview(r) || "No preview available"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.created_at).toLocaleDateString(undefined, { 
                        month: "short", 
                        day: "numeric", 
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {r.status || "completed"}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, r)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      title="Delete record"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
