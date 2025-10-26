"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { isPremiumUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Users, 
  Puzzle, 
  Settings,
  Copy,
  Share2,
  Lock,
  Globe,
  Crown,
  CheckCircle,
  Loader2
} from "lucide-react";

// Interface for puzzle data from API
interface PuzzleData {
  id: number;
  title: string;
  description: string | null;
  difficulty: string | null;
  tier: string | null;
  tags: string | null;
  estimated_solve_time: number | null;
  play_count: number | null;
}

const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

const accessLevelColors = {
  free: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  premium: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
};

export default function CreateRoomPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [roomName, setRoomName] = useState("");
  const [selectedPuzzle, setSelectedPuzzle] = useState<number | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomCreated, setRoomCreated] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  
  // Real puzzle data state
  const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Premium user check
  const isPremium = isPremiumUser(session);

  // Fetch puzzles from API
  useEffect(() => {
    const fetchPuzzles = async () => {
      try {
        setLoading(true);
        // Fetch ALL puzzles without tier filtering for multiplayer room creation
        const response = await fetch('/api/puzzles?limit=100');
        if (!response.ok) throw new Error('Failed to fetch puzzles');
        const data = await response.json();
        setPuzzles(data.puzzles);
      } catch (error) {
        console.error('Failed to load puzzles:', error);
        setError('Failed to load puzzles');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPuzzles();
  }, []);

  const handleCreateRoom = async () => {
    if (!selectedPuzzle || !isPremium) return;
    
    try {
      setCreating(true);
      const response = await fetch('/api/multiplayer/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzleId: selectedPuzzle,
          name: roomName || `${session?.user?.name}'s Room`,
          maxPlayers,
          isPrivate
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create room');
      }
      
    const room = await response.json();
    
    // Verify room exists before redirecting
    let roomExists = false;
    let attempts = 0;
    
    while (!roomExists && attempts < 5) {
      const verifyResponse = await fetch(`/api/multiplayer/rooms/${room.roomCode}`);
      if (verifyResponse.ok) {
        roomExists = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
      attempts++;
    }
    
    if (!roomExists) {
      throw new Error('Room creation verification failed');
    }
    
    router.push(`/room/${room.roomCode}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    // In a real app, you'd show a toast notification
  };

  const shareRoom = () => {
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url);
    // In a real app, you'd show a toast notification
  };

  if (roomCreated) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-xl">
          <div className="container mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/multiplayer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Lobby
                </Link>
              </Button>
              <h1 className="text-xl font-bold">Room Created!</h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto max-w-4xl px-4 py-16">
          <motion.div 
            className="text-center space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-4">Room Created Successfully!</h2>
              <p className="text-xl text-muted-foreground">
                Your multiplayer room is ready. Share the code with friends to start playing together.
              </p>
            </div>

            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center space-y-6">
                <div>
                  <Label className="text-sm text-muted-foreground">Room Code</Label>
                  <div className="text-4xl font-bold font-mono tracking-wider text-primary mt-2">
                    {roomCode}
                  </div>
                </div>

                <div className="space-y-3">
                  <Button onClick={copyRoomCode} className="w-full">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Code
                  </Button>
                  <Button variant="outline" onClick={shareRoom} className="w-full">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Link
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button asChild size="lg" className="w-full">
                    <Link href={`/room/${roomCode}`}>
                      <Users className="mr-2 h-4 w-4" />
                      Enter Room
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/multiplayer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lobby
              </Link>
            </Button>
            <h1 className="text-xl font-bold">Create New Room</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Room Settings */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Room Settings
                  </CardTitle>
                  <CardDescription>
                    Configure your multiplayer session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="roomName">Room Name</Label>
                    <Input
                      id="roomName"
                      placeholder="Enter a name for your room"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxPlayers">Maximum Players</Label>
                    <select
                      id="maxPlayers"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2"
                    >
                      <option value={2}>2 players</option>
                      <option value={3}>3 players</option>
                      <option value={4}>4 players</option>
                      <option value={6}>6 players</option>
                      <option value={8}>8 players</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Label htmlFor="isPrivate" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Private room (requires room code to join)
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Puzzle Selection */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Puzzle className="h-5 w-5" />
                    Select Puzzle
                  </CardTitle>
                  <CardDescription>
                    Choose which crossword puzzle to solve together
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Loading puzzles...</span>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <p className="text-red-600 mb-4">{error}</p>
                      <Button variant="outline" onClick={() => window.location.reload()}>
                        Try Again
                      </Button>
                    </div>
                  ) : puzzles.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No puzzles available</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {puzzles.map((puzzle, index) => (
                        <motion.div
                          key={puzzle.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedPuzzle === puzzle.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedPuzzle(puzzle.id)}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold">{puzzle.title}</h4>
                              {selectedPuzzle === puzzle.id && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {puzzle.description || "No description available"}
                            </p>
                            
                            <div className="flex gap-2 flex-wrap">
                              {puzzle.difficulty && (
                                <Badge className={difficultyColors[puzzle.difficulty as keyof typeof difficultyColors]}>
                                  {puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1)}
                                </Badge>
                              )}
                              {puzzle.tier && (
                                <Badge className={accessLevelColors[puzzle.tier as keyof typeof accessLevelColors]}>
                                  {puzzle.tier.charAt(0).toUpperCase() + puzzle.tier.slice(1)}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-sm text-muted-foreground">
                              {puzzle.estimated_solve_time ? (
                                <>Estimated time: {puzzle.estimated_solve_time} min</>
                              ) : (
                                <>Plays: {puzzle.play_count || 0}</>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Room Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{roomName || "Untitled Room"}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Puzzle</Label>
                    <p className="font-medium">
                      {selectedPuzzle 
                        ? puzzles.find(p => p.id === selectedPuzzle)?.title || "Unknown puzzle"
                        : "Not selected"
                      }
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Max Players</Label>
                    <p className="font-medium">{maxPlayers}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Privacy</Label>
                    <p className="font-medium flex items-center gap-2">
                      {isPrivate ? (
                        <>
                          <Lock className="h-4 w-4" />
                          Private
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4" />
                          Public
                        </>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Notice - Only show for non-premium users */}
            {!isPremium && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <h3 className="font-semibold">Premium Feature</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Room hosting is available for premium users. Upgrade to create and manage your own multiplayer sessions.
                    </p>
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href="/pricing">
                        <Crown className="mr-2 h-4 w-4" />
                        Upgrade to Premium
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Create Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button 
                onClick={handleCreateRoom}
                disabled={!roomName || !selectedPuzzle || !isPremium || creating}
                className="w-full"
                size="lg"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Create Room
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
