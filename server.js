const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
// const { roomLifecycleManager } = require('./src/lib/roomLifecycle');

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3004', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.NEXTAUTH_URL || 'http://localhost:3004',
        'http://localhost:3004',
        'http://127.0.0.1:3004'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling']
  });

  // Auto-save intervals for rooms
  const roomAutoSaveIntervals = new Map();

  // Function to start auto-save for a room
  const startRoomAutoSave = (roomCode) => {
    if (roomAutoSaveIntervals.has(roomCode)) {
      return; // Already running
    }

           const interval = setInterval(async () => {
             try {
               const room = await prisma.multiplayerRoom.findUnique({
                 where: { roomCode }
               });

               if (room) {
                 // Just update lastActivityAt to keep track of active rooms
                 // The actual gridState is saved immediately via cell_update events
                 await prisma.multiplayerRoom.update({
                   where: { id: room.id },
                   data: { lastActivityAt: new Date() }
                 });
                 
                 // Emit auto-save event to all room participants
                 io.to(roomCode).emit('room_autosaved', {
                   roomCode,
                   timestamp: new Date().toISOString(),
                   message: 'Progress saved'
                 });
                 console.log(`[Auto-save] Updated activity for room ${roomCode}`);
               }
             } catch (error) {
               console.error(`[Auto-save] Error updating room ${roomCode}:`, error);
             }
           }, 30000); // 30 seconds

    roomAutoSaveIntervals.set(roomCode, interval);
    console.log(`[Auto-save] Started auto-save for room ${roomCode}`);
  };

  // Function to stop auto-save for a room
  const stopRoomAutoSave = (roomCode) => {
    const interval = roomAutoSaveIntervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      roomAutoSaveIntervals.delete(roomCode);
      console.log(`[Auto-save] Stopped auto-save for room ${roomCode}`);
    }
  };

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room
    socket.on('join_room', async (data) => {
      const { roomCode, userId, userName, role } = data;
      
      try {
        // Verify room exists
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode },
          include: { participants: true }
        });

        if (!room) {
          socket.emit('join_room_response', { 
            success: false, 
            error: 'Room not found' 
          });
          return;
        }

        if (room.status === 'COMPLETED' || room.status === 'EXPIRED') {
          socket.emit('join_room_response', { 
            success: false, 
            error: 'Room is no longer active' 
          });
          return;
        }

        // Check if room is full
        if (room.participants.length >= room.maxPlayers) {
          socket.emit('join_room_response', { 
            success: false, 
            error: 'Room is full' 
          });
          return;
        }

        // Join Socket.IO room
        socket.join(roomCode);

        // Get user info for display name
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, name: true }
        });

        // Check if participant already exists
        const existingParticipant = await prisma.roomParticipant.findFirst({
          where: {
            roomId: room.id,
            userId: userId
          }
        });

        let participant;
        if (existingParticipant) {
          // Update existing participant
          participant = await prisma.roomParticipant.update({
            where: { id: existingParticipant.id },
            data: {
              isOnline: true,
              leftAt: null
            }
          });
        } else {
          // Create new participant
          participant = await prisma.roomParticipant.create({
            data: {
              roomId: room.id,
              userId: userId,
              displayName: user?.username || user?.name || userName,
              role: role || 'SPECTATOR',
              isOnline: true
            }
          });
        }

        // Send success response to the joining player
        socket.emit('join_room_response', {
          success: true,
          roomCode,
          participantCount: room.participants.length + 1
        });

        // Broadcast to room
        io.to(roomCode).emit('player_joined', {
          userId,
          userName,
          role: participant.role,
          participantCount: room.participants.length + 1
        });

        // Send current room state to new player
        socket.emit('room_state', {
          room,
          puzzleId: room.puzzleId,
          gridState: room.gridState ? JSON.parse(room.gridState) : {},
          participants: await prisma.roomParticipant.findMany({
            where: { roomId: room.id, isOnline: true }
          })
        });

        console.log(`[Socket.IO] ${userName} joined room ${roomCode}`);
        
        // Start auto-save for this room if not already running
        startRoomAutoSave(roomCode);
      } catch (error) {
        console.error('[Socket.IO] Error joining room:', error);
        socket.emit('join_room_response', { 
          success: false, 
          error: 'Failed to join room' 
        });
      }
    });

    // Leave room
    socket.on('leave_room', async (data) => {
      const { roomCode, userId } = data;

      try {
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode }
        });

        if (room) {
          await prisma.roomParticipant.updateMany({
            where: { roomId: room.id, userId: userId },
            data: { isOnline: false, leftAt: new Date() }
          });

          socket.leave(roomCode);
          io.to(roomCode).emit('player_left', { userId });
        }
      } catch (error) {
        console.error('[Socket.IO] Error leaving room:', error);
      }
    });

    // Cell update (grid editing) with conflict resolution
    socket.on('cell_update', async (data) => {
      console.log('[Socket.IO] cell_update received:', data);
      const { roomCode, cellId, value, userId, userName, role, timestamp, clientId } = data;

      // Only allow edits from HOST or PLAYER roles
      if (role === 'SPECTATOR') {
        console.log('[Socket.IO] Blocking cell update from spectator');
        socket.emit('error', { message: 'Spectators cannot edit' });
        return;
      }

      // Validate input - relaxed validation
      if (!cellId || typeof cellId !== 'string') {
        console.log('[Socket.IO] Invalid cellId:', cellId);
        socket.emit('error', { message: 'Invalid cell ID' });
        return;
      }
      
      if (!value || typeof value !== 'string') {
        console.log('[Socket.IO] Invalid value:', value);
        socket.emit('error', { message: 'Invalid cell value' });
        return;
      }
      
      // Convert to uppercase and ensure single character
      const normalizedValue = value.toUpperCase().charAt(0);
      if (!normalizedValue || !/[A-Z]/.test(normalizedValue)) {
        console.log('[Socket.IO] Invalid normalized value:', normalizedValue);
        socket.emit('error', { message: 'Invalid cell value format' });
        return;
      }

      try {
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode }
        });

        if (!room) return;

        // Initialize conflict tracking if not exists
        if (!global.cellConflicts) {
          global.cellConflicts = new Map();
        }

        const conflictKey = `${room.id}-${cellId}`;
        const now = Date.now();
        
        // Check for conflicts (simultaneous edits to same cell)
        if (global.cellConflicts.has(conflictKey)) {
          const existingConflict = global.cellConflicts.get(conflictKey);
          const timeDiff = now - existingConflict.timestamp;
          
          // If edits are within 500ms of each other, it's a conflict
          if (timeDiff < 500 && existingConflict.userId !== userId) {
            console.log('[Socket.IO] Conflict detected for cell:', cellId, 'between users:', existingConflict.userId, userId);
            
            // Resolve conflict using last-write-wins with timestamp tiebreaker
            let winner, loser;
            if (timestamp > existingConflict.timestamp) {
              winner = { userId, userName, value: normalizedValue, timestamp, clientId };
              loser = existingConflict;
            } else if (timestamp < existingConflict.timestamp) {
              winner = existingConflict;
              loser = { userId, userName, value: normalizedValue, timestamp, clientId };
            } else {
              // Same timestamp - use user ID as tiebreaker (deterministic)
              if (userId > existingConflict.userId) {
                winner = { userId, userName, value: normalizedValue, timestamp, clientId };
                loser = existingConflict;
              } else {
                winner = existingConflict;
                loser = { userId, userName, value: normalizedValue, timestamp, clientId };
              }
            }
            
            // Notify the losing user about the conflict
            socket.emit('cell_conflict', {
              cellId,
              attemptedValue: loser.value,
              actualValue: winner.value,
              winnerUserName: winner.userName,
              message: `Conflict resolved: ${winner.userName}'s edit was applied`
            });
            
            // Update the conflict record with the winner
            global.cellConflicts.set(conflictKey, winner);
            
            // Broadcast the winning update
            const updateData = {
              cellId,
              value: winner.value,
              userId: winner.userId,
              userName: winner.userName,
              timestamp: winner.timestamp,
              clientId: winner.clientId,
              conflictResolved: true
            };
            
            // Broadcast to all clients in room
            io.to(roomCode).emit('cell_updated', updateData);
            
            // Update database
            const gridState = room.gridState ? JSON.parse(room.gridState) : {};
            gridState[cellId] = winner.value;
            
            await prisma.multiplayerRoom.update({
              where: { id: room.id },
              data: { gridState: JSON.stringify(gridState) }
            });
            
            return;
          }
        }
        
        // No conflict - proceed with normal update
        global.cellConflicts.set(conflictKey, { userId, userName, value: normalizedValue, timestamp, clientId });
        
        // Clear conflict record after 1 second
        setTimeout(() => {
          global.cellConflicts.delete(conflictKey);
        }, 1000);

        // Parse current grid state
        const gridState = room.gridState ? JSON.parse(room.gridState) : {};
        gridState[cellId] = normalizedValue;

        // Update database with debouncing (150ms per room/user)
        const debounceKey = `${room.id}-${userId}`;
        if (global.cellUpdateDebounce) {
          clearTimeout(global.cellUpdateDebounce[debounceKey]);
        } else {
          global.cellUpdateDebounce = {};
        }
        
        global.cellUpdateDebounce[debounceKey] = setTimeout(async () => {
          try {
            await prisma.multiplayerRoom.update({
              where: { id: room.id },
              data: { gridState: JSON.stringify(gridState) }
            });
          } catch (error) {
            console.error('[Socket.IO] Error updating cell in DB:', error);
          }
        }, 150);

        // Broadcast immediately to all clients in room (except sender)
        console.log('[Socket.IO] Broadcasting cell_updated to room:', roomCode);
        socket.to(roomCode).emit('cell_updated', {
          cellId,
          value: normalizedValue,
          userId,
          userName,
          timestamp,
          clientId
        });
      } catch (error) {
        console.error('[Socket.IO] Error updating cell:', error);
      }
    });

    // Cursor position update
    socket.on('cursor_move', async (data) => {
      const { roomCode, userId, cellId, x, y } = data;
      
      try {
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode }
        });

        if (room) {
          // Update cursor position in database
          await prisma.roomParticipant.updateMany({
            where: { roomId: room.id, userId: userId },
            data: { 
              cursorPosition: JSON.stringify({ x, y, cellId })
            }
          });
        }
        
        // Broadcast cursor position to room (except sender)
        socket.to(roomCode).emit('cursor_moved', {
          userId,
          cellId,
          x,
          y,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[Socket.IO] Error updating cursor:', error);
      }
    });

    // Chat message
    socket.on('chat_message', async (data) => {
      const { roomCode, userId, userName, content, type = 'text', metadata } = data;

      try {
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode }
        });

        if (!room) return;

        // Check if user is muted
        const mutedUser = await prisma.roomMutedUser.findFirst({
          where: {
            roomId: room.id,
            userId: userId,
            mutedUntil: { gt: new Date() }
          }
        });

        if (mutedUser) {
          socket.emit('error', { message: 'You are muted and cannot send messages' });
          return;
        }

        // Rate limiting check
        const oneMinuteAgo = new Date(Date.now() - 60000);
        const recentMessages = await prisma.roomMessage.count({
          where: {
            roomId: room.id,
            userId: userId,
            createdAt: { gte: oneMinuteAgo }
          }
        });

        if (recentMessages >= 10) {
          socket.emit('error', { message: 'Rate limit exceeded. You can send 10 messages per minute.' });
          return;
        }

        // Save message to database
        const message = await prisma.roomMessage.create({
          data: {
            roomId: room.id,
            userId,
            userName,
            content: content.substring(0, 500), // Limit length
            type: type,
            metadata: metadata ? JSON.stringify(metadata) : null
          }
        });

        // Broadcast to all clients in room
        io.to(roomCode).emit('chat_message_received', {
          id: message.id,
          userId,
          userName,
          content,
          type: message.type,
          metadata: message.metadata ? JSON.parse(message.metadata) : null,
          createdAt: message.createdAt
        });
      } catch (error) {
        console.error('[Socket.IO] Error sending message:', error);
      }
    });

    // Typing indicator
    socket.on('typing_start', (data) => {
      const { roomCode, userId, userName } = data;
      socket.to(roomCode).emit('user_typing', { userId, userName });
    });

    socket.on('typing_stop', (data) => {
      const { roomCode, userId } = data;
      socket.to(roomCode).emit('user_stopped_typing', { userId });
    });

    // Message reaction
    socket.on('message_reaction', async (data) => {
      const { roomCode, messageId, emoji, userId } = data;

      try {
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode }
        });

        if (!room) return;

        // Check if user already reacted with this emoji
        const existingReaction = await prisma.roomMessageReaction.findFirst({
          where: {
            messageId,
            emoji,
            userId
          }
        });

        if (existingReaction) {
          // Remove reaction
          await prisma.roomMessageReaction.delete({
            where: { id: existingReaction.id }
          });
        } else {
          // Add reaction
          await prisma.roomMessageReaction.create({
            data: {
              messageId,
              emoji,
              userId
            }
          });
        }

        // Get updated reactions
        const reactions = await prisma.roomMessageReaction.findMany({
          where: { messageId },
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        });

        // Group reactions by emoji
        const groupedReactions = reactions.reduce((acc, reaction) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = {
              emoji: reaction.emoji,
              users: [],
              count: 0
            };
          }
          acc[reaction.emoji].users.push(reaction.userId);
          acc[reaction.emoji].count++;
          return acc;
        }, {});

        // Broadcast reaction update
        io.to(roomCode).emit('message_reaction_updated', {
          messageId,
          reactions: Object.values(groupedReactions)
        });
      } catch (error) {
        console.error('[Socket.IO] Error handling message reaction:', error);
      }
    });

    // Message edit
    socket.on('message_edit', async (data) => {
      const { roomCode, messageId, content, userId } = data;

      try {
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode }
        });

        if (!room) return;

        // Find the message
        const message = await prisma.roomMessage.findFirst({
          where: {
            id: messageId,
            roomId: room.id,
            userId: userId // Only allow editing own messages
          }
        });

        if (!message) {
          socket.emit('error', { message: 'Message not found or you cannot edit this message' });
          return;
        }

        // Check if message is within 5 minutes
        const messageTime = new Date(message.createdAt).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (now - messageTime > fiveMinutes) {
          socket.emit('error', { message: 'Message can only be edited within 5 minutes' });
          return;
        }

        // Update message
        const updatedMessage = await prisma.roomMessage.update({
          where: { id: messageId },
          data: {
            content: content.trim(),
            editedAt: new Date(),
            isEdited: true
          }
        });

        // Broadcast edit to room
        io.to(roomCode).emit('message_edited', {
          messageId,
          content: updatedMessage.content,
          editedAt: updatedMessage.editedAt,
          isEdited: updatedMessage.isEdited
        });
      } catch (error) {
        console.error('[Socket.IO] Error editing message:', error);
      }
    });

    // Message delete
    socket.on('message_delete', async (data) => {
      const { roomCode, messageId, userId, userRole, isHost } = data;

      try {
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode }
        });

        if (!room) return;

        // Find the message
        const message = await prisma.roomMessage.findFirst({
          where: {
            id: messageId,
            roomId: room.id
          }
        });

        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check permissions
        const isOwner = message.userId === userId;
        const isModerator = userRole === 'HOST' || userRole === 'MODERATOR';

        if (!isOwner && !isHost && !isModerator) {
          socket.emit('error', { message: 'You cannot delete this message' });
          return;
        }

        // Soft delete message
        const deletedMessage = await prisma.roomMessage.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            deletedBy: userId,
            deletedAt: new Date()
          }
        });

        // Broadcast deletion to room
        io.to(roomCode).emit('message_deleted', {
          messageId,
          deletedBy: userId,
          deletedAt: deletedMessage.deletedAt
        });
      } catch (error) {
        console.error('[Socket.IO] Error deleting message:', error);
      }
    });

    // Host controls: Kick player
    socket.on('kick_player', async (data) => {
      const { roomCode, hostUserId, targetUserId } = data;

      try {
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode }
        });

        if (!room || room.hostUserId !== hostUserId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Remove participant
        await prisma.roomParticipant.updateMany({
          where: { roomId: room.id, userId: targetUserId },
          data: { isOnline: false, leftAt: new Date() }
        });

        // Notify kicked player
        io.to(roomCode).emit('player_kicked', { userId: targetUserId });
      } catch (error) {
        console.error('[Socket.IO] Error kicking player:', error);
      }
    });

    // Host controls: End session
    socket.on('end_session', async (data) => {
      const { roomCode, hostUserId } = data;

      try {
        const room = await prisma.multiplayerRoom.findUnique({
          where: { roomCode }
        });

        if (!room || room.hostUserId !== hostUserId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Mark room as completed
        await prisma.multiplayerRoom.update({
          where: { id: room.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });

        // Notify all players
        io.to(roomCode).emit('session_ended', {
          message: 'Host ended the session'
        });

        // Disconnect all sockets in this room
        io.in(roomCode).disconnectSockets();
        
        // Stop auto-save for this room
        stopRoomAutoSave(roomCode);
      } catch (error) {
        console.error('[Socket.IO] Error ending session:', error);
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      
      try {
        // Get user info from socket data
        const userId = socket.userId;
        const userName = socket.userName;
        
        if (userId) {
          // Mark user as offline in all rooms
          await prisma.roomParticipant.updateMany({
            where: { userId },
            data: { 
              isOnline: false,
              leftAt: new Date()
            }
          });

          // Check for host disconnections and handle promotion
          const rooms = await prisma.multiplayerRoom.findMany({
            where: { hostUserId: userId },
            include: {
              participants: {
                where: { 
                  userId: { not: userId },
                  isOnline: true
                },
                orderBy: { joinedAt: 'asc' }
              }
            }
          });

          for (const room of rooms) {
            console.log(`[Socket.IO] Host disconnected from room ${room.roomCode}`);
            
            if (room.participants.length > 0) {
              // Promote the first online participant to host
              const newHost = room.participants[0];
              
              await prisma.multiplayerRoom.update({
                where: { id: room.id },
                data: { hostUserId: newHost.userId }
              });

              await prisma.roomParticipant.update({
                where: {
                  roomId_userId: {
                    roomId: room.id,
                    userId: newHost.userId
                  }
                },
                data: { role: 'HOST' }
              });

              // Notify all participants about the host change
              io.to(room.roomCode).emit('host_changed', {
                newHostId: newHost.userId,
                newHostName: newHost.displayName,
                previousHostName: userName,
                timestamp: new Date().toISOString()
              });

              // Create notification for new host
              await prisma.notification.create({
                data: {
                  userId: newHost.userId,
                  type: 'ROOM_HOST_PROMOTED',
                  title: 'You are now the host',
                  message: `You have been promoted to host of room "${room.name || room.roomCode}"`,
                  actionUrl: `/room/${room.roomCode}`,
                  metadata: JSON.stringify({
                    roomId: room.id,
                    roomCode: room.roomCode,
                    roomName: room.name,
                    previousHostName: userName
                  })
                }
              });

              console.log(`[Socket.IO] Promoted ${newHost.displayName} to host of room ${room.roomCode}`);
            } else {
              // No other participants, mark room as expired
              await prisma.multiplayerRoom.update({
                where: { id: room.id },
                data: { 
                  status: 'EXPIRED',
                  completedAt: new Date()
                }
              });

              console.log(`[Socket.IO] Room ${room.roomCode} expired due to host disconnection`);
            }
          }
        }
      } catch (error) {
        console.error('[Socket.IO] Error handling disconnection:', error);
      }
      
      // Check if any rooms are now empty and stop auto-save
      const rooms = await io.fetchSockets();
      const roomCounts = new Map();
      
      for (const roomSocket of rooms) {
        for (const room of roomSocket.rooms) {
          if (room !== roomSocket.id) { // Skip the socket's own room
            roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
          }
        }
      }
      
      // Stop auto-save for empty rooms
      for (const [roomCode, count] of roomCounts) {
        if (count === 0) {
          stopRoomAutoSave(roomCode);
        }
      }
    });

    // Notification events
    socket.on('notification_read', async (data) => {
      const { notificationId } = data;
      
      try {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { isRead: true }
        });
      } catch (error) {
        console.error('[Socket.IO] Error marking notification as read:', error);
      }
    });

    // Friend events
    socket.on('friend_request_sent', async (data) => {
      const { toUserId, fromUserId, fromUserName } = data;
      
      try {
        // Emit to the recipient
        io.to(toUserId).emit('friend_request_received', {
          fromUserId,
          fromUserName,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[Socket.IO] Error broadcasting friend request:', error);
      }
    });

    socket.on('friend_request_accepted', async (data) => {
      const { toUserId, friendUserId, friendUserName } = data;
      
      try {
        // Emit to the original requester
        io.to(toUserId).emit('friend_request_accepted', {
          friendUserId,
          friendUserName,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[Socket.IO] Error broadcasting friend acceptance:', error);
      }
    });

    // Room invite events
    socket.on('room_invite_sent', async (data) => {
      const { toUserId, roomCode, roomName, fromUserName } = data;
      
      try {
        // Emit to the recipient
        io.to(toUserId).emit('room_invite_received', {
          roomCode,
          roomName,
          fromUserName,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[Socket.IO] Error broadcasting room invite:', error);
      }
    });

    socket.on('room_invite_accepted', async (data) => {
      const { toUserId, roomCode, acceptedByUserName } = data;
      
      try {
        // Emit to the inviter
        io.to(toUserId).emit('room_invite_accepted', {
          roomCode,
          acceptedByUserName,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[Socket.IO] Error broadcasting invite acceptance:', error);
      }
    });

    // Join request events
    socket.on('join_request_sent', async (data) => {
      const { toUserId, roomCode, roomName, fromUserName } = data;
      
      try {
        // Emit to the host
        io.to(toUserId).emit('join_request_received', {
          roomCode,
          roomName,
          fromUserName,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[Socket.IO] Error broadcasting join request:', error);
      }
    });

    socket.on('join_request_approved', async (data) => {
      const { toUserId, roomCode, approvedByUserName } = data;
      
      try {
        // Emit to the requester
        io.to(toUserId).emit('join_request_approved', {
          roomCode,
          approvedByUserName,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[Socket.IO] Error broadcasting join approval:', error);
      }
    });

    socket.on('join_request_rejected', async (data) => {
      const { toUserId, roomCode, rejectedByUserName } = data;
      
      try {
        // Emit to the requester
        io.to(toUserId).emit('join_request_rejected', {
          roomCode,
          rejectedByUserName,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[Socket.IO] Error broadcasting join rejection:', error);
      }
    });
  });

  // Start room lifecycle management
  // roomLifecycleManager.start();

  httpServer.listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Socket.IO server running`);
    // console.log(`> Room lifecycle management started`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    // roomLifecycleManager.stop();
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    // roomLifecycleManager.stop();
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
