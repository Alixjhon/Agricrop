import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Plus, Copy, Trash2, Sparkles, Leaf, Sprout, CloudSun, RotateCcw, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import "./Chat.css";

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  id: string;
}

interface StoredMessage {
  role: "user" | "ai";
  content: string;
  timestamp: string;
  id: string;
}

const STORAGE_KEY = "cropwise_chat_state";

const quickSuggestions = [
  { icon: Leaf, text: "Best crops for rainy season?", color: "text-primary" },
  { icon: Sprout, text: "How to improve soil quality?", color: "text-success" },
  { icon: CloudSun, text: "Ideal temperature for rice?", color: "text-warning" },
  { icon: Sparkles, text: "Natural pest control methods?", color: "text-accent" },
];

export default function Chat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    () => new URLSearchParams(window.location.search).get("id") || undefined
  );
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved chat state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.messages && Array.isArray(parsed.messages)) {
          // Restore messages with Date objects
          const restoredMessages: Message[] = parsed.messages.map((msg: StoredMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(restoredMessages);
          setShowSuggestions(false);
        }
        if (parsed.conversationId) {
          setConversationId(parsed.conversationId);
        }
      } catch (err) {
        console.error("Failed to restore chat state:", err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Load chat history when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadChatHistory(conversationId);
    }
  }, [conversationId]);

  // Save chat state to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const stateToSave = {
        messages,
        conversationId,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [messages, conversationId]);

  // Hide suggestions when there are messages
  useEffect(() => {
    setShowSuggestions(messages.length === 0);
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const loadChatHistory = async (convId: string) => {
    try {
      const data = await api.getChatHistory(convId);
      if (data.success && data.messages.length > 0) {
        const loadedMessages: Message[] = data.messages.map((msg) => ({
          role: msg.role === "assistant" ? "ai" : "user",
          content: msg.content,
          timestamp: new Date(),
          id: `${msg.role}-${Date.now()}-${Math.random()}`,
        }));
        setMessages(loadedMessages);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: Message = {
      role: "user",
      content: question,
      timestamp: new Date(),
      id: `user-${Date.now()}`,
    };

    setMessages((m) => [...m, userMessage]);
    setLoading(true);
    try {
      const res = await api.sendMessage(question, conversationId);
      setConversationId(res.conversationId);

      const aiMessage: Message = {
        role: "ai",
        content: res.reply,
        timestamp: new Date(),
        id: `ai-${Date.now()}`,
      };

      setMessages((m) => [...m, aiMessage]);

      // Update URL with conversation ID
      const url = new URL(window.location.href);
      url.searchParams.set("id", res.conversationId);
      window.history.replaceState({}, "", url.toString());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Could not get a response.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, toast]);

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    setInput("");
    setShowSuggestions(true);
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    // Clear URL params
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState({}, "", url.toString());
    toast({ title: "New conversation", description: "Started a new chat session" });
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied!", description: "Message copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
    }
  };

  const handleDeleteMessage = (id: string) => {
    setMessages((m) => m.filter((msg) => msg.id !== id));
    toast({ title: "Message deleted" });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="rounded-lg p-1 text-foreground hover:bg-muted" title="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Farming Chat</h1>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-primary hover:bg-primary/10 transition-colors"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-32 pt-4">
        <AnimatePresence mode="wait">
          {showSuggestions && messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">AI Farming Assistant</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Ask me anything about crops, soil, pests, weather, or planting schedules. I'm here to help!
              </p>

              <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                {quickSuggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:shadow-md",
                      "hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    <suggestion.icon className={cn("h-5 w-5 shrink-0", suggestion.color)} />
                    <span className="text-sm text-foreground">{suggestion.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      msg.role === "ai" ? "bg-primary/10" : "bg-accent/20"
                    )}
                  >
                    {msg.role === "ai" ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-accent-foreground" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "group relative max-w-[80%] rounded-2xl px-4 py-3",
                      msg.role === "ai" ? "bg-card card-shadow" : "gradient-primary text-primary-foreground"
                    )}
                  >
                    <div className={cn("prose prose-sm max-w-none text-sm", msg.role === "ai" ? "" : "prose-invert")}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    <div
                      className={cn(
                        "mt-2 flex items-center gap-2 text-[10px] opacity-0 transition-opacity group-hover:opacity-100",
                        msg.role === "ai" ? "text-muted-foreground" : "text-primary-foreground/70"
                      )}
                    >
                      <span>{formatTime(msg.timestamp)}</span>
                      {msg.role === "ai" && (
                        <>
                          <button
                            onClick={() => handleCopy(msg.content)}
                            className="rounded p-0.5 hover:bg-muted"
                            title="Copy message"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className={cn(
                          "rounded p-0.5 hover:bg-destructive/20",
                          msg.role === "ai" ? "hover:text-destructive" : "hover:text-red-200"
                        )}
                        title="Delete message"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl bg-card px-4 py-3 card-shadow">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 bounce-delay-0" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 bounce-delay-150" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 bounce-delay-300" />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a farming question..."
              rows={1}
              disabled={loading}
              className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            {input.trim() && (
              <button
                onClick={() => setInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Clear input"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            title="Send message"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary text-primary-foreground transition-all",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              input.trim() && !loading && "hover:shadow-lg hover:scale-105 active:scale-95"
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}