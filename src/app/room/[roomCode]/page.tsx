"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Loader2, X } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useIframeMessage } from "@/hooks/useIframeMessage";
import { useDeviceType } from "@/hooks/useDeviceType";
import { AdaptiveLayout } from "@/components/layouts/AdaptiveLayout";
import { SaveIndicator } from "@/components/SaveIndicator";
import { PuzzleArea } from "@/components/puzzle/PuzzleArea";
import { HintsMenu } from "@/components/puzzle/HintsMenu";
import { CluesPanel } from "@/components/puzzle/CluesPanel";
import { ProgressBar } from "@/components/puzzle/ProgressBar";
import { RoomParticipantList } from "@/components/RoomParticipantList";
import { extractCluesWithRetry, formatCluesForDisplay } from "@/lib/clueExtraction";
import { ConflictNotification, useConflictNotification } from "@/components/ConflictNotification";
import { HostChangeNotification, useHostChangeNotification } from "@/components/HostChangeNotification";
import { useToast, ToastContainer } from "@/components/Toast";

interface RoomPageProps {
  params: Promise<{ roomCode: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const device = useDeviceType();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [room, setRoom] = useState<any>(null);
  const [puzzle, setPuzzle] = useState<any>(null);
  const [puzzleContent, setPuzzleContent] = useState<string>("");
  const [clues, setClues] = useState<{ across: any[]; down: any[] }>({ across: [], down: [] });
  const [progressPercent, setProgressPercent] = useState(0);
  const [iframeHeight, setIframeHeight] = useState(600);
  const [gridState, setGridState] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveConfig, setAutoSaveConfig] = useState({ enabled: true, interval: 30000 });

  // Conflict notification
  const { conflict, showConflict, dismissConflict } = useConflictNotification();
  const { notification: hostChangeNotification, showHostChange, dismissNotification } = useHostChangeNotification();
  const toast = useToast();

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

  const userRole = getUserRole();
  const isHost = userRole === 'HOST';
  const canEdit = userRole === 'PLAYER' || userRole === 'HOST';

  // Socket.IO integration
  const {
    isConnected,
    connectionState,
    participants,
    updateCell,
    moveCursor,
    kickPlayer,
    endSession
  } = useSocket({
    roomCode: resolvedParams.roomCode,
    userId: session?.userId,
    userName: session?.user?.name || 'Player',
    role: userRole,
    onCellUpdated: (data) => {
      console.log('[RoomPage] onCellUpdated:', data);
      // Apply cell update to iframe
      if (iframeRef.current?.contentWindow) {
        const contentWindow = iframeRef.current.contentWindow as any;
        if (contentWindow.__applyRemoteCellUpdate) {
          contentWindow.__applyRemoteCellUpdate(data.cellId, data.value);
        }
      }
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
    },
    onCellConflict: (data) => {
      console.log('[RoomPage] Cell conflict detected:', data);
      showConflict(data);
    },
    onHostChanged: (data) => {
      console.log('[RoomPage] Host changed:', data);
      showHostChange(data.newHostName, data.previousHostName);
      // Refresh room data
      fetchRoom();
    }
  });

