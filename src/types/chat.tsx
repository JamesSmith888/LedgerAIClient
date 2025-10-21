import { IMessage, User } from 'react-native-gifted-chat';

export interface ChatMessage extends IMessage {
  _id: string | number;
  text: string;
  createdAt: Date | number;
  user: User;
  status?: 'sending' | 'sent' | 'error';
}

export interface ChatUser {
  _id: string | number;
  name?: string;
  avatar?: string;
}

export interface WSMessage {
  type: 'message' | 'typing' | 'error' | 'broadcast';
  content?: string;
  timestamp?: number;
  sender?: 'user' | 'ai';
}
