"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { UserProfile, PairedUser, Chat, Message, AppState } from '@/types';
import { DEFAULT_AVATAR_SVG_DATA_URI } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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
  const [chats, setChatsState] = useLocalStorage<Chat[]>('peerlink-chats', initialState.chats);
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
    setPairedUsersState(prevPairedUsers => prevPairedUsers.filter(user => user.userId !== userIdToRemove));
    // Note: Chats with this user are not automatically deleted to preserve history,
    // they will just appear inactive in the chat list or can be manually cleared.
  }, [setPairedUsersState]);
  
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

  const createOrGetChat = useCallback((participantId: string, participantDisplayName: string, participantAvatarArg?: string): Chat => {
    if (!userProfile) throw new Error("User profile not set");

    const sortedParticipantIds: [string, string] = [userProfile.userId, participantId].sort() as [string, string];
    const chatId = sortedParticipantIds.join('_');
    
    const pairedParticipantFromList = pairedUsers.find(p => p.userId === participantId);
    const effectiveParticipantDisplayName = pairedParticipantFromList?.localDisplayName || pairedParticipantFromList?.displayName || participantDisplayName;
    const effectiveParticipantAvatar = pairedParticipantFromList?.avatar || participantAvatarArg || DEFAULT_AVATAR_SVG_DATA_URI;

    let existingChat = chats.find(c => c.chatId === chatId);

    if (existingChat) {
      let detailsChanged = false;
      const updatedParticipantDetails = {...existingChat.participantDetails};

      // Check and update current user's details in the chat
      if (updatedParticipantDetails[userProfile.userId]?.displayName !== userProfile.displayName || 
          updatedParticipantDetails[userProfile.userId]?.avatar !== userProfile.avatar) {
        updatedParticipantDetails[userProfile.userId] = { displayName: userProfile.displayName, avatar: userProfile.avatar };
        detailsChanged = true;
      }
      // Check and update other participant's details in the chat
      if (updatedParticipantDetails[participantId]?.displayName !== effectiveParticipantDisplayName ||
          updatedParticipantDetails[participantId]?.avatar !== effectiveParticipantAvatar) {
        updatedParticipantDetails[participantId] = { displayName: effectiveParticipantDisplayName, avatar: effectiveParticipantAvatar };
        detailsChanged = true;
      }

      if (detailsChanged) {
        existingChat = { ...existingChat, participantDetails: updatedParticipantDetails };
        setChatsState(prev => prev.map(c => c.chatId === chatId ? existingChat! : c));
      }
      return existingChat;
    }

    const newChat: Chat = {
      chatId,
      participants: sortedParticipantIds,
      participantDetails: {
        [userProfile.userId]: { displayName: userProfile.displayName, avatar: userProfile.avatar },
        [participantId]: { displayName: effectiveParticipantDisplayName, avatar: effectiveParticipantAvatar },
      },
      unreadCount: 0,
    };
    setChatsState(prev => [...prev, newChat]);
    return newChat;
  }, [userProfile, chats, pairedUsers, setChatsState]);
  
  const addMessage = useCallback((message: Message) => {
    // Ensure new messages have a status, defaulting to 'sent'
    const messageWithStatus = { ...message, status: message.status || 'sent' };

    setMessagesState(prev => {
      const chatMessages = prev[messageWithStatus.chatId] || [];
      return { ...prev, [messageWithStatus.chatId]: [...chatMessages, messageWithStatus] };
    });
    setChatsState(prevChats => prevChats.map(chat => {
      if (chat.chatId === messageWithStatus.chatId) {
        let newUnreadCount = chat.unreadCount;
        // Only increment unread count if the message is from another user
        // and the chat is not currently "active" (this part would require more logic for active chat tracking)
        // For now, assume if sender is not current user, it's unread.
        if (messageWithStatus.senderId !== userProfile?.userId) {
          newUnreadCount = (chat.unreadCount || 0) + 1;
        }
        return { ...chat, lastMessage: messageWithStatus, unreadCount: newUnreadCount };
      }
      return chat;
    }));
  }, [setMessagesState, setChatsState, userProfile]);

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
    return chats.find(c => c.chatId === chatId);
  }, [chats]);

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

  const value: AppContextType = {
    userProfile,
    pairedUsers,
    chats,
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
