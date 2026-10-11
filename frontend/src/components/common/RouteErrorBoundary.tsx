import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCw, AlertTriangle, Wifi } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  private onlineListener: (() => void) | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isRetrying: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Route lazy loading error caught by ErrorBoundary:', error, errorInfo);

    const isChunkError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError';

    // If chunk loading failed because laptop just woke from sleep and network was reconnecting,
    // auto-retry after brief moment once online
    if (isChunkError && typeof window !== 'undefined') {
      const retryKey = `eb_chunk_retry_${window.location.pathname}`;
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, 'true');
        setTimeout(() => {
          this.setState({ hasError: false, error: null });
        }, 1200);
      }
    }
  }

  componentDidMount() {
    this.onlineListener = () => {
      // When network comes back online after laptop sleep, automatically clear errors and retry view
      if (this.state.hasError) {
        this.setState({ hasError: false, error: null });
      }
    };
    window.addEventListener('online', this.onlineListener);
  }

  componentWillUnmount() {
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
  }

  handleTryAgain = () => {
    this.setState({ isRetrying: true }, () => {
      setTimeout(() => {
        this.setState({ hasError: false, error: null, isRetrying: false });
      }, 300);
    });
  };

  render() {
    if (this.state.hasError) {
      const isNetworkIssue =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        this.state.error?.message?.includes('Failed to fetch') ||
        this.state.error?.message?.includes('Network Error');

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center animate-fade-in">
          <div className="card-surface p-6 max-w-md shadow-lg space-y-3 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              {isNetworkIssue ? <Wifi size={24} className="text-amber-600" /> : <AlertTriangle size={24} />}
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {isNetworkIssue ? 'Reconnecting to System' : 'Something went wrong loading this view'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isNetworkIssue
                ? 'Network connection re-synchronizing after sleep. Resuming live session...'
                : (this.state.error?.message || 'A component update failed to load. Please try again or reload the page.')}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleTryAgain}
                disabled={this.state.isRetrying}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <RotateCw size={12} className={this.state.isRetrying ? 'animate-spin' : ''} />
                <span>{this.state.isRetrying ? 'Reconnecting...' : 'Try Again'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <RotateCw size={14} />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
