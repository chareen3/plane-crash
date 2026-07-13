import { cookies } from "next/headers";
import { DashboardRoot } from "../_components/DashboardRoot";
import { MOBILE_COOKIE } from "../_hooks/useIsMobile";

export default async function MainDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const initialIsMobile = jar.get(MOBILE_COOKIE)?.value === "1";

  return (
    <DashboardRoot initialIsMobile={initialIsMobile}>{children}</DashboardRoot>
  );
}
