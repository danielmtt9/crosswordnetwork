import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Shield, 
  Eye, 
  MoreVertical,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserAvatar, UserAvatarListItem } from './UserAvatar';
import { RoleIndicator, UserRole, SubscriptionStatus, UserStatus } from './RoleIndicator';
import { cn } from '@/lib/utils';

interface Participant {
  userId: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  role: UserRole;
  subscriptionStatus?: SubscriptionStatus;
  isOnline: boolean;
  userStatus: UserStatus;
  isPremium: boolean;
  isHost: boolean;
  isModerator: boolean;
  joinedAt: string;
  lastSeenAt?: string;
  isActive: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'disconnected';
}

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  currentUserRole: UserRole;
  isHost: boolean;
  isModerator: boolean;
  onKickUser?: (userId: string) => void;
  onPromoteToModerator?: (userId: string) => void;
  onDemoteFromModerator?: (userId: string) => void;
  onMuteUser?: (userId: string) => void;
  onUnmuteUser?: (userId: string) => void;
  onSendPrivateMessage?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  className?: string;
}

type SortField = 'name' | 'role' | 'status' | 'joinedAt';
type SortOrder = 'asc' | 'desc';
type FilterRole = 'all' | 'HOST' | 'PLAYER' | 'SPECTATOR' | 'MODERATOR';
type FilterStatus = 'all' | 'online' | 'offline' | 'away' | 'busy';

