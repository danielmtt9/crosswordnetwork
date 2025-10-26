/**
 * Hook for managing message history persistence during room sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '@/components/RoomChat';

interface MessageHistoryConfig {
  maxMessages: number;
  sessionDuration: number; // in milliseconds
  autoSaveInterval: number; // in milliseconds
}

interface SessionData {
  roomId: string;
  startTime: number;
  messages: ChatMessage[];
  lastActivity: number;
}

const DEFAULT_CONFIG: MessageHistoryConfig = {
  maxMessages: 1000, // Keep last 1000 messages
  sessionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
  autoSaveInterval: 30 * 1000, // 30 seconds
};

export function useMessageHistory(
  roomId: string,
  config: Partial<MessageHistoryConfig> = {}
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config });
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionDataRef = useRef<SessionData | null>(null);

  // Generate session key for localStorage
  const getSessionKey = useCallback((roomId: string) => {
    return `chat-session-${roomId}`;
  }, []);

  // Load session data from localStorage
  const loadSessionData = useCallback(() => {
    try {
      const sessionKey = getSessionKey(roomId);
      const savedData = localStorage.getItem(sessionKey);
      
      if (savedData) {
        const sessionData: SessionData = JSON.parse(savedData);
        const now = Date.now();
        
        // Check if session is still valid (within duration)
        if (now - sessionData.startTime <= configRef.current.sessionDuration) {
          sessionDataRef.current = sessionData;
          setMessages(sessionData.messages);
          setLastSaved(new Date(sessionData.lastActivity));
          return true;
        } else {
          // Session expired, clear it
          localStorage.removeItem(sessionKey);
        }
      }
    } catch (error) {
      console.error('Error loading session data:', error);
    }
    
    return false;
  }, [roomId, getSessionKey]);

  // Save session data to localStorage
  const saveSessionData = useCallback(() => {
    try {
      const sessionKey = getSessionKey(roomId);
      const now = Date.now();
      
      const sessionData: SessionData = {
        roomId,
        startTime: sessionDataRef.current?.startTime || now,
        messages: messages.slice(-configRef.current.maxMessages), // Keep only recent messages
        lastActivity: now,
      };
      
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      sessionDataRef.current = sessionData;
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }, [roomId, messages, getSessionKey]);

  // Initialize session
  const initializeSession = useCallback(() => {
    const now = Date.now();
    sessionDataRef.current = {
      roomId,
      startTime: now,
      messages: [],
      lastActivity: now,
    };
  }, [roomId]);

  // Add message to history
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      
      // Trim to max messages if needed
      if (newMessages.length > configRef.current.maxMessages) {
        return newMessages.slice(-configRef.current.maxMessages);
      }
      
      return newMessages;
    });
  }, []);

  // Update message in history
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Remove message from history
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Get messages by type
  const getMessagesByType = useCallback((type: ChatMessage['type']) => {
    return messages.filter(msg => msg.type === type);
  }, [messages]);

  // Get messages by user
  const getMessagesByUser = useCallback((userId: string) => {
    return messages.filter(msg => msg.userId === userId);
  }, [messages]);

  // Search messages
  const searchMessages = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(lowercaseQuery) ||
      msg.userName.toLowerCase().includes(lowercaseQuery)
    );
  }, [messages]);

  // Get message statistics
  const getMessageStats = useCallback(() => {
    const now = Date.now();
    const sessionStart = sessionDataRef.current?.startTime || now;
    const sessionDuration = now - sessionStart;
    
    const userMessageCounts = messages.reduce((acc, msg) => {
      acc[msg.userId] = (acc[msg.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const typeCounts = messages.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalMessages: messages.length,
      sessionDuration: Math.floor(sessionDuration / 1000), // in seconds
      userMessageCounts,
      typeCounts,
      averageMessagesPerMinute: sessionDuration > 0 ? 
        (messages.length / (sessionDuration / 60000)) : 0,
    };
  }, [messages]);

  // Export session data
  const exportSessionData = useCallback(() => {
    const stats = getMessageStats();
    return {
      roomId,
      sessionData: sessionDataRef.current,
      messages,
      stats,
      exportedAt: new Date().toISOString(),
    };
  }, [roomId, messages, getMessageStats]);

  // Import session data
  const importSessionData = useCallback((data: any) => {
    try {
      if (data.roomId === roomId && data.messages) {
        setMessages(data.messages);
        if (data.sessionData) {
          sessionDataRef.current = data.sessionData;
        }
        return true;
      }
    } catch (error) {
      console.error('Error importing session data:', error);
    }
    return false;
  }, [roomId]);

  // Clean up expired sessions
  const cleanupExpiredSessions = useCallback(() => {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith('chat-session-')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const sessionData: SessionData = JSON.parse(data);
              if (now - sessionData.startTime > configRef.current.sessionDuration) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // Invalid data, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }, []);

  // Set up auto-save
  useEffect(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }
    
    autoSaveIntervalRef.current = setInterval(() => {
      saveSessionData();
    }, configRef.current.autoSaveInterval);
    
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [saveSessionData]);

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      
      // Try to load existing session
      const sessionLoaded = loadSessionData();
      
      if (!sessionLoaded) {
        // No valid session, initialize new one
        initializeSession();
      }
      
      setIsLoading(false);
    };
    
    loadSession();
  }, [roomId, loadSessionData, initializeSession]);

  // Save on unmount
  useEffect(() => {
    return () => {
      saveSessionData();
    };
  }, [saveSessionData]);

  // Clean up expired sessions on mount
  useEffect(() => {
    cleanupExpiredSessions();
  }, [cleanupExpiredSessions]);

  return {
    messages,
    isLoading,
    lastSaved,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    getMessagesByType,
    getMessagesByUser,
    searchMessages,
    getMessageStats,
    exportSessionData,
    importSessionData,
    saveSessionData,
    loadSessionData,
  };
}
