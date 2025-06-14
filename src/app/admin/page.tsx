"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  MessageSquare,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  PanelLeft,
  Send,
  AlertTriangle,
  BellRing,
  User,
  MessagesSquare,
  Search,
  ArrowLeft,
  Eye,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserProfile, PairedUser } from '@/types';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Type guard function to check if user is UserProfile
function isUserProfile(user: UserProfile | PairedUser): user is UserProfile {
  return 'phoneNumber' in user;
}

const BROADCAST_TYPES = {
  normal: { label: "Normal", icon: <Bell className="h-4 w-4 mr-2" /> },
  important: { label: "Important", icon: <BellRing className="h-4 w-4 mr-2" /> },
  urgent: { label: "Urgent", icon: <AlertTriangle className="h-4 w-4 mr-2" /> }
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const {
    userProfile,
    pairedUsers,
    chats,
    messages,
    broadcastAnnouncement,
    announcements,
    invites,
    deleteAnnouncement,
  } = useAppContext();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastType, setBroadcastType] = useState<"normal" | "important" | "urgent">("normal");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  
  // Get total stats for dashboard
  const totalUsers = pairedUsers.length + (userProfile ? 1 : 0);
  
  // Get unique users from invites (both inviters and invitees)
  const uniqueInviteUsers = new Set<string>();
  if (invites && invites.length > 0) {
    invites.forEach(invite => {
      uniqueInviteUsers.add(invite.inviterId);
      uniqueInviteUsers.add(invite.inviteeId);
    });
  }
  
  const totalUniqueUsers = uniqueInviteUsers.size;
  const totalChats = chats.length;
  const totalMessages = Object.values(messages).reduce((acc, chatMsgs) => acc + chatMsgs.length, 0);
  const totalInvites = invites ? invites.length : 0;
  
  // Mock data for join dates (in a real app this would come from backend)
  const mockJoinDates: Record<string, string> = {
    ...(userProfile?.userId ? { [userProfile.userId]: "2023-08-15 14:30" } : {}),
    ...pairedUsers.reduce((acc, user) => {
      // Generate a random date in the last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const formattedDate = `${date.toISOString().split('T')[0]} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      return { ...acc, [user.userId]: formattedDate };
    }, {} as Record<string, string>)
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (broadcastTitle.trim() && broadcastContent.trim()) {
      const formattedTitle = `${broadcastType !== "normal" ? `[${BROADCAST_TYPES[broadcastType].label.toUpperCase()}] ` : ""}${broadcastTitle}`;
      broadcastAnnouncement(formattedTitle, broadcastContent);
      toast({
        title: "Announcement Broadcast",
        description: `Your ${broadcastType} announcement has been sent to all users.`,
      });
      setBroadcastTitle("");
      setBroadcastContent("");
      setBroadcastType("normal");
    } else {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and content for the announcement.",
        variant: "destructive"
      });
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('admin-token');
    router.push('/chat/about');
  };

  // Get display name based on user type
  const getDisplayName = (user: UserProfile | PairedUser): string => {
    if (isUserProfile(user)) {
      return user.displayName;
    } else {
      // It's a PairedUser
      return user.localDisplayName || user.displayName;
    }
  };
  
  // Get phone number based on user type
  const getPhoneNumber = (user: UserProfile | PairedUser): string => {
    if (isUserProfile(user)) {
      return user.phoneNumber || "Not provided";
    } else {
      // It's a PairedUser - doesn't have phoneNumber in the type
      return "Not available for paired users";
    }
  };

  // Filter users based on search query (by name or phone number)
  const filteredUsers = [
    ...(userProfile ? [userProfile] : []), 
    ...pairedUsers
  ].filter(user => {
    const query = searchQuery.toLowerCase();
    const name = getDisplayName(user).toLowerCase();
    const phone = isUserProfile(user) ? user.phoneNumber?.toLowerCase() : '';
    return name.includes(query) || (phone && phone.includes(query));
  });
  
  // Get user's chats
  const getUserChats = (userId: string) => {
    return chats.filter(chat => 
      chat.participants.includes(userId)
    ).map(chat => {
      const otherUserId = chat.participants.find(id => id !== userId);
      const otherUser = otherUserId ? 
        (otherUserId === userProfile?.userId ? 
          userProfile : 
          pairedUsers.find(u => u.userId === otherUserId)
        ) : null;
      
      const chatMessages = messages[chat.chatId] || [];
      
      return {
        chat,
        otherUser,
        messageCount: chatMessages.length,
        lastMessage: chatMessages.length > 0 ? 
          chatMessages.sort((a, b) => b.timestamp - a.timestamp)[0] : 
          null
      };
    });
  };
  
  const selectedUser = viewingUserId === userProfile?.userId ? 
    userProfile : 
    pairedUsers.find(user => user.userId === viewingUserId);
  
  const selectedUserChats = viewingUserId ? getUserChats(viewingUserId) : [];

  // Function to handle deleting an announcement
  const handleDeleteAnnouncement = (announcementId: string) => {
    deleteAnnouncement(announcementId);
    toast({
      title: "Announcement Deleted",
      description: "The announcement has been removed from all users' views."
    });
  };

  // Format timestamp to human-readable date/time
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Count number of invites by a user
  const countInvitesByUser = (userId: string): number => {
    return invites ? invites.filter(invite => invite.inviterId === userId).length : 0;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b p-4 bg-card shadow-sm flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Exit Admin Panel
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="container py-8">
        {viewingUserId ? (
          // User Chat View
          <div>
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="ghost" 
                onClick={() => setViewingUserId(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Users
              </Button>
              <h2 className="text-xl font-semibold">
                Chats for: {selectedUser ? getDisplayName(selectedUser) : "Unknown"} 
                {selectedUser === userProfile ? " (You)" : ""}
              </h2>
            </div>
            
            <div className="grid gap-4">
              {selectedUserChats.length > 0 ? (
                selectedUserChats.map(({chat, otherUser, messageCount, lastMessage}) => (
                  <Card key={chat.chatId}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {otherUser ? 
                                getDisplayName(otherUser).substring(0, 2).toUpperCase() : 
                                "??"
                              }
                            </AvatarFallback>
                          </Avatar>
                          {otherUser ? 
                            (otherUser === userProfile ? 
                              `${otherUser.displayName} (You)` : 
                              getDisplayName(otherUser)
                            ) : 
                            "Unknown User"
                          }
                        </CardTitle>
                        <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                          {messageCount} messages
                        </span>
                      </div>
                      <CardDescription>
                        {otherUser && otherUser !== userProfile && 
                          `Phone: ${getPhoneNumber(otherUser)}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Messages</h4>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {(messages[chat.chatId] || [])
                              .sort((a, b) => b.timestamp - a.timestamp)
                              .slice(0, 10)
                              .map(msg => {
                                const sender = msg.senderId === userProfile?.userId ? 
                                  userProfile : 
                                  pairedUsers.find(u => u.userId === msg.senderId);
                                  
                                const senderName = sender === userProfile ? 
                                  `${sender.displayName} (Admin)` : 
                                  sender ? getDisplayName(sender) : "Unknown";
                                
                                return (
                                  <div 
                                    key={msg.messageId} 
                                    className={`p-3 rounded-lg ${
                                      msg.senderId === viewingUserId ? 
                                        "bg-primary/10 ml-8" : 
                                        "bg-muted mr-8"
                                    } ${
                                      msg.deletedForMe || msg.deletedForEveryone ? 
                                        "opacity-70" : ""
                                    }`}
                                  >
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs font-medium">{senderName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(msg.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm">
                                      {msg.deletedForEveryone ? 
                                        <span className="italic">[Message was deleted by user, but still visible to admin]</span> : 
                                        msg.text}
                                    </p>
                                    {msg.edited && <span className="text-xs text-muted-foreground">(edited)</span>}
                                    {(msg.deletedForMe && !msg.deletedForEveryone) && 
                                      <span className="text-xs text-muted-foreground">(deleted for sender only)</span>}
                                  </div>
                                );
                              })
                            }
                            {(messages[chat.chatId] || []).length > 10 && (
                              <p className="text-center text-xs text-muted-foreground pt-2">
                                Showing 10 most recent messages of {(messages[chat.chatId] || []).length} total
                              </p>
                            )}
                            {(messages[chat.chatId] || []).length === 0 && (
                              <p className="text-center text-xs text-muted-foreground py-8">
                                No messages in this conversation yet
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p>This user hasn't started any conversations yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalUsers}</div>
                  <p className="text-muted-foreground text-sm">Total registered users</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Chats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalChats}</div>
                  <p className="text-muted-foreground text-sm">Active conversations</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalMessages}</div>
                  <p className="text-muted-foreground text-sm">Total messages sent</p>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList>
                <TabsTrigger value="users">
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="invites">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invites ({totalInvites})
                </TabsTrigger>
                <TabsTrigger value="broadcast">
                  <Bell className="h-4 w-4 mr-2" />
                  Broadcast
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      View and manage all users on the platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                    
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map(user => (
                            <TableRow key={user.userId}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                      {getDisplayName(user).substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{getDisplayName(user)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {user === userProfile ? "Admin" : "User"}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                <div className="max-w-[200px] overflow-x-auto">
                                  {user.userId}
                                </div>
                              </TableCell>
                              <TableCell>
                                {isUserProfile(user) ? user.phoneNumber : "N/A"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViewingUserId(user.userId)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Chats
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invites">
                <Card>
                  <CardHeader>
                    <CardTitle>Invite Tracking</CardTitle>
                    <CardDescription>
                      Track all user invitations on the platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Inviter</TableHead>
                            <TableHead>Inviter ID</TableHead>
                            <TableHead>Invitee</TableHead>
                            <TableHead>Invitee ID</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Total Invites</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invites && invites.length > 0 ? (
                            invites.map((invite) => (
                              <TableRow key={invite.id}>
                                <TableCell>
                                  <div className="font-medium">{invite.inviterName}</div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  <div className="max-w-[200px] overflow-x-auto">
                                    {invite.inviterId}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{invite.inviteeName}</div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  <div className="max-w-[200px] overflow-x-auto">
                                    {invite.inviteeId}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatTimestamp(invite.timestamp)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{countInvitesByUser(invite.inviterId)}</Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4">
                                No invites recorded yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="broadcast">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle>Broadcast Announcement</CardTitle>
                      <CardDescription>
                        Send an announcement to all users on the platform
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="broadcast-type">Announcement Priority</Label>
                          <Select
                            value={broadcastType}
                            onValueChange={(value: "normal" | "important" | "urgent") => setBroadcastType(value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal" className="flex items-center">
                                <div className="flex items-center">
                                  {BROADCAST_TYPES.normal.icon}
                                  {BROADCAST_TYPES.normal.label}
                                </div>
                              </SelectItem>
                              <SelectItem value="important">
                                <div className="flex items-center">
                                  {BROADCAST_TYPES.important.icon}
                                  {BROADCAST_TYPES.important.label}
                                </div>
                              </SelectItem>
                              <SelectItem value="urgent">
                                <div className="flex items-center">
                                  {BROADCAST_TYPES.urgent.icon}
                                  {BROADCAST_TYPES.urgent.label}
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="broadcast-title">Announcement Title</Label>
                          <Input
                            id="broadcast-title"
                            placeholder="Title of your announcement"
                            value={broadcastTitle}
                            onChange={(e) => setBroadcastTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="broadcast-content">Announcement Content</Label>
                          <Textarea
                            id="broadcast-content"
                            placeholder="Enter the message you want to broadcast to all users"
                            rows={4}
                            value={broadcastContent}
                            onChange={(e) => setBroadcastContent(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button type="submit" className="w-full md:w-auto">
                            <Send className="h-4 w-4 mr-2" />
                            Send {broadcastType.charAt(0).toUpperCase() + broadcastType.slice(1)} Announcement
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Previous Announcements</CardTitle>
                      <CardDescription>
                        View and manage all sent announcements
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Content</TableHead>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {announcements && announcements.length > 0 ? (
                              announcements.map((announcement) => (
                                <TableRow key={announcement.id}>
                                  <TableCell className="font-medium">
                                    {announcement.title}
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate">
                                    {announcement.content}
                                  </TableCell>
                                  <TableCell>
                                    {announcement.date}
                                  </TableCell>
                                  <TableCell>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Delete
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this announcement? It will be removed from all users' announcement sections.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteAnnouncement(announcement.id)}>
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                  No announcements have been sent yet
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
} 