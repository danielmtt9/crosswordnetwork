"use client";

import { useMemo } from 'react';
import { RoomPermissionManager, createPermissionContext, RoomAction } from '@/lib/roomPermissions';
import { ParticipantRole } from '@prisma/client';

interface UseRoomPermissionsProps {
  userRole: ParticipantRole | null;
  isHost: boolean;
  isOnline: boolean;
  roomStatus: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  isPrivate: boolean;
  hasPassword: boolean;
  isPremium: boolean;
}

export function useRoomPermissions({
  userRole,
  isHost,
  isOnline,
  roomStatus,
  isPrivate,
  hasPassword,
  isPremium
}: UseRoomPermissionsProps) {
  const permissionContext = useMemo(() => 
    createPermissionContext(
      userRole,
      isHost,
      isOnline,
      roomStatus,
      isPrivate,
      hasPassword,
      isPremium
    ), [userRole, isHost, isOnline, roomStatus, isPrivate, hasPassword, isPremium]
  );

  const canPerformAction = useMemo(() => {
    return (action: RoomAction) => {
      return RoomPermissionManager.canPerformAction(action, permissionContext);
    };
  }, [permissionContext]);

  const validateAction = useMemo(() => {
    return (action: RoomAction) => {
      return RoomPermissionManager.validateAction(action, permissionContext);
    };
  }, [permissionContext]);

  const getActionsForRole = useMemo(() => {
    return (role: ParticipantRole) => {
      return RoomPermissionManager.getActionsForRole(role);
    };
  }, []);

  const isRoleHigherOrEqual = useMemo(() => {
    return (roleA: ParticipantRole, roleB: ParticipantRole) => {
      return RoomPermissionManager.isRoleHigherOrEqual(roleA, roleB);
    };
  }, []);

  // Convenience methods for common actions
  const canViewRoom = canPerformAction('view_room');
  const canJoinRoom = canPerformAction('join_room');
  const canLeaveRoom = canPerformAction('leave_room');
  const canUpdateCell = canPerformAction('update_cell');
  const canUseHints = canPerformAction('use_hints');
  const canSendChatMessage = canPerformAction('send_chat_message');
  const canModerateChat = canPerformAction('moderate_chat');
  const canKickPlayer = canPerformAction('kick_player');
  const canChangeRole = canPerformAction('change_role');
  const canManageSession = canPerformAction('manage_session');
  const canUpdateRoomSettings = canPerformAction('update_room_settings');
  const canViewParticipants = canPerformAction('view_participants');
  const canInvitePlayers = canPerformAction('invite_players');
  const canRequestJoin = canPerformAction('request_join');

  return {
    // Core permission methods
    canPerformAction,
    validateAction,
    getActionsForRole,
    isRoleHigherOrEqual,
    
    // Convenience methods
    canViewRoom,
    canJoinRoom,
    canLeaveRoom,
    canUpdateCell,
    canUseHints,
    canSendChatMessage,
    canModerateChat,
    canKickPlayer,
    canChangeRole,
    canManageSession,
    canUpdateRoomSettings,
    canViewParticipants,
    canInvitePlayers,
    canRequestJoin,
    
    // Context info
    permissionContext,
    userRole,
    isHost,
    isOnline,
    roomStatus
  };
}

/**
 * Hook for checking if a user can perform actions on another user
 */
export function useUserActionPermissions(
  actorRole: ParticipantRole | null,
  targetRole: ParticipantRole,
  isActorHost: boolean
) {
  const canKickUser = useMemo(() => {
    return RoomPermissionManager.canKickUser(actorRole, targetRole, isActorHost);
  }, [actorRole, targetRole, isActorHost]);

  const canChangeUserRole = useMemo(() => {
    return (newRole: ParticipantRole) => {
      return RoomPermissionManager.canChangeRole(actorRole, targetRole, newRole, isActorHost);
    };
  }, [actorRole, targetRole, isActorHost]);

  return {
    canKickUser,
    canChangeUserRole
  };
}
