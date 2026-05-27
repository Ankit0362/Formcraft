"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-red-100 p-4">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Something went wrong</h2>
        <p className="max-w-md text-muted-foreground">
          An unexpected error occurred. Our team has been notified. Please try again or contact support if the problem persists.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-red-50 p-4 text-left text-sm text-red-800">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = "/dashboard"}
          className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
