import React, { Component } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-surface text-white p-6">
          <div className="max-w-md w-full bg-surface-light border border-border rounded-2xl p-8 text-center shadow-xl animate-fadeIn">
            <div className="w-16 h-16 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Something went wrong
            </h1>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              We encountered an unexpected error. Don't worry, your data is safe. Let's try reloading the application.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all duration-200 shadow-lg shadow-primary/20"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 text-left bg-black/40 border border-red-900/20 rounded-lg p-4 max-h-40 overflow-y-auto text-xs font-mono text-red-400">
                {this.state.error?.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
