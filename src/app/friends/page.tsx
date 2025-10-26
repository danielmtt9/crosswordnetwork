"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Clock,
  UserCheck,
  UserX
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  subscriptionStatus: string;
}

interface Friend {
  id: string;
  friend: User;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface FriendRequest {
  id: string;
  user?: User;
  friend?: User;
  status: string;
  createdAt: string;
}

export default function FriendsPage() {
  const { data: session } = useSession();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch friends data
  const fetchFriends = async () => {
    if (!session?.userId) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/friends');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setSentRequests(data.sentRequests || []);
        setReceivedRequests(data.receivedRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search users
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (friendId: string) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId, action: 'send_request' })
      });

      if (response.ok) {
        await fetchFriends(); // Refresh data
        setSearchResults(prev => prev.filter(user => user.id !== friendId));
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      });

      if (response.ok) {
        await fetchFriends(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  // Reject friend request
  const rejectFriendRequest = async (friendshipId: string) => {
    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      });

      if (response.ok) {
        await fetchFriends(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  };

  // Remove friend
  const removeFriend = async (friendshipId: string) => {
    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFriends(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  // Load friends on mount
  useEffect(() => {
    if (session?.userId) {
      fetchFriends();
    }
  }, [session?.userId]);

  // Search debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (!session?.userId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please sign in to view your friends.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Friends</h1>
        <p className="text-muted-foreground">
          Connect with other crossword enthusiasts and collaborate on puzzles.
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">
            Requests ({receivedRequests.length + sentRequests.length})
          </TabsTrigger>
          <TabsTrigger value="find">Find Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading friends...</p>
            </div>
          ) : friends.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by finding and adding friends to collaborate on puzzles.
                </p>
                <Button asChild>
                  <a href="#find">Find Friends</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => (
                <Card key={friend.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.friend.image} />
                        <AvatarFallback>
                          {friend.friend.name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.friend.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {friend.friend.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {friend.friend.role}
                          </Badge>
                          <UserCheck className="h-3 w-3 text-green-500" />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFriend(friend.id)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          {/* Received Requests */}
          {receivedRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Friend Requests</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {receivedRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={request.user?.image} />
                          <AvatarFallback>
                            {request.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{request.user?.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {request.user?.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptFriendRequest(request.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectFriendRequest(request.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Sent Requests</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {sentRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={request.friend?.image} />
                          <AvatarFallback>
                            {request.friend?.name?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{request.friend?.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {request.friend?.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-muted-foreground">
                              Pending
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {receivedRequests.length === 0 && sentRequests.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-muted-foreground">
                  All friend requests have been handled.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="find" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Find Friends</CardTitle>
              <CardDescription>
                Search for other users by name or email to send friend requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchLoading && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Searching...</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Search Results</h4>
                    <div className="grid gap-2">
                      {searchResults.map((user) => (
                        <Card key={user.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.image} />
                                <AvatarFallback>
                                  {user.name?.slice(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user.name}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => sendFriendRequest(user.id)}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery && !searchLoading && searchResults.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
