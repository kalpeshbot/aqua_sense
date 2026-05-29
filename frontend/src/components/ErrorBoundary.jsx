import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('AquaSense component error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center p-6">
          <div className="text-danger text-4xl mb-3">⚠</div>
          <div className="text-white font-semibold mb-1">Component failed to load</div>
          <div className="text-secondary text-sm mb-4">{this.state.error?.message}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-accent text-white rounded text-sm"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
