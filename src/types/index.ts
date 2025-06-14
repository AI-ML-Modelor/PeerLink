export const DEFAULT_AVATAR_SVG_DATA_URI = "data:image/svg+xml;utf8,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%2012C14.2091%2012%2016%2010.2091%2016%208C16%205.79086%2014.2091%204%2012%204C9.79086%204%208%205.79086%208%208C8%2010.2091%209.79086%2012%2012%2012Z%22%20fill%3D%22currentColor%22%2F%3E%3Cpath%20d%3D%22M20%2019C20%2016.7909%2016.4183%2015%2012%2015C7.58172%2015%204%2016.7909%204%2019V20H20V19Z%22%20fill%3D%22currentColor%22%2F%3E%3C%2Fsvg%3E";

export interface UserProfile {
  userId: string;
  displayName: string;
  phoneNumber: string;
  inviteLink: string;
  avatar: string; // Will always be DEFAULT_AVATAR_SVG_DATA_URI
}

export interface PairedUser {
  userId: string;
  displayName: string; // Original name from pairing
  localDisplayName?: string; // Custom name set by the current user
  avatar: string; // Will always be DEFAULT_AVATAR_SVG_DATA_URI
}

export interface Chat {
  chatId: string; // Could be a sorted concatenation of two userIds
  participants: [string, string]; // [currentUser.userId, pairedUser.userId]
  lastMessage?: Message;
  unreadCount: number;
  participantDetails: {
    [userId: string]: { displayName: string, avatar: string };
  };
  isPending?: boolean; // Indicates if this is a placeholder chat with no messages yet
}

export interface MessageFile {
  name: string;
  type: string;
  size: number;
}

export interface Message {
  messageId: string;
  chatId: string;
  senderId: string; // userId of the sender
  receiverId: string; // userId of the receiver
  text: string; // Can be a caption for a file, or the main content if no file
  file?: MessageFile; // Optional file information
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  edited?: boolean; // Indicates if the message has been edited
  deletedForMe?: boolean; // Indicates if the message is deleted for the current user only
  deletedForEveryone?: boolean; // Indicates if the message is deleted for all participants
  replyToId?: string; // ID of the message this is replying to, if applicable
}

export interface AppState {
  userProfile: UserProfile | null;
  pairedUsers: PairedUser[];
  chats: Chat[];
  messages: Record<string, Message[]>; // Record<chatId, Message[]>
  announcements: Announcement[];
  invites: Invite[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  read?: boolean;
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
