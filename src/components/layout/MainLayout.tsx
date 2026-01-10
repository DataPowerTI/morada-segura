import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
        <div className="container py-6 px-4 md:px-6 max-w-7xl">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
