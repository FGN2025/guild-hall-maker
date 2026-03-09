import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  url: string;
}

const RulesPdfViewer = ({ url }: Props) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? "Hide Rules PDF" : "Preview Rules PDF"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => window.open(url, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          Open in New Tab
        </Button>
      </div>

      {expanded && (
        <div className="rounded-lg border border-border/50 overflow-hidden bg-muted/30">
          <iframe
            src={url}
            title="Tournament Rules PDF"
            className="w-full h-[600px]"
          />
        </div>
      )}
    </div>
  );
};

export default RulesPdfViewer;
