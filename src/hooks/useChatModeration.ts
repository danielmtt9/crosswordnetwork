/**
 * Hook for managing chat moderation functionality
 */

import { useState, useCallback, useEffect } from 'react';
import { ModerationConfig, ModerationAction, ModerationStats } from '@/lib/chatModeration';

interface UseChatModerationProps {
  onModerationAction?: (action: string, userId: string, reason?: string) => void;
  onWarning?: (userId: string, count: number) => void;
  onBlock?: (userId: string, reason: string) => void;
}

export function useChatModeration({
  onModerationAction,
  onWarning,
  onBlock
}: UseChatModerationProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isStrictMode, setIsStrictMode] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [warningCounts, setWarningCounts] = useState<Map<string, number>>(new Map());
  const [recentActions, setRecentActions] = useState<ModerationAction[]>([]);
  const [config, setConfig] = useState<ModerationConfig>({
    maxWarnings: 3,
    warningCooldown: 5 * 60 * 1000, // 5 minutes
    strictMode: false,
    customFilters: [],
    whitelist: []
  });

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('chat-moderation-config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        setIsEnabled(parsed.enabled !== false);
        setIsStrictMode(parsed.strictMode || false);
      }
    } catch (error) {
      console.error('Error loading moderation config:', error);
    }
  }, []);

  // Save configuration to localStorage when it changes
  useEffect(() => {
    try {
      const configToSave = {
        ...config,
        enabled: isEnabled,
        strictMode: isStrictMode
      };
      localStorage.setItem('chat-moderation-config', JSON.stringify(configToSave));
    } catch (error) {
      console.error('Error saving moderation config:', error);
    }
  }, [config, isEnabled, isStrictMode]);

  const checkMessage = useCallback((message: string, userId: string): boolean => {
    if (!isEnabled) return true;
    
    // Check if user is whitelisted
    if (config.whitelist.includes(userId)) return true;
    
    // Check if user is blocked
    if (blockedUsers.has(userId)) return false;
    
    // Check for inappropriate content
    const inappropriateWords = [
      'spam', 'scam', 'fake', 'hack', 'cheat', 'exploit',
      'hate', 'discrimination', 'harassment', 'abuse',
      'inappropriate', 'offensive', 'vulgar'
    ];
    
    const messageLower = message.toLowerCase();
    const hasInappropriateContent = inappropriateWords.some(word => 
      messageLower.includes(word)
    );
    
    // Check custom filters
    const hasCustomFilter = config.customFilters.some(filter => 
      messageLower.includes(filter.toLowerCase())
    );
    
    if (hasInappropriateContent || hasCustomFilter) {
      // Add warning
      const currentWarnings = warningCounts.get(userId) || 0;
      const newWarnings = currentWarnings + 1;
      
      setWarningCounts(prev => new Map(prev.set(userId, newWarnings)));
      
      // Record action
      const action: ModerationAction = {
        action: 'warning',
        userId,
        timestamp: new Date(),
        reason: hasInappropriateContent ? 'Inappropriate content detected' : 'Custom filter triggered'
      };
      
      setRecentActions(prev => [action, ...prev.slice(0, 99)]); // Keep last 100 actions
      
      // Call callbacks
      onWarning?.(userId, newWarnings);
      onModerationAction?.('warning', userId, action.reason);
      
      // Check if user should be blocked
      if (newWarnings >= config.maxWarnings) {
        blockUser(userId, `Exceeded maximum warnings (${config.maxWarnings})`);
      }
      
      return false; // Message should be blocked
    }
    
    return true; // Message is allowed
  }, [isEnabled, config, blockedUsers, warningCounts, onWarning, onModerationAction]);

  const blockUser = useCallback((userId: string, reason: string) => {
    setBlockedUsers(prev => new Set(prev).add(userId));
    
    const action: ModerationAction = {
      action: 'block',
      userId,
      timestamp: new Date(),
      reason
    };
    
    setRecentActions(prev => [action, ...prev.slice(0, 99)]);
    
    onBlock?.(userId, reason);
    onModerationAction?.('block', userId, reason);
  }, [onBlock, onModerationAction]);

  const unblockUser = useCallback((userId: string) => {
    setBlockedUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
    
    const action: ModerationAction = {
      action: 'unblock',
      userId,
      timestamp: new Date()
    };
    
    setRecentActions(prev => [action, ...prev.slice(0, 99)]);
    
    onModerationAction?.('unblock', userId);
  }, [onModerationAction]);

  const clearWarnings = useCallback((userId: string) => {
    setWarningCounts(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
    
    const action: ModerationAction = {
      action: 'clear-warnings',
      userId,
      timestamp: new Date()
    };
    
    setRecentActions(prev => [action, ...prev.slice(0, 99)]);
    
    onModerationAction?.('clear-warnings', userId);
  }, [onModerationAction]);

  const toggleModeration = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const toggleStrictMode = useCallback(() => {
    setIsStrictMode(prev => !prev);
    setConfig(prev => ({ ...prev, strictMode: !prev.strictMode }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<ModerationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const getStats = useCallback((): ModerationStats => {
    const totalWarnings = Array.from(warningCounts.values()).reduce((sum, count) => sum + count, 0);
    const blockedCount = blockedUsers.size;
    const recentActionCount = recentActions.length;
    
    return {
      totalWarnings,
      blockedCount,
      recentActionCount,
      isEnabled,
      isStrictMode
    };
  }, [warningCounts, blockedUsers, recentActions, isEnabled, isStrictMode]);

  const getRecentActions = useCallback((limit: number = 20): ModerationAction[] => {
    return recentActions.slice(0, limit);
  }, [recentActions]);

  const isUserBlocked = useCallback((userId: string): boolean => {
    return blockedUsers.has(userId);
  }, [blockedUsers]);

  const getUserWarningCount = useCallback((userId: string): number => {
    return warningCounts.get(userId) || 0;
  }, [warningCounts]);

  return {
    isEnabled,
    isStrictMode,
    blockedUsers,
    warningCounts,
    checkMessage,
    blockUser,
    unblockUser,
    clearWarnings,
    toggleModeration,
    toggleStrictMode,
    updateConfig,
    getStats,
    getRecentActions,
    isUserBlocked,
    getUserWarningCount
  };
}