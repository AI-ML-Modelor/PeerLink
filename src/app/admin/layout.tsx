"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Zap, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { userProfile, isInitialized } = useAppContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    if (isInitialized) {
      if (!userProfile) {
        router.replace('/onboarding');
      } else {
        // In a real app, we'd check admin status from the server
        // For now, we'll use localStorage for demo purposes
        const adminToken = localStorage.getItem('admin-token');
        if (adminToken === 'admin123') {
          setIsAuthenticated(true);
        } else {
          router.replace('/chat/about');
        }
      }
      setIsLoading(false);
    }
  }, [isInitialized, userProfile, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Zap className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You don't have permission to access this area.</p>
        <Button onClick={() => router.push('/chat')}>Return to Chat</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {children}
    </div>
  );
} 