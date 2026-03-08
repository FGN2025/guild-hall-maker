import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const handleScroll = () => {
      setVisible(main.scrollTop > 400);
    };

    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => main.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 right-24 z-40 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-300",
        "bg-primary/80 text-primary-foreground hover:bg-primary hover:scale-110",
        "ring-1 ring-primary/30 backdrop-blur-sm",
        visible
          ? "scale-100 opacity-100 pointer-events-auto"
          : "scale-0 opacity-0 pointer-events-none"
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
