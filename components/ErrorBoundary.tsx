import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from './Icons';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 mb-6 text-sm">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <div className="bg-slate-100 p-4 rounded text-left overflow-auto max-h-40 mb-6 text-xs font-mono text-slate-600">
                {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;