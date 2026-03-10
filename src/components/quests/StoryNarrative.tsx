import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

interface StoryNarrativeProps {
  text: string;
  variant?: "intro" | "outro";
}

const StoryNarrative = ({ text, variant = "intro" }: StoryNarrativeProps) => {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-primary/80 uppercase tracking-wider mb-1">
              {variant === "intro" ? "Story" : "Epilogue"}
            </p>
            <p className="text-sm text-foreground/90 italic leading-relaxed whitespace-pre-wrap">{text}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StoryNarrative;
