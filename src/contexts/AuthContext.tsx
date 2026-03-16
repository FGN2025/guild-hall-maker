import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  const fetchingRef = { current: false };

  const fetchRoleAndDiscord = async (userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setRoleLoading(true);
    const [roleResult, profileResult, tenantAdminResult] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("discord_id, discord_bypass_approved").eq("user_id", userId).maybeSingle(),
      supabase.from("tenant_admins").select("id").eq("user_id", userId).limit(1),
    ]);
    const roles = (roleResult.data ?? []).map((r) => r.role);
    setIsAdmin(roles.includes("admin"));
    setIsModerator(roles.includes("moderator"));
    setIsMarketing(roles.includes("marketing"));
    setIsTenantStaff((tenantAdminResult.data ?? []).length > 0);
    setDiscordLinked(!!profileResult.data?.discord_id || !!profileResult.data?.discord_bypass_approved);
    setRoleLoading(false);
    fetchingRef.current = false;
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

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, isModerator, isMarketing, isTenantStaff, roleLoading, discordLinked, emailConfirmed, signOut, refreshDiscordStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
