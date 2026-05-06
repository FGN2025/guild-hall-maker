import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
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
  const fetchingRef = { current: false };

  const hydrateRolesFromCache = (userId: string): boolean => {
    try {
      const cached = localStorage.getItem(`fgn_roles_${userId}`);
      if (!cached) return false;
      const { roles, isTenant, discordLinked: dl, ts } = JSON.parse(cached);
      if (!Array.isArray(roles)) return false;
      // Use cache for instant render; refresh in background regardless.
      setIsAdmin(roles.includes("admin"));
      setIsModerator(roles.includes("moderator"));
      setIsMarketing(roles.includes("marketing"));
      setIsTenantStaff(!!isTenant);
      setDiscordLinked(!!dl);
      setRoleLoading(false);
      // If cache is older than 10 minutes, treat as stale but still useful for paint.
      return Date.now() - (ts ?? 0) < 10 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const fetchRoleAndDiscord = async (userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    // Hydrate from cache so first paint is not blocked on the network.
    const hadFresh = hydrateRolesFromCache(userId);
    if (!hadFresh) setRoleLoading(true);
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
    fetchingRef.current = false;
    try {
      localStorage.setItem(
        `fgn_roles_${userId}`,
        JSON.stringify({ roles, isTenant, discordLinked: dl, ts: Date.now() })
      );
    } catch {
      // ignore quota errors
    }

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
  };

  const refreshDiscordStatus = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("discord_id, discord_bypass_approved").eq("user_id", user.id).maybeSingle();
    setDiscordLinked(!!data?.discord_id || !!data?.discord_bypass_approved);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          fetchRoleAndDiscord(session.user.id);
        } else {
          setIsAdmin(false);
          setIsModerator(false);
          setIsMarketing(false);
          setIsTenantStaff(false);
          setDiscordLinked(false);
          setRoleLoading(false);
          setSubscriptionStatus('inactive');
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
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
