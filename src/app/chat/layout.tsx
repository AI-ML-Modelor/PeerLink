"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { PeerLinkLogo } from '@/components/icons/Logo';
import { MessageSquare, UserPlus, Settings, LogOut, Zap, Info, BellRing } from 'lucide-react';
import { ThemeToggle } from '@/components/chat/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DEFAULT_AVATAR_SVG_DATA_URI } from '@/types';
import { Badge } from '@/components/ui/badge';
import useLocalStorage from '@/hooks/useLocalStorage';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile, setUserProfile, isInitialized, announcements } = useAppContext();
  const [lastSeenAnnouncementId, setLastSeenAnnouncementId] = useLocalStorage<string>('lastSeenAnnouncementId', '');
  
  // Check if we've visited the announcements page
  const [hasSeenAnnouncements, setHasSeenAnnouncements] = useState(false);
  
  // Get the latest announcement ID or an empty string if none
  const latestAnnouncementId = announcements && announcements.length > 0 ? announcements[0].id : '';
  
  // Count unread announcements
  const hasAnnouncements = announcements?.length > 0;
  const unreadAnnouncementsCount = hasAnnouncements && lastSeenAnnouncementId !== latestAnnouncementId ? 
    announcements.length : 0;

  // Check if we're on the announcements page
  useEffect(() => {
    if (pathname === '/chat/announcements') {
      setHasSeenAnnouncements(true);
    }
  }, [pathname]);

  // On component unmount, check if we just left the announcements page
  useEffect(() => {
    return () => {
      if (pathname === '/chat/announcements' && hasSeenAnnouncements && latestAnnouncementId) {
        setLastSeenAnnouncementId(latestAnnouncementId);
      }
    };
  }, [pathname, hasSeenAnnouncements, latestAnnouncementId, setLastSeenAnnouncementId]);

  useEffect(() => {
    if (isInitialized && !userProfile) {
      router.replace('/onboarding');
    }
  }, [userProfile, router, isInitialized]);

  if (!isInitialized || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Zap className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  const handleLogout = () => {
    setUserProfile(null); 
    router.push('/onboarding');
  };
  
  // Handle navigation with direct router.push
  const handleNavigation = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(href);
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div 
              onClick={handleNavigation('/chat')} 
              className="cursor-pointer" 
              aria-label="PeerLink Home"
            >
              <PeerLinkLogo className="h-8 w-auto text-primary" />
            </div>
            <SidebarTrigger className="md:hidden" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="mt-2 px-2 space-y-1">
            <div
              onClick={handleNavigation('/chat')}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md cursor-pointer ${
                pathname === '/chat' || pathname.startsWith('/chat/messages') 
                  ? 'bg-accent text-accent-foreground' 
                  : 'hover:bg-accent/50'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chats</span>
            </div>
            
            <div
              onClick={handleNavigation('/chat/invite')}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md cursor-pointer ${
                pathname === '/chat/invite' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Users</span>
            </div>
            
            <div
              onClick={handleNavigation('/chat/settings')}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md cursor-pointer ${
                pathname === '/chat/settings' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </div>
            
            <div
              onClick={handleNavigation('/chat/about')}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md cursor-pointer ${
                pathname === '/chat/about' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
            >
              <Info className="h-4 w-4" />
              <span>About</span>
            </div>
            
            <div
              onClick={handleNavigation('/chat/announcements')}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md cursor-pointer ${
                pathname === '/chat/announcements' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center w-full">
                <BellRing className="h-4 w-4 mr-2" />
                <span className="flex-grow">Announcements</span>
                {unreadAnnouncementsCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {unreadAnnouncementsCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 mb-2">
             <Avatar>
                <AvatarImage src={DEFAULT_AVATAR_SVG_DATA_URI} alt={userProfile.displayName} />
                <AvatarFallback>{userProfile.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{userProfile.displayName}</span>
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>
          <ThemeToggle />
          <Button variant="ghost" className="w-full justify-start mt-2" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-full">
          <div className="flex-grow overflow-auto">
           {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
