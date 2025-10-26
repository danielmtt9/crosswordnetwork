import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../components/RoomChat';

interface UseRoomChatProps {
  roomId: string;
  roomCode: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'HOST' | 'PLAYER' | 'SPECTATOR';
  isHost: boolean;
  canModerate: boolean;
  onSendMessage: (message: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onMuteUser: (userId: string, durationMinutes: number) => void;
  onUnmuteUser: (userId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

interface UseRoomChatReturn {
  messages: ChatMessage[];
  messageInput: string;
  setMessageInput: (input: string) => void;
  sendMessage: () => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  muteUser: (userId: string, durationMinutes: number) => Promise<void>;
  unmuteUser: (userId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  typingUsers: string[];
  isTyping: boolean;
  handleTyping: () => void;
}

export const useRoomChat = ({
  roomId,
  roomCode,
  currentUserId,
  currentUserName,
  currentUserRole,
  isHost,
  canModerate,
  onSendMessage,
  onDeleteMessage,
  onMuteUser,
  onUnmuteUser,
  onAddReaction,
  onRemoveReaction,
}: UseRoomChatProps): UseRoomChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
      });

      // Join room
      socketRef.current.emit('join_room', { roomCode, userId: currentUserId });

      // Set up event listeners
      socketRef.current.on('chat_message_received', (data: any) => {
        const newMessage: ChatMessage = {
          id: data.id,
          userId: data.userId,
          userName: data.userName,
          content: data.content,
          type: data.type || 'text',
          metadata: data.metadata,
          createdAt: data.createdAt,
          reactions: data.reactions || [],
        };
        setMessages(prev => [...prev, newMessage]);
      });

      socketRef.current.on('user_typing', (data: { userId: string; userName: string }) => {
        setTypingUsers(prev => {
          if (!prev.includes(data.userName)) {
            return [...prev, data.userName];
          }
          return prev;
        });
      });

      socketRef.current.on('user_stopped_typing', (data: { userId: string }) => {
        setTypingUsers(prev => prev.filter(name => name !== data.userName));
      });

      socketRef.current.on('message_reaction_updated', (data: any) => {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      });

      socketRef.current.on('message_edited', (data: any) => {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { 
                ...msg, 
                content: data.content, 
                editedAt: data.editedAt, 
                isEdited: data.isEdited 
              }
            : msg
        ));
      });

      socketRef.current.on('message_deleted', (data: any) => {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { 
                ...msg, 
                isDeleted: true, 
                deletedBy: data.deletedBy, 
                deletedAt: data.deletedAt 
              }
            : msg
        ));
      });

      socketRef.current.on('error', (data: { message: string }) => {
        console.error('Socket error:', data.message);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('chat_message_received');
        socketRef.current.off('user_typing');
        socketRef.current.off('user_stopped_typing');
        socketRef.current.off('message_reaction_updated');
        socketRef.current.off('message_edited');
        socketRef.current.off('message_deleted');
        socketRef.current.off('error');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomCode, currentUserId]);

  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !socketRef.current) return;

    const messageData = {
      roomCode,
      userId: currentUserId,
      userName: currentUserName,
      content: messageInput.trim(),
      type: 'text',
      metadata: null,
    };

    socketRef.current.emit('chat_message', messageData);
    setMessageInput('');
    onSendMessage(messageInput.trim());
  }, [messageInput, roomCode, currentUserId, currentUserName, onSendMessage]);

  const handleTyping = useCallback(() => {
    if (!socketRef.current) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing_start', {
        roomCode,
        userId: currentUserId,
        userName: currentUserName,
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('typing_stop', {
        roomCode,
        userId: currentUserId,
      });
    }, 1000);
  }, [roomCode, currentUserId, currentUserName, isTyping]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('message_reaction', {
      roomCode,
      messageId,
      emoji,
      userId: currentUserId,
    });

    onAddReaction(messageId, emoji);
  }, [roomCode, currentUserId, onAddReaction]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('message_reaction', {
      roomCode,
      messageId,
      emoji,
      userId: currentUserId,
    });

    onRemoveReaction(messageId, emoji);
  }, [roomCode, currentUserId, onRemoveReaction]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('message_edit', {
      roomCode,
      messageId,
      content,
      userId: currentUserId,
    });
  }, [roomCode, currentUserId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('message_delete', {
      roomCode,
      messageId,
      userId: currentUserId,
      userRole: currentUserRole,
      isHost,
    });

    onDeleteMessage(messageId);
  }, [roomCode, currentUserId, currentUserRole, isHost, onDeleteMessage]);

  const muteUser = useCallback(async (userId: string, durationMinutes: number) => {
    if (!socketRef.current) return;

    socketRef.current.emit('mute_user', {
      roomCode,
      userId,
      durationMinutes,
      mutedBy: currentUserId,
    });

    onMuteUser(userId, durationMinutes);
  }, [roomCode, currentUserId, onMuteUser]);

  const unmuteUser = useCallback(async (userId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('unmute_user', {
      roomCode,
      userId,
      unmutedBy: currentUserId,
    });

    onUnmuteUser(userId);
  }, [roomCode, currentUserId, onUnmuteUser]);

  return {
    messages,
    messageInput,
    setMessageInput,
    sendMessage,
    deleteMessage,
    muteUser,
    unmuteUser,
    addReaction,
    removeReaction,
    editMessage,
    typingUsers,
    isTyping,
    handleTyping,
  };
};

export default useRoomChat;
