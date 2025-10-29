"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageCircle, Send, MoreVertical, Trash2, VolumeX, Volume2, Crown, Eye, User, AlertTriangle, CheckCircle, XCircle, Clock, Users, Trophy, Star, Smile, Edit, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from './EmojiPicker';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: 'text' | 'system' | 'achievement' | 'join' | 'leave' | 'kick' | 'role_change' | 'session_start' | 'session_end' | 'hint_used' | 'puzzle_complete';
  metadata?: {
    role?: 'HOST' | 'PLAYER' | 'SPECTATOR';
    achievement?: {
      name: string;
      description: string;
      icon?: string;
    };
    targetUser?: string;
    newRole?: string;
    hintType?: string;
    timestamp?: string;
  };
  createdAt: string;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface MutedUser {
  userId: string;
  userName: string;
  mutedUntil: Date;
  mutedBy: string;
  reason?: string;
}

interface RoomParticipant {
  userId: string;
  userName: string;
  userRole: 'HOST' | 'PLAYER' | 'SPECTATOR';
  isOnline: boolean;
  joinedAt: string;
  lastSeenAt?: string;
}

interface RoomChatProps {
  roomId: string;
  roomCode: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'HOST' | 'PLAYER' | 'SPECTATOR';
  isHost: boolean;
  canModerate: boolean;
  messages: ChatMessage[];
  mutedUsers: MutedUser[];
  participants: RoomParticipant[];
  onSendMessage: (content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onMuteUser?: (userId: string, duration: number, reason?: string) => void;
  onUnmuteUser?: (userId: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  className?: string;
}

export function RoomChat({
  roomId,
  roomCode,
  currentUserId,
  currentUserName,
  currentUserRole,
  isHost,
  canModerate,
  messages,
  mutedUsers,
  participants,
  onSendMessage,
  onDeleteMessage,
  onMuteUser,
  onUnmuteUser,
  onAddReaction,
  onRemoveReaction,
  className = ""
}: RoomChatProps) {
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([]);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ count: number; resetTime: number } | null>(null);
  const [showModerationTools, setShowModerationTools] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  
  // Mention functionality state
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  
  // Message editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<number>(0);
  const messageCountRef = useRef<number>(0);
  const rateLimitWindowRef = useRef<number>(60000); // 1 minute window
  const maxMessagesPerWindow = 10; // Max 10 messages per minute

  // Check if current user is muted
  const isCurrentUserMuted = mutedUsers.some(muted => 
    muted.userId === currentUserId && muted.mutedUntil > new Date()
  );

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Track previous messages length to only scroll on new messages
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    // Only scroll if new messages were added (not on re-renders)
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages, scrollToBottom]);

  // Update message history when messages prop changes
  useEffect(() => {
    setMessageHistory(messages);
  }, [messages]);

  // Rate limiting check
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const windowStart = now - rateLimitWindowRef.current;
    
    // Reset count if we're in a new window
    if (lastMessageTimeRef.current < windowStart) {
      messageCountRef.current = 0;
    }
    
    if (messageCountRef.current >= maxMessagesPerWindow) {
      const resetTime = lastMessageTimeRef.current + rateLimitWindowRef.current;
      setRateLimitInfo({ count: messageCountRef.current, resetTime });
      return false;
    }
    
    return true;
  }, []);

  // Handle message submission
  const handleSendMessage = useCallback(() => {
    const content = messageInput.trim();
    if (!content || isCurrentUserMuted) return;

    // Check rate limit
    if (!checkRateLimit()) {
      alert(`Rate limit exceeded. You can send ${maxMessagesPerWindow} messages per minute.`);
      return;
    }

    // Check message length
    if (content.length > 500) {
      alert('Message too long. Maximum 500 characters allowed.');
      return;
    }

    // Check for spam patterns
    if (isSpamMessage(content)) {
      alert('Message appears to be spam and was blocked.');
      return;
    }

    onSendMessage(content);
    setMessageInput("");
    setIsTyping(false);
    
    // Update rate limiting
    messageCountRef.current++;
    lastMessageTimeRef.current = Date.now();
    setRateLimitInfo(null);
  }, [messageInput, isCurrentUserMuted, checkRateLimit, onSendMessage]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, []);

  // Spam detection
  const isSpamMessage = (content: string): boolean => {
    const spamPatterns = [
      /(.)\1{4,}/, // Repeated characters (5+)
      /(https?:\/\/[^\s]+)/gi, // URLs (basic detection)
      /(www\.[^\s]+)/gi, // www links
      /(bit\.ly|tinyurl|t\.co)/gi, // Common URL shorteners
      /(free|win|click|now|urgent|limited)/gi, // Spam keywords
    ];
    
    return spamPatterns.some(pattern => pattern.test(content));
  };

  // Mention functionality
  const getMentionSuggestions = useCallback(() => {
    return participants
      .filter(participant => 
        participant.userId !== currentUserId && // Don't suggest self
        (mentionQuery.trim() === '' || participant.userName.toLowerCase().includes(mentionQuery.toLowerCase()))
      )
      .slice(0, 5); // Limit to 5 suggestions
  }, [participants, currentUserId, mentionQuery]);

  const handleMentionInput = useCallback((value: string, cursorPosition: number) => {
    const beforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      const startIndex = cursorPosition - query.length - 1; // -1 for @
      
      setMentionQuery(query);
      setMentionStartIndex(startIndex);
      setShowMentionSuggestions(true);
      setSelectedMentionIndex(0);
    } else {
      // Check if we just typed @ at the end
      const justAtMatch = beforeCursor.match(/@$/);
      if (justAtMatch) {
        const startIndex = cursorPosition - 1;
        setMentionQuery('');
        setMentionStartIndex(startIndex);
        setShowMentionSuggestions(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentionSuggestions(false);
        setMentionQuery('');
        setMentionStartIndex(-1);
      }
    }
  }, []);

  const insertMention = useCallback((userName: string) => {
    const beforeMention = messageInput.substring(0, mentionStartIndex);
    const afterMention = messageInput.substring(mentionStartIndex + mentionQuery.length + 1);
    const newInput = `${beforeMention}@${userName} ${afterMention}`;
    
    setMessageInput(newInput);
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
    setSelectedMentionIndex(0);
  }, [messageInput, mentionStartIndex, mentionQuery]);

  const handleMentionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showMentionSuggestions) return;
    
    const suggestions = getMentionSuggestions();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedMentionIndex]) {
          insertMention(suggestions[selectedMentionIndex].userName);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowMentionSuggestions(false);
        setMentionQuery('');
        setMentionStartIndex(-1);
        break;
    }
  }, [showMentionSuggestions, getMentionSuggestions, selectedMentionIndex, insertMention]);

  // Message editing functionality
  const canEditMessage = useCallback((message: ChatMessage) => {
    if (message.userId !== currentUserId) return false;
    if (message.type !== 'text') return false;
    if (message.isDeleted) return false;
    
    // Check if message is within 5 minutes
    const messageTime = new Date(message.createdAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return (now - messageTime) <= fiveMinutes;
  }, [currentUserId]);

  const startEditingMessage = useCallback((message: ChatMessage) => {
    if (!canEditMessage(message)) return;
    
    setEditingMessageId(message.id);
    setEditContent(message.content);
  }, [canEditMessage]);

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
    setEditContent('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingMessageId || !editContent.trim()) return;
    
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to edit message');
      }

      // Update local message
      setMessageHistory(prev => prev.map(msg => 
        msg.id === editingMessageId 
          ? { ...msg, content: editContent.trim() }
          : msg
      ));

      setEditingMessageId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('Failed to edit message. Please try again.');
    }
  }, [editingMessageId, editContent, roomId]);

  // Get message type icon
  const getMessageTypeIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'system': return <AlertTriangle className="h-3 w-3 text-blue-500" />;
      case 'achievement': return <Trophy className="h-3 w-3 text-yellow-500" />;
      case 'join': return <Users className="h-3 w-3 text-green-500" />;
      case 'leave': return <Users className="h-3 w-3 text-gray-500" />;
      case 'kick': return <XCircle className="h-3 w-3 text-red-500" />;
      case 'role_change': return <Crown className="h-3 w-3 text-purple-500" />;
      case 'session_start': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'session_end': return <XCircle className="h-3 w-3 text-red-500" />;
      case 'hint_used': return <Star className="h-3 w-3 text-orange-500" />;
      case 'puzzle_complete': return <Trophy className="h-3 w-3 text-yellow-500" />;
      default: return <MessageCircle className="h-3 w-3 text-gray-500" />;
    }
  };

  // Get message type color
  const getMessageTypeColor = (type: ChatMessage['type']) => {
    switch (type) {
      case 'system': return 'text-blue-600';
      case 'achievement': return 'text-yellow-600';
      case 'join': return 'text-green-600';
      case 'leave': return 'text-gray-600';
      case 'kick': return 'text-red-600';
      case 'role_change': return 'text-purple-600';
      case 'session_start': return 'text-green-600';
      case 'session_end': return 'text-red-600';
      case 'hint_used': return 'text-orange-600';
      case 'puzzle_complete': return 'text-yellow-600';
      default: return 'text-gray-900';
    }
  };

  // Format message content based on type
  const formatMessageContent = (message: ChatMessage) => {
    switch (message.type) {
      case 'system':
        return <span className="italic">{message.content}</span>;
      case 'achievement':
        return (
          <div className="flex items-center gap-2">
            <span>{message.content}</span>
            {message.metadata?.achievement && (
              <Badge variant="secondary" className="text-xs">
                {message.metadata.achievement.name}
              </Badge>
            )}
          </div>
        );
      case 'join':
        return <span className="text-green-600">{message.content}</span>;
      case 'leave':
        return <span className="text-gray-600">{message.content}</span>;
      case 'kick':
        return <span className="text-red-600">{message.content}</span>;
      case 'role_change':
        return <span className="text-purple-600">{message.content}</span>;
      case 'session_start':
        return <span className="text-green-600 font-medium">{message.content}</span>;
      case 'session_end':
        return <span className="text-red-600 font-medium">{message.content}</span>;
      case 'hint_used':
        return <span className="text-orange-600">{message.content}</span>;
      case 'puzzle_complete':
        return <span className="text-yellow-600 font-medium">{message.content}</span>;
      default:
        return formatMessageWithMentions(message.content);
    }
  };

  // Format message content with highlighted mentions
  const formatMessageWithMentions = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      // Check if mentioned user exists in participants
      const mentionedUser = participants.find(p => p.userName === match[1]);
      
      if (mentionedUser) {
        // Highlight mention
        parts.push(
          <span 
            key={match.index} 
            className="bg-blue-100 text-blue-700 px-1 rounded font-medium"
          >
            @{match[1]}
          </span>
        );
      } else {
        // Regular text if user not found
        parts.push(`@${match[1]}`);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return <span>{parts}</span>;
  };

  // Check if user can moderate a specific message
  const canModerateMessage = (message: ChatMessage) => {
    if (!canModerate) return false;
    if (message.type === 'system') return false; // Can't delete system messages
    if (message.userId === currentUserId && !isHost) return false; // Can only delete own messages unless host
    return true;
  };

  // Check if user is muted
  const isUserMuted = (userId: string) => {
    return mutedUsers.some(muted => 
      muted.userId === userId && muted.mutedUntil > new Date()
    );
  };

  // Handle emoji reaction
  const handleEmojiReaction = (messageId: string, emoji: string) => {
    const message = messageHistory.find(msg => msg.id === messageId);
    if (!message || !onAddReaction) return;

    const existingReaction = message.reactions?.find(r => r.emoji === emoji);
    const hasUserReacted = existingReaction?.users.includes(currentUserId);

    if (hasUserReacted) {
      // Remove reaction
      onRemoveReaction?.(messageId, emoji);
    } else {
      // Add reaction
      onAddReaction(messageId, emoji);
    }
    
    setShowEmojiPicker(null);
  };

  // Check if user has reacted with specific emoji
  const hasUserReacted = (message: ChatMessage, emoji: string) => {
    const reaction = message.reactions?.find(r => r.emoji === emoji);
    return reaction?.users.includes(currentUserId) || false;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
            {typingUsers.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {Array.from(typingUsers).join(', ')} typing...
              </Badge>
            )}
          </div>
          {canModerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModerationTools(!showModerationTools)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Moderation Tools */}
          {showModerationTools && canModerate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">Moderation Tools</span>
              </div>
              <div className="text-xs text-yellow-700">
                • Right-click messages to delete them
                • Mute users for spam or inappropriate behavior
                • System messages cannot be deleted
              </div>
            </motion.div>
          )}

          {/* Rate Limit Warning */}
          {rateLimitInfo && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Rate limit exceeded. You can send {maxMessagesPerWindow} messages per minute.
                  Reset in {Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)}s
                </span>
              </div>
            </div>
          )}

          {/* Muted User Warning */}
          {isCurrentUserMuted && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
              <div className="flex items-center gap-2">
                <VolumeX className="h-4 w-4" />
                <span>You are muted and cannot send messages.</span>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="h-64 w-full">
            <div className="space-y-2 pr-4">
              <AnimatePresence>
                {messageHistory.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`text-sm ${
                      message.isDeleted ? 'opacity-50' : ''
                    }`}
                  >
                    {message.isDeleted ? (
                      <div className="flex items-center gap-2 text-gray-500 italic">
                        <Trash2 className="h-3 w-3" />
                        <span>Message deleted by {message.deletedBy}</span>
                      </div>
                    ) : (
                      <div className="group">
                        <div className="flex items-start gap-2">
                          <div className="flex items-center gap-1">
                            {getMessageTypeIcon(message.type)}
                            {message.metadata?.role === 'HOST' && (
                              <Crown className="h-3 w-3 text-yellow-500" />
                            )}
                            {message.metadata?.role === 'SPECTATOR' && (
                              <Eye className="h-3 w-3 text-gray-500" />
                            )}
                            {isUserMuted(message.userId) && (
                              <VolumeX className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                message.userId === currentUserId ? 'text-blue-600' : 'text-gray-700'
                              }`}>
                                {message.userName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className={`${getMessageTypeColor(message.type)}`}>
                              {editingMessageId === message.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        saveEdit();
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        cancelEditing();
                                      }
                                    }}
                                    className="text-sm"
                                    maxLength={500}
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={saveEdit}
                                      disabled={!editContent.trim()}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditing}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                formatMessageContent(message)
                              )}
                            </div>
                            
                            {/* Message Reactions */}
                            {message.reactions && message.reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {message.reactions.map((reaction, index) => (
                                  <button
                                    key={`${reaction.emoji}-${index}`}
                                    onClick={() => handleEmojiReaction(message.id, reaction.emoji)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                      hasUserReacted(message, reaction.emoji)
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                    }`}
                                  >
                                    <span>{reaction.emoji}</span>
                                    <span>{reaction.count}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Emoji Reaction Button */}
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                                className="h-6 w-6 p-0"
                                aria-label="Add emoji reaction"
                              >
                                <Smile className="h-3 w-3" />
                              </Button>
                              
                              {/* Emoji Picker */}
                              {showEmojiPicker === message.id && (
                                <EmojiPicker
                                  onEmojiSelect={(emoji) => handleEmojiReaction(message.id, emoji)}
                                  onClose={() => setShowEmojiPicker(null)}
                                  isOpen={true}
                                  className="bottom-full left-0 mb-1"
                                />
                              )}
                            </div>

                            {/* Moderation Tools */}
                            {canModerateMessage(message) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    aria-label="More options"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEditMessage(message) && (
                                    <DropdownMenuItem
                                      onClick={() => startEditingMessage(message)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Message
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => onDeleteMessage?.(message.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Message
                                  </DropdownMenuItem>
                                  {message.userId !== currentUserId && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => onMuteUser?.(message.userId, 300000, 'Inappropriate message')} // 5 minutes
                                      >
                                        <VolumeX className="h-4 w-4 mr-2" />
                                        Mute User (5 min)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => onMuteUser?.(message.userId, 1800000, 'Spam')} // 30 minutes
                                      >
                                        <VolumeX className="h-4 w-4 mr-2" />
                                        Mute User (30 min)
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="relative flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => {
                const value = e.target.value;
                const cursorPosition = e.target.selectionStart || 0;
                setMessageInput(value);
                handleTyping();
                handleMentionInput(value, cursorPosition);
              }}
              onKeyDown={(e) => {
                handleMentionKeyDown(e);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !showMentionSuggestions) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isCurrentUserMuted 
                  ? "You are muted and cannot send messages"
                  : "Type a message... (Enter to send, Shift+Enter for new line)"
              }
              maxLength={500}
              disabled={isCurrentUserMuted}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              size="sm"
              disabled={!messageInput.trim() || isCurrentUserMuted}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Mention Suggestions */}
          {showMentionSuggestions && getMentionSuggestions().length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {getMentionSuggestions().map((participant, index) => (
                <button
                  key={participant.userId}
                  onClick={() => insertMention(participant.userName)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                    index === selectedMentionIndex ? 'bg-blue-100 dark:bg-blue-900' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="font-medium">{participant.userName}</span>
                    <Badge 
                      variant={participant.userRole === 'HOST' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {participant.userRole}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Character count */}
          <div className="text-xs text-gray-500 text-right">
            {messageInput.length}/500 characters
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for managing chat state
export function useRoomChat(roomId: string, currentUserId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setMutedUsers(data.mutedUsers || []);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      const newMessage = await response.json();
      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [roomId]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete message');
      }

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isDeleted: true, deletedBy: 'You', deletedAt: new Date().toISOString() }
          : msg
      ));
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }, [roomId]);

  // Mute user
  const muteUser = useCallback(async (userId: string, duration: number, reason?: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, duration, reason })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mute user');
      }

      const mutedUser = await response.json();
      setMutedUsers(prev => [...prev, mutedUser]);
    } catch (error) {
      console.error('Failed to mute user:', error);
      throw error;
    }
  }, [roomId]);

  // Unmute user
  const unmuteUser = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/mute/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unmute user');
      }

      setMutedUsers(prev => prev.filter(muted => muted.userId !== userId));
    } catch (error) {
      console.error('Failed to unmute user:', error);
      throw error;
    }
  }, [roomId]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add reaction');
      }

      const updatedMessage = await response.json();
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ));
    } catch (error) {
      console.error('Failed to add reaction:', error);
      throw error;
    }
  }, [roomId]);

  // Remove reaction from message
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/messages/${messageId}/reactions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove reaction');
      }

      const updatedMessage = await response.json();
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ));
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      throw error;
    }
  }, [roomId]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  return {
    messages,
    mutedUsers,
    isLoading,
    sendMessage,
    deleteMessage,
    muteUser,
    unmuteUser,
    addReaction,
    removeReaction,
    loadChatHistory
  };
}