export function ParticipantList({
  participants,
  currentUserId,
  currentUserRole,
  isHost,
  isModerator,
  onKickUser,
  onPromoteToModerator,
  onDemoteFromModerator,
  onMuteUser,
  onUnmuteUser,
  onSendPrivateMessage,
  onViewProfile,
  className = ''
}: ParticipantListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter and sort participants
  const filteredAndSortedParticipants = React.useMemo(() => {
    let filtered = participants.filter(participant => {
      // Search filter
      if (searchQuery && !participant.userName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Role filter
      if (filterRole !== 'all' && participant.role !== filterRole) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && participant.userStatus !== filterStatus) {
        return false;
      }

      return true;
    });

    // Sort participants
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.userName.localeCompare(b.userName);
          break;
        case 'role':
          const roleOrder = { HOST: 0, MODERATOR: 1, PLAYER: 2, SPECTATOR: 3 };
          comparison = roleOrder[a.role] - roleOrder[b.role];
          break;
        case 'status':
          const statusOrder = { online: 0, away: 1, busy: 2, offline: 3 };
          comparison = statusOrder[a.userStatus] - statusOrder[b.userStatus];
          break;
        case 'joinedAt':
          comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [participants, searchQuery, sortField, sortOrder, filterRole, filterStatus]);

  // Get participant counts
  const participantCounts = React.useMemo(() => {
    const online = participants.filter(p => p.isOnline).length;
    const total = participants.length;
    const hosts = participants.filter(p => p.role === 'HOST').length;
    const players = participants.filter(p => p.role === 'PLAYER').length;
    const spectators = participants.filter(p => p.role === 'SPECTATOR').length;
    const moderators = participants.filter(p => p.role === 'MODERATOR').length;

    return { online, total, hosts, players, spectators, moderators };
  }, [participants]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const getConnectionQualityColor = (quality?: string) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-yellow-500';
      case 'poor':
        return 'text-orange-500';
      case 'disconnected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getConnectionQualityIcon = (quality?: string) => {
    switch (quality) {
      case 'excellent':
        return '🟢';
      case 'good':
        return '🟡';
      case 'poor':
        return '🟠';
      case 'disconnected':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Participants</CardTitle>
            <Badge variant="outline" className="ml-2">
              {participantCounts.online}/{participantCounts.total}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>
        <CardDescription>
          {participantCounts.online} online • {participantCounts.hosts} hosts • {participantCounts.players} players • {participantCounts.spectators} spectators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setFilterRole('all')}>
                  All Roles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterRole('HOST')}>
                  Hosts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterRole('MODERATOR')}>
                  Moderators
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterRole('PLAYER')}>
                  Players
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterRole('SPECTATOR')}>
                  Spectators
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('online')}>
                  Online
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('away')}>
                  Away
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('busy')}>
                  Busy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('offline')}>
                  Offline
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="flex items-center gap-1">
              {[
                { field: 'name' as SortField, label: 'Name' },
                { field: 'role' as SortField, label: 'Role' },
                { field: 'status' as SortField, label: 'Status' },
                { field: 'joinedAt' as SortField, label: 'Joined' }
              ].map(({ field, label }) => (
                <Button
                  key={field}
                  variant={sortField === field ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort(field)}
                  className="h-8 px-2 text-xs"
                >
                  {label}
                  {sortField === field && (
                    sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Participants List */}
        <ScrollArea className="h-96">
          <div className="space-y-2">
            <AnimatePresence>
              {filteredAndSortedParticipants.map((participant, index) => (
                <motion.div
                  key={participant.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <UserAvatarListItem
                        userId={participant.userId}
                        userName={participant.userName}
                        userEmail={participant.userEmail}
                        avatarUrl={participant.avatarUrl}
                        role={participant.role}
                        subscriptionStatus={participant.subscriptionStatus}
                        isOnline={participant.isOnline}
                        userStatus={participant.userStatus}
                        isPremium={participant.isPremium}
                        isHost={participant.isHost}
                        isModerator={participant.isModerator}
                        onClick={() => onViewProfile?.(participant.userId)}
                      />
                      
                      {/* Connection Quality Indicator */}
                      {participant.connectionQuality && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">
                            {getConnectionQualityIcon(participant.connectionQuality)}
                          </span>
                          <span className={cn('text-xs', getConnectionQualityColor(participant.connectionQuality))}>
                            {participant.connectionQuality}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions Menu */}
                    {participant.userId !== currentUserId && (isHost || isModerator || participant.role === 'SPECTATOR') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSendPrivateMessage?.(participant.userId)}>
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onViewProfile?.(participant.userId)}>
                            View Profile
                          </DropdownMenuItem>
                          
                          {(isHost || isModerator) && (
                            <>
                              <DropdownMenuSeparator />
                              {participant.role === 'SPECTATOR' && (
                                <DropdownMenuItem onClick={() => onPromoteToModerator?.(participant.userId)}>
                                  Promote to Moderator
                                </DropdownMenuItem>
                              )}
                              {participant.role === 'MODERATOR' && isHost && (
                                <DropdownMenuItem onClick={() => onDemoteFromModerator?.(participant.userId)}>
                                  Demote from Moderator
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => onMuteUser?.(participant.userId)}>
                                Mute User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onUnmuteUser?.(participant.userId)}>
                                Unmute User
                              </DropdownMenuItem>
                              {isHost && (
                                <DropdownMenuItem 
                                  onClick={() => onKickUser?.(participant.userId)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  Kick User
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Summary Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-4">
            <span>Online: {participantCounts.online}</span>
            <span>Total: {participantCounts.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for sidebars
export function ParticipantListCompact({
  participants,
  currentUserId,
  onUserClick,
  className = ''
}: {
  participants: Participant[];
  currentUserId: string;
  onUserClick?: (userId: string) => void;
  className?: string;
}) {
  const onlineParticipants = participants.filter(p => p.isOnline);
  const offlineParticipants = participants.filter(p => !p.isOnline);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Online Participants */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm font-medium">Online ({onlineParticipants.length})</span>
        </div>
        <div className="space-y-1">
          {onlineParticipants.map((participant) => (
            <motion.div
              key={participant.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <UserAvatarListItem
                userId={participant.userId}
                userName={participant.userName}
                avatarUrl={participant.avatarUrl}
                role={participant.role}
                subscriptionStatus={participant.subscriptionStatus}
                isOnline={participant.isOnline}
                userStatus={participant.userStatus}
                isPremium={participant.isPremium}
                isHost={participant.isHost}
                isModerator={participant.isModerator}
                onClick={() => onUserClick?.(participant.userId)}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Offline Participants */}
      {offlineParticipants.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="text-sm font-medium">Offline ({offlineParticipants.length})</span>
          </div>
          <div className="space-y-1">
            {offlineParticipants.map((participant) => (
              <motion.div
                key={participant.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <UserAvatarListItem
                  userId={participant.userId}
                  userName={participant.userName}
                  avatarUrl={participant.avatarUrl}
                  role={participant.role}
                  subscriptionStatus={participant.subscriptionStatus}
                  isOnline={participant.isOnline}
                  userStatus={participant.userStatus}
                  isPremium={participant.isPremium}
                  isHost={participant.isHost}
                  isModerator={participant.isModerator}
                  onClick={() => onUserClick?.(participant.userId)}
                  className="p-2 hover:bg-muted/50 rounded-lg transition-colors opacity-60"
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
