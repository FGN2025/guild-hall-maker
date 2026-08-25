import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'loading';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isMarketing: boolean;
  isTenantStaff: boolean;
  roleLoading: boolean;
  discordLinked: boolean;
  emailConfirmed: boolean;
  subscriptionStatus: SubscriptionStatus;
  signOut: () => Promise<void>;
  refreshDiscordStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  isModerator: false,
  isMarketing: false,
  isTenantStaff: false,
  roleLoading: true,
  discordLinked: false,
  emailConfirmed: false,
  subscriptionStatus: 'loading',
  signOut: async () => {},
  refreshDiscordStatus: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isMarketing, setIsMarketing] = useState(false);
  const [isTenantStaff, setIsTenantStaff] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading');
  // Must persist across renders — a plain object is recreated each render and
  // cannot guard overlapping auth-event refetches.
  const fetchingRef = useRef(false);
  const rolesLoadedRef = useRef(false);

  const resetRoles = () => {
    setIsAdmin(false);
    setIsModerator(false);
    setIsMarketing(false);
    setIsTenantStaff(false);
    setDiscordLinked(false);
    setRoleLoading(false);
    setSubscriptionStatus("inactive");
    rolesLoadedRef.current = false;
  };

  const fetchRoleAndDiscord = async (userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    // SECURITY: Never hydrate role flags from localStorage. Privileged UI must
    // only render after the server confirms roles via user_roles RLS query.
    // Skip flipping loading true on a background refetch — that unmounts
    // AdminRoute children (e.g. Challenge Manager) and remounts a spinner.
    if (!rolesLoadedRef.current) {
      setRoleLoading(true);
    }
    try {
      const [roleResult, profileResult, tenantAdminResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("discord_id, discord_bypass_approved").eq("user_id", userId).maybeSingle(),
        supabase.from("tenant_admins").select("id").eq("user_id", userId).limit(1),
      ]);
      const roles = (roleResult.data ?? []).map((r) => r.role);
      setIsAdmin(roles.includes("admin"));
      setIsModerator(roles.includes("moderator"));
      setIsMarketing(roles.includes("marketing"));
      const isTenant = (tenantAdminResult.data ?? []).length > 0;
      setIsTenantStaff(isTenant);
      const dl = !!profileResult.data?.discord_id || !!profileResult.data?.discord_bypass_approved;
      setDiscordLinked(dl);
      setRoleLoading(false);
      rolesLoadedRef.current = true;

      // Subscription status: hydrate from cache immediately, refresh in background.
      // Never blocks roleLoading or page render.
      if (isTenant) {
        const cacheKey = `fgn_sub_status_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        let cachedFresh = false;
        if (cached) {
          try {
            const { status, ts } = JSON.parse(cached);
            setSubscriptionStatus(
              status === "active" || status === "trialing"
                ? "active"
                : status === "past_due"
                ? "past_due"
                : "inactive"
            );
            cachedFresh = Date.now() - ts < 5 * 60 * 1000;
          } catch {
            // ignore malformed cache
          }
        }

        if (cachedFresh) return;

        // Background refresh (fire-and-forget)
        supabase.functions
          .invoke("check-subscription", { body: { userId } })
          .then(({ data }) => {
            const status = data?.status;
            const mapped: SubscriptionStatus =
              status === "active" || status === "trialing"
                ? "active"
                : status === "past_due"
                ? "past_due"
                : "inactive";
            setSubscriptionStatus(mapped);
            localStorage.setItem(cacheKey, JSON.stringify({ status, ts: Date.now() }));
          })
          .catch(() => {
            if (!cached) setSubscriptionStatus("inactive");
          });
      } else {
        setSubscriptionStatus("inactive");
      }
    } finally {
      fetchingRef.current = false;
    }
  };

  const refreshDiscordStatus = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("discord_id, discord_bypass_approved").eq("user_id", user.id).maybeSingle();
    setDiscordLinked(!!data?.discord_id || !!data?.discord_bypass_approved);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Token refresh is not a role change. Refetching here set roleLoading
        // true and remounted /admin/challenges on every TOKEN_REFRESHED.
        if (event === "TOKEN_REFRESHED") {
          return;
        }
        if (session?.user) {
          fetchRoleAndDiscord(session.user.id);
        } else {
          resetRoles();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchRoleAndDiscord(session.user.id);
      } else {
        setRoleLoading(false);
        rolesLoadedRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (user) {
      try {
        localStorage.removeItem(`fgn_roles_${user.id}`);
        localStorage.removeItem(`fgn_sub_status_${user.id}`);
      } catch {
        /* ignore */
      }
    }
    await supabase.auth.signOut();
  };

  const emailConfirmed = !!user?.email_confirmed_at;

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      isAdmin,
      isModerator,
      isMarketing,
      isTenantStaff,
      roleLoading,
      discordLinked,
      emailConfirmed,
      subscriptionStatus,
      signOut,
      refreshDiscordStatus,
    }),
    [
      session,
      user,
      loading,
      isAdmin,
      isModerator,
      isMarketing,
      isTenantStaff,
      roleLoading,
      discordLinked,
      emailConfirmed,
      subscriptionStatus,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
