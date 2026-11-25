import { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (reset: () => void) => ReactNode;
  onError?: (error: unknown) => void;
}

interface ErrorBoundaryState {
  failed: boolean;
}

// Contains render errors to one subtree instead of taking down the whole app.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    this.props.onError?.(error);
  }

  private readonly reset = (): void => this.setState({ failed: false });

  render(): ReactNode {
    return this.state.failed ? this.props.fallback(this.reset) : this.props.children;
  }
}
