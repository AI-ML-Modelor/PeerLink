"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Info, Users, Zap, ShieldCheck, Smartphone, Instagram as InstagramIconLucide, Send, Lock, User, MessageSquare, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';

// Simple Instagram SVG Icon (Lucide might not have a brand icon)
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export default function AboutPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [currentAdminTab, setCurrentAdminTab] = useState("broadcast");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  
  const { 
    userProfile, 
    pairedUsers, 
    chats, 
    messages, 
    isInitialized, 
    broadcastAnnouncement 
  } = useAppContext();

  useEffect(() => {
    if (isInitialized && !userProfile) {
      router.replace('/onboarding');
    }
  }, [isInitialized, userProfile, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100); // Short delay to trigger animation
    return () => clearTimeout(timer);
  }, []);

  const features = [
    { icon: <Zap className="h-5 w-5 text-primary" />, text: "Offline Chat Functionality" },
    { icon: <Users className="h-5 w-5 text-primary" />, text: "Unique Invite-based User Connection" },
    { icon: <ShieldCheck className="h-5 w-5 text-primary" />, text: "Secure and Private Communication" },
    { icon: <Smartphone className="h-5 w-5 text-primary" />, text: "Lightweight and User-Friendly Interface" },
  ];

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check (in real app, this would use proper authentication)
    if (adminPassword === "admin123") {
      // Store admin token in localStorage
      localStorage.setItem('admin-token', 'admin123');
      setIsAdminDialogOpen(false);
      setAdminPassword("");
      // Redirect to admin dashboard
      router.push('/admin');
    } else {
      toast({
        title: "Invalid Password",
        description: "The admin password is incorrect.",
        variant: "destructive"
      });
    }
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (broadcastTitle.trim() && broadcastContent.trim()) {
      broadcastAnnouncement(broadcastTitle, broadcastContent);
      toast({
        title: "Announcement Broadcast",
        description: "Your announcement has been sent to all users.",
      });
      setBroadcastTitle("");
      setBroadcastContent("");
    } else {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and content for the announcement.",
        variant: "destructive"
      });
    }
  };

  // Get total chats, messages, and users for admin stats
  const totalUsers = pairedUsers.length + (userProfile ? 1 : 0);
  const totalChats = chats.length;
  const totalMessages = Object.values(messages).reduce((acc, chatMsgs) => acc + chatMsgs.length, 0);

  return (
    <div
      className={`h-full flex flex-col p-4 md:p-6 space-y-6 overflow-y-auto pb-20 transition-opacity duration-500 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0 translate-y-2'
      }`}
    >
      <header className="pb-4 border-b">
        <h1 className="text-2xl font-headline font-semibold flex items-center">
          <Info className="mr-3 text-primary" />About PeerLink
        </h1>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">App Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            This app is designed to provide seamless offline communication between users — even without internet, Wi-Fi, or Bluetooth. Using an innovative pairing system, users can securely connect and chat via unique invite links.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center space-x-3">
                {feature.icon}
                <span className="text-foreground">{feature.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Admin Panel (modal dialog) when it's open */}
      {isAdminPanelOpen && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Admin Dashboard
            </CardTitle>
            <CardDescription>System management interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Admin Panel stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <User className="h-5 w-5 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Users</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <MessageSquare className="h-5 w-5 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{totalChats}</div>
                  <p className="text-xs text-muted-foreground">Chats</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <UsersRound className="h-5 w-5 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{totalMessages}</div>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Admin Panel tabs */}
            <Tabs defaultValue={currentAdminTab} onValueChange={setCurrentAdminTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="chats">Chats</TabsTrigger>
              </TabsList>
              
              {/* Broadcast Tab */}
              <TabsContent value="broadcast" className="p-4">
                <form onSubmit={handleBroadcastSubmit} className="space-y-4">
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
                      rows={4}
                      value={broadcastContent}
                      onChange={(e) => setBroadcastContent(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Broadcast Announcement
                  </Button>
                </form>
              </TabsContent>
              
              {/* Users Tab */}
              <TabsContent value="users" className="max-h-[400px] overflow-y-auto">
                <div className="space-y-4">
                  {userProfile && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{userProfile.displayName} (You)</p>
                            <p className="text-xs text-muted-foreground">{userProfile.phoneNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">{userProfile.userId}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {pairedUsers.map(user => (
                    <Card key={user.userId}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{user.localDisplayName || user.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.userId}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              {/* Chats Tab */}
              <TabsContent value="chats" className="max-h-[400px] overflow-y-auto">
                <div className="space-y-4">
                  {chats.map(chat => {
                    const otherUserId = chat.participants.find(id => id !== userProfile?.userId);
                    const otherUser = otherUserId ? chat.participantDetails[otherUserId] : null;
                    const chatMessages = messages[chat.chatId] || [];
                    
                    return (
                      <Card key={chat.chatId}>
                        <CardContent className="p-4">
                          <div>
                            <div className="flex justify-between">
                              <p className="font-medium">
                                {otherUser ? otherUser.displayName : 'Unknown User'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {chatMessages.length} messages
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              ID: {chat.chatId}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
            
            <Button variant="destructive" onClick={() => setIsAdminPanelOpen(false)}>
              Close Admin Panel
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Developer Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium text-foreground">Name</p>
            <p className="text-muted-foreground">Shubham Sharma</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-foreground">Contact Email</p>
            <a
              href="mailto:aimldevelopershubham@gmail.com"
              className="text-primary hover:underline flex items-center group"
            >
              <Mail className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              aimldevelopershubham@gmail.com
            </a>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground mb-2">Connect</p>
              <Button
                  variant="outline"
                  onClick={() => window.open('https://www.instagram.com/s__h__u__b__h__a_mm', '_blank')}
                  className="w-full md:w-auto"
              >
                  <InstagramIcon className="h-5 w-5 mr-2" />
                  Follow on Instagram
              </Button>
            </div>
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsAdminDialogOpen(true)}
                title="Admin Access"
                className="opacity-30 hover:opacity-100 transition-opacity"
              >
                <Lock className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <footer className="text-center text-xs text-muted-foreground pt-4">
        PeerLink App &copy; {new Date().getFullYear()}
      </footer>

      {/* Admin Authentication Dialog */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Admin Authentication
            </DialogTitle>
            <DialogDescription>
              Enter your administrator password to access system controls.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdminAuth} className="space-y-4 pt-4">
            <div className="grid w-full items-center gap-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input 
                id="admin-password"
                type="password" 
                placeholder="Enter admin password" 
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">Hint: The password is "admin123"</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdminDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Login
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
