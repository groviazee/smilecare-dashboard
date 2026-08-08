import React from "react";

// Production-readiness addition: without this, any unexpected rendering
// error (a bad API response shape, a null field the UI didn't expect, etc.)
// crashes the whole React tree to a blank white page with no explanation.
// This catches that, shows a plain-language message, and offers a reload —
// staff at a front desk should never be staring at a blank screen with no
// idea what happened or what to do next.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard crashed:", error, info);
    // Optional hook: Dashboard passes onError to also write this into the
    // execution_errors table (already shown in the Alerts tab), so a crash
    // doesn't just vanish into one staff member's browser console — someone
    // checking Alerts later will actually see it happened.
    if (this.props.onError) {
      try { this.props.onError(error, info); } catch (_e) { /* logging itself must never crash */ }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 w-full max-w-sm text-center">
            <p className="text-2xl mb-2">⚠️</p>
            <h1 className="font-semibold text-stone-900 mb-1">Something went wrong</h1>
            <p className="text-xs text-stone-500 mb-4">
              The dashboard hit an unexpected error. Reloading usually fixes it — your data in Supabase is safe either way.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-medium"
            >
              Reload dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
