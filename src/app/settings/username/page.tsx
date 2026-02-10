'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, User, AlertCircle } from 'lucide-react';

interface UsernameCheck {
  available: boolean;
  error?: string;
}

export default function UsernameSettingsPage() {
  const { data: session, update } = useSession();
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [checkResult, setCheckResult] = useState<UsernameCheck | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (session?.user?.username) {
      setCurrentUsername(session.user.username);
    }
  }, [session]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === currentUsername) {
      setCheckResult(null);
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch(`/api/users/username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (response.ok) {
        setCheckResult({
          available: data.available,
          error: data.error
        });
      } else {
        setCheckResult({
          available: false,
          error: data.error || 'Failed to check username'
        });
      }
    } catch (error) {
      setCheckResult({
        available: false,
        error: 'Network error'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setNewUsername(value);
    setMessage(null);
    
    // Debounce the check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleUpdateUsername = async () => {
    if (!newUsername || newUsername === currentUsername) return;
    if (!checkResult?.available) return;

    setIsUpdating(true);
    try {
      const response = await fetch('/api/users/username', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: newUsername }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Username updated successfully!' });
        setCurrentUsername(newUsername);
        setNewUsername('');
        setCheckResult(null);
        // Update the session to reflect the new username
        await update();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update username' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    
    if (!checkResult) return null;
    
    if (checkResult.available) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    if (!checkResult) return '';
    
    if (checkResult.available) {
      return 'Available';
    } else {
      return checkResult.error || 'Not available';
    }
  };

  const getStatusColor = () => {
    if (isChecking) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (!checkResult) return '';
    
    if (checkResult.available) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    } else {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Username Settings
          </CardTitle>
          <CardDescription>
            Choose a unique username that will be displayed on your profile and in leaderboards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Username</label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {currentUsername || 'Not set'}
              </Badge>
            </div>
          </div>

          {/* New Username Input */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              New Username
            </label>
            <div className="space-y-2">
              <Input
                id="username"
                type="text"
                placeholder="Enter new username"
                value={newUsername}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full"
                maxLength={20}
              />
              
              {/* Status Badge */}
              {newUsername && newUsername !== currentUsername && (
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <Badge className={getStatusColor()}>
                    {getStatusText()}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Username Rules */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4" />
              Username Rules
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 3-20 characters long</li>
              <li>• Only letters, numbers, and underscores</li>
              <li>• Cannot start or end with underscore</li>
              <li>• No consecutive underscores</li>
              <li>• Must be unique</li>
            </ul>
          </div>

          {/* Update Button */}
          <Button
            onClick={handleUpdateUsername}
            disabled={!newUsername || newUsername === currentUsername || !checkResult?.available || isUpdating}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Username'
            )}
          </Button>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
