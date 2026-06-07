import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Bir şeyler ters gitti</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              {this.state.error?.message || 'Beklenmeyen bir hata oluştu.'}
            </p>
            <div className="rounded-md bg-slate-50 p-2 text-xs font-mono text-slate-500 mb-4 max-h-40 overflow-auto">
              {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
            </div>
            <button
              onClick={this.reset}
              className="btn-primary w-full"
            >
              <RefreshCw className="h-4 w-4" /> Tekrar Dene
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
