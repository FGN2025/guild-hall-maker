import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MarketingLayout from "./MarketingLayout";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const MarketingRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, isMarketing, roleLoading } = useAuth();

  useEffect(() => {
    if (!loading && !roleLoading && user && !isAdmin && !isMarketing) {
      toast({ title: "Access denied", description: "You do not have marketing privileges.", variant: "destructive" });
    }
  }, [loading, roleLoading, user, isAdmin, isMarketing]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin && !isMarketing) return <Navigate to="/dashboard" replace />;

  return <AdminLayout>{children}</AdminLayout>;
};

export default MarketingRoute;
