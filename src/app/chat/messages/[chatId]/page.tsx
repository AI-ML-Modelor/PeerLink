"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, Check, CheckCheck, XCircle, Zap, FileText, MoreVertical, Trash2, Pencil, CornerUpRight, MessageSquareQuote, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSchema, type MessageFormData } from '@/lib/schemas';
import type { Message, Chat } from '@/types';
import { DEFAULT_AVATAR_SVG_DATA_URI } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import P2PConnect from '@/components/P2PConnect';
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
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

// Add this new component to handle automatic recovery
const ChatRecovery = ({ chatId }: { chatId: string }) => {
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    // If we've retried less than 3 times automatically
    if (retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Automatically recovering chat: attempt ${retryCount + 1}`);
        // Force reload the page
        window.location.reload();
      }, 1000); // Wait 1 second before reloading
      
      return () => clearTimeout(timer);
    }
  }, [retryCount]);
  
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">Loading chat failed</h3>
      <p className="text-muted-foreground mb-4">Automatically retrying ({retryCount}/3)...</p>
      <Button 
        onClick={() => {
          setRetryCount(prev => prev + 1);
          window.location.reload();
        }}
      >
        Retry Manually
      </Button>
      <Button 
        variant="outline" 
        className="mt-2"
        onClick={() => {
          window.location.href = '/chat';
        }}
      >
        Return to Chat List
      </Button>
    </div>
  );
};

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
    chats,
    pairedUsers
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [longPressTimeoutId, setLongPressTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const form = useForm<MessageFormData>({
    resolver: zodResolver(MessageSchema),
    defaultValues: { text: "" },
  });

  useEffect(() => {
    if (isInitialized && !userProfile) {
      router.replace('/onboarding');
      return;
    }

    if (isInitialized && userProfile && chatId) {
      let chatData = getChatById(chatId);
      
      // If the chat exists, load it
      if (chatData) {
        setChat(chatData);
        setMessages(getChatMessages(chatId));
        markChatAsRead(chatId);
      }
      // If chat doesn't exist but we're initialized, try to recover by loading from storage directly
      else if (isInitialized) {
        try {
          const storedChats = localStorage.getItem('peerlink-chats');
          if (storedChats) {
            const parsedChats = JSON.parse(storedChats) as Chat[];
            const storedChat = parsedChats.find(c => c.chatId === chatId);
            if (storedChat) {
              console.log("Chat recovered from localStorage directly");
              setChat(storedChat);
              
              // Also try to find messages
              const storedMessages = localStorage.getItem('peerlink-messages');
              if (storedMessages) {
                const parsedMessages = JSON.parse(storedMessages);
                const chatMessages = parsedMessages[chatId] || [];
                setMessages(chatMessages);
              }
            }
          }
        } catch (error) {
          console.error("Error recovering chat from localStorage:", error);
        }
      }
    }
  }, [chatId, userProfile, getChatById, getChatMessages, markChatAsRead, isInitialized, chats, router]);
  
  useEffect(() => {
    // Set up an interval to refresh messages every second
    const messageRefreshInterval = setInterval(() => {
      if (isInitialized && userProfile && chatId && chat) {
        const latestMessages = getChatMessages(chatId);
        
        // Check if messages are missing
        if (latestMessages.length !== messages.length) {
          console.log(`Messages state mismatch: Local ${messages.length}, Storage ${latestMessages.length}`);
          setMessages(latestMessages);
          
          // Mark chat as read when this happens
          markChatAsRead(chatId);
        }
        
        // Also check for new data in localStorage directly as a fallback
        try {
          const localStorageMessages = localStorage.getItem('peerlink-messages');
          if (localStorageMessages) {
            const parsedMessages = JSON.parse(localStorageMessages);
            const chatMessages = parsedMessages[chatId] || [];
            
            if (chatMessages.length !== messages.length) {
              console.log(`Direct localStorage check: Found ${chatMessages.length} messages, had ${messages.length}`);
              setMessages(chatMessages);
            }
          }
        } catch (error) {
          console.error("Error checking localStorage for messages:", error);
        }
      }
    }, 700); // Faster refresh rate
    
    return () => {
      clearInterval(messageRefreshInterval);
    };
  }, [isInitialized, userProfile, chatId, chat, getChatMessages, messages.length, markChatAsRead]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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

  const goBack = () => {
    // Force navigation to the chat list page
    window.location.href = '/chat';
  };

  const handleMessagePress = (message: Message) => {
    // Set timeout for long press to activate reply feature
    const timeoutId = setTimeout(() => {
      setReplyingTo(message);
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(50); // Short vibration
      }
    }, 500); // 500ms = long press
    
    setLongPressTimeoutId(timeoutId);
  };

  const handleMessageRelease = () => {
    // Clear the timeout if user releases before long press is detected
    if (longPressTimeoutId) {
      clearTimeout(longPressTimeoutId);
      setLongPressTimeoutId(null);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    form.setFocus("text");
  };

  const findRepliedMessage = (replyToId: string) => {
    return messages.find(msg => msg.messageId === replyToId);
  };

  const scrollToMessage = (messageId: string) => {
    if (!messageListRef.current) return;
    
    const messageElement = messageListRef.current.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash effect
      messageElement.classList.add('bg-accent/30');
      setTimeout(() => {
        messageElement.classList.remove('bg-accent/30');
      }, 2000);
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
    
    // Ensure we have the latest chat
    const currentChat = getChatById(chatId) || chat;
    
    const newMessage: Message = {
      messageId: uuidv4(),
      chatId: currentChat.chatId,
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
      // However, the text field should still store the filename if that's what's in it.
    }

    // If replying to another message, store the reference
    if (replyingTo) {
      newMessage.replyToId = replyingTo.messageId;
    }

    // Add the message to local state first to ensure immediate visibility
    setMessages(prev => [...prev, newMessage]);

    // Add to global state to ensure persistence
    addMessage(newMessage);
    
    // Clear the reply UI after sending
    setReplyingTo(null);
    
    form.reset({ text: "" }); // Reset text field explicitly
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }

    // Ensure message doesn't disappear by writing directly to localStorage as a backup
    try {
      const storedMessages = localStorage.getItem('peerlink-messages') || '{}';
      const parsedMessages = JSON.parse(storedMessages);
      
      const chatMessages = parsedMessages[chatId] || [];
      chatMessages.push(newMessage);
      
      parsedMessages[chatId] = chatMessages;
      
      localStorage.setItem('peerlink-messages', JSON.stringify(parsedMessages));
      sessionStorage.setItem('peerlink-messages-backup', JSON.stringify(parsedMessages));
    } catch (error) {
      console.error("Error adding message directly to localStorage:", error);
    }

    // Simulate message delivery and read receipts for demo purposes
    setTimeout(() => {
      updateMessageStatus(chat.chatId, newMessage.messageId, 'delivered');
    }, 1000);
    setTimeout(() => {
      // Simulate read only for demo
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const canEditMessage = (message: Message) => {
    // Can only edit your own messages,
    // and can't edit file messages (for simplicity in this demo)
    return (
      message.senderId === userProfile?.userId &&
      !message.file &&
      !message.deletedForEveryone &&
      !message.deletedForMe
    );
  };
  
  const canDeleteMessage = (message: Message) => {
    // Can only delete your own messages
    return (
      message.senderId === userProfile?.userId &&
      !message.deletedForEveryone &&
      !message.deletedForMe
    );
  };
  
  const renderMessageStatus = (status: Message['status']) => {
    if (status === 'read') return <CheckCheck className="h-4 w-4 text-accent" />; 
    if (status === 'delivered') return <Check className="h-4 w-4" />; 
    if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />; 
    return <Check className="h-4 w-4" />;
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <Zap className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!chat) {
    return <ChatRecovery chatId={chatId} />;
  }

  const otherParticipantId = chat.participants.find(pId => pId !== userProfile?.userId);
  if (!otherParticipantId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <XCircle className="w-24 h-24 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Invalid Chat</h2>
        <p className="text-muted-foreground mb-4">This chat has invalid participants.</p>
        <Button onClick={goBack}>Go to Chats</Button>
      </div>
    );
  }
  
  // Get display name from paired users if available (for local name preference)
  const pairedUser = pairedUsers.find(u => u.userId === otherParticipantId);
  const otherParticipantDetails = chat.participantDetails[otherParticipantId] || { 
    displayName: pairedUser?.localDisplayName || pairedUser?.displayName || "Unknown User", 
    avatar: DEFAULT_AVATAR_SVG_DATA_URI 
  };
  
  // Override with paired user data if available (for local names)
  if (pairedUser) {
    otherParticipantDetails.displayName = pairedUser.localDisplayName || pairedUser.displayName;
    otherParticipantDetails.avatar = pairedUser.avatar || DEFAULT_AVATAR_SVG_DATA_URI;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <Button variant="ghost" size="icon" onClick={goBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage src={otherParticipantDetails.avatar} />
          <AvatarFallback>{otherParticipantDetails.displayName.substring(0,2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="ml-3 flex-1">
          <h2 className="font-medium text-foreground">{otherParticipantDetails.displayName}</h2>
        </div>
        
        {/* P2P Connection Button */}
        <P2PConnect userId={otherParticipantId} />
        
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

      <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={messageListRef}>
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

            // Check if this message is a reply
            const repliedMessage = message.replyToId ? findRepliedMessage(message.replyToId) : null;
            const isReply = !!repliedMessage;
            const replySender = repliedMessage?.senderId === userProfile?.userId 
              ? 'You' 
              : otherParticipantDetails.displayName;
              
            return (
              <div 
                key={message.messageId} 
                data-message-id={message.messageId}
                className={cn(
                  "flex items-end gap-2 transition-all duration-300", 
                  isSentByMe ? "justify-end" : "",
                )}
              >
                {!isSentByMe && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={senderAvatar} />
                    <AvatarFallback>{senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <div 
                  className={cn(
                    "max-w-[75%] relative group", 
                    isSentByMe ? "items-end" : ""
                  )}
                  onTouchStart={() => handleMessagePress(message)}
                  onTouchEnd={handleMessageRelease}
                  onTouchCancel={handleMessageRelease}
                >
                  {/* Reply-to section if this is a reply */}
                  {isReply && repliedMessage && !repliedMessage.deletedForEveryone && (
                    <div 
                      className={cn(
                        "px-3 py-1 rounded-t-md -mb-1 text-xs border-l-2 border-l-primary cursor-pointer",
                        isSentByMe ? "bg-primary/30" : "bg-muted/50"
                      )}
                      onClick={() => scrollToMessage(repliedMessage.messageId)}
                    >
                      <p className="font-medium text-primary/90">
                        <MessageSquareQuote className="h-3 w-3 inline mr-1" />
                        Reply to {replySender}
                      </p>
                      <p className="truncate">
                        {repliedMessage.deletedForMe 
                          ? "Message unavailable" 
                          : repliedMessage.text}
                      </p>
                    </div>
                  )}
                  
                  {/* Message Bubble */}
                  <div 
                    className={cn(
                      "px-3 py-2 rounded-lg",
                      isReply && "rounded-tl-none",
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
                  
                  {/* Quick action buttons on hover/tap */}
                  {!message.deletedForEveryone && (
                    <div className="absolute right-0 top-0 -mt-7 opacity-0 group-hover:opacity-100 transition-opacity flex">
                      {/* Reply button - always show */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => handleReply(message)}
                      >
                        <CornerUpRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Edit/Delete dropdown - only for your messages */}
                      {isSentByMe && (
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
                      )}
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
            {replyingTo && (
              <div className="absolute bottom-16 left-0 right-0 p-2 bg-muted/60 border-t flex items-center mx-3 rounded-t-md">
                <div className="flex-1 pl-3 border-l-2 border-l-primary py-1 overflow-hidden">
                  <p className="text-xs font-medium text-primary truncate">
                    Replying to: {replyingTo.senderId === userProfile?.userId ? 'You' : otherParticipantDetails.displayName}
                  </p>
                  <p className="truncate text-xs">{replyingTo.text}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0" 
                  onClick={() => setReplyingTo(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
            
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
                          : replyingTo
                            ? "Type your reply..." 
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
            {(editingMessageId || replyingTo) && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setEditingMessageId(null);
                  setReplyingTo(null);
                  form.reset({ text: "" });
                }}
              >
                Cancel
              </Button>
            )}
          </form>
        </Form>
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
