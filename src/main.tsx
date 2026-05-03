import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { bootstrapBrandMode, detectBrandMode } from "./lib/brandMode";

// Apply FGN brand mode (arcade vs enterprise) before React mounts to avoid flash.
bootstrapBrandMode();
const initialTheme = detectBrandMode() === "enterprise" ? "light" : "dark";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider
      attribute="class"
      defaultTheme={initialTheme}
      enableSystem={false}
      forcedTheme={initialTheme === "dark" ? "dark" : undefined}
    >
      <App />
    </ThemeProvider>
  </ErrorBoundary>
);
