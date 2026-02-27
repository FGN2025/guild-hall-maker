import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isMarketing: boolean;
  roleLoading: boolean;
  discordLinked: boolean;
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
  roleLoading: true,
  discordLinked: false,
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
  const [roleLoading, setRoleLoading] = useState(true);
  const [discordLinked, setDiscordLinked] = useState(false);

  const fetchRoleAndDiscord = async (userId: string) => {
    setRoleLoading(true);
    const [roleResult, profileResult] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("discord_id").eq("user_id", userId).maybeSingle(),
    ]);
    setIsAdmin(roleResult.data?.role === "admin");
    setIsModerator(roleResult.data?.role === "moderator");
    setIsMarketing(roleResult.data?.role === "marketing");
    setDiscordLinked(!!profileResult.data?.discord_id);
    setRoleLoading(false);
  };

  const refreshDiscordStatus = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("discord_id").eq("user_id", user.id).maybeSingle();
    setDiscordLinked(!!data?.discord_id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          setTimeout(() => fetchRoleAndDiscord(session.user.id), 0);
        } else {
          setIsAdmin(false);
          setIsModerator(false);
          setIsMarketing(false);
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

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, isModerator, isMarketing, roleLoading, discordLinked, signOut, refreshDiscordStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
