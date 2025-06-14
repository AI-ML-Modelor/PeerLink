import type { Message, Announcement } from '@/types';

// Simplified P2P implementation using native WebRTC APIs
// Types for our P2P connections
interface PeerConnection {
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  userId: string;
  connected: boolean;
}

// Event handlers
type MessageHandler = (message: Message) => void;
type AnnouncementHandler = (announcement: Announcement) => void;
type ConnectionHandler = (info: { userId: string, connected: boolean }) => void;
type ErrorHandler = (error: Error) => void;

// Track active connections
const connections = new Map<string, PeerConnection>();

// Event handlers
const messageHandlers: MessageHandler[] = [];
const announcementHandlers: AnnouncementHandler[] = [];
const connectionHandlers: ConnectionHandler[] = [];
const errorHandlers: ErrorHandler[] = [];

// Local user info
let currentUserId = '';
let iceCandidates: RTCIceCandidate[] = [];

// Initialize the P2P system
export const initializeP2P = (userId: string): void => {
  currentUserId = userId;
  console.log("P2P initialized for user:", userId);
};

// Create a connection offer
export async function createConnectionOffer(): Promise<string> {
  if (!currentUserId) throw new Error("P2P not initialized");

  try {
    // Create WebRTC peer connection with STUN server for NAT traversal
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    
    // Create data channel for communication
    const dataChannel = peerConnection.createDataChannel('messageChannel');
    setupDataChannel(dataChannel);
    
    // Generate connection ID
    const connectionId = `conn_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // Listen for ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        iceCandidates.push(event.candidate);
      }
    };
    
    // Store connection info
    const connection: PeerConnection = {
      connection: peerConnection,
      dataChannel,
      userId: connectionId, // Temporary ID until we know the actual user
      connected: false
    };
    
    connections.set(connectionId, connection);
    
    // Wait for ICE gathering to complete
    await new Promise(resolve => {
      setTimeout(resolve, 1000); // Give time for ICE candidates
    });
    
    // Create connection info object
    const connectionInfo = {
      type: 'offer',
      userId: currentUserId,
      connectionId,
      sdp: peerConnection.localDescription?.sdp,
      iceCandidates
    };
    
    return JSON.stringify(connectionInfo);
  } catch (err) {
    console.error("Error creating connection offer:", err);
    errorHandlers.forEach(h => h(err instanceof Error ? err : new Error(String(err))));
    throw err;
  }
}

// Accept a connection offer
export async function acceptConnectionOffer(offerData: string): Promise<boolean> {
  if (!currentUserId) throw new Error("P2P not initialized");
  
  try {
    // Parse the offer data
    const offer = JSON.parse(offerData);
    
    // Create RTCPeerConnection with STUN server
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    
    // Handle data channels
    peerConnection.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };
    
    // Set up remote description from offer
    await peerConnection.setRemoteDescription({
      type: 'offer',
      sdp: offer.sdp
    });
    
    // Add ICE candidates
    if (offer.iceCandidates) {
      for (const candidate of offer.iceCandidates) {
        await peerConnection.addIceCandidate(candidate);
      }
    }
    
    // Create answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    // Store connection info
    const connection: PeerConnection = {
      connection: peerConnection,
      userId: offer.userId,
      connected: true
    };
    
    connections.set(offer.connectionId, connection);
    
    // Notify connection handlers
    connectionHandlers.forEach(h => h({ 
      userId: offer.userId, 
      connected: true 
    }));
    
    return true;
  } catch (err) {
    console.error("Error accepting connection:", err);
    errorHandlers.forEach(h => h(err instanceof Error ? err : new Error(String(err))));
    return false;
  }
}

// Set up the data channel event handlers
function setupDataChannel(channel: RTCDataChannel): void {
  channel.onopen = () => {
    console.log("Data channel opened");
  };
  
  channel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        messageHandlers.forEach(h => h(data.content));
      } else if (data.type === 'announcement') {
        announcementHandlers.forEach(h => h(data.content));
      } else if (data.type === 'identity') {
        // Update connection with real user ID
        for (const [connId, conn] of connections.entries()) {
          if (conn.dataChannel === channel) {
            conn.userId = data.userId;
            connectionHandlers.forEach(h => h({ 
              userId: data.userId, 
              connected: true 
            }));
            break;
          }
        }
      }
    } catch (err) {
      console.error("Error processing message:", err);
    }
  };
  
  channel.onerror = (error) => {
    console.error("Data channel error:", error);
    errorHandlers.forEach(h => h(new Error("Data channel error")));
  };
  
  channel.onclose = () => {
    console.log("Data channel closed");
    // Find and update the connection that was closed
    for (const [connId, conn] of connections.entries()) {
      if (conn.dataChannel === channel) {
        conn.connected = false;
        connectionHandlers.forEach(h => h({ 
          userId: conn.userId, 
          connected: false 
        }));
        connections.delete(connId);
        break;
      }
    }
  };
}

// Send a direct message to a peer
export function sendDirectMessage(message: Message): boolean {
  try {
    // Find connection for the receiver
    for (const conn of connections.values()) {
      if (conn.userId === message.receiverId && conn.dataChannel && conn.connected) {
        conn.dataChannel.send(JSON.stringify({
          type: 'message',
          content: message
        }));
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("Error sending message:", err);
    errorHandlers.forEach(h => h(err instanceof Error ? err : new Error(String(err))));
    return false;
  }
}

// Broadcast an announcement to all peers
export function broadcastAnnouncement(announcement: Announcement): void {
  try {
    for (const conn of connections.values()) {
      if (conn.dataChannel && conn.connected) {
        conn.dataChannel.send(JSON.stringify({
          type: 'announcement',
          content: announcement
        }));
      }
    }
  } catch (err) {
    console.error("Error broadcasting announcement:", err);
    errorHandlers.forEach(h => h(err instanceof Error ? err : new Error(String(err))));
  }
}

// Register for message events
export function onDirectMessage(handler: MessageHandler): () => void {
  messageHandlers.push(handler);
  return () => {
    const index = messageHandlers.indexOf(handler);
    if (index !== -1) messageHandlers.splice(index, 1);
  };
}

// Register for announcement events
export function onAnnouncement(handler: AnnouncementHandler): () => void {
  announcementHandlers.push(handler);
  return () => {
    const index = announcementHandlers.indexOf(handler);
    if (index !== -1) announcementHandlers.splice(index, 1);
  };
}

// Register for connection events
export function onConnectionChange(handler: ConnectionHandler): () => void {
  connectionHandlers.push(handler);
  return () => {
    const index = connectionHandlers.indexOf(handler);
    if (index !== -1) connectionHandlers.splice(index, 1);
  };
}

// Register for error events
export function onError(handler: ErrorHandler): () => void {
  errorHandlers.push(handler);
  return () => {
    const index = errorHandlers.indexOf(handler);
    if (index !== -1) errorHandlers.splice(index, 1);
  };
}

// Check if connected to a specific peer
export function isConnectedToPeer(userId: string): boolean {
  for (const conn of connections.values()) {
    if (conn.userId === userId && conn.connected) {
      return true;
    }
  }
  return false;
}

// Get all connected peers
export function getConnectedPeers(): string[] {
  const peerIds: string[] = [];
  for (const conn of connections.values()) {
    if (conn.connected && conn.userId) {
      peerIds.push(conn.userId);
    }
  }
  return peerIds;
}

// Disconnect all peers
export function disconnectAll(): void {
  for (const conn of connections.values()) {
    try {
      if (conn.dataChannel) {
        conn.dataChannel.close();
      }
      conn.connection.close();
    } catch (err) {
      console.error("Error disconnecting:", err);
    }
  }
  connections.clear();
} 