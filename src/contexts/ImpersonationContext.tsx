import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ImpersonationState = {
  active: boolean;
  targetEmail: string | null;
  /** Email of the super admin who initiated impersonation */
  actorEmail: string | null;
};

type ImpersonationContextType = {
  impersonation: ImpersonationState;
  startImpersonation: (targetUserId: string, actorEmail: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  logAuditAction: (action: string) => Promise<void>;
};

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

const STORAGE_KEY = "gilded_impersonation";
const ORIGINAL_SESSION_KEY = "gilded_original_session";

function loadImpersonationState(): ImpersonationState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ImpersonationState;
  } catch {}
  return { active: false, targetEmail: null, actorEmail: null };
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonation, setImpersonation] = useState<ImpersonationState>(loadImpersonationState);

  const startImpersonation = useCallback(async (targetUserId: string, actorEmail: string) => {
    try {
      // Save the current session tokens so we can restore them later
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        sessionStorage.setItem(ORIGINAL_SESSION_KEY, JSON.stringify({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        }));
      }

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/impersonate-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ targetUserId }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Impersonation failed");

      // Set the target user's session
      await supabase.auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });

      const state: ImpersonationState = {
        active: true,
        targetEmail: json.target_email,
        actorEmail,
      };
      setImpersonation(state);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      toast.success(`Now impersonating ${json.target_email}`);
      // Reload to re-initialize all hooks under the new session
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to impersonate user");
    }
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
      setImpersonation({ active: false, targetEmail: null, actorEmail: null });
      toast.success("Returned to your own account.");
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop impersonation");
    }
  }, []);

  const logAuditAction = useCallback(async (action: string) => {
    if (!impersonation.active) return;
    try {
      await supabase.from("system_audits").insert({
        actor_id: (await supabase.auth.getSession()).data.session?.user?.id ?? "",
        actor_email: impersonation.actorEmail ?? "unknown",
        impersonated_email: impersonation.targetEmail ?? "unknown",
        action: `Action performed by Super Admin ${impersonation.actorEmail} while impersonating ${impersonation.targetEmail}: ${action}`,
      });
    } catch {
      // Audit logging failures are silent — don't disrupt the user
    }
  }, [impersonation]);

  return (
    <ImpersonationContext.Provider value={{ impersonation, startImpersonation, stopImpersonation, logAuditAction }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
}
