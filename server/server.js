const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const PORT = process.env.PORT || 3003;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development; restrict in production
    methods: ['GET', 'POST']
  }
});

// Store user connections
const connectedUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User identification
  socket.on('register_user', (userId) => {
    console.log(`User ${userId} registered with socket ${socket.id}`);
    connectedUsers.set(userId, socket.id);
    userSockets.set(socket.id, userId);
    
    // Notify others this user is online
    socket.broadcast.emit('user_status_change', { userId, status: 'online' });
    
    // Send current online users to the newly connected user
    const onlineUsers = Array.from(connectedUsers.keys());
    socket.emit('online_users', onlineUsers);
  });

  // Handle private messages
  socket.on('private_message', (data) => {
    console.log(`Message from ${data.senderId} to ${data.receiverId}`);
    
    // Store the message (would use a database in production)
    const message = {
      ...data,
      timestamp: Date.now(),
      status: 'sent'
    };
    
    // Send to receiver if online
    const receiverSocketId = connectedUsers.get(data.receiverId);
    if (receiverSocketId) {
      console.log(`Receiver ${data.receiverId} is online, forwarding message`);
      io.to(receiverSocketId).emit('new_message', message);
      
      // Update message status to delivered
      message.status = 'delivered';
      socket.emit('message_status_update', {
        chatId: data.chatId,
        messageId: data.messageId,
        status: 'delivered'
      });
    }
    
    // Echo back to sender with status
    socket.emit('message_sent', message);
  });
  
  // Handle message read receipts
  socket.on('message_read', (data) => {
    const { messageId, chatId, senderId } = data;
    const senderSocketId = connectedUsers.get(senderId);
    
    if (senderSocketId) {
      io.to(senderSocketId).emit('message_status_update', {
        chatId,
        messageId,
        status: 'read'
      });
    }
  });
  
  // Handle announcements/broadcasts
  socket.on('broadcast_announcement', (data) => {
    const userId = userSockets.get(socket.id);
    console.log(`Broadcast from ${userId}`);
    
    // Only allow broadcasts from admin (you would implement proper auth)
    if (data.isAdmin) {
      const announcement = {
        ...data,
        id: Date.now().toString(),
        date: new Date().toISOString()
      };
      
      // Broadcast to all connected users
      io.emit('new_announcement', announcement);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const userId = userSockets.get(socket.id);
    if (userId) {
      console.log(`User ${userId} disconnected`);
      connectedUsers.delete(userId);
      userSockets.delete(socket.id);
      
      // Notify others this user is offline
      socket.broadcast.emit('user_status_change', { userId, status: 'offline' });
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 