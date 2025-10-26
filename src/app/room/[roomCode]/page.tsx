"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { MultiplayerGrid } from "@/components/MultiplayerGrid";
import { ParticipantCursors } from "@/components/CursorDisplay";
import { ConflictNotification, useConflictNotification } from "@/components/ConflictNotification";
import { PredictionFeedback, PredictionStatus } from "@/components/PredictionFeedback";
import { HostControls } from "@/components/HostControls";
import { RoomParticipantList } from "@/components/RoomParticipantList";
import { RoomChat, useRoomChat } from "@/components/RoomChat";
import { useClientPrediction } from "@/lib/prediction";
import { useRoomPermissions } from "@/hooks/useRoomPermissions";
import { HostChangeNotification, useHostChangeNotification } from "@/components/HostChangeNotification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, MessageCircle, Crown, Eye, Play, LogOut, UserX, Lightbulb, FileText } from "lucide-react";

interface RoomPageProps {
  params: Promise<{ roomCode: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [room, setRoom] = useState<any>(null);
  const [puzzle, setPuzzle] = useState<any>(null);
  const [cursors, setCursors] = useState<Map<string, any>>(new Map());
  const [puzzleContent, setPuzzleContent] = useState<string>("");
  const [clues, setClues] = useState<{ across: any[]; down: any[] }>({ across: [], down: [] });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Conflict notification management
  const { conflict, showConflict, dismissConflict } = useConflictNotification();
  const { notification: hostChangeNotification, showHostChange, dismissNotification } = useHostChangeNotification();
  
  // Client-side prediction system
  const { predictions, rollbacks, clearOldRollbacks } = useClientPrediction();
  
  // Chat system
  const {
    messages,
    mutedUsers,
    isLoading: chatLoading,
    sendMessage,
    deleteMessage,
    muteUser,
    unmuteUser
  } = useRoomChat(room?.id || '', session?.userId || '');

  // Determine user role
  const getUserRole = () => {
    if (!session?.userId || !room) return 'SPECTATOR';
    if (room.hostUserId === session.userId) return 'HOST';
    
    const user = session.user as any;
    const isPremium = user?.role === 'PREMIUM' || 
                     user?.subscriptionStatus === 'ACTIVE' ||
                     (user?.subscriptionStatus === 'TRIAL' && user?.trialEndsAt && new Date() < user.trialEndsAt);
    
    return isPremium ? 'PLAYER' : 'SPECTATOR';
  };

  // Get user role and permissions (moved to top to avoid hooks order violation)
  const userRole = getUserRole();
  const isHost = userRole === 'HOST';
  const isOnline = room?.participants?.find(p => p.userId === session?.userId)?.isOnline ?? false;

  // Room permissions
  const permissions = useRoomPermissions({
    userRole,
    isHost,
    isOnline,
    roomStatus: room?.status || 'WAITING',
    isPrivate: room?.isPrivate || false,
    hasPassword: !!room?.password,
    isPremium: false // TODO: Get from user data
  });

  // Host control functions
  const handleKickPlayer = async (userId: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to kick player: ${error.error}`);
      }
    } catch (error) {
      console.error('Error kicking player:', error);
      alert('Failed to kick player');
    }
  };

  const handleSessionAction = async (action: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}/session`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to ${action} session: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing session:`, error);
      alert(`Failed to ${action} session`);
    }
  };

  const handlePromoteToPlayer = async (userId: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}/participants/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole: 'PLAYER' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to promote player: ${error.error}`);
      }
    } catch (error) {
      console.error('Error promoting player:', error);
      alert('Failed to promote player');
    }
  };

  const handleDemoteToSpectator = async (userId: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}/participants/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole: 'SPECTATOR' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to demote player: ${error.error}`);
      }
    } catch (error) {
      console.error('Error demoting player:', error);
      alert('Failed to demote player');
    }
  };

  // Socket.IO integration
  const {
    isConnected,
    connectionState,
    reconnectAttempts,
    lastDisconnectTime,
    pendingUpdatesCount,
    participants,
    cursorPositions,
    updateCell,
    moveCursor,
    sendMessage: sendSocketMessage,
    kickPlayer,
    endSession
  } = useSocket({
    roomCode: resolvedParams.roomCode,
    userId: session?.userId,
    userName: session?.user?.name || 'Player',
    role: getUserRole(),
    onCellUpdated: (data) => {
      // Apply cell update to iframe via EclipseCrossword bridge
      console.log('[RoomPage] onCellUpdated received:', data);
      if (typeof window !== 'undefined') {
        const iframe = document.querySelector('iframe[data-puzzle-content]') as HTMLIFrameElement;
        console.log('[RoomPage] Found iframe:', !!iframe);
        if (iframe?.contentWindow && iframe.contentWindow.__applyRemoteCellUpdate) {
          console.log('[RoomPage] Applying remote cell update:', data.cellId, data.value);
          iframe.contentWindow.__applyRemoteCellUpdate(data.cellId, data.value);
        } else {
          // Fallback: try to find iframe by other means or retry
          console.warn('[RoomPage] Iframe not ready for cell update, retrying...');
          setTimeout(() => {
            const retryIframe = document.querySelector('iframe[data-puzzle-content]') as HTMLIFrameElement;
            if (retryIframe?.contentWindow && retryIframe.contentWindow.__applyRemoteCellUpdate) {
              console.log('[RoomPage] Retry: Applying remote cell update:', data.cellId, data.value);
              retryIframe.contentWindow.__applyRemoteCellUpdate(data.cellId, data.value);
            } else {
              console.error('[RoomPage] Failed to apply remote cell update after retry');
            }
          }, 100);
        }
      }
    },
    onCursorMoved: (data) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
      
      // Clear cursor after 2 seconds
      setTimeout(() => {
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }, 2000);
    },
    onPlayerKicked: (data) => {
      if (data.userId === session?.userId) {
        alert('You have been removed from the room');
        router.push('/multiplayer');
      }
    },
    onSessionEnded: () => {
      alert('Session ended by host');
      router.push('/multiplayer');
    },
    onAutoSaved: (data) => {
      console.log('[RoomPage] Auto-save received:', data);
      setLastSaved(new Date());
    },
    onCellConflict: (data) => {
      console.log('[RoomPage] Cell conflict detected:', data);
      showConflict(data);
    },
    onPredictionRollback: (data) => {
      console.log('[RoomPage] Prediction rollback:', data);
      // Clear old rollbacks to prevent memory buildup
      clearOldRollbacks();
    },
    onHostChanged: (data) => {
      console.log('[RoomPage] Host changed:', data);
      // Show notification
      showHostChange(data.newHostName, data.previousHostName);
      // Refresh room data to get updated participant info
      const fetchRoom = async () => {
        const response = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}`);
        if (response.ok) {
          const roomData = await response.json();
          setRoom(roomData);
        }
      };
      fetchRoom();
    }
  });

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [status, router]);

  // Fetch room data
  useEffect(() => {
    const fetchRoom = async () => {
      const response = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}`);
      if (response.ok) {
        const data = await response.json();
        setRoom(data);
        
        // Fetch puzzle
        if (data.puzzleId) {
          const puzzleResponse = await fetch(`/api/puzzles/${data.puzzleId}`);
          if (puzzleResponse.ok) {
            const puzzleData = await puzzleResponse.json();
            setPuzzle(puzzleData);
            // Fetch puzzle HTML content with iframe bridge injected
            try {
              const contentResponse = await fetch(`/api/puzzles/${data.puzzleId}/content?mode=iframe`);
              if (contentResponse.ok) {
                const html = await contentResponse.text();
                setPuzzleContent(html);
                
            // Extract clues from the puzzle content with retry mechanism
            const extractCluesWithRetry = (attempt = 1, maxAttempts = 10) => {
              const iframe = document.querySelector('iframe[data-puzzle-content]') as HTMLIFrameElement;
              if (iframe?.contentWindow && iframe.contentWindow.__ecwGetClues) {
                try {
                  console.log(`[RoomPage] Extracting clues attempt ${attempt}/${maxAttempts}`);
                  const extractedClues = iframe.contentWindow.__ecwGetClues();
                  console.log('[RoomPage] Extracted clues:', extractedClues);
                  
                  // Check if we got meaningful clues
                  if (extractedClues && (extractedClues.across?.length > 0 || extractedClues.down?.length > 0)) {
                    setClues(extractedClues);
                    console.log('[RoomPage] Clues set successfully');
                    return;
                  } else {
                    console.log('[RoomPage] No clues found, retrying...');
                  }
                } catch (error) {
                  console.error('Failed to extract clues from iframe:', error);
                }
              }
              
              // Retry if not successful
              if (attempt < maxAttempts) {
                setTimeout(() => extractCluesWithRetry(attempt + 1, maxAttempts), 500);
              } else {
                console.warn('[RoomPage] Failed to extract clues after all attempts');
                // Set empty clues as fallback
                setClues({ across: [], down: [] });
              }
            };
            
            // Start clue extraction after a short delay
            setTimeout(() => extractCluesWithRetry(), 1000);
              }
            } catch (err) {
              console.error('Failed to fetch puzzle content', err);
            }
          }
        }
      } else {
        router.push('/multiplayer');
      }
    };

    fetchRoom();
  }, [resolvedParams.roomCode, router]);


  // Handle hint usage
  const handleUseHint = async (hintType: 'LETTER' | 'WORD' | 'DEFINITION') => {
    try {
      console.log('[RoomPage] Using hint:', { 
        hintType, 
        hasSession: !!session, 
        userId: session?.userId,
        sessionStatus: status 
      });
      
      const response = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: hintType,
          userId: session?.userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to use hint');
      }

      const result = await response.json();
      console.log('Hint result:', result);

      // Apply the hint result to the iframe with retry mechanism
      const applyHintWithRetry = (attempt = 1, maxAttempts = 3) => {
        if (typeof window !== 'undefined') {
          const iframe = document.querySelector('iframe[data-puzzle-content]') as HTMLIFrameElement;
          if (iframe?.contentWindow) {
            console.log(`[RoomPage] Applying hint attempt ${attempt}/${maxAttempts}`);
            
            if (hintType === 'LETTER' && result.cellId && result.letter) {
              if (iframe.contentWindow.__applyRemoteCellUpdate) {
                const success = iframe.contentWindow.__applyRemoteCellUpdate(result.cellId, result.letter);
                if (success) {
                  console.log('[RoomPage] Letter hint applied successfully');
                  return;
                }
              }
            } else if (hintType === 'WORD' && result.wordData) {
              // Apply word hint
              iframe.contentWindow.postMessage({
                source: 'parent',
                type: 'REVEAL_WORD',
                wordData: result.wordData
              }, window.location.origin);
              console.log('[RoomPage] Word hint message sent');
              return;
            } else if (hintType === 'DEFINITION' && result.enhancedClue) {
              // Show enhanced clue (could be displayed in a modal or notification)
              console.log('Enhanced clue:', result.enhancedClue);
              alert(`Enhanced Clue: ${result.enhancedClue}`);
              return;
            }
          }
          
          // Retry if not successful
          if (attempt < maxAttempts) {
            console.log(`[RoomPage] Retrying hint application in 500ms (attempt ${attempt + 1})`);
            setTimeout(() => applyHintWithRetry(attempt + 1, maxAttempts), 500);
          } else {
            console.warn('[RoomPage] Failed to apply hint after all attempts');
            alert('Hint could not be applied. Please try again.');
          }
        }
      };
      
      applyHintWithRetry();
    } catch (error) {
      console.error('Error using hint:', error);
      alert(error instanceof Error ? error.message : 'Failed to use hint');
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div>Please sign in to access this room.</div>;
  }

  if (!room || !puzzle || !puzzleContent) {
    return <div>Loading room data...</div>;
  }

  const canEdit = permissions.canUpdateCell;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{room.name}</h1>
            <p className="text-muted-foreground">Room Code: {room.roomCode}</p>
            {lastSaved && (
              <p className="text-xs text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            {isHost && (
              <Button onClick={endSession} variant="destructive" size="sm">
                End Session
              </Button>
            )}
            <Button onClick={() => router.push('/multiplayer')} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>

        {/* Enhanced Connection Status Alert */}
        {connectionState !== 'connected' && (
          <div className={`px-4 py-3 rounded mb-4 ${
            connectionState === 'reconnecting' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
            connectionState === 'failed' ? 'bg-red-100 border border-red-400 text-red-700' :
            'bg-orange-100 border border-orange-400 text-orange-700'
          }`}>
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-2 ${
                connectionState === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
                connectionState === 'failed' ? 'bg-red-500' :
                'bg-orange-500'
              }`}></div>
              <div>
                <strong>
                  {connectionState === 'reconnecting' && 'Reconnecting...'}
                  {connectionState === 'failed' && 'Connection Failed'}
                  {connectionState === 'disconnected' && 'Connection Lost'}
                </strong>
                <p className="text-sm">
                  {connectionState === 'reconnecting' && `Attempt ${reconnectAttempts} of 5...`}
                  {connectionState === 'failed' && 'Unable to reconnect. Please refresh the page.'}
                  {connectionState === 'disconnected' && 'Attempting to reconnect to multiplayer server...'}
                </p>
                {pendingUpdatesCount > 0 && (
                  <p className="text-xs mt-1">
                    {pendingUpdatesCount} update{pendingUpdatesCount > 1 ? 's' : ''} queued for sync
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main puzzle area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{puzzle.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {canEdit ? (
                  <p className="text-sm text-green-600 mb-2">✓ You can edit</p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-2">
                    <Eye className="h-4 w-4 inline mr-1" />
                    Spectator mode - View only
                  </p>
                )}
                
                {/* Multiplayer Grid with Enhanced Features */}
                {puzzle && (
                  <MultiplayerGrid
                    puzzleId={puzzle.id}
                    content={puzzleContent}
                    roomCode={resolvedParams.roomCode}
                    userId={session?.userId}
                    userName={session?.user?.name || 'Player'}
                    userRole={getUserRole()}
                    participants={participants}
                    cursorPositions={cursorPositions}
                    isConnected={isConnected}
                    connectionState={connectionState}
                    pendingUpdatesCount={pendingUpdatesCount}
                    onCellUpdate={(cellData) => {
                      console.log('[RoomPage] onCellUpdate received:', cellData);
                      // Send cell update to server
                      const updateData = {
                        roomCode: resolvedParams.roomCode,
                        cellId: cellData.cellId,
                        value: cellData.value,
                        userId: session?.userId,
                        userName: session?.user?.name || 'Player',
                        role: getUserRole()
                      };
                      console.log('[RoomPage] Sending updateCell to server:', updateData);
                      updateCell(updateData);
                    }}
                    onCursorMove={(cellId, x, y) => {
                      // Send cursor position to server
                      moveCursor(cellId, x, y);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Participants & Chat */}
          <div className="lg:col-span-1 space-y-4">
            {/* Participants */}
            <RoomParticipantList
              participants={participants}
              currentUserId={session?.userId}
              isHost={permissions.canKickPlayer}
              onKickPlayer={handleKickPlayer}
              onChangeRole={(userId, role) => {
                if (role === 'PLAYER') {
                  handlePromoteToPlayer(userId);
                } else if (role === 'SPECTATOR') {
                  handleDemoteToSpectator(userId);
                }
              }}
            />
            
            {/* Active cursors indicator */}
            {cursorPositions.size > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <ParticipantCursors
                    cursorPositions={cursorPositions}
                    currentUserId={session?.userId}
                  />
                </CardContent>
              </Card>
            )}

            {/* Host Controls - Only for host */}
            {permissions.canManageSession && (
              <HostControls
                roomCode={resolvedParams.roomCode}
                participants={participants}
                currentUserId={session?.userId || ''}
                roomStatus={room?.status || 'WAITING'}
                timeLimit={room?.timeLimit || undefined}
                onKickPlayer={handleKickPlayer}
                onPauseSession={() => handleSessionAction('pause')}
                onResumeSession={() => handleSessionAction('resume')}
                onEndSession={() => handleSessionAction('end')}
                onStartSession={() => handleSessionAction('start')}
                onUpdateRoomSettings={() => {}} // TODO: Implement room settings update
              />
            )}

            {/* Hints - Only for collaborators */}
            {canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Hints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleUseHint('LETTER')}
                    >
                      Letter Hint (5 points)
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleUseHint('WORD')}
                    >
                      Word Hint (15 points)
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleUseHint('DEFINITION')}
                    >
                      Enhanced Clue (3 points)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Clues - For all users */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Clues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Across Clues */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-blue-600">Across</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {clues.across.map((clue) => (
                        <div key={clue.num} className="text-xs">
                          <span className="font-medium text-blue-600">{clue.num}.</span>
                          <span className="ml-1">{clue.clue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Down Clues */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-green-600">Down</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {clues.down.map((clue) => (
                        <div key={clue.num} className="text-xs">
                          <span className="font-medium text-green-600">{clue.num}.</span>
                          <span className="ml-1">{clue.clue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Chat System */}
            <RoomChat
              roomId={room?.id || ''}
              roomCode={resolvedParams.roomCode}
              currentUserId={session?.userId || ''}
              currentUserName={session?.user?.name || 'Player'}
              currentUserRole={getUserRole()}
              isHost={permissions.canKickPlayer}
              canModerate={permissions.canModerateChat}
              messages={messages}
              mutedUsers={mutedUsers}
              participants={participants}
              onSendMessage={sendMessage}
              onDeleteMessage={deleteMessage}
              onMuteUser={muteUser}
              onUnmuteUser={unmuteUser}
            />
          </div>
        </div>
      </div>
      
      {/* Prediction Feedback */}
      <PredictionFeedback
        predictions={predictions}
        rollbacks={rollbacks}
        onDismissRollback={() => {}} // Auto-dismiss handled by component
        className="fixed bottom-4 right-4 z-50"
      />
      
      {/* Host Change Notification */}
      <HostChangeNotification
        isVisible={hostChangeNotification.isVisible}
        newHostName={hostChangeNotification.newHostName}
        previousHostName={hostChangeNotification.previousHostName}
        onDismiss={dismissNotification}
      />
      
      {/* Conflict Notification */}
      <ConflictNotification
        conflict={conflict}
        onDismiss={dismissConflict}
      />
    </div>
  );
}
