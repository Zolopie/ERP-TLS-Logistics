import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DEMO = {
  admin: { email: "admin@tlslogistics.com", password: "Admin123" },
  user: { email: "user@tlslogistics.com", password: "User123" },
};

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const ensureDemoSeeded = async () => {
    await supabase.functions.invoke("seed-demo-users");
  };

  const demoLogin = async (kind: "admin" | "user") => {
    setDemoLoading(kind);
    try {
      const creds = DEMO[kind];
      let { error } = await supabase.auth.signInWithPassword(creds);
      if (error) {
        await ensureDemoSeeded();
        ({ error } = await supabase.auth.signInWithPassword(creds));
      }
      if (error) throw error;
      toast.success(`Signed in as ${kind}`);
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Demo login failed");
    } finally {
      setDemoLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! You can sign in now.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950" />
      <div className="relative w-full max-w-md backdrop-blur-xl bg-white/95 border border-white/40 rounded-2xl shadow-2xl p-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-lg overflow-hidden">
            <img src="/tls-logo.png" alt="TLS Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">TLS Logistics</h1>
          <p className="text-slate-500 mt-2 text-sm">ERP Portal</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            type="button"
            className="h-11 bg-blue-600 hover:bg-blue-700"
            disabled={!!demoLoading}
            onClick={() => demoLogin("admin")}
          >
            {demoLoading === "admin" ? "..." : "Login as Admin"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={!!demoLoading}
            onClick={() => demoLogin("user")}
          >
            {demoLoading === "user" ? "..." : "Login as User"}
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">or sign in manually</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Create New Account" : "Back to Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
