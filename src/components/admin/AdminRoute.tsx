import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "./AdminLayout";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, roleLoading } = useAuth();

  useEffect(() => {
    if (!loading && !roleLoading && user && !isAdmin) {
      toast({ title: "Access denied", description: "You do not have admin privileges.", variant: "destructive" });
    }
  }, [loading, roleLoading, user, isAdmin]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <AdminLayout>{children}</AdminLayout>;
};

export default AdminRoute;
