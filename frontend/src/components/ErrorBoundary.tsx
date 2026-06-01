import React from 'react';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col items-center justify-center text-center">
          <IconAlertTriangle size={32} className="text-red-500 mb-3" />
          <h3 className="text-red-700 dark:text-red-400 font-bold mb-1">Something went wrong</h3>
          <p className="text-sm text-red-600 dark:text-red-500/80 mb-4 max-w-sm">
            {this.props.fallbackMessage || "This section couldn't load due to an unexpected error."}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="flex items-center gap-2 text-xs font-bold bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#222] transition shadow-sm"
          >
            <IconRefresh size={14} /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
