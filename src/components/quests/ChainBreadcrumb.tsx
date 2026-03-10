import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChainBreadcrumbProps {
  chainName: string;
  chainOrder: number;
  siblings: { id: string; name: string; chain_order: number }[];
  currentQuestId: string;
}

const ChainBreadcrumb = ({ chainName, chainOrder, siblings, currentQuestId }: ChainBreadcrumbProps) => {
  const sorted = [...siblings].sort((a, b) => a.chain_order - b.chain_order);
  const currentIdx = sorted.findIndex((s) => s.id === currentQuestId);
  const prev = currentIdx > 0 ? sorted[currentIdx - 1] : null;
  const next = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
        <Link2 className="h-3 w-3" />
        {chainName}
      </Badge>
      <span className="text-xs text-muted-foreground font-mono">
        Quest {chainOrder + 1} of {sorted.length}
      </span>
      <div className="flex items-center gap-1 ml-auto">
        {prev && (
          <Link to={`/quests/${prev.id}`}>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <ChevronLeft className="h-3 w-3" /> Prev
            </Button>
          </Link>
        )}
        {next && (
          <Link to={`/quests/${next.id}`}>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              Next <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default ChainBreadcrumb;
