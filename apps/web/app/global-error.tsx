"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", padding: "32px", fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ color: "#666", maxWidth: "400px", textAlign: "center" }}>
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{ padding: "10px 24px", backgroundColor: "#000", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
