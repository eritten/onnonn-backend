import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-brand-950 p-8">
          <div className="panel max-w-lg p-8 text-center">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm text-brand-muted">This screen crashed, but the rest of the app is still safe. Reload the window to continue.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
