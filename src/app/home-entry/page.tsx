
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeEntryPage() {
  const router = useRouter();
  const { userProfile, isInitialized } = useAppContext();

  useEffect(() => {
    if (!isInitialized) return;

    if (userProfile) {
      router.replace('/chat');
    } else {
      router.replace('/onboarding');
    }
  }, [userProfile, router, isInitialized]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    </div>
  );
}
