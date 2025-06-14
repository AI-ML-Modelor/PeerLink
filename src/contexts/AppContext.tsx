"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { UserProfile, PairedUser, Chat, Message, AppState } from '@/types';
import { DEFAULT_AVATAR_SVG_DATA_URI } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import * as socketService from '@/lib/socket';
import * as p2pService from '@/lib/p2p';

interface AppContextType extends AppState {
  setUserProfile: (profile: UserProfile | null) => void;
  addPairedUser: (user: PairedUser) => void;
  removePairedUser: (userId: string) => void;
  updatePairedUserLocalDisplayName: (userId: string, localName: string) => void;
  createOrGetChat: (participantId: string, participantDisplayName: string, participantAvatar?: string) => Chat;
  addMessage: (message: Message) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: Message['status']) => void;
  getChatMessages: (chatId: string) => Message[];
  getChatById: (chatId: string) => Chat | undefined;
  clearAllData: () => void;
  clearChatMessages: (chatId: string) => void;
  markChatAsRead: (chatId: string) => void;
  isInitialized: boolean;
  editMessage: (chatId: string, messageId: string, newText: string) => void;
  deleteMessageForMe: (chatId: string, messageId: string) => void;
  deleteMessageForEveryone: (chatId: string, messageId: string) => void;
  announcements: Announcement[];
  broadcastAnnouncement: (title: string, content: string) => void;
  invites: Invite[];
  addInvite: (inviterId: string, inviteeId: string, inviterName: string, inviteeName: string) => void;
  deleteAnnouncement: (announcementId: string) => void;
  markAnnouncementAsRead: (announcementId: string) => void;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface Invite {
  id: string;
  inviterId: string;
  inviteeId: string;
  inviterName: string;
  inviteeName: string;
  timestamp: number;
  accepted: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  userProfile: null,
  pairedUsers: [],
  chats: [],
  messages: {},
  announcements: [],
  invites: [],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfileState] = useLocalStorage<UserProfile | null>('peerlink-userProfile', initialState.userProfile);
  const [pairedUsers, setPairedUsersState] = useLocalStorage<PairedUser[]>('peerlink-pairedUsers', initialState.pairedUsers);
  const [chatsState, setChatsState] = useLocalStorage<Chat[]>('peerlink-chats', initialState.chats);
  const [messages, setMessagesState] = useLocalStorage<Record<string, Message[]>>('peerlink-messages', initialState.messages);
  const [announcements, setAnnouncementsState] = useLocalStorage<Announcement[]>('peerlink-announcements', initialState.announcements);
  const [invites, setInvitesState] = useLocalStorage<Invite[]>('peerlink-invites', initialState.invites);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const setUserProfile = useCallback((newProfile: UserProfile | null) => {
    const oldProfile = userProfile;
    const profileToSet = newProfile ? { ...newProfile, avatar: DEFAULT_AVATAR_SVG_DATA_URI } : null;
    setUserProfileState(profileToSet);

    if (profileToSet && (oldProfile?.userId !== profileToSet.userId || oldProfile?.displayName !== profileToSet.displayName)) {
      setChatsState(prevChats =>
        prevChats.map(chat => {
          const updatedParticipantDetails = { ...chat.participantDetails };
          if (updatedParticipantDetails[profileToSet.userId]) {
            updatedParticipantDetails[profileToSet.userId] = { 
              displayName: profileToSet.displayName,
              avatar: profileToSet.avatar 
            };
            return { ...chat, participantDetails: updatedParticipantDetails };
          }
          return chat;
        })
      );
    }
  }, [userProfile, setUserProfileState, setChatsState]);

  const addInvite = useCallback((inviterId: string, inviteeId: string, inviterName: string, inviteeName: string) => {
    const newInvite: Invite = {
      id: uuidv4(),
      inviterId,
      inviteeId,
      inviterName,
      inviteeName,
      timestamp: Date.now(),
      accepted: true
    };
    
    setInvitesState(prev => [newInvite, ...prev]);
  }, [setInvitesState]);

  const addPairedUser = useCallback((user: PairedUser) => {
    setPairedUsersState(prev => {
      if (prev.find(p => p.userId === user.userId)) return prev;
      // Ensure avatar is default and localDisplayName is not set initially on pairing
      const newUser = { 
        ...user, 
        avatar: DEFAULT_AVATAR_SVG_DATA_URI,
        localDisplayName: undefined // Explicitly undefined
      };
      return [...prev, newUser];
    });
    
    // Track the invite when a user is paired
    if (userProfile) {
      addInvite(
        userProfile.userId, // Inviter ID
        user.userId,       // Invitee ID
        userProfile.displayName, // Inviter Name
        user.displayName   // Invitee Name
      );
    }
  }, [setPairedUsersState, userProfile, addInvite]);
  
  const removePairedUser = useCallback((userIdToRemove: string) => {
    // First, find and remove any chats with this user
    setChatsState(prevChats => {
      const updatedChats = prevChats.filter(chat => !chat.participants.includes(userIdToRemove));
      
      // Save changes to storage
      try {
        localStorage.setItem('peerlink-chats', JSON.stringify(updatedChats));
        sessionStorage.setItem('peerlink-chats-backup', JSON.stringify(updatedChats));
      } catch (error) {
        console.error("Error saving chats after user removal:", error);
      }
      
      return updatedChats;
    });
    
    // Clean up messages associated with this user
    setMessagesState(prevMessages => {
      const updatedMessages = { ...prevMessages };
      
      // Find chat IDs that contain this user
      const chatIdsToRemove = Object.keys(updatedMessages).filter(chatId => 
        chatId.includes(userIdToRemove)
      );
      
      // Remove those chat messages
      chatIdsToRemove.forEach(chatId => {
        delete updatedMessages[chatId];
      });
      
      // Save changes to storage
      try {
        localStorage.setItem('peerlink-messages', JSON.stringify(updatedMessages));
        sessionStorage.setItem('peerlink-messages-backup', JSON.stringify(updatedMessages));
      } catch (error) {
        console.error("Error saving messages after user removal:", error);
      }
      
      return updatedMessages;
    });
    
    // Disconnect P2P connection if exists
    if (p2pService.isConnectedToPeer(userIdToRemove)) {
      p2pService.disconnectPeer(userIdToRemove);
    }
    
    // Finally remove from paired users
    setPairedUsersState(prevPairedUsers => prevPairedUsers.filter(user => user.userId !== userIdToRemove));
  }, [setPairedUsersState, setChatsState, setMessagesState]);
  
  const updatePairedUserLocalDisplayName = useCallback((userId: string, localName: string) => {
    setPairedUsersState(prevPairedUsers =>
      prevPairedUsers.map(user =>
        user.userId === userId ? { ...user, localDisplayName: localName } : user
      )
    );
    // Update chat participantDetails as well
    setChatsState(prevChats =>
      prevChats.map(chat => {
        if (chat.participants.includes(userId) && chat.participantDetails[userId]) {
          const updatedParticipantDetails = {
            ...chat.participantDetails,
            [userId]: {
              ...chat.participantDetails[userId],
              displayName: localName, // Update with the new local name
            }
          };
          return { ...chat, participantDetails: updatedParticipantDetails };
        }
        return chat;
      })
    );
  }, [setPairedUsersState, setChatsState]);

  const createOrGetChat = useCallback((otherUserId: string, otherUserDisplayName: string, otherUserAvatar?: string) => {
    if (!userProfile) throw new Error("User profile is not initialized");

    const sortedParticipantIds = [userProfile.userId, otherUserId].sort() as [string, string];
    const chatId = sortedParticipantIds.join('_');
    
    // First check if this chat already exists in state
    const existingChat = chatsState.find(chat => chat.chatId === chatId);
    
    // Also double check in localStorage directly as a safety measure
    let existingChatFromStorage: Chat | undefined;
    try {
      const storedChats = localStorage.getItem('peerlink-chats');
      if (storedChats) {
        const parsedChats = JSON.parse(storedChats) as Chat[];
        existingChatFromStorage = parsedChats.find(chat => chat.chatId === chatId);
      }
    } catch (error) {
      console.error("Error checking localStorage for existing chat:", error);
    }
    
    // If it exists in either place, update it
    if (existingChat || existingChatFromStorage) {
      // Use either the state or storage version
      const chatToUpdate = existingChat || existingChatFromStorage!;
      
      // Update the chat to make sure it's not pending anymore
      setChatsState(prevChats => {
        // First check if we need to add this chat that was only in storage
        if (!existingChat && existingChatFromStorage) {
          const updatedChats = [...prevChats, { ...existingChatFromStorage, isPending: false }];
          try {
            localStorage.setItem('peerlink-chats', JSON.stringify(updatedChats));
            sessionStorage.setItem('peerlink-chats-backup', JSON.stringify(updatedChats));
          } catch (error) {
            console.error("Error saving chats during update:", error);
          }
          return updatedChats;
        }
        
        // Otherwise just update the existing chat
        const updatedChats = prevChats.map(chat => {
          if (chat.chatId === chatId) {
            // Ensure the chat is not marked as pending
            return { ...chat, isPending: false };
          }
          return chat;
        });
        
        // Force save immediately to localStorage
        try {
          localStorage.setItem('peerlink-chats', JSON.stringify(updatedChats));
          sessionStorage.setItem('peerlink-chats-backup', JSON.stringify(updatedChats));
        } catch (error) {
          console.error("Error saving chats during update:", error);
        }
        
        return updatedChats;
      });
      
      return chatToUpdate;
    }
    
    // If it doesn't exist, create a new chat
    const newChat = {
      chatId,
      participants: sortedParticipantIds,
      participantDetails: {
        [userProfile.userId]: {
          displayName: userProfile.displayName,
          avatar: userProfile.avatar
        },
        [otherUserId]: {
          displayName: otherUserDisplayName,
          avatar: otherUserAvatar || ''
        }
      },
      unreadCount: 0,
      isPending: false // Not pending, it's been explicitly created
    };
    
    // Update state with the new chat
    setChatsState(prevChats => {
      const updatedChats = [...prevChats, newChat];
      
      // Force save immediately to localStorage
      try {
        localStorage.setItem('peerlink-chats', JSON.stringify(updatedChats));
        sessionStorage.setItem('peerlink-chats-backup', JSON.stringify(updatedChats));
      } catch (error) {
        console.error("Error saving chats during creation:", error);
      }
      
      return updatedChats;
    });
    
    // Ensure there's an empty messages state for this chat ID
    setMessagesState(prevMessages => {
      if (!prevMessages[chatId]) {
        const updatedMessages = {
          ...prevMessages,
          [chatId]: []
        };
        
        // Force save immediately
        try {
          localStorage.setItem('peerlink-messages', JSON.stringify(updatedMessages));
          sessionStorage.setItem('peerlink-messages-backup', JSON.stringify(updatedMessages));
        } catch (error) {
          console.error("Error initializing messages for new chat:", error);
        }
        
        return updatedMessages;
      }
      return prevMessages;
    });
    
    return newChat;
  }, [userProfile, chatsState, setChatsState, setMessagesState]);
  
  const addMessage = useCallback((message: Message) => {
    // Ensure new messages have a status, defaulting to 'sent'
    const messageWithStatus = { ...message, status: message.status || 'sent' };

    // Send message via socket.io if it's outgoing (from current user)
    if (userProfile && message.senderId === userProfile.userId) {
      // Try P2P first if connected
      const isPeerConnected = p2pService.isConnectedToPeer(message.receiverId);
      
      if (isPeerConnected) {
        // Send message via P2P connection
        const sent = p2pService.sendDirectMessage(messageWithStatus);
        if (!sent) {
          // Fallback to socket if P2P fails
          socketService.sendPrivateMessage(messageWithStatus);
        }
      } else {
        // No P2P connection, use socket
        socketService.sendPrivateMessage(messageWithStatus);
      }
    }
    
    // Do a direct write to localStorage first for maximum reliability
    try {
      // Get current messages directly from storage
      const storedMessagesStr = localStorage.getItem('peerlink-messages') || '{}';
      const storedMessages = JSON.parse(storedMessagesStr);
      
      const chatId = messageWithStatus.chatId;
      const chatMessages = storedMessages[chatId] || [];
      
      // Check if this message already exists to avoid duplicates
      const messageExists = chatMessages.some((m: Message) => m.messageId === messageWithStatus.messageId);
      if (!messageExists) {
        // Add the message and persist immediately
        const updatedChatMessages = [...chatMessages, messageWithStatus];
        storedMessages[chatId] = updatedChatMessages;
        
        localStorage.setItem('peerlink-messages', JSON.stringify(storedMessages));
        sessionStorage.setItem('peerlink-messages-backup', JSON.stringify(storedMessages));
      }
    } catch (error) {
      console.error("Error with direct localStorage write:", error);
    }

    // Then update the state
    setMessagesState(prev => {
      const chatMessages = prev[messageWithStatus.chatId] || [];
      
      // Check if this message already exists to avoid duplicates
      const messageExists = chatMessages.some(m => m.messageId === messageWithStatus.messageId);
      if (messageExists) {
        return prev; // No changes needed
      }
      
      const newMessages = { 
        ...prev, 
        [messageWithStatus.chatId]: [...chatMessages, messageWithStatus] 
      };
      
      // Force save to localStorage to prevent message loss
      try {
        localStorage.setItem('peerlink-messages', JSON.stringify(newMessages));
        
        // Backup to sessionStorage as well for redundancy
        sessionStorage.setItem('peerlink-messages-backup', JSON.stringify(newMessages));
      } catch (error) {
        console.error("Error saving messages to storage:", error);
      }
      
      return newMessages;
    });
    
    // Update chat metadata
    setChatsState(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.chatId === messageWithStatus.chatId) {
          let newUnreadCount = chat.unreadCount;
          // Only increment unread count if the message is from another user
          if (messageWithStatus.senderId !== userProfile?.userId) {
            newUnreadCount = (chat.unreadCount || 0) + 1;
            
            // Trigger system notification if supported
            try {
              if ("Notification" in window && Notification.permission === "granted") {
                const pairedUser = pairedUsers.find(p => p.userId === messageWithStatus.senderId);
                const senderName = pairedUser?.localDisplayName || 
                                  pairedUser?.displayName || 
                                  "User " + messageWithStatus.senderId.substring(0, 6);
                                  
                new Notification("New message from " + senderName, {
                  body: messageWithStatus.text.substring(0, 60) + (messageWithStatus.text.length > 60 ? "..." : ""),
                  icon: "/icons/icon-192x192.png",
                  tag: chat.chatId // Group by chat
                });
              } else if ("Notification" in window && Notification.permission !== "denied") {
                // Request permission if not explicitly denied
                Notification.requestPermission();
              }
            } catch (e) {
              console.log("Notification API not supported or permission denied");
            }
          }
          
          const updatedChat = { 
            ...chat, 
            lastMessage: messageWithStatus, 
            unreadCount: newUnreadCount,
            isPending: false // When a message is sent, the chat is no longer pending
          };
          
          return updatedChat;
        }
        return chat;
      });
      
      // Force save to localStorage to prevent chat metadata loss
      try {
        localStorage.setItem('peerlink-chats', JSON.stringify(updatedChats));
        
        // Backup to sessionStorage as well
        sessionStorage.setItem('peerlink-chats-backup', JSON.stringify(updatedChats));
      } catch (error) {
        console.error("Error saving chats to storage:", error);
      }
      
      return updatedChats;
    });
  }, [setMessagesState, setChatsState, userProfile, pairedUsers]);

  // Recovery function to restore lost messages from backup
  useEffect(() => {
    if (isInitialized) {
      try {
        // Check if we have messages in localStorage
        const storedMessages = localStorage.getItem('peerlink-messages');
        const backupMessages = sessionStorage.getItem('peerlink-messages-backup');
        
        // If localStorage messages are missing but we have backup, restore from backup
        if (!storedMessages && backupMessages) {
          localStorage.setItem('peerlink-messages', backupMessages);
          setMessagesState(JSON.parse(backupMessages));
        }
        
        // Same for chats
        const storedChats = localStorage.getItem('peerlink-chats');
        const backupChats = sessionStorage.getItem('peerlink-chats-backup');
        
        if (!storedChats && backupChats) {
          localStorage.setItem('peerlink-chats', backupChats);
          setChatsState(JSON.parse(backupChats));
        }
      } catch (error) {
        console.error("Error during storage recovery check:", error);
      }
    }
  }, [isInitialized, setMessagesState, setChatsState]);

  const updateMessageStatus = useCallback((chatId: string, messageId: string, status: Message['status']) => {
    setMessagesState(prev => {
      const chatMessages = prev[chatId] || [];
      const updatedMessages = chatMessages.map(msg => 
        msg.messageId === messageId ? { ...msg, status } : msg
      );
      return { ...prev, [chatId]: updatedMessages };
    });
    // Also update lastMessage status if it's the one being updated
    setChatsState(prevChats => prevChats.map(chat => {
      if (chat.chatId === chatId && chat.lastMessage?.messageId === messageId) {
        return { ...chat, lastMessage: { ...chat.lastMessage, status } };
      }
      return chat;
    }));
  }, [setMessagesState, setChatsState]);

  const getChatMessages = useCallback((chatId: string): Message[] => {
    return messages[chatId] || [];
  }, [messages]);

  const getChatById = useCallback((chatId: string): Chat | undefined => {
    return chatsState.find(c => c.chatId === chatId);
  }, [chatsState]);

  const markChatAsRead = useCallback((chatId: string) => {
    setChatsState(prevChats => prevChats.map(chat =>
      chat.chatId === chatId ? { ...chat, unreadCount: 0 } : chat
    ));
  }, [setChatsState]);

  const clearChatMessages = useCallback((chatId: string) => {
    setMessagesState(prevMessages => {
      const newMessages = { ...prevMessages };
      delete newMessages[chatId];
      return newMessages;
    });
    setChatsState(prevChats => prevChats.map(chat =>
      chat.chatId === chatId ? { ...chat, lastMessage: undefined, unreadCount: 0 } : chat
    ));
  }, [setMessagesState, setChatsState]);
  
  const clearAllData = useCallback(() => {
    setUserProfileState(initialState.userProfile);
    setPairedUsersState(initialState.pairedUsers);
    setChatsState(initialState.chats);
    setMessagesState(initialState.messages);
  }, [setUserProfileState, setPairedUsersState, setChatsState, setMessagesState]);

  const editMessage = useCallback((chatId: string, messageId: string, newText: string) => {
    setMessagesState(prev => {
      const chatMessages = prev[chatId] || [];
      const updatedMessages = chatMessages.map(msg => 
        msg.messageId === messageId ? { ...msg, text: newText, edited: true } : msg
      );
      return { ...prev, [chatId]: updatedMessages };
    });
    
    // Update lastMessage if needed
    setChatsState(prevChats => prevChats.map(chat => {
      if (chat.chatId === chatId && chat.lastMessage?.messageId === messageId) {
        return { ...chat, lastMessage: { ...chat.lastMessage, text: newText, edited: true } };
      }
      return chat;
    }));
  }, [setMessagesState, setChatsState]);

  const deleteMessageForMe = useCallback((chatId: string, messageId: string) => {
    setMessagesState(prev => {
      const chatMessages = prev[chatId] || [];
      const updatedMessages = chatMessages.map(msg => 
        msg.messageId === messageId ? { ...msg, deletedForMe: true } : msg
      );
      return { ...prev, [chatId]: updatedMessages };
    });
    
    // Update lastMessage if it was the deleted message
    setChatsState(prevChats => {
      return prevChats.map(chat => {
        if (chat.chatId === chatId && chat.lastMessage?.messageId === messageId) {
          // Find the most recent non-deleted message
          const chatMsgs = messages[chatId] || [];
          const newLastMsg = [...chatMsgs]
            .reverse()
            .find(msg => msg.messageId !== messageId && !msg.deletedForMe);
          
          return { ...chat, lastMessage: newLastMsg };
        }
        return chat;
      });
    });
  }, [setMessagesState, setChatsState, messages]);

  const deleteMessageForEveryone = useCallback((chatId: string, messageId: string) => {
    setMessagesState(prev => {
      const chatMessages = prev[chatId] || [];
      const updatedMessages = chatMessages.map(msg => 
        msg.messageId === messageId ? { ...msg, deletedForEveryone: true } : msg
      );
      return { ...prev, [chatId]: updatedMessages };
    });
    
    // Update lastMessage if it was the deleted message
    setChatsState(prevChats => {
      return prevChats.map(chat => {
        if (chat.chatId === chatId && chat.lastMessage?.messageId === messageId) {
          // Find the most recent non-deleted message
          const chatMsgs = messages[chatId] || [];
          const newLastMsg = [...chatMsgs]
            .reverse()
            .find(msg => msg.messageId !== messageId && !msg.deletedForEveryone);
          
          return { ...chat, lastMessage: newLastMsg };
        }
        return chat;
      });
    });
  }, [setMessagesState, setChatsState, messages]);
  
  const broadcastAnnouncement = useCallback((title: string, content: string) => {
    const newAnnouncement: Announcement = {
      id: uuidv4(),
      title,
      content,
      date: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
    
    // Send via socket to all other users
    socketService.broadcastAnnouncement(title, content, true);
    
    // Also broadcast via P2P if any peers are connected
    p2pService.broadcastAnnouncement(newAnnouncement);
    
    setAnnouncementsState(prev => [newAnnouncement, ...prev]);
  }, [setAnnouncementsState]);

  const deleteAnnouncement = useCallback((announcementId: string) => {
    setAnnouncementsState(prev => 
      prev.filter(announcement => announcement.id !== announcementId)
    );
  }, [setAnnouncementsState]);

  const markAnnouncementAsRead = useCallback((announcementId: string) => {
    setAnnouncementsState(prev => 
      prev.map(announcement => 
        announcement.id === announcementId ? { ...announcement, read: true } : announcement
      )
    );
  }, [setAnnouncementsState]);

  // This effect creates chats for all paired users when the app initializes or when paired users change
  useEffect(() => {
    // Only run after initialization and when we have user profile and paired users
    if (isInitialized && userProfile && pairedUsers.length > 0) {
      pairedUsers.forEach(pairedUser => {
        // Skip if we're still initializing
        if (!isInitialized) return;
        
        const sortedParticipantIds: [string, string] = [userProfile.userId, pairedUser.userId].sort() as [string, string];
        const chatId = sortedParticipantIds.join('_');
        
        const existingChat = chatsState.find(chat => chat.chatId === chatId);
        if (!existingChat) {
          const displayName = pairedUser.localDisplayName || pairedUser.displayName;
          // Create chat entry for this paired user
          const newChat: Chat = {
            chatId,
            participants: sortedParticipantIds,
            participantDetails: {
              [userProfile.userId]: { displayName: userProfile.displayName, avatar: userProfile.avatar },
              [pairedUser.userId]: { displayName: displayName, avatar: pairedUser.avatar },
            },
            unreadCount: 0,
            isPending: true
          };
          
          setChatsState(prev => {
            const updatedChats = [...prev, newChat];
            localStorage.setItem('peerlink-chats', JSON.stringify(updatedChats));
            return updatedChats;
          });
        }
      });
    }
  }, [isInitialized, userProfile, pairedUsers]);
  
  // Initialize WebSocket connection when user profile is set
  useEffect(() => {
    if (userProfile) {
      // Initialize socket connection
      socketService.initializeSocket(userProfile.userId)
        .then(connected => {
          console.log(connected ? 'WebSocket connected' : 'WebSocket connection failed');
        });
      
      // Initialize P2P
      p2pService.initializeP2P(userProfile.userId);
      
      // Set up WebSocket message handlers
      const socketMessageHandler = socketService.onNewMessage((message) => {
        // Add received message to our local state
        addMessage(message);
      });
      
      const socketAnnouncementHandler = socketService.onNewAnnouncement((announcement) => {
        // Add received announcement to our local state
        setAnnouncementsState(prev => [announcement, ...prev]);
      });
      
      const socketStatusHandler = socketService.onMessageStatusUpdate((update) => {
        // Update message status
        updateMessageStatus(update.chatId, update.messageId, update.status);
      });
      
      // Set up P2P message handlers
      const p2pMessageHandler = p2pService.onDirectMessage((message) => {
        // Add received message to our local state
        addMessage(message);
      });
      
      const p2pAnnouncementHandler = p2pService.onAnnouncement((announcement) => {
        // Add received announcement to our local state
        setAnnouncementsState(prev => [announcement, ...prev]);
      });
      
      // Clean up handlers when component unmounts or user changes
      return () => {
        // WebSocket handlers
        socketMessageHandler();
        socketAnnouncementHandler();
        socketStatusHandler();
        socketService.disconnectSocket();
        
        // P2P handlers
        p2pMessageHandler();
        p2pAnnouncementHandler();
        p2pService.disconnectAll();
      };
    }
  }, [userProfile, addMessage, updateMessageStatus, setAnnouncementsState]);

  const value: AppContextType = {
    userProfile,
    pairedUsers,
    chats: chatsState,
    messages,
    announcements,
    invites,
    setUserProfile,
    addPairedUser,
    removePairedUser,
    updatePairedUserLocalDisplayName,
    createOrGetChat,
    addMessage,
    updateMessageStatus,
    getChatMessages,
    getChatById,
    clearAllData,
    clearChatMessages,
    markChatAsRead,
    editMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
    broadcastAnnouncement,
    deleteAnnouncement,
    addInvite,
    markAnnouncementAsRead,
    isInitialized,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
