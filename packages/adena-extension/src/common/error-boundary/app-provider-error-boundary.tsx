import React, { ErrorInfo } from 'react';

import { CommonError } from '@common/errors/common';

interface Props {
  fallback: React.ReactNode;
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppProviderErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    if (error instanceof CommonError) {
      if (error.getStatus() === 401) {
        return { hasError: true };
      }
    }
    return { hasError: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
