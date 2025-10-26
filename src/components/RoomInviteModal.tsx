"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Clock, 
  Lock, 
  Unlock, 
  Crown, 
  Eye, 
  Play, 
  CheckCircle, 
  XCircle,
  Mail,
  User,
  Link,
  Send,
  Copy,
  Share2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RoomInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomName?: string;
  roomId: string;
  onInviteSent?: (results: any[]) => void;
}

interface InviteResult {
  recipient: string;
  success: boolean;
  error?: string;
  inviteId?: string;
}

export function RoomInviteModal({ 
  isOpen, 
  onClose, 
  roomCode, 
  roomName, 
  roomId,
  onInviteSent 
}: RoomInviteModalProps) {
  const [inviteType, setInviteType] = useState<'email' | 'username' | 'direct_link'>('email');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [message, setMessage] = useState('');
  const [expiresIn, setExpiresIn] = useState(24);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setRecipients([]);
      setRecipientInput('');
      setMessage(`Join me in solving a crossword puzzle in room ${roomCode}!`);
      setResults([]);
      setShowResults(false);
    }
  }, [isOpen, roomCode]);

  // Add recipient
  const addRecipient = () => {
    const trimmed = recipientInput.trim();
    if (trimmed && !recipients.includes(trimmed)) {
      setRecipients([...recipients, trimmed]);
      setRecipientInput('');
    }
  };

  // Remove recipient
  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  // Handle Enter key in recipient input
  const handleRecipientKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRecipient();
    }
  };

  // Send invitations
  const sendInvitations = async () => {
    if (recipients.length === 0) {
      alert('Please add at least one recipient');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomCode}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteType,
          recipients,
          message: message.trim() || undefined,
          expiresIn
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitations');
      }

      const data = await response.json();
      setResults(data.results || []);
      setShowResults(true);
      onInviteSent?.(data.results || []);

    } catch (error: any) {
      console.error('Error sending invitations:', error);
      alert(error.message || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  // Copy room link
  const copyRoomLink = async () => {
    const roomUrl = `${window.location.origin}/room/${roomCode}`;
    try {
      await navigator.clipboard.writeText(roomUrl);
      alert('Room link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Share room link
  const shareRoomLink = async () => {
    const roomUrl = `${window.location.origin}/room/${roomCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${roomName || 'Crossword Room'}`,
          text: `Join me in solving a crossword puzzle!`,
          url: roomUrl,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      copyRoomLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Players to {roomName || `Room ${roomCode}`}
          </DialogTitle>
          <DialogDescription>
            Send invitations to friends to join your crossword room
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Invitation Type */}
            <div className="space-y-2">
              <Label>Invitation Method</Label>
              <Select value={inviteType} onValueChange={(value: any) => setInviteType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Addresses
                    </div>
                  </SelectItem>
                  <SelectItem value="username">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Usernames
                    </div>
                  </SelectItem>
                  <SelectItem value="direct_link">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Direct Link
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Direct Link Option */}
            {inviteType === 'direct_link' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Share Room Link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}/room/${roomCode}`}
                      readOnly
                      className="flex-1"
                    />
                    <Button onClick={copyRoomLink} variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button onClick={shareRoomLink} variant="outline" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this link with anyone you want to invite to the room
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recipients */}
            {inviteType !== 'direct_link' && (
              <div className="space-y-2">
                <Label>
                  {inviteType === 'email' ? 'Email Addresses' : 'Usernames'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={
                      inviteType === 'email' 
                        ? 'Enter email addresses...' 
                        : 'Enter usernames...'
                    }
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyPress={handleRecipientKeyPress}
                  />
                  <Button onClick={addRecipient} variant="outline">
                    Add
                  </Button>
                </div>
                
                {/* Recipient List */}
                {recipients.length > 0 && (
                  <div className="space-y-2">
                    <Label>Recipients ({recipients.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {recipients.map((recipient, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {recipient}
                          <button
                            onClick={() => removeRecipient(index)}
                            className="ml-1 hover:text-red-600"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Message */}
            {inviteType !== 'direct_link' && (
              <div className="space-y-2">
                <Label>Custom Message (Optional)</Label>
                <Textarea
                  placeholder="Add a personal message to your invitation..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Expiration */}
            {inviteType !== 'direct_link' && (
              <div className="space-y-2">
                <Label>Invitation Expires In</Label>
                <Select value={expiresIn.toString()} onValueChange={(value) => setExpiresIn(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Hour</SelectItem>
                    <SelectItem value="6">6 Hours</SelectItem>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="72">3 Days</SelectItem>
                    <SelectItem value="168">1 Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Results */}
            {showResults && results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Invitation Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-2 p-2 rounded ${
                          result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}
                      >
                        {result.success ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <span className="flex-1">
                          <strong>{result.recipient}</strong>
                          {result.success ? ' - Invitation sent successfully' : ` - ${result.error}`}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            {showResults ? 'Close' : 'Cancel'}
          </Button>
          {inviteType !== 'direct_link' && (
            <Button 
              onClick={sendInvitations} 
              disabled={loading || recipients.length === 0}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitations
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