  // Auto-save for multiplayer room
  const { saveStatus, lastSaved, error: saveError, forceSave } = useAutoSave({
    saveFunction: async () => {
      if (!room || !isDirty) return;
      
      const response = await fetch(`/api/multiplayer/rooms/${room.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gridState,
          timestamp: new Date().toISOString(),
          participantState: {
            completedCells: Object.keys(gridState).length,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Conflict - show notification but don't throw
          showConflict({
            cellId: 'room',
            conflictingUser: 'another participant',
            timestamp: new Date().toISOString()
          });
          return;
        }
        throw new Error(errorData.error || 'Failed to save room state');
      }

      setIsDirty(false);
    },
    isDirty,
    saveInterval: autoSaveConfig.interval,
    onSuccess: () => {
      console.log('[RoomPage] Auto-save successful');
      toast.success('Room state saved');
    },
    onError: (error) => {
      console.error('[RoomPage] Auto-save failed:', error);
      toast.error('Failed to save room state');
    },
  });

  // Iframe messaging
  const { sendCommand } = useIframeMessage({
    iframeRef,
    onMessage: useCallback((message) => {
      switch (message.type) {
        case 'progress':
          const progress = message.data.progress || 0;
          setProgressPercent(progress);
          
          if (message.data.gridState) {
            setGridState(message.data.gridState);
            setIsDirty(true);
          }
          break;

        case 'dimensions':
          if (message.data.totalHeight) {
            setIframeHeight(message.data.totalHeight);
          }
          break;

        case 'complete':
          console.log('[RoomPage] Puzzle completed!', message.data);
          break;

        case 'wordlist':
          if (message.data.words) {
            const formatted = formatCluesForDisplay({
              across: message.data.words.filter((w: any) => w.direction === 'across'),
              down: message.data.words.filter((w: any) => w.direction === 'down'),
            });
            setClues(formatted);
          }
          break;

        case 'cell_updated':
          // Local cell update - send to other participants via socket
          if (canEdit && message.data.cellId && message.data.value !== undefined) {
            updateCell({
              roomCode: resolvedParams.roomCode,
              cellId: message.data.cellId,
              value: message.data.value,
              userId: session?.userId,
              userName: session?.user?.name || 'Player',
              role: userRole
            });
          }
          break;
      }
    }, [canEdit, updateCell, resolvedParams.roomCode, session, userRole, showConflict]),
  });

  // Fetch room data
  const fetchRoom = async () => {
    try {
      // Join room
      const joinResponse = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!joinResponse.ok) {
        const error = await joinResponse.json();
        if (!error.error?.includes('already in this room')) {
          console.error('Failed to join room:', error);
          alert(error.error || 'Failed to join room');
          router.push('/multiplayer');
          return;
        }
      }
      
      // Fetch room details
      const response = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}`);
      if (!response.ok) {
        router.push('/multiplayer');
        return;
      }

      const data = await response.json();
      setRoom(data);
      
      // Fetch puzzle
      if (data.puzzleId) {
        const puzzleResponse = await fetch(`/api/puzzles/${data.puzzleId}`);
        if (puzzleResponse.ok) {
          const puzzleData = await puzzleResponse.json();
          setPuzzle(puzzleData);
          
          // Fetch puzzle content
          const contentResponse = await fetch(`/api/puzzles/${data.puzzleId}/content?mode=iframe`);
          if (contentResponse.ok) {
            const html = await contentResponse.text();
            setPuzzleContent(html);
          }
        }
      }

      // Fetch auto-save config
      if (data.id) {
        const configResponse = await fetch(`/api/multiplayer/rooms/${data.id}/save`);
        if (configResponse.ok) {
          const config = await configResponse.json();
          setAutoSaveConfig({
            enabled: config.autoSaveEnabled,
            interval: config.saveInterval
          });
        }
      }
    } catch (err) {
      console.error('Error fetching room:', err);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (status === "authenticated") {
      fetchRoom();
    }
  }, [status, resolvedParams.roomCode, router]);

  // Extract clues from iframe after content loads
  useEffect(() => {
    if (!puzzleContent || !iframeRef.current) return;

    const timer = setTimeout(async () => {
      const extractedClues = await extractCluesWithRetry(iframeRef.current);
      const formatted = formatCluesForDisplay(extractedClues);
      setClues(formatted);
    }, 1000);

    return () => clearTimeout(timer);
  }, [puzzleContent]);

  // Handle hint usage
  const handleUseHint = async (hintType: 'letter' | 'word' | 'definition') => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: hintType.toUpperCase(),
          userId: session?.userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to use hint');
      }

      const result = await response.json();
      
