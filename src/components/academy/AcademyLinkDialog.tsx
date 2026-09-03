import { ExternalLink, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AcademyLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academyUrl: string;
  email?: string | null;
}

export const AcademyLinkDialog = ({
  open,
  onOpenChange,
  academyUrl,
  email,
}: AcademyLinkDialogProps) => {
  const steps = [
    "Open FGN Academy using the button below.",
    email
      ? `Sign up (or sign in) with the same email you use here — ${email}. That address is what links the two accounts.`
      : "Sign up (or sign in) with the same email address you use here. That address is what links the two accounts.",
    "Your past challenge and quest completions are claimed onto your Skill Passport within a few minutes.",
    "Come back to your dashboard and click Open Skill Passport again.",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-accent/40">
        <DialogHeader>
          <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center mb-2">
            <GraduationCap className="h-5 w-5 text-accent" />
          </div>
          <DialogTitle className="font-display">Connect your Academy account</DialogTitle>
          <DialogDescription className="font-body">
            We couldn't find an FGN Academy profile linked to this Play account yet.
            Here's how to connect it.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 text-sm font-body text-muted-foreground">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="h-5 w-5 shrink-0 rounded-full bg-accent/15 text-accent text-xs font-heading flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-foreground/80">{step}</span>
            </li>
          ))}
        </ol>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" className="font-heading" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="font-heading"
            onClick={() => window.open(academyUrl, "_blank", "noopener,noreferrer")}
          >
            Go to FGN Academy
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AcademyLinkDialog;
