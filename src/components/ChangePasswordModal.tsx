import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Mail, CircleCheck as CheckCircle } from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";

type Props = { open: boolean; onClose: () => void };

export default function ChangePasswordModal({ open, onClose }: Props) {
  const demo = useDemoMode();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleClose = () => {
    setSent(false);
    setEmail("");
    setLoading(false);
    onClose();
  };

  const handleSend = async () => {
    if (demo) {
      toast.info("Password changes are not available in demo mode.");
      handleClose();
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email ?? "";
    if (!userEmail) {
      toast.error("No email address found for your account.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/dashboard`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setEmail(userEmail);
      setSent(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Change Password
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="space-y-4 text-center py-2">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Check your email</p>
              <p className="text-xs text-muted-foreground">
                We sent a password reset link to
              </p>
              <p className="text-sm font-semibold text-gold break-all">{email}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the link in the email to set a new password. You'll be brought back to your dashboard automatically.
            </p>
            <Button
              onClick={handleClose}
              className="w-full gradient-gold text-primary-foreground font-semibold"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <Mail className="w-5 h-5 text-gold mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                We'll send a secure password reset link to your account email address. Click it to set a new password.
              </p>
            </div>
            <Button
              onClick={handleSend}
              disabled={loading}
              className="w-full gradient-gold text-primary-foreground font-semibold"
            >
              {loading ? "Sending..." : "Send Reset Email"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
