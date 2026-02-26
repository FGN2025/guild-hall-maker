import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ModeratorLayout from "./ModeratorLayout";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const ModeratorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isModerator, isAdmin, roleLoading } = useAuth();

  useEffect(() => {
    if (!loading && !roleLoading && user && !isModerator && !isAdmin) {
      toast({ title: "Access denied", description: "You do not have moderator privileges.", variant: "destructive" });
    }
  }, [loading, roleLoading, user, isModerator, isAdmin]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  // Admins can also access moderator panel
  if (!isModerator && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <ModeratorLayout>{children}</ModeratorLayout>;
};

export default ModeratorRoute;
