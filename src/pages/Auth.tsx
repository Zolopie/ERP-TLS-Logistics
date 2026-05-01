import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: "url('/tls-logo.png')" }}
      />
      <div className="absolute inset-0 bg-slate-950/40" />

      {/* 💎 LOGIN CARD */}
      <div className="relative w-full max-w-md backdrop-blur-xl bg-white/80 border border-white/40 rounded-2xl shadow-2xl p-10">

        {/* HEADER */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-lg overflow-hidden">
            <img src="/tls-logo.png" alt="TLS Logo" className="w-10 h-10 object-contain" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">TLS</h1>

          <p className="text-slate-500 mt-2">
            {mode === "signin"
              ? "Welcome to TLS Portal"
              : "Create your account"}
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {mode === "signup" && (
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create New Account" : "Back to Sign In"}
          </Button>

        </form>
      </div>
    </div>
  );
};

export default Auth;