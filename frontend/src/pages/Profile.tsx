import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  Edit3,
  Sprout,
  Award,
  Calendar,
  PencilLine,
  Loader2,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";

export default function Profile() {
  const { toast } = useToast();

  type ProfileUser = {
    name?: string;
    email?: string;
    image?: string;
    image_url?: string;
    phone?: string;
    location?: string;
  };

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved
      ? JSON.parse(saved)
      : {
          name: "Farmer User",
          email: "farmer@example.com",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
          phone: "+1 234 567 890",
          location: "California, USA",
        };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    location: user.location || "",
    image: user.image || "",
  });

  const [stats, setStats] = useState({
    cropsAnalyzed: 0,
    daysActive: 0,
    aiConversations: 0,
  });

  const profileCompletion = useMemo(() => {
    const completedFields = [
      user.name,
      user.email,
      user.phone,
      user.location,
      user.image || user.image_url,
    ].filter((value) => String(value || "").trim().length > 0).length;

    return Math.round((completedFields / 5) * 100);
  }, [user]);

  const normalizeUser = useCallback((incomingUser: ProfileUser) => ({
    ...incomingUser,
    image: incomingUser.image || incomingUser.image_url || user.image,
  }), [user.image]);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [profileResult, statsResult, historyResult] = await Promise.allSettled([
          token ? api.getProfile(token) : Promise.resolve(null),
          api.getStats(),
          api.getHistory(),
        ]);

        if (profileResult.status === "fulfilled" && profileResult.value?.user) {
          const nextUser = normalizeUser(profileResult.value.user);
          setUser(nextUser);
          setEditForm({
            name: nextUser.name || "",
            email: nextUser.email || "",
            phone: nextUser.phone || "",
            location: nextUser.location || "",
            image: nextUser.image || "",
          });
          localStorage.setItem("user", JSON.stringify(nextUser));
        }

        if (statsResult.status === "fulfilled") {
          let daysActive = 0;

          if (historyResult.status === "fulfilled" && historyResult.value.history.length > 0) {
            const timestamps = historyResult.value.history.map((item) =>
              new Date(item.created_at).getTime(),
            );
            const oldest = Math.min(...timestamps);
            daysActive = Math.max(
              1,
              Math.ceil((Date.now() - oldest) / (1000 * 60 * 60 * 24)),
            );
          }

          setStats({
            cropsAnalyzed: statsResult.value.cropsAnalyzed,
            aiConversations: statsResult.value.aiConversations,
            daysActive,
          });
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfileData();
  }, [normalizeUser]);

  // Handler functions for each button
  const handleEditProfile = () => {
    setIsEditing(true);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      location: user.location || "",
      image: user.image || "",
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;
        
        // Update local state immediately for preview
        setEditForm({ ...editForm, image: base64Image });
        
        // Update user state and localStorage immediately
        const updatedUser = { ...user, image: base64Image };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Automatically save to database
        try {
          const token = localStorage.getItem("token");
          const data = await api.updateProfile(
            { image_url: base64Image },
            token,
          );

          if (data?.user) {
            const dbUpdatedUser = data?.user 
              ? { ...user, ...data.user, image: base64Image }
              : { ...user, image: base64Image };
            setUser(dbUpdatedUser);
            localStorage.setItem("user", JSON.stringify(dbUpdatedUser));
            
            toast({
              title: "Profile image updated",
              description: "Your profile image has been saved.",
            });
          } else {
            throw new Error("Failed to save image to database");
          }
        } catch (error: unknown) {
          console.error("Error saving image:", error);
          toast({
            title: "Image saved locally",
            description: "Profile image saved. Database sync may require login.",
          });
        }
      };
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read the image file.",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingProfile(true);
      const token = localStorage.getItem("token");
      const data = await api.updateProfile(
        {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          location: editForm.location,
          image_url: editForm.image,
        },
        token,
      );

      const updatedUser = data?.user
        ? { ...user, ...data.user, image: data.user.image || data.user.image_url || editForm.image }
        : { ...user, ...editForm };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved to the database.",
      });
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile. Please try again.";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      location: user.location || "",
      image: user.image || "",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-100 pb-24">
      <PageHeader
        title="My Profile"
        showBack={true}
        showLogout={false}
      />

      <div className="px-4 pt-4">
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 pb-6 pt-8">
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -right-6 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                  CropWise Farmer Profile
                </div>
                <div className="relative">
                  <img
                    src={editForm.image || user.image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"}
                    alt="Profile"
                    className="h-28 w-28 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                  <input
                    type="file"
                    id="profile-image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    title="Upload profile image"
                    aria-label="Upload profile image"
                  />
                  <button
                    onClick={() => document.getElementById('profile-image-upload')?.click()}
                    className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-md transition-colors hover:bg-slate-50"
                    title="Change profile photo"
                    aria-label="Change profile photo"
                  >
                    <Camera className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600">Upload</span>
                  </button>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-white">{user.name || "Farmer User"}</h2>
                <p className="mt-1 text-sm text-white/85">{user.email || "farmer@example.com"}</p>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
                  <MapPin className="h-3 w-3" />
                  <span>{user.location || "California, USA"}</span>
                </div>
                <p className="mt-3 text-xs text-white/75">
                  Keep your profile information current so recommendations and account details stay accurate.
                </p>
                {!isEditing && (
                  <Button
                    onClick={handleEditProfile}
                    variant="secondary"
                    size="sm"
                    className="mt-4 rounded-full border-0 bg-white text-emerald-700 hover:bg-white/90"
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit My Details
                  </Button>
                )}
                <div className="mt-4 w-full max-w-xs rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between text-xs text-white/90">
                    <span>Profile completion</span>
                    <span>{profileCompletion}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                  <Mail className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{user.email || "Not set"}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                  <Phone className="h-4 w-4 text-cyan-600" />
                  <span>{user.phone || "Not set"}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Location</p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  <span>{user.location || "Not set"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mb-4"
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-3 text-center">
              <div className="flex justify-center mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Sprout className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.cropsAnalyzed}</p>
              <p className="text-xs text-muted-foreground">Crops Analyzed</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-3 text-center">
              <div className="flex justify-center mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.daysActive}</p>
              <p className="text-xs text-muted-foreground">Days Active</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-3 text-center">
              <div className="flex justify-center mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                  <Award className="h-5 w-5 text-violet-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.aiConversations}</p>
              <p className="text-xs text-muted-foreground">AI Chats</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Card className="border-0 shadow-md">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-semibold">Account Status</p>
                </div>
                <p className="mt-2 text-sm text-emerald-900">
                  Your profile is active and ready for crop recommendations, disease scans, and AI chat history.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
                <p className="text-sm font-semibold text-cyan-800">Profile Tip</p>
                <p className="mt-2 text-sm text-cyan-900">
                  Add a phone number and precise location to make your farm account more complete and easier to manage.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {!isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4"
          >
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                {loadingProfile && (
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading latest profile data...
                  </div>
                )}

                {!loadingProfile && profileCompletion < 100 && (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                    <p className="font-medium">Complete your profile</p>
                    <p className="mt-1 text-xs text-amber-800">
                      Add missing details like phone number, location, or profile photo to make your account easier to use.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">Edit Profile</p>
                    <p className="text-xs text-muted-foreground">Update your name, email, phone, and location</p>
                  </div>
                  <Button onClick={handleEditProfile} variant="outline" size="sm" className="rounded-full">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Edit Profile Form */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  <span className="font-semibold">Edit Information</span>
                </CardDescription>
                <p className="text-sm text-muted-foreground">
                  Update your details below. Your profile photo can still be changed from the upload button above.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
                  Tip: name and email are required. Add phone and location to make your profile more complete.
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Current Email</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{user.email || "Not set"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Current Location</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{user.location || "Not set"}</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Enter your name"
                    />
                    <p className="text-xs text-muted-foreground">Use the name you want shown on your account.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email Address</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Enter your email"
                    />
                    <p className="text-xs text-muted-foreground">We use this for account access and updates.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone Number</Label>
                    <Input
                      id="edit-phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Enter your phone number"
                    />
                    <p className="text-xs text-muted-foreground">Optional, but helpful for contact details.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="Enter your location"
                    />
                    <p className="text-xs text-muted-foreground">City or farm area helps personalize recommendations.</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {savingProfile ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={savingProfile}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Version Info */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          CropWise AI v1.0 • Built with ❤️ for Farmers
        </p>
      </div>
    </div>
  );
}
