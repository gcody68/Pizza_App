import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, X } from "lucide-react";

const STORAGE_KEY = "gilded_impersonation";
const ORIGINAL_SESSION_KEY = "gilded_original_session";

type ImpersonationState = {
  active: boolean;
  targetEmail: string | null;
  actorEmail: string | null;
};

export default function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState>({ active: false, targetEmail: null, actorEmail: null });

  useEffect(() => {
    const read = () => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw) as ImpersonationState);
        else setState({ active: false, targetEmail: null, actorEmail: null });
      } catch {}
    };
    read();
    // Re-read on storage events (cross-tab) and on focus
    window.addEventListener("storage", read);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("focus", read);
    };
  }, []);

  const stopImpersonation = useCallback(async () => {
    try {
      const raw = sessionStorage.getItem(ORIGINAL_SESSION_KEY);
      if (raw) {
        const { access_token, refresh_token } = JSON.parse(raw) as { access_token: string; refresh_token: string };
        await supabase.auth.setSession({ access_token, refresh_token });
      } else {
        await supabase.auth.signOut();
      }
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(ORIGINAL_SESSION_KEY);
      setState({ active: false, targetEmail: null, actorEmail: null });
      toast.success("Returned to your own account.");
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop impersonation");
    }
  }, []);

  if (!state.active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-black flex items-center justify-between px-4 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="w-4 h-4 flex-shrink-0" />
        <span>
          Super Admin mode: viewing as <strong>{state.targetEmail}</strong>
          {state.actorEmail && <span className="font-normal opacity-75"> (logged in as {state.actorEmail})</span>}
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="flex items-center gap-1.5 text-xs font-semibold bg-black/15 hover:bg-black/25 px-3 py-1.5 rounded transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
        Exit Impersonation
      </button>
    </div>
  );
}