      // Apply hint to iframe
      if (hintType === 'letter' && result.cellId && result.letter) {
        if (iframeRef.current?.contentWindow) {
          const contentWindow = iframeRef.current.contentWindow as any;
          if (contentWindow.__applyRemoteCellUpdate) {
            contentWindow.__applyRemoteCellUpdate(result.cellId, result.letter);
          }
        }
      } else if (hintType === 'word' && result.wordData) {
        sendCommand({ type: 'reveal_word', wordData: result.wordData });
      } else if (hintType === 'definition' && result.enhancedClue) {
        alert(`Enhanced Clue: ${result.enhancedClue}`);
      }
    } catch (error) {
      console.error('Error using hint:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to use hint');
    }
  };

  // Handle participant actions
  const handleKickPlayer = async (userId: string) => {
    await kickPlayer(userId);
  };

  // Loading state
  if (status === "loading" || !room || !puzzle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <X className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to access this room.</p>
        </div>
      </div>
    );
  }

  // Prepare participants for sidebar
  const participantsComponent = (
    <RoomParticipantList
      participants={participants}
      currentUserId={session?.userId}
      isHost={isHost}
      onKickPlayer={handleKickPlayer}
      onChangeRole={(userId, role) => {
        // Implement role change via API
        fetch(`/api/multiplayer/rooms/${resolvedParams.roomCode}/participants/${userId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newRole: role })
        });
      }}
    />
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl flex-shrink-0 z-50 h-14">
        <div className="container mx-auto max-w-7xl px-4 py-2 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-bold">{room.name || `Room ${room.roomCode}`}</h1>
                <p className="text-xs text-muted-foreground">Code: {room.roomCode}</p>
              </div>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <SaveIndicator 
                status={saveStatus} 
                lastSaved={lastSaved} 
                error={saveError} 
              />
              {isHost && device === 'desktop' && (
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
        </div>
      </header>

      {/* Connection Status Alert */}
      {connectionState !== 'connected' && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded ${
          connectionState === 'reconnecting' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
          connectionState === 'failed' ? 'bg-red-100 border border-red-400 text-red-700' :
          'bg-orange-100 border border-orange-400 text-orange-700'
        }`}>
          <strong>
            {connectionState === 'reconnecting' && 'Reconnecting...'}
            {connectionState === 'failed' && 'Connection Failed'}
            {connectionState === 'disconnected' && 'Connection Lost'}
          </strong>
        </div>
      )}

      {/* Main Content with AdaptiveLayout */}
      <div className="flex-1 container mx-auto max-w-7xl px-4 py-4">
        <AdaptiveLayout
          participantCount={participants.length}
          device={device}
          
          // Puzzle area
          puzzleArea={
            <div>
              {!canEdit && (
                <div className="mb-2 p-2 bg-muted rounded text-sm text-muted-foreground">
                  👁️ Spectator mode - View only
                </div>
              )}
              <PuzzleArea
                puzzleUrl={puzzle.file_path}
                puzzleContent={puzzleContent}
                height={iframeHeight}
                iframeRef={iframeRef}
              />
            </div>
          }
          
          // Clues panel
          cluesPanel={
            <CluesPanel
              acrossClues={clues.across}
              downClues={clues.down}
              onClueClick={(clue) => {
                console.log('[RoomPage] Clue clicked:', clue);
                // Send focus command to iframe
                sendCommand({ 
                  type: 'focus_clue', 
                  clueNumber: clue.number,
                  direction: clue.number < 100 ? 'across' : 'down' 
                });
              }}
            />
          }
          
          // Hints menu (only for players)
          hintsMenu={canEdit ? (
            <HintsMenu
              isPremium={true} // Multiplayer hints work differently
              onRevealLetter={() => handleUseHint('letter')}
              onRevealWord={() => handleUseHint('word')}
              onCheckPuzzle={() => {
                sendCommand({ type: 'check_puzzle' });
              }}
              device={device}
            />
          ) : null}
          
          // Progress bar
          progressBar={
            <ProgressBar
              completionPercent={progressPercent}
              wordsCompleted={Object.keys(gridState).length}
              totalWords={clues.across.length + clues.down.length}
            />
          }
          
          // Save indicator
          saveIndicator={
            <SaveIndicator 
              status={saveStatus} 
              lastSaved={lastSaved} 
              error={saveError} 
            />
          }
          
          // Participants list (multiplayer-specific)
          participantsList={participantsComponent}
        />
      </div>

      {/* Notifications */}
      <HostChangeNotification
        isVisible={hostChangeNotification.isVisible}
        newHostName={hostChangeNotification.newHostName}
        previousHostName={hostChangeNotification.previousHostName}
        onDismiss={dismissNotification}
      />
      
      <ConflictNotification
        conflict={conflict}
        onDismiss={dismissConflict}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </div>
  );
}
