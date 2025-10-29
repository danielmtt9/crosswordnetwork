import { renderHook } from '@testing-library/react';
import { useRoomPermissions, useUserActionPermissions } from './useRoomPermissions';
import { ParticipantRole } from '@prisma/client';

// Mock the room permissions module
jest.mock('../lib/roomPermissions', () => ({
  RoomPermissionManager: {
    canPerformAction: jest.fn(),
    validateAction: jest.fn(),
    getActionsForRole: jest.fn(),
    isRoleHigherOrEqual: jest.fn(),
    canKickUser: jest.fn(),
    canChangeRole: jest.fn(),
  },
  createPermissionContext: jest.fn(),
}));

import { RoomPermissionManager, createPermissionContext } from '../lib/roomPermissions';

const mockRoomPermissionManager = RoomPermissionManager as jest.Mocked<typeof RoomPermissionManager>;
const mockCreatePermissionContext = createPermissionContext as jest.MockedFunction<typeof createPermissionContext>;

describe('useRoomPermissions', () => {
  const mockPermissionContext = {
    userId: 'user-123',
    roomId: 'room-123',
    userRole: 'PLAYER' as ParticipantRole,
    isHost: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePermissionContext.mockReturnValue(mockPermissionContext);
  });

  it('should return permission context and convenience methods', () => {
    mockRoomPermissionManager.canPerformAction.mockReturnValue(true);
    mockRoomPermissionManager.validateAction.mockReturnValue({ allowed: true });
    mockRoomPermissionManager.getActionsForRole.mockReturnValue(['view_room', 'update_cell']);
    mockRoomPermissionManager.isRoleHigherOrEqual.mockReturnValue(true);

    const { result } = renderHook(() =>
      useRoomPermissions({
        userRole: 'PLAYER',
        isHost: false,
        isOnline: true,
        roomStatus: 'WAITING',
        isPrivate: false,
        hasPassword: false,
        isPremium: true,
      })
    );

    expect(result.current.permissionContext).toEqual(mockPermissionContext);
    expect(result.current.userRole).toBe('PLAYER');
    expect(result.current.isHost).toBe(false);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.roomStatus).toBe('WAITING');
  });

  it('should provide convenience methods for common actions', () => {
    mockRoomPermissionManager.canPerformAction
      .mockReturnValueOnce(true)  // canViewRoom
      .mockReturnValueOnce(true)  // canJoinRoom
      .mockReturnValueOnce(true)  // canLeaveRoom
      .mockReturnValueOnce(true)  // canUpdateCell
      .mockReturnValueOnce(false) // canUseHints
      .mockReturnValueOnce(true)  // canSendMessage
      .mockReturnValueOnce(false) // canKickPlayer
      .mockReturnValueOnce(false) // canChangeRole
      .mockReturnValueOnce(false) // canManageSession
      .mockReturnValueOnce(false) // canUpdateRoomSettings
      .mockReturnValueOnce(true)  // canViewParticipants
      .mockReturnValueOnce(true)  // canInvitePlayers
      .mockReturnValueOnce(true); // canRequestJoin

    const { result } = renderHook(() =>
      useRoomPermissions({
        userRole: 'PLAYER',
        isHost: false,
        isOnline: true,
        roomStatus: 'WAITING',
        isPrivate: false,
        hasPassword: false,
        isPremium: true,
      })
    );

    expect(result.current.canViewRoom).toBe(true);
    expect(result.current.canJoinRoom).toBe(true);
    expect(result.current.canLeaveRoom).toBe(true);
    expect(result.current.canUpdateCell).toBe(true);
    expect(result.current.canUseHints).toBe(false);
    expect(result.current.canSendMessage).toBe(true);
    expect(result.current.canKickPlayer).toBe(false);
    expect(result.current.canChangeRole).toBe(false);
    expect(result.current.canManageSession).toBe(false);
    expect(result.current.canUpdateRoomSettings).toBe(false);
    expect(result.current.canViewParticipants).toBe(true);
    expect(result.current.canInvitePlayers).toBe(true);
    expect(result.current.canRequestJoin).toBe(true);
  });

  it('should call canPerformAction with correct parameters', () => {
    mockRoomPermissionManager.canPerformAction.mockReturnValue(true);

    renderHook(() =>
      useRoomPermissions({
        userRole: 'PLAYER',
        isHost: false,
        isOnline: true,
        roomStatus: 'WAITING',
        isPrivate: false,
        hasPassword: false,
        isPremium: true,
      })
    );

    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('view_room', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('join_room', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('leave_room', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('update_cell', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('use_hints', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('send_message', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('kick_player', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('change_role', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('manage_session', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('update_room_settings', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('view_participants', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('invite_players', mockPermissionContext);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('request_join', mockPermissionContext);
  });

  it('should provide canPerformAction function', () => {
    mockRoomPermissionManager.canPerformAction.mockReturnValue(true);

    const { result } = renderHook(() =>
      useRoomPermissions({
        userRole: 'PLAYER',
        isHost: false,
        isOnline: true,
        roomStatus: 'WAITING',
        isPrivate: false,
        hasPassword: false,
        isPremium: true,
      })
    );

    const canPerform = result.current.canPerformAction('view_room');
    expect(canPerform).toBe(true);
    expect(mockRoomPermissionManager.canPerformAction).toHaveBeenCalledWith('view_room', mockPermissionContext);
  });

  it('should provide validateAction function', () => {
    const mockValidation = { allowed: true, reason: undefined };
    mockRoomPermissionManager.validateAction.mockReturnValue(mockValidation);

    const { result } = renderHook(() =>
      useRoomPermissions({
        userRole: 'PLAYER',
        isHost: false,
        isOnline: true,
        roomStatus: 'WAITING',
        isPrivate: false,
        hasPassword: false,
        isPremium: true,
      })
    );

    const validation = result.current.validateAction('view_room');
    expect(validation).toEqual(mockValidation);
    expect(mockRoomPermissionManager.validateAction).toHaveBeenCalledWith('view_room', mockPermissionContext);
  });

  it('should provide getActionsForRole function', () => {
    const mockActions = ['view_room', 'update_cell'];
    mockRoomPermissionManager.getActionsForRole.mockReturnValue(mockActions);

    const { result } = renderHook(() =>
      useRoomPermissions({
        userRole: 'PLAYER',
        isHost: false,
        isOnline: true,
        roomStatus: 'WAITING',
        isPrivate: false,
        hasPassword: false,
        isPremium: true,
      })
    );

    const actions = result.current.getActionsForRole('PLAYER');
    expect(actions).toEqual(mockActions);
    expect(mockRoomPermissionManager.getActionsForRole).toHaveBeenCalledWith('PLAYER');
  });

  it('should provide isRoleHigherOrEqual function', () => {
    mockRoomPermissionManager.isRoleHigherOrEqual.mockReturnValue(true);

    const { result } = renderHook(() =>
      useRoomPermissions({
        userRole: 'PLAYER',
        isHost: false,
        isOnline: true,
        roomStatus: 'WAITING',
        isPrivate: false,
        hasPassword: false,
        isPremium: true,
      })
    );

    const isHigher = result.current.isRoleHigherOrEqual('HOST', 'PLAYER');
    expect(isHigher).toBe(true);
    expect(mockRoomPermissionManager.isRoleHigherOrEqual).toHaveBeenCalledWith('HOST', 'PLAYER');
  });

  it('should update when props change', () => {
    const { rerender } = renderHook(
      ({ props }) => useRoomPermissions(props),
      {
        initialProps: {
          props: {
            userRole: 'PLAYER' as ParticipantRole,
            isHost: false,
            isOnline: true,
            roomStatus: 'WAITING' as const,
            isPrivate: false,
            hasPassword: false,
            isPremium: true,
          }
        }
      }
    );

    expect(mockCreatePermissionContext).toHaveBeenCalledWith(
      'PLAYER',
      false,
      true,
      'WAITING',
      false,
      false,
      true
    );

    rerender({
      props: {
        userRole: 'HOST' as ParticipantRole,
        isHost: true,
        isOnline: true,
        roomStatus: 'ACTIVE' as const,
        isPrivate: false,
        hasPassword: false,
        isPremium: true,
      }
    });

    expect(mockCreatePermissionContext).toHaveBeenCalledWith(
      'HOST',
      true,
      true,
      'ACTIVE',
      false,
      false,
      true
    );
  });
});

describe('useUserActionPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return canKickUser and canChangeUserRole functions', () => {
    mockRoomPermissionManager.canKickUser.mockReturnValue(true);
    mockRoomPermissionManager.canChangeRole.mockReturnValue(true);

    const { result } = renderHook(() =>
      useUserActionPermissions('HOST', 'PLAYER', true)
    );

    expect(result.current.canKickUser).toBe(true);
    expect(result.current.canChangeUserRole('SPECTATOR')).toBe(true);
  });

  it('should call canKickUser with correct parameters', () => {
    mockRoomPermissionManager.canKickUser.mockReturnValue(true);

    renderHook(() =>
      useUserActionPermissions('HOST', 'PLAYER', true)
    );

    expect(mockRoomPermissionManager.canKickUser).toHaveBeenCalledWith('HOST', 'PLAYER', true);
  });

  it('should call canChangeRole with correct parameters', () => {
    mockRoomPermissionManager.canChangeRole.mockReturnValue(true);

    const { result } = renderHook(() =>
      useUserActionPermissions('HOST', 'PLAYER', true)
    );

    result.current.canChangeUserRole('SPECTATOR');

    expect(mockRoomPermissionManager.canChangeRole).toHaveBeenCalledWith('HOST', 'PLAYER', 'SPECTATOR', true);
  });

  it('should update when parameters change', () => {
    const { rerender } = renderHook(
      ({ actorRole, targetRole, isActorHost }) =>
        useUserActionPermissions(actorRole, targetRole, isActorHost),
      {
        initialProps: {
          actorRole: 'HOST' as ParticipantRole,
          targetRole: 'PLAYER' as ParticipantRole,
          isActorHost: true,
        }
      }
    );

    expect(mockRoomPermissionManager.canKickUser).toHaveBeenCalledWith('HOST', 'PLAYER', true);

    rerender({
      actorRole: 'PLAYER' as ParticipantRole,
      targetRole: 'SPECTATOR' as ParticipantRole,
      isActorHost: false,
    });

    expect(mockRoomPermissionManager.canKickUser).toHaveBeenCalledWith('PLAYER', 'SPECTATOR', false);
  });
});
