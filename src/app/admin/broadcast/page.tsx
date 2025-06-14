"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Send, AlertTriangle, Bell, BellRing, CheckCircle } from 'lucide-react';
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';

export default function BroadcastPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { broadcastAnnouncement, announcements } = useAppContext();
  
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastType, setBroadcastType] = useState<"normal" | "important" | "urgent">("normal");
  const [isSending, setIsSending] = useState(false);
  
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and content for the announcement.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      // Format the title according to priority
      const formattedTitle = `${broadcastType !== "normal" ? `[${broadcastType.toUpperCase()}] ` : ""}${broadcastTitle}`;
      
      // Create broadcast with priority metadata
      broadcastAnnouncement(formattedTitle, broadcastContent);
      
      toast({
        title: "Announcement Broadcast Successful",
        description: `Your ${broadcastType} announcement has been sent to all users.`,
      });
      
      // Reset form
      setBroadcastTitle("");
      setBroadcastContent("");
      setBroadcastType("normal");
    } catch (error) {
      toast({
        title: "Broadcast Failed",
        description: "There was a problem sending your announcement.",
        variant: "destructive"
      });
    }
    
    setIsSending(false);
  };
  
  // Helper function to extract priority from announcement title
  const extractPriority = (title: string) => {
    if (title.startsWith('[URGENT]')) return 'urgent';
    if (title.startsWith('[IMPORTANT]')) return 'important';
    return 'normal';
  };
  
  // Helper to get icon based on priority type
  const getPriorityIcon = (type: string) => {
    switch(type) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'important':
        return <BellRing className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Broadcast Management</h1>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Broadcast Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Create New Announcement</CardTitle>
              <CardDescription>
                Broadcast messages to all users on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBroadcastSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label>Announcement Priority</Label>
                  <RadioGroup 
                    className="grid grid-cols-3 gap-4"
                    value={broadcastType} 
                    onValueChange={(value) => setBroadcastType(value as "normal" | "important" | "urgent")}
                  >
                    <div>
                      <RadioGroupItem 
                        value="normal" 
                        id="normal" 
                        className="peer sr-only" 
                      />
                      <Label
                        htmlFor="normal"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <Bell className="mb-3 h-6 w-6" />
                        Normal
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem
                        value="important"
                        id="important"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="important"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <BellRing className="mb-3 h-6 w-6" />
                        Important
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem
                        value="urgent"
                        id="urgent"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="urgent"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <AlertTriangle className="mb-3 h-6 w-6" />
                        Urgent
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Announcement Title</Label>
                  <Input
                    id="title"
                    placeholder="Title of your announcement"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Announcement Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter the message you want to broadcast to all users"
                    rows={6}
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                  />
                </div>
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg" 
                    disabled={isSending}
                  >
                    {isSending ? (
                      <>Sending Announcement...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Broadcast to All Users
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Previous Broadcasts */}
        <Card className="shadow-md h-fit">
          <CardHeader>
            <CardTitle>Previous Announcements</CardTitle>
            <CardDescription>
              History of recent broadcasts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {announcements && announcements.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {announcements.map((announcement, index) => (
                  <AccordionItem value={`item-${index}`} key={announcement.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2 text-left">
                        {getPriorityIcon(extractPriority(announcement.title))}
                        <span className="text-sm font-medium truncate">
                          {announcement.title}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm">
                        <p className="mb-2">{announcement.content}</p>
                        <div className="text-xs text-muted-foreground mt-2">
                          Sent: {announcement.date}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <BellRing className="h-10 w-10 mb-2 opacity-20" />
                <p>No announcements have been sent yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 