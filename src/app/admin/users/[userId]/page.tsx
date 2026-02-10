"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Activity,
  Puzzle,
  Users,
  Shield,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Edit,
  Trash2,
  MoreHorizontal,
  BarChart3,
  History,
  Gamepad2,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
// Removed direct import of isSuperAdmin - now using API route
import { UserSuspensionModal } from "@/components/admin/UserSuspensionModal";

interface UserDetails {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    accountStatus: string;
    suspendedAt: Date | null;
    suspendedBy: string | null;
    suspensionReason: string | null;
    suspensionExpiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      progress: number;
      hostedRooms: number;
      notifications: number;
    };
  };
  recentProgress: Array<{
    id: string;
    puzzleId: number;
    completedAt: Date | null;
    updatedAt: Date;
    puzzle: {
      title: string;
      difficulty: string;
    };
  }>;
  recentRooms: Array<{
    id: string;
    role: string;
    joinedAt: Date;
    room: {
      roomCode: string;
      name: string | null;
      status: string;
    };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: Date;
    details: any;
  }>;
}

const roleColors = {
  FREE: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const difficultyColors = {
  EASY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  HARD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspensionModalOpen, setSuspensionModalOpen] = useState(false);

  const userId = params.userId as string;
  const currentUserEmail = session?.user?.email;
  const [isCurrentUserSuperAdmin, setIsCurrentUserSuperAdmin] = useState(false);

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (currentUserEmail) {
        try {
          const response = await fetch('/api/admin/status');
          if (response.ok) {
            const data = await response.json();
            setIsCurrentUserSuperAdmin(data.isSuperAdmin);
          }
        } catch (error) {
          console.error('Failed to check super admin status:', error);
          setIsCurrentUserSuperAdmin(false);
        }
      }
    };
    checkSuperAdminStatus();
  }, [currentUserEmail]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          }
          throw new Error('Failed to fetch user details');
        }

        const data = await response.json();
        setUserDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    if (session && userId) {
      fetchUserDetails();
    }
  }, [session, userId]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const formatRelativeTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const handleUpdateUser = async (updates: any) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates })
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Refresh user details
      const updatedResponse = await fetch(`/api/admin/users/${userId}`);
      if (updatedResponse.ok) {
        const data = await updatedResponse.json();
        setUserDetails(data);
      }
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm(`Are you sure you want to delete user "${userDetails?.user.name || userDetails?.user.email}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      router.push('/admin/users');
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user');
    }
  };

  const handleSuspensionSuccess = async () => {
    // Refresh user details after suspension action
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserDetails(data);
      }
    } catch (err) {
      console.error('Error refreshing user details:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading user details...</span>
        </div>
      </div>
    );
  }

  if (error || !userDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error || 'Failed to load user details'}</p>
          <Button onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const { user, recentProgress, recentRooms, auditLogs } = userDetails;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/users')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{user.name || 'Unnamed User'}</h1>
                <p className="text-sm text-muted-foreground">User Details & Activity</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleUpdateUser({ role: 'FREE' })}>
                    <User className="h-4 w-4 mr-2" />
                    Make Player
                  </DropdownMenuItem>
                  {isCurrentUserSuperAdmin && (
                    <DropdownMenuItem onClick={() => handleUpdateUser({ role: 'ADMIN' })}>
                      <Shield className="h-4 w-4 mr-2" />
                      Make Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setSuspensionModalOpen(true)}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {user.accountStatus === 'SUSPENDED' ? 'Manage Suspension' : 'Suspend/Ban User'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDeleteUser}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{user.name || 'Unnamed User'}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Role</span>
                    <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                      {user.role === 'FREE' ? 'Player' : user.role}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Account Status</span>
                    <Badge className={
                      user.accountStatus === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      user.accountStatus === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      user.accountStatus === 'BANNED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }>
                      <div className="flex items-center gap-1">
                        {user.accountStatus === 'ACTIVE' ? <CheckCircle className="h-3 w-3" /> :
                         user.accountStatus === 'SUSPENDED' ? <AlertTriangle className="h-3 w-3" /> :
                         user.accountStatus === 'BANNED' ? <XCircle className="h-3 w-3" /> :
                         <User className="h-3 w-3" />}
                        {user.accountStatus}
                      </div>
                    </Badge>
                  </div>

                  {user.accountStatus === 'SUSPENDED' && (
                    <>
                      {user.suspensionReason && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Suspension Reason</span>
                          <span className="text-sm text-muted-foreground text-right max-w-48 truncate">
                            {user.suspensionReason}
                          </span>
                        </div>
                      )}
                      {user.suspensionExpiresAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Expires</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(user.suspensionExpiresAt)}
                          </span>
                        </div>
                      )}
                    </>
                  )}


                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Joined</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Activity</span>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(user.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Puzzle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Puzzles Completed</span>
                  </div>
                  <span className="font-medium">{user._count.progress}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Rooms Hosted</span>
                  </div>
                  <span className="font-medium">{user._count.hostedRooms}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Rooms Joined</span>
                  </div>
                  <span className="font-medium">{user._count.notifications}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Member Since</span>
                  </div>
                  <span className="font-medium">
                    {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="activity" className="space-y-6">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="puzzles">Puzzles</TabsTrigger>
                <TabsTrigger value="rooms">Rooms</TabsTrigger>
                <TabsTrigger value="audit">Audit Log</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      Latest user actions and system events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log, index) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="flex items-center gap-4 p-4 rounded-lg border"
                          >
                            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                              <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{log.action} on {log.entityType}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(log.createdAt)}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {log.entityType}
                            </Badge>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="puzzles" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Puzzle className="h-5 w-5" />
                      Puzzle Progress
                    </CardTitle>
                    <CardDescription>
                      Recent puzzle completions and progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentProgress.length > 0 ? (
                        recentProgress.map((progress, index) => (
                          <motion.div
                            key={progress.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg border"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Puzzle className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{progress.puzzle.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge className={difficultyColors[progress.puzzle.difficulty as keyof typeof difficultyColors]}>
                                    {progress.puzzle.difficulty}
                                  </Badge>
                                  <span>•</span>
                                  <span>Updated {formatRelativeTime(progress.updatedAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {progress.completedAt ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  In Progress
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No puzzle progress found</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rooms" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Room Activity
                    </CardTitle>
                    <CardDescription>
                      Multiplayer room participation history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentRooms.length > 0 ? (
                        recentRooms.map((room, index) => (
                          <motion.div
                            key={room.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg border"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Gamepad2 className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold">
                                  {room.room.name || `Room ${room.room.roomCode}`}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline">{room.role}</Badge>
                                  <span>•</span>
                                  <span>Joined {formatRelativeTime(room.joinedAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge 
                                className={
                                  room.room.status === 'ACTIVE' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : room.room.status === 'COMPLETED'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }
                              >
                                {room.room.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {room.room.roomCode}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No room activity found</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audit" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Audit Log
                    </CardTitle>
                    <CardDescription>
                      Complete audit trail of user actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log, index) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="p-4 rounded-lg border"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{log.action}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  on {log.entityType}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="mt-2 p-3 bg-muted/50 rounded text-sm">
                                <pre className="whitespace-pre-wrap text-xs">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No audit logs found</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Suspension Modal */}
      {userDetails && (
        <UserSuspensionModal
          isOpen={suspensionModalOpen}
          onClose={() => setSuspensionModalOpen(false)}
          userId={userDetails.user.id}
          userName={userDetails.user.name || userDetails.user.email}
          currentStatus={userDetails.user.accountStatus}
          onSuccess={handleSuspensionSuccess}
        />
      )}
    </div>
  );
}
