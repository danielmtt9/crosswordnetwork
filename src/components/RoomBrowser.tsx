"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Users, 
  Clock, 
  Lock, 
  Unlock, 
  Crown, 
  Eye, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle,
  Filter,
  RefreshCw,
  Copy,
  Share2,
  Star,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export interface RoomInfo {
  id: string;
  roomCode: string;
  name: string;
  description?: string;
  hostName: string;
  hostAvatar?: string;
  puzzleTitle: string;
  puzzleDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  participantCount: number;
  maxPlayers: number;
  spectatorCount: number;
  allowSpectators: boolean;
  isPrivate: boolean;
  hasPassword: boolean;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  timeLimit?: number; // in minutes
  tags: string[];
  createdAt: string;
  startedAt?: string;
  averageRating?: number;
  totalPlays?: number;
}

interface RoomBrowserProps {
  onJoinRoom: (roomCode: string, password?: string) => void;
  onRefresh: () => void;
  className?: string;
}

export function RoomBrowser({ onJoinRoom, onRefresh, className = "" }: RoomBrowserProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [privacyFilter, setPrivacyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created');
  const [showOnlyJoinable, setShowOnlyJoinable] = useState(true);
  const [showOnlyWithSpace, setShowOnlyWithSpace] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Load rooms
  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        status: statusFilter,
        difficulty: difficultyFilter,
        privacy: privacyFilter,
        sort: sortBy,
        joinable: showOnlyJoinable.toString(),
        hasSpace: showOnlyWithSpace.toString(),
      });
      
      const response = await fetch(`/api/multiplayer/rooms/browse?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to load rooms: ${response.status}`);
      }
      
      const data = await response.json();
      setRooms(data.rooms || []);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, difficultyFilter, privacyFilter, sortBy, showOnlyJoinable, showOnlyWithSpace]);

  // Filter rooms based on current filters
  useEffect(() => {
    let filtered = [...rooms];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(room => 
        room.name?.toLowerCase().includes(query) ||
        room.description?.toLowerCase().includes(query) ||
        room.hostName.toLowerCase().includes(query) ||
        room.puzzleTitle.toLowerCase().includes(query) ||
        room.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(room => room.status === statusFilter);
    }

    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(room => room.puzzleDifficulty === difficultyFilter);
    }

    // Apply privacy filter
    if (privacyFilter !== 'all') {
      filtered = filtered.filter(room => 
        privacyFilter === 'private' ? room.isPrivate : !room.isPrivate
      );
    }

    // Apply joinable filter
    if (showOnlyJoinable) {
      filtered = filtered.filter(room => room.status === 'WAITING');
    }

    // Apply space filter
    if (showOnlyWithSpace) {
      filtered = filtered.filter(room => room.participantCount < room.maxPlayers);
    }

    setFilteredRooms(filtered);
  }, [rooms, searchQuery, statusFilter, difficultyFilter, privacyFilter, showOnlyJoinable, showOnlyWithSpace]);

  // Load rooms when filters change
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Handle room join
  const handleJoinRoom = async (room: RoomInfo) => {
    if (room.isPrivate && room.hasPassword) {
      const password = prompt(`Enter password for room "${room.name || room.roomCode}":`);
      if (!password) return;
      onJoinRoom(room.roomCode, password);
    } else {
      onJoinRoom(room.roomCode);
    }
  };

  // Handle room sharing
  const handleShareRoom = async (room: RoomInfo) => {
    const shareUrl = `${window.location.origin}/room/${room.roomCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${room.name || 'Crossword Room'}`,
          text: `Join me in solving "${room.puzzleTitle}"!`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Room link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: RoomInfo['status']) => {
    switch (status) {
      case 'WAITING':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'ACTIVE':
        return { icon: Play, color: 'text-green-600', bg: 'bg-green-100' };
      case 'COMPLETED':
        return { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'EXPIRED':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: RoomInfo['puzzleDifficulty']) => {
    switch (difficulty) {
      case 'EASY':
        return 'text-green-600 bg-green-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'HARD':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDifficultyFilter('all');
    setPrivacyFilter('all');
    setSortBy('created');
    setShowOnlyJoinable(true);
    setShowOnlyWithSpace(false);
    setCurrentPage(1);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Browse Rooms</h2>
          <p className="text-muted-foreground">
            Find and join multiplayer crossword rooms
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => router.push('/multiplayer/create')} size="sm">
            Create Room
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms, hosts, puzzles, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={privacyFilter} onValueChange={setPrivacyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Privacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                <SelectItem value="public">Public Only</SelectItem>
                <SelectItem value="private">Private Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Recently Created</SelectItem>
                <SelectItem value="started">Recently Started</SelectItem>
                <SelectItem value="participants">Most Participants</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Row 2 */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="joinable"
                checked={showOnlyJoinable}
                onCheckedChange={(checked) => setShowOnlyJoinable(!!checked)}
              />
              <label htmlFor="joinable" className="text-sm">
                Only joinable rooms
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasSpace"
                checked={showOnlyWithSpace}
                onCheckedChange={(checked) => setShowOnlyWithSpace(!!checked)}
              />
              <label htmlFor="hasSpace" className="text-sm">
                Only rooms with space
              </label>
            </div>
            <Button onClick={clearFilters} variant="outline" size="sm">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {loading ? 'Loading...' : `${filteredRooms.length} room${filteredRooms.length !== 1 ? 's' : ''} found`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8 text-red-600">
              <p>{error}</p>
              <Button onClick={loadRooms} variant="outline" className="mt-2">
                Try Again
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading rooms...</p>
            </div>
          )}

          {!loading && !error && filteredRooms.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rooms found matching your criteria</p>
              <Button onClick={clearFilters} variant="outline" className="mt-2">
                Clear Filters
              </Button>
            </div>
          )}

          {!loading && !error && filteredRooms.length > 0 && (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredRooms.map((room) => {
                    const StatusIcon = getStatusInfo(room.status).icon;
                    const statusColor = getStatusInfo(room.status).color;
                    const statusBg = getStatusInfo(room.status).bg;
                    const difficultyColor = getDifficultyColor(room.puzzleDifficulty);

                    return (
                      <motion.div
                        key={room.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold truncate">
                                {room.name || `Room ${room.roomCode}`}
                              </h3>
                              <Badge variant="outline" className={statusBg}>
                                <StatusIcon className={`h-3 w-3 mr-1 ${statusColor}`} />
                                {room.status}
                              </Badge>
                              {room.isPrivate && (
                                <Badge variant="outline" className="bg-gray-100">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Private
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Crown className="h-3 w-3" />
                                  {room.hostName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {room.participantCount}/{room.maxPlayers} players
                                </span>
                                {room.allowSpectators && (
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {room.spectatorCount} spectators
                                  </span>
                                )}
                              </div>
                              <p className="truncate">
                                <strong>Puzzle:</strong> {room.puzzleTitle}
                              </p>
                              {room.description && (
                                <p className="truncate">{room.description}</p>
                              )}
                              {room.timeLimit && (
                                <p>
                                  <strong>Time Limit:</strong> {room.timeLimit} minutes
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={difficultyColor}>
                                {room.puzzleDifficulty}
                              </Badge>
                              {room.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {room.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{room.tags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              onClick={() => handleJoinRoom(room)}
                              size="sm"
                              disabled={room.status !== 'WAITING' || room.participantCount >= room.maxPlayers}
                            >
                              Join
                            </Button>
                            <Button
                              onClick={() => handleShareRoom(room)}
                              variant="outline"
                              size="sm"
                            >
                              <Share2 className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
