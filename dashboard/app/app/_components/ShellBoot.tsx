"use client";

/**
 * Neutral full-screen boot while mobile/desktop shell is resolved.
 * Prevents a flash of the old desktop layout on phone refresh.
 */
export function ShellBoot() {
  return (
    <div
      className="m-shell-boot"
      aria-busy="true"
      aria-label="Loading"
      style={{
        minHeight: "100dvh",
        height: "100%",
        width: "100%",
        background: "#060a14",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: "#6b7594",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(0,255,213,0.25)",
          boxShadow: "0 0 24px rgba(0,255,213,0.15)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={44} height={44} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div
        style={{
          width: 28,
          height: 28,
          border: "2px solid rgba(0,255,213,0.2)",
          borderTopColor: "#00ffd5",
          borderRadius: "50%",
          animation: "mShellSpin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes mShellSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
