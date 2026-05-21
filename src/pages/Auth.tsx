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

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
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
            data: {
              full_name: fullName || email.split("@")[0],
            },
          },
        });

        if (error) throw error;

        toast.success(
          "Account created successfully!"
        );

        setMode("signin");
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) throw error;

        toast.success(
          "Welcome back!"
        );

        navigate("/", {
          replace: true,
        });
      }
    } catch (err: any) {
      toast.error(
        err.message ||
          "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center overflow-hidden"
      style={{
        backgroundImage:
          "url('/tls-logo.png')",
      }}
    >
      {/* Dark overlay */}

      <div className="absolute inset-0 bg-black/60"></div>

      {/* Login Card */}

      <div className="relative z-10 w-full max-w-md px-5">

        <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-2xl p-10">

          {/* Logo */}

          <div className="flex flex-col items-center mb-6">

            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">

              <img
                src="/tls-logo.png"
                alt="TLS Logo"
                className="w-12 h-12 object-contain"
              />

            </div>

            <h1 className="text-3xl font-bold text-white mt-4">
              TLS Logistics
            </h1>

            <p className="text-white/80 mt-2 text-sm">
              ERP Portal
            </p>

          </div>

          {/* Divider */}

          <div className="flex items-center gap-3 mb-6">

            <div className="flex-1 h-px bg-white/30"></div>

            <span className="text-xs text-white/70">
              Sign In
            </span>

            <div className="flex-1 h-px bg-white/30"></div>

          </div>

          {/* Form */}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {mode === "signup" && (

              <div className="space-y-2">

                <Label className="text-white">
                  Full Name
                </Label>

                <Input
                  value={fullName}
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                  placeholder="John Doe"
                />

              </div>

            )}

            <div className="space-y-2">

              <Label className="text-white">
                Email Address
              </Label>

              <Input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                required
              />

            </div>

            <div className="space-y-2">

              <Label className="text-white">
                Password
              </Label>

              <Input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
                minLength={6}
              />

            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                ? "Sign In"
                : "Create Account"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-white hover:text-white hover:bg-white/10"
              onClick={() =>
                setMode(
                  mode === "signin"
                    ? "signup"
                    : "signin"
                )
              }
            >
              {mode === "signin"
                ? "Create New Account"
                : "Back to Sign In"}
            </Button>

          </form>

        </div>

      </div>

    </div>
  );
};

export default Auth;