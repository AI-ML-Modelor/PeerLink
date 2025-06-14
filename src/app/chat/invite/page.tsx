"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Copy, UserMinus, UserPlus, Users, Zap, Pencil } from 'lucide-react';
import { AcceptInviteSchema, type AcceptInviteFormData, RenamePairedUserSchema, type RenamePairedUserFormData } from "@/lib/schemas";
import type { PairedUser } from '@/types';
import { DEFAULT_AVATAR_SVG_DATA_URI } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";


export default function InvitePage() {
  const { userProfile, pairedUsers, addPairedUser, removePairedUser, updatePairedUserLocalDisplayName, createOrGetChat, isInitialized, addInvite } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<PairedUser | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  const acceptInviteForm = useForm<AcceptInviteFormData>({
    resolver: zodResolver(AcceptInviteSchema),
    defaultValues: {
      inviteLink: "",
    },
  });

  const renameUserForm = useForm<RenamePairedUserFormData>({
    resolver: zodResolver(RenamePairedUserSchema),
    defaultValues: {
      localDisplayName: "",
    },
  });
  
  useEffect(() => {
    if (isInitialized && !userProfile) {
      router.replace('/onboarding');
    }
  }, [userProfile, router, isInitialized]);

  useEffect(() => {
    if (editingUser) {
      renameUserForm.reset({ localDisplayName: editingUser.localDisplayName || editingUser.displayName });
    }
  }, [editingUser, renameUserForm]);


  if (!isInitialized || !userProfile) {
    return <div className="flex items-center justify-center h-full"><Zap className="h-16 w-16 animate-pulse text-primary" /></div>;
  }

  const handleCopyLink = () => {
    if (!userProfile?.inviteLink) return;
    navigator.clipboard.writeText(userProfile.inviteLink)
      .then(() => {
        toast({ title: "Copied!", description: "Invite link copied to clipboard." });
      })
      .catch(err => {
        console.error("Clipboard copy failed:", err);
        toast({ title: "Error", description: "Could not copy link. Your browser might not support this feature or permissions might be denied.", variant: "destructive" });
      });
  };
  

  function onAcceptInviteSubmit(data: AcceptInviteFormData) {
    if (!userProfile) {
      toast({ title: "Error", description: "User profile not found.", variant: "destructive" });
      return;
    }
    try {
      const invitedUserId = data.inviteLink.substring("peerlink://invite/".length);
      
      if (invitedUserId === userProfile.userId) {
        toast({ title: "Oops!", description: "You can't pair with yourself.", variant: "destructive" });
        return;
      }

      if (pairedUsers.find(u => u.userId === invitedUserId)) {
        toast({ title: "Already Paired", description: "You are already paired with this user.", variant: "default" });
        acceptInviteForm.reset();
        return;
      }
      
      // This displayName is temporary; actual display name should be fetched or handled by user
      // For this app, we'll use a generic one, and user can rename.
      const invitedUserDisplayName = `User ${invitedUserId.substring(0, 6)}`;

      const newPairedUser: PairedUser = {
        userId: invitedUserId,
        displayName: invitedUserDisplayName, 
        avatar: DEFAULT_AVATAR_SVG_DATA_URI, // Set default avatar
        // localDisplayName will be undefined initially
      };
      
      // Add the paired user
      addPairedUser(newPairedUser);
      
      // Explicitly track the invite in case the inviterId isn't the current user
      // (this helps ensure our invite tracking is complete)
      addInvite(
        invitedUserId,
        userProfile.userId,
        invitedUserDisplayName,
        userProfile.displayName
      );
      
      // createOrGetChat will use the displayName from PairedUser if localDisplayName is not set
      const chat = createOrGetChat(newPairedUser.userId, newPairedUser.displayName, newPairedUser.avatar);
      
      toast({ title: "Successfully Paired!", description: `You are now connected with ${newPairedUser.displayName}.` });
      acceptInviteForm.reset();
      router.push(`/chat/messages/${chat.chatId}`); // Navigate to the new chat

    } catch (error) {
      let message = "Failed to process invite link.";
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      
      toast({ title: "Pairing Failed", description: message, variant: "destructive" });
      console.error("Pairing error:", error);
    }
  }

  const confirmUnpair = (userId: string) => {
    removePairedUser(userId);
    toast({ title: "Unpaired", description: "User has been unpaired. Chat history remains." });
  };

  const handleOpenRenameDialog = (user: PairedUser) => {
    setEditingUser(user);
    setIsRenameDialogOpen(true);
  };

  const onRenameUserSubmit = (data: RenamePairedUserFormData) => {
    if (editingUser) {
      updatePairedUserLocalDisplayName(editingUser.userId, data.localDisplayName);
      toast({ title: "Renamed", description: `User renamed to ${data.localDisplayName}.`});
      setIsRenameDialogOpen(false);
      setEditingUser(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><UserPlus className="mr-3 text-primary"/>Share Your Invite Link</CardTitle>
          <CardDescription>
            Your unique invite link is automatically generated. Share it with friends to connect and chat offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input type="text" value={userProfile.inviteLink || ""} readOnly className="bg-muted"/>
            <Button variant="outline" size="icon" onClick={handleCopyLink} aria-label="Copy invite link" disabled={!userProfile.inviteLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><UserPlus className="mr-3 text-accent"/>Accept an Invite</CardTitle>
          <CardDescription>
            Paste an invite link from a friend to connect with them. Only app-generated links are valid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...acceptInviteForm}>
            <form onSubmit={acceptInviteForm.handleSubmit(onAcceptInviteSubmit)} className="space-y-4">
              <FormField
                control={acceptInviteForm.control}
                name="inviteLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Friend's Invite Link</FormLabel>
                    <FormControl>
                      <Input placeholder="peerlink://invite/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Connect</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg flex-grow flex flex-col min-h-0">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><Users className="mr-3 text-primary"/>Paired Devices</CardTitle>
          <CardDescription>
            Manage your connected devices. Unpairing will remove them from this list, but will not delete your chat history. You can set a local display name for them.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          {pairedUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No devices paired yet.</p>
          ) : (
            <ScrollArea className="h-full max-h-[300px] pr-3"> {/* Ensure ScrollArea has defined height for scrolling */}
              <ul className="space-y-3">
                {pairedUsers.map((user) => {
                  const displayUserName = user.localDisplayName || user.displayName;
                  return (
                  <li key={user.userId} className="flex items-center justify-between p-3 bg-muted/30 rounded-md hover:bg-muted/60">
                    <div className="flex items-center space-x-3">
                       <Avatar className="h-10 w-10">
                         <AvatarImage src={user.avatar} alt={displayUserName} />
                         <AvatarFallback>{displayUserName.substring(0,2).toUpperCase()}</AvatarFallback>
                       </Avatar>
                       <div>
                         <p className="font-medium text-sm">{displayUserName}</p>
                         <p className="text-xs text-muted-foreground">ID: {user.userId.substring(0,8)}...</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleOpenRenameDialog(user)} aria-label="Rename user">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" aria-label="Unpair user">
                            <UserMinus className="h-4 w-4"/>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to unpair?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove <span className="font-semibold">{displayUserName}</span> from your paired devices. 
                              Your chat history with them will not be deleted. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => confirmUnpair(user.userId)} className="bg-destructive hover:bg-destructive/90">
                              Unpair
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                )})}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Paired User</DialogTitle>
              <DialogDescription>
                Set a local display name for '{editingUser.displayName}'. This name is only visible to you.
              </DialogDescription>
            </DialogHeader>
            <Form {...renameUserForm}>
              <form onSubmit={renameUserForm.handleSubmit(onRenameUserSubmit)} className="space-y-4 py-2">
                <FormField
                  control={renameUserForm.control}
                  name="localDisplayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save Name</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
