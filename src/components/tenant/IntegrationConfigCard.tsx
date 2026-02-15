import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

interface IntegrationCardProps {
  name: string;
  providerType: string;
  description: string;
  comingSoon?: boolean;
  isConfigured?: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  onConfigure?: () => void;
}

const IntegrationConfigCard = ({
  name,
  description,
  comingSoon,
  isConfigured,
  lastSyncAt,
  lastSyncStatus,
  onConfigure,
}: IntegrationCardProps) => {
  const statusIcon = lastSyncStatus === "success" ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : lastSyncStatus === "error" ? (
    <AlertCircle className="h-4 w-4 text-destructive" />
  ) : null;

  return (
    <Card className={comingSoon ? "opacity-70" : ""}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            {name}
            {comingSoon && <Badge variant="secondary">Coming Soon</Badge>}
            {isConfigured && !comingSoon && <Badge variant="outline" className="text-green-600 border-green-600">Connected</Badge>}
          </CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {lastSyncAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Clock className="h-3.5 w-3.5" />
            Last sync: {new Date(lastSyncAt).toLocaleString()}
            {statusIcon}
          </div>
        )}
        <Button
          variant={comingSoon ? "secondary" : "outline"}
          size="sm"
          disabled={comingSoon}
          onClick={onConfigure}
        >
          <Settings className="h-4 w-4 mr-2" />
          {comingSoon ? "API Endpoints Pending" : isConfigured ? "Edit Settings" : "Configure"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default IntegrationConfigCard;
