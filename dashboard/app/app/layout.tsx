export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Temporarily bypass auth checks
  return <>{children}</>;
}
