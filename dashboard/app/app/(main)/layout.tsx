"use client";

import { DashboardRoot } from "../_components/DashboardRoot";

export default function MainDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardRoot>{children}</DashboardRoot>;
}
