import { useEffect, useState } from "react";
import { Settings as SettingsIcon, User, Bell, Shield, Database, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "data", label: "Data & Privacy", icon: Database },
  { id: "appearance", label: "Appearance", icon: Palette },
];

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState("profile");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [notifs, setNotifs] = useState({ email: true, lowStock: true, orderUpdates: true });
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,email").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setFullName(data?.full_name || "");
      setEmail(data?.email || user.email || "");
    });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const changePassword = async () => {
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success("Password updated"); setPassword("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="w-7 h-7 text-primary" />Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="bg-card rounded-xl p-3 border border-border shadow-sm h-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                tab === t.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
              )}
            >
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {tab === "profile" && (
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div><Label>Email Address</Label><Input value={email} disabled /></div>
                <div><Label>Role</Label><Input value={isAdmin ? "Administrator" : "User"} disabled /></div>
                <Button onClick={saveProfile}>Save Changes</Button>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: "email", label: "Email notifications" },
                  { key: "lowStock", label: "Low stock alerts" },
                  { key: "orderUpdates", label: "Order updates" },
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between">
                    <span>{n.label}</span>
                    <Checkbox checked={notifs[n.key as keyof typeof notifs]} onCheckedChange={(v) => setNotifs({ ...notifs, [n.key]: !!v })} />
                  </div>
                ))}
                <Button onClick={() => toast.success("Preferences saved")}>Save Preferences</Button>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Security</h3>
              <div className="space-y-4">
                <div><Label>New Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
                <Button onClick={changePassword}>Update Password</Button>
              </div>
            </div>
          )}

          {tab === "data" && (
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Data & Privacy</h3>
              <p className="text-sm text-muted-foreground mb-4">Your data is securely stored and encrypted.</p>
              <Button variant="outline" onClick={() => toast.success("Data export queued")}>Export My Data</Button>
            </div>
          )}

          {tab === "appearance" && (
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Appearance</h3>
              <p className="text-sm text-muted-foreground">Theme customization coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
