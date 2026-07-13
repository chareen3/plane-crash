"use client";

/** Shared spacing wrapper for mobile secondary pages */
export function MobilePageChrome({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="m-page">
      <div className="m-page-head">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="m-page-body">{children}</div>
    </div>
  );
}
