import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const RELOAD_FLAG = "chunk-reload-attempted";

const isChunkLoadError = (error: Error | null | undefined): boolean => {
  if (!error) return false;
  const msg = `${error.name ?? ""} ${error.message ?? ""}`;
  return (
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg)
  );
};

/**
 * Global error boundary that catches unhandled React render errors
 * and displays a recovery UI instead of a blank white screen.
 *
 * Automatically recovers from stale lazy-loaded chunk errors (common after
 * a new deploy invalidates the chunk filenames cached in the user's tab)
 * by reloading once. A sessionStorage flag prevents reload loops.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Auto-recover from stale chunk errors before rendering the fallback UI.
    if (isChunkLoadError(error) && typeof window !== "undefined") {
      try {
        if (!window.sessionStorage.getItem(RELOAD_FLAG)) {
          window.sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
          // Keep hasError false so we don't flash the fallback while reloading.
          return { hasError: false, error: null };
        }
      } catch {
        /* sessionStorage unavailable — fall through to error UI */
      }
    }
    return { hasError: true, error };
  }

  componentDidMount() {
    // Successful render — clear the flag so future stale chunks can recover.
    try {
      window.sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      /* ignore */
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <pre className="text-xs text-destructive bg-destructive/10 rounded p-3 overflow-auto max-h-32 text-left">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleReset}>Return Home</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
