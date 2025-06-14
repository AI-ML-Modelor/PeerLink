"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, BellRing, AlertTriangle, ChevronDown, ChevronUp, Home } from 'lucide-react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// Helper function to extract priority from announcement title
const extractPriority = (title: string) => {
  if (title.startsWith('[URGENT]')) return { type: 'urgent', cleanTitle: title.replace('[URGENT] ', '') };
  if (title.startsWith('[IMPORTANT]')) return { type: 'important', cleanTitle: title.replace('[IMPORTANT] ', '') };
  return { type: 'normal', cleanTitle: title };
};

// Helper function to get priority icon
const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case 'important':
      return <BellRing className="h-5 w-5 text-warning" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

// Helper function to get priority badge
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <Badge variant="destructive">Urgent</Badge>;
    case 'important':
      return <Badge variant="outline" className="border-warning text-warning">Important</Badge>;
    default:
      return null;
  }
};

// Helper function to make links clickable in content
const linkify = (text: string) => {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split the text by URLs and create React elements
  const parts = text.split(urlRegex);
  
  // Map through parts to convert URLs to anchor tags
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
          onClick={(e) => e.stopPropagation()} // Prevent parent card click handler
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function AnnouncementsPage() {
  const router = useRouter();
  const { announcements, isInitialized, markAnnouncementAsRead } = useAppContext();
  const [lastSeenAnnouncementId, setLastSeenAnnouncementId] = useLocalStorage<string>('lastSeenAnnouncementId', '');
  const [openAnnouncements, setOpenAnnouncements] = useState<Set<string>>(new Set());
  const [viewedOnce, setViewedOnce] = useState(false);
  
  // Toggle announcement open/closed state
  const toggleAnnouncement = (id: string) => {
    setOpenAnnouncements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Flag that user has viewed this page
  useEffect(() => {
    setViewedOnce(true);
  }, []);
  
  // Only mark as read when user has actually viewed the page
  useEffect(() => {
    if (announcements && announcements.length > 0 && viewedOnce) {
      // Mark the newest announcement as seen when the component is unmounted (user leaves)
      const handleBeforeUnload = () => {
        setLastSeenAnnouncementId(announcements[0].id);
      };
      
      // Add event listener for page navigation
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // Update last seen when leaving the page
        setLastSeenAnnouncementId(announcements[0].id);
      };
    }
  }, [announcements, viewedOnce, setLastSeenAnnouncementId]);

  // Navigation functions
  const navigateTo = (path: string) => () => {
    // Update last seen on navigation if we've viewed the announcements
    if (viewedOnce && announcements && announcements.length > 0) {
      setLastSeenAnnouncementId(announcements[0].id);
    }
    router.push(path);
  };

  if (!isInitialized) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={navigateTo('/chat')}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
        <h1 className="text-2xl font-bold">Announcements</h1>
      </div>
      
      <div className="fixed bottom-4 right-4 z-10">
        <Button 
          size="lg" 
          onClick={navigateTo('/chat')}
          className="shadow-lg"
        >
          Back to Chats
        </Button>
      </div>
      
      {announcements && announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const { type: priority, cleanTitle } = extractPriority(announcement.title);
            const isOpen = openAnnouncements.has(announcement.id);
            
            return (
              <Card 
                key={announcement.id} 
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => toggleAnnouncement(announcement.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(priority)}
                      <div>
                        <CardTitle className="text-lg">
                          {cleanTitle}
                        </CardTitle>
                        <CardDescription>
                          {announcement.date}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(priority)}
                      {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="pt-2">
                    <p className="whitespace-pre-wrap">{linkify(announcement.content)}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
          <BellRing className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-center">No announcements yet.</p>
          <p className="text-center text-sm">Check back later for updates and announcements.</p>
        </div>
      )}
    </div>
  );
} 