import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="p-4 text-red-600 text-sm font-mono">
          <p className="font-bold">Render error</p>
          <pre className="mt-1 text-xs whitespace-pre-wrap">{this.state.error.message}</pre>
          <button
            className="mt-2 px-2 py-1 bg-red-100 rounded text-red-700 text-xs"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
