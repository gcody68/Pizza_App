import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { Lock, Shield, ChevronRight } from "lucide-react";

type Props = { open: boolean; onClose: () => void };
type Mode = "login" | "signup";

function normalizeEmail(input: string): string {
  if (input.trim() === "admin") return "admin@admin.local";
  if (!input.includes("@")) return `${input.trim()}@admin.local`;
  return input.trim();
}

export default function AdminLoginModal({ open, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signUp } = useAdmin();

  const reset = () => {
    setEmail("");
    setPassword("");
    setRestaurantName("");
    setMode("login");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { error } = await login(normalizeEmail(email), password);
    setLoading(false);
    if (error) {
      toast.error("Invalid username or password");
    } else {
      toast.success("Welcome back!");
      handleClose();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !restaurantName.trim()) return;
    setLoading(true);
    const { error } = await signUp(normalizeEmail(email), password, restaurantName.trim());
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Account created! Welcome.");
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {mode === "login" ? "Owner Login" : "Create Restaurant Account"}
          </DialogTitle>
        </DialogHeader>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Username or Email</Label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                className="bg-secondary border-border"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="bg-secondary border-border"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-gold text-primary-foreground font-semibold"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="w-full text-center text-xs text-muted-foreground hover:text-gold transition-colors flex items-center justify-center gap-1"
            >
              New restaurant? Create your account <ChevronRight className="w-3 h-3" />
            </button>
            <div className="flex justify-center pt-2 border-t border-border">
              <Shield className="w-4 h-4 text-muted-foreground/30" />
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Restaurant Name</Label>
              <Input
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder=""
                className="bg-secondary border-border"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Username or Email</Label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="bg-secondary border-border"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-gold text-primary-foreground font-semibold"
            >
              {loading ? "Creating account..." : "Create Restaurant Account"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full text-center text-xs text-muted-foreground hover:text-gold transition-colors"
            >
              Already have an account? Sign in
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
