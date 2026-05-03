import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { bootstrapBrandMode, detectBrandMode } from "./lib/brandMode";

// Apply FGN brand mode (arcade vs enterprise) before React mounts to avoid flash.
bootstrapBrandMode();
const initialTheme = "dark";

// Clear any stale persisted theme from next-themes so the brand-mode default wins
// on every load. Users can still toggle via ThemeToggle during the session.
try {
  const stored = window.localStorage.getItem("theme");
  if (stored !== initialTheme) {
    window.localStorage.removeItem("theme");
  }
  document.documentElement.classList.remove("light");
  document.documentElement.classList.add("dark");
} catch {
  /* ignore */
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider
      attribute="class"
      defaultTheme={initialTheme}
      enableSystem={false}
    >
      <App />
    </ThemeProvider>
  </ErrorBoundary>
);
