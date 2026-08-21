import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FC] dark:bg-bg">
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
