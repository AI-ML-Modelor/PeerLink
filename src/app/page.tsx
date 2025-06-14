"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Zap } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { userProfile, isInitialized } = useAppContext();

  useEffect(() => {
    if (isInitialized) {
      if (userProfile) {
        window.location.href = '/chat';
      } else {
        window.location.href = '/onboarding';
      }
    }
  }, [isInitialized, userProfile]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Zap className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
