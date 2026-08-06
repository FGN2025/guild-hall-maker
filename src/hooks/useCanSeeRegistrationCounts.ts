import { useAuth } from "@/contexts/AuthContext";

/**
 * Single source of truth for who may see live registration/sign-up counts.
 *
 * Platform roles (Admin, Moderator) see `registered / max`.
 * Everyone else — including tenant admins, managers, marketing users and
 * tournament creators who are not platform staff — sees capacity only.
 *
 * Returns false while roles are still loading so a count never flashes.
 */
export function useCanSeeRegistrationCounts(): boolean {
  const { isAdmin, isModerator, roleLoading } = useAuth();
  if (roleLoading) return false;
  return Boolean(isAdmin || isModerator);
}
