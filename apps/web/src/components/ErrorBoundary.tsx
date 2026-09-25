import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
          <p className="text-sm text-gray-400 max-w-md">{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
