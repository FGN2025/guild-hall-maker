import usePageTitle from "@/hooks/usePageTitle";
import { Compass } from "lucide-react";
import AdminQuestsPanel from "@/components/quests/AdminQuestsPanel";

const AdminQuests = () => {
  usePageTitle("Quest Management");

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Compass className="h-8 w-8 text-primary" />
          Quest Management
        </h1>
      </div>

      <AdminQuestsPanel queryKeyPrefix="admin" showEnrollmentCounts />
    </div>
  );
};

export default AdminQuests;
