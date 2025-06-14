"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, Check, CheckCheck, XCircle, Zap, FileText, MoreVertical, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSchema, type MessageFormData } from '@/lib/schemas';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import type { Message, Chat } from '@/types';
import { DEFAULT_AVATAR_SVG_DATA_URI } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const { toast } = useToast();
  
  const { 
    userProfile, 
    getChatById, 
    getChatMessages, 
    addMessage, 
    updateMessageStatus, 
    clearChatMessages,
    markChatAsRead,
    editMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
    isInitialized,
    chats // Add chats here to re-render when chat details (like participant name) change
  } = useAppContext();

  const [chat, setChat] = useState<Chat | null | undefined>(undefined); 
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isClearChatAlertOpen, setIsClearChatAlertOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);


  const form = useForm<MessageFormData>({
    resolver: zodResolver(MessageSchema),
    defaultValues: { text: "" },
  });

  useEffect(() => {
    if (isInitialized && !userProfile) {
      router.replace('/onboarding');
    }
  }, [userProfile, router, isInitialized]);

  useEffect(() => {
    if (isInitialized && userProfile && chatId) {
      const currentChat = getChatById(chatId);
      setChat(currentChat);
      if (currentChat) {
        setMessages(getChatMessages(chatId));
        markChatAsRead(chatId); 
      }
    }
  }, [chatId, userProfile, getChatById, getChatMessages, markChatAsRead, isInitialized, chats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for demo
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 5MB for this demo.",
          variant: "destructive",
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; 
        }
        return;
      }
      setSelectedFile(file);
      // If text field is empty or just contains the old file name, update it
      if (!form.getValues("text") || (selectedFile && form.getValues("text") === selectedFile.name)) {
        form.setValue("text", file.name, { shouldValidate: true });
      }
    }
  };

  const onSubmit = (data: MessageFormData) => {
    if (!userProfile || !chat) return;

    const otherParticipantId = chat.participants.find(pId => pId !== userProfile.userId);
    if (!otherParticipantId) return;

    // Check if both text and file are empty
    if (!data.text && !selectedFile) {
      form.setError("text", { type: "manual", message: "Message or file attachment cannot be empty." });
      return;
    }
    
    // Editing an existing message
    if (editingMessageId) {
      editMessage(chatId, editingMessageId, data.text);
      setEditingMessageId(null);
      form.reset({ text: "" });
      return;
    }
    
    const newMessage: Message = {
      messageId: uuidv4(),
      chatId: chat.chatId,
      senderId: userProfile.userId,
      receiverId: otherParticipantId, 
      text: data.text, // Use the text from the form, which might be filename or custom message
      timestamp: Date.now(),
      status: 'sent', // Default status
    };

    if (selectedFile) {
      newMessage.file = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
      };
      // If the text field ONLY contains the filename, it implies no separate caption was written.
      // In this case, for display, we might prefer to show just the file.
      // However, the text field should still store the filename if that's what's in it.
    }

    addMessage(newMessage);
    // messages state will update via useEffect listening to getChatMessages/chats
    
    form.reset({ text: "" }); // Reset text field explicitly
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }

    // Simulate message delivery and read receipts for demo purposes
    setTimeout(() => {
      updateMessageStatus(chat.chatId, newMessage.messageId, 'delivered');
    }, 1000);
    setTimeout(() => {
      // Simulate read only if it's not the test buddy, or if test buddy is "online"
      // For simplicity, we'll just mark it as read for demo
      updateMessageStatus(chat.chatId, newMessage.messageId, 'read');
    }, 2500);
  };
  
  const handleClearChat = () => {
    if (!chat) return;
    clearChatMessages(chat.chatId);
    setMessages([]); // Immediately clear messages from local state for UI update
    toast({ title: "Chat Cleared", description: "All messages in this chat have been deleted."});
    setIsClearChatAlertOpen(false);
  };
  
  const handleStartEdit = (message: Message) => {
    if (message.senderId === userProfile?.userId) {
      // Only allow editing messages sent by the current user
      setEditingMessageId(message.messageId);
      form.setValue("text", message.text);
      
      // Cancel edit if user presses escape
      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setEditingMessageId(null);
          form.reset({ text: "" });
          window.removeEventListener('keydown', handleEscapeKey);
        }
      };
      
      window.addEventListener('keydown', handleEscapeKey);
    }
  };
  
  const handleDeleteForMe = () => {
    if (messageToDelete) {
      deleteMessageForMe(chatId, messageToDelete.messageId);
      setMessageToDelete(null);
      setIsDeleteAlertOpen(false);
      toast({ title: "Message Deleted", description: "The message has been deleted for you." });
    }
  };
  
  const handleDeleteForEveryone = () => {
    if (messageToDelete) {
      deleteMessageForEveryone(chatId, messageToDelete.messageId);
      setMessageToDelete(null);
      setIsDeleteAlertOpen(false);
      toast({ title: "Message Deleted", description: "The message has been deleted for everyone." });
    }
  };

  if (!isInitialized || userProfile === undefined) {
     return <div className="flex items-center justify-center h-full"><Zap className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (chat === undefined) { 
    return <div className="flex items-center justify-center h-full"><Zap className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <XCircle className="w-24 h-24 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Chat Not Found</h2>
        <p className="text-muted-foreground mb-4">This chat doesn't exist or you don't have access.</p>
        <Button asChild>
          <Link href="/chat">Go to Chats</Link>
        </Button>
      </div>
    );
  }

  const otherParticipantId = chat.participants.find(pId => pId !== userProfile?.userId);
  const otherParticipantDetails = otherParticipantId ? chat.participantDetails[otherParticipantId] : { displayName: "Unknown User", avatar: DEFAULT_AVATAR_SVG_DATA_URI };

  const renderMessageStatus = (status: Message['status']) => {
    if (status === 'read') return <CheckCheck className="h-4 w-4 text-accent" />; // Or a different color like blue for read
    if (status === 'delivered') return <CheckCheck className="h-4 w-4" />; // Double check for delivered
    if (status === 'sent') return <Check className="h-4 w-4" />; // Single check for sent
    return null; // No icon for 'failed' or undefined
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Helper to determine if a message can be edited (within 1 hour of sending)
  const canEditMessage = (message: Message) => {
    return (
      message.senderId === userProfile?.userId && 
      !message.deletedForEveryone &&
      !message.deletedForMe &&
      Date.now() - message.timestamp < 3600000 // 1 hour in milliseconds
    );
  };

  // Helper to determine if user can delete a message
  const canDeleteMessage = (message: Message) => {
    return (
      message.senderId === userProfile?.userId && 
      !message.deletedForEveryone &&
      !message.deletedForMe
    );
  };
  
  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center border-b p-3 shadow-sm">
        <Link href="/chat" className="mr-2">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Avatar>
          <AvatarImage src={otherParticipantDetails.avatar} />
          <AvatarFallback>
            {otherParticipantDetails.displayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3 flex-1">
          <h2 className="font-medium text-foreground">{otherParticipantDetails.displayName}</h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsClearChatAlertOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 opacity-50">
            <p>No messages yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          messages.map(message => {
            // Skip rendering messages deleted for the current user
            if (message.deletedForMe) return null;
            
            const isSentByMe = message.senderId === userProfile?.userId;
            const senderName = isSentByMe 
              ? userProfile?.displayName 
              : otherParticipantDetails.displayName;
            const senderAvatar = isSentByMe 
              ? userProfile?.avatar || DEFAULT_AVATAR_SVG_DATA_URI
              : otherParticipantDetails.avatar;
              
            return (
              <div key={message.messageId} className={cn("flex items-end gap-2", isSentByMe ? "justify-end" : "")}>
                {!isSentByMe && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={senderAvatar} />
                    <AvatarFallback>{senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[75%] relative group", isSentByMe ? "items-end" : "")}>
                  {/* Message Bubble */}
                  <div 
                    className={cn(
                      "px-3 py-2 rounded-lg",
                      isSentByMe ? "bg-primary text-primary-foreground" : "bg-muted",
                      message.deletedForEveryone ? "italic opacity-50" : ""
                    )}
                  >
                    {/* Message content */}
                    {message.deletedForEveryone ? (
                      <p>This message was deleted</p>
                    ) : (
                      <>
                        {message.file && (
                          <div className="flex items-center space-x-1 mb-1 p-2 bg-background/30 rounded-md">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <div className="overflow-hidden text-sm">
                              <p className="truncate">{message.file.name}</p>
                              <p className="text-xs opacity-80">{formatFileSize(message.file.size)}</p>
                            </div>
                          </div>
                        )}
                        <p>{message.text}</p>
                        {message.edited && (
                          <span className="text-xs opacity-70 ml-1">(edited)</span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Message dropdown with edit/delete options */}
                  {!message.deletedForEveryone && isSentByMe && (
                    <div className="absolute right-0 top-0 -mt-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {canEditMessage(message) && (
                            <DropdownMenuItem onClick={() => handleStartEdit(message)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Message
                            </DropdownMenuItem>
                          )}
                          {canDeleteMessage(message) && (
                            <DropdownMenuItem onClick={() => {
                              setMessageToDelete(message);
                              setIsDeleteAlertOpen(true);
                            }}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Message
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  {/* Message metadata */}
                  <div className={cn(
                    "flex items-center text-[10px] text-muted-foreground mt-1",
                    isSentByMe ? "justify-end" : "justify-start"
                  )}>
                    <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
                    {isSentByMe && (
                      <span className="ml-1">{renderMessageStatus(message.status)}</span>
                    )}
                  </div>
                </div>
                {isSentByMe && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={senderAvatar} />
                    <AvatarFallback>{senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
        {/* A dummy div for scrolling to the bottom */}
        <div ref={messagesEndRef} className="py-1" />
      </div>

      <div className="p-3 border-t">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
            >
              <Paperclip className="h-5 w-5" />
              <input 
                type="file" 
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </Button>
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input 
                      placeholder={
                        editingMessageId 
                          ? "Edit your message..." 
                          : selectedFile 
                            ? "Add a caption or send without one..." 
                            : "Type a message..."
                      } 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <Button type="submit" size="icon" className="flex-shrink-0">
              <Send className="h-5 w-5" />
            </Button>
            {editingMessageId && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setEditingMessageId(null);
                  form.reset({ text: "" });
                }}
              >
                Cancel
              </Button>
            )}
          </form>
        </Form>
        {selectedFile && (
          <div className="mt-2 p-2 bg-muted rounded-md flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="h-7 w-7 p-0"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Clear Chat Confirmation */}
      <AlertDialog open={isClearChatAlertOpen} onOpenChange={setIsClearChatAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear entire chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages in this conversation for you. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Message Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to delete this message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="sm:mt-0">Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleDeleteForMe}>
              Delete for me
            </Button>
            <AlertDialogAction onClick={handleDeleteForEveryone}>
              Delete for everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
