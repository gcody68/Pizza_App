import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { UtensilsCrossed, Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const GOLD = "#c9a84c";
const PAGE_BG = "#0d1010";
const DARK_CARD = "#131e30";

function normalizeEmail(input: string): string {
  if (input.trim() === "admin") return "admin@admin.local";
  if (!input.includes("@")) return `${input.trim()}@admin.local`;
  return input.trim();
}

type Mode = "login" | "signup";

function LoginInner() {
  const { isAdmin, authLoading, login, signUp } = useAdmin();
  const { isCustomDomainHost, resolution } = useRestaurant();
  const navigate = useNavigate();

  // On a customer-facing custom domain, /login should never be shown to customers.
  // Only /admin is the legitimate owner login path.
  const isLoginRoute = window.location.pathname === "/login";
  if (isCustomDomainHost && isLoginRoute && resolution.status !== "loading") {
    return <Navigate to="/" replace />;
  }
  const [mode, setMode] = useState<Mode>(() => {
    const stored = sessionStorage.getItem("loginMode");
    sessionStorage.removeItem("loginMode");
    return stored === "signup" ? "signup" : "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} />
    </div>
  );

  // Already logged in → go straight to dashboard
  if (isAdmin) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { error } = await login(normalizeEmail(email), password);
    setLoading(false);
    if (error) {
      toast.error("Invalid email or password. Please try again.");
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !restaurantName.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await signUp(normalizeEmail(email), password, restaurantName.trim());
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Account created! Welcome to Loomis.");
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: PAGE_BG }}>
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "linear-gradient(160deg, #1a1208, #0a0d10, #0d1010)" }} />
      <div className="fixed inset-0 pointer-events-none opacity-40" style={{ backgroundImage: `radial-gradient(ellipse at 25% 10%, rgba(201,168,76,0.2) 0%, transparent 55%)` }} />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: GOLD }}>
            <UtensilsCrossed className="w-4 h-4 text-neutral-900" />
          </div>
          <span className="font-bold text-lg text-white">Loomis</span>
        </Link>
        <Link to="/" className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>

      {/* Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl p-8 shadow-2xl"
            style={{ background: DARK_CARD, border: "1px solid rgba(201,168,76,0.15)" }}
          >
            {/* Icon + heading */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
                <UtensilsCrossed className="w-7 h-7" style={{ color: GOLD }} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {mode === "login" ? "Welcome back" : "Start your free trial"}
              </h1>
              <p className="text-sm" style={{ color: "#6b7280" }}>
                {mode === "login"
                  ? "Sign in to your restaurant dashboard"
                  : "Create your restaurant account — no credit card needed"}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={() => setMode("login")}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={mode === "login" ? { background: GOLD, color: "#111" } : { color: "#9ca3af" }}
              >
                Log In
              </button>
              <button
                onClick={() => setMode("signup")}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={mode === "signup" ? { background: GOLD, color: "#111" } : { color: "#9ca3af" }}
              >
                Sign Up
              </button>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Email or Username</Label>
                  <Input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@restaurant.com"
                    autoFocus
                    required
                    className="h-11 text-sm text-white placeholder:text-neutral-600"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-11 text-sm text-white placeholder:text-neutral-600 pr-10"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "#6b7280" }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-sm font-semibold mt-2"
                  style={{ background: GOLD, color: "#111" }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Restaurant Name</Label>
                  <Input
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="The Golden Fork"
                    autoFocus
                    required
                    className="h-11 text-sm text-white placeholder:text-neutral-600"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@restaurant.com"
                    required
                    className="h-11 text-sm text-white placeholder:text-neutral-600"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      className="h-11 text-sm text-white placeholder:text-neutral-600 pr-10"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "#6b7280" }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-sm font-semibold mt-2"
                  style={{ background: GOLD, color: "#111" }}
                >
                  {loading ? "Creating account..." : "Create Free Account"}
                </Button>
                <p className="text-xs text-center" style={{ color: "#4b5563" }}>
                  No credit card required. Cancel anytime.
                </p>
              </form>
            )}

            <div className="mt-6 pt-5 border-t flex items-center justify-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <Shield className="w-3.5 h-3.5" style={{ color: "#374151" }} />
              <span className="text-xs" style={{ color: "#374151" }}>Secured by Supabase Auth · TLS encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <AdminProvider>
      <LoginInner />
    </AdminProvider>
  );
}
