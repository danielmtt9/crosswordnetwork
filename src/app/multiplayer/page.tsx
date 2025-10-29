"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { isPremiumUser } from "@/lib/auth";
import { 
  Users, 
  Plus, 
  Search, 
  Clock, 
  Puzzle, 
  Crown,
  ArrowRight,
  Copy,
  Eye,
  Play,
  Lock,
  Star,
  Loader2
} from "lucide-react";

// Empty state component
const EmptyState = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="p-4 rounded-full bg-muted mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-sm">{description}</p>
  </div>
);

const difficultyColors = {
  EASY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  HARD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

const accessLevelColors = {
  FREE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PREMIUM: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
};

const statusColors = {
  WAITING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  COMPLETED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

export default function MultiplayerPage() {
  const { data: session } = useSession();
  const isPremium = isPremiumUser(session);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [joinCode, setJoinCode] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/multiplayer/rooms', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch rooms');
        const data = await response.json();
        setRooms(data.rooms || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rooms');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.createdByUser?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDifficulty = selectedDifficulty === "ALL" || room.puzzle?.difficulty === selectedDifficulty;
    const matchesStatus = selectedStatus === "ALL" || (room.isActive ? "ACTIVE" : "WAITING") === selectedStatus;
    
    return matchesSearch && matchesDifficulty && matchesStatus;
  });

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // In a real app, you'd show a toast notification
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <motion.div 
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Multiplayer Lobby
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join live crossword sessions or start your own room to play with friends.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Quick Actions */}
        <section className="mb-8">
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Start a Room</h3>
                      <p className="text-primary-foreground/80 mb-4">
                        Create a new multiplayer session and invite friends
                      </p>
                      <Button variant="secondary" asChild>
                        <Link href="/multiplayer/new">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Room
                        </Link>
                      </Button>
                    </div>
                    <div className="p-4 rounded-full bg-primary-foreground/20">
                      <Users className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2">Join with Code</h3>
                  <p className="text-muted-foreground mb-4">
                    Enter a room code to join a specific session
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter room code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="flex-1"
                      maxLength={6}
                    />
                    <Button asChild disabled={joinCode.length !== 6}>
                      <Link href={`/room/${joinCode}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="WAITING">Waiting</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
          </div>
        </section>

        {/* Active Rooms */}
        <section>
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Active Rooms ({filteredRooms.length})
            </h2>
            <p className="text-muted-foreground">
              Join an existing room or wait for more players to join
            </p>
          </motion.div>

          {loading ? (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Loading rooms...</h3>
              <p className="text-muted-foreground">Fetching available multiplayer sessions</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load rooms</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </motion.div>
          ) : filteredRooms.length === 0 ? (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
              <p className="text-muted-foreground mb-4">
                No rooms match your current filters. Try adjusting your search or create a new room.
              </p>
              <Button asChild>
                <Link href="/multiplayer/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Room
                </Link>
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                >
                  <Card className="h-full bg-card/70 backdrop-blur-xl ring-1 ring-border hover:shadow-lg transition-all duration-300 group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {room.name}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Badge className={difficultyColors[room.puzzle?.difficulty as keyof typeof difficultyColors] || difficultyColors.MEDIUM}>
                              {room.puzzle?.difficulty || 'MEDIUM'}
                            </Badge>
                            <Badge className={statusColors[room.isActive ? 'ACTIVE' : 'WAITING' as keyof typeof statusColors]}>
                              {room.isActive ? 'ACTIVE' : 'WAITING'}
                            </Badge>
                          </div>
                        </div>
                        {room.isPrivate && (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Hosted by {room.hostUser?.username || room.hostUser?.name || 'Unknown'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {Array.from({ length: Math.min(room.playerCount || 1, 4) }).map((_, i) => (
                              <div key={i} className="h-6 w-6 rounded-full bg-primary/20 border-2 border-background" />
                            ))}
                            {(room.playerCount || 1) > 4 && (
                              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                +{(room.playerCount || 1) - 4}
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {room.playerCount || 1}/{room.maxPlayers} players
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button asChild className="flex-1">
                          <Link href={`/room/${room.roomCode}`}>
                            {room.isActive ? (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Spectate
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Join Room
                              </>
                            )}
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyRoomCode(room.roomCode)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Premium Notice - Only show for non-premium users */}
        {!isPremium && (
          <motion.section 
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                    <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Want to host your own rooms?</h3>
                    <p className="text-sm text-muted-foreground">
                      Premium users can create and host multiplayer sessions. Upgrade to start your own crossword parties!
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href="/pricing">
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}
      </div>
    </div>
  );
}
