import { io, Socket } from 'socket.io-client';
import { Message, Announcement } from '@/types';

// Socket.io connection instance
let socket: Socket | null = null;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3003';

// Message handlers
type MessageHandler = (message: Message) => void;
type AnnouncementHandler = (announcement: Announcement) => void;
type StatusUpdateHandler = (update: { chatId: string; messageId: string; status: Message['status'] }) => void;
type UserStatusHandler = (data: { userId: string; status: 'online' | 'offline' }) => void;

// Handlers storage
const messageHandlers: MessageHandler[] = [];
const announcementHandlers: AnnouncementHandler[] = [];
const statusUpdateHandlers: StatusUpdateHandler[] = [];
const userStatusHandlers: UserStatusHandler[] = [];

/**
 * Initialize socket connection
 */
export const initializeSocket = (userId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // If already connected, disconnect first
      if (socket) {
        socket.disconnect();
      }

      // Create new connection
      socket = io(SOCKET_URL);

      // Connection event handlers
      socket.on('connect', () => {
        console.log('Socket connected');
        
        // Register user with socket server
        socket?.emit('register_user', userId);
        resolve(true);
      });
      
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        resolve(false);
      });
      
      // Message handlers
      socket.on('new_message', (message: Message) => {
        console.log('Received new message:', message);
        messageHandlers.forEach(handler => handler(message));
      });
      
      socket.on('message_sent', (message: Message) => {
        console.log('Message sent confirmation:', message);
        messageHandlers.forEach(handler => handler(message));
      });
      
      socket.on('message_status_update', (update) => {
        console.log('Message status update:', update);
        statusUpdateHandlers.forEach(handler => handler(update));
      });
      
      // Announcement handlers
      socket.on('new_announcement', (announcement: Announcement) => {
        console.log('Received announcement:', announcement);
        announcementHandlers.forEach(handler => handler(announcement));
      });
      
      // User status handlers
      socket.on('user_status_change', (data) => {
        console.log('User status change:', data);
        userStatusHandlers.forEach(handler => handler(data));
      });
    } catch (error) {
      console.error('Socket initialization error:', error);
      resolve(false);
    }
  });
};

/**
 * Send a private message
 */
export const sendPrivateMessage = (message: Message): void => {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return;
  }
  
  socket.emit('private_message', message);
};

/**
 * Mark a message as read
 */
export const markMessageAsRead = (chatId: string, messageId: string, senderId: string): void => {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return;
  }
  
  socket.emit('message_read', { chatId, messageId, senderId });
};

/**
 * Broadcast an announcement (admin only)
 */
export const broadcastAnnouncement = (
  title: string, 
  content: string, 
  isAdmin: boolean = false
): void => {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return;
  }
  
  socket.emit('broadcast_announcement', {
    title,
    content,
    isAdmin
  });
};

/**
 * Register message handler
 */
export const onNewMessage = (handler: MessageHandler): () => void => {
  messageHandlers.push(handler);
  return () => {
    const index = messageHandlers.indexOf(handler);
    if (index !== -1) {
      messageHandlers.splice(index, 1);
    }
  };
};

/**
 * Register announcement handler
 */
export const onNewAnnouncement = (handler: AnnouncementHandler): () => void => {
  announcementHandlers.push(handler);
  return () => {
    const index = announcementHandlers.indexOf(handler);
    if (index !== -1) {
      announcementHandlers.splice(index, 1);
    }
  };
};

/**
 * Register message status update handler
 */
export const onMessageStatusUpdate = (handler: StatusUpdateHandler): () => void => {
  statusUpdateHandlers.push(handler);
  return () => {
    const index = statusUpdateHandlers.indexOf(handler);
    if (index !== -1) {
      statusUpdateHandlers.splice(index, 1);
    }
  };
};

/**
 * Register user status change handler
 */
export const onUserStatusChange = (handler: UserStatusHandler): () => void => {
  userStatusHandlers.push(handler);
  return () => {
    const index = userStatusHandlers.indexOf(handler);
    if (index !== -1) {
      userStatusHandlers.splice(index, 1);
    }
  };
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}; 