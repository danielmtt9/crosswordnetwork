"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Ban, Clock, Shield } from "lucide-react";

interface UserSuspensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentStatus: string;
  onSuccess: () => void;
}

export function UserSuspensionModal({
  isOpen,
  onClose,
  userId,
  userName,
  currentStatus,
  onSuccess,
}: UserSuspensionModalProps) {
  const [action, setAction] = useState<'suspend' | 'ban'>('suspend');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let expiresAt: Date | null = null;

      if (action === 'suspend' && duration !== 'permanent') {
        if (duration === 'custom') {
          if (!customDate) {
            setError('Custom date is required');
            setLoading(false);
            return;
          }
          expiresAt = new Date(customDate);
        } else {
          const hours = parseInt(duration);
          expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        }
      }

      const endpoint = action === 'suspend' ? 'suspend' : 'ban';
      const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, expiresAt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} user`);
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} user`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsuspend = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/unsuspend`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unsuspend user');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsuspend user');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAction('suspend');
    setReason('');
    setDuration('');
    setCustomDate('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getActionIcon = () => {
    switch (action) {
      case 'suspend':
        return <Clock className="h-5 w-5" />;
      case 'ban':
        return <Ban className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getActionColor = () => {
    switch (action) {
      case 'suspend':
        return 'text-yellow-600';
      case 'ban':
        return 'text-red-600';
      default:
        return 'text-orange-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-full bg-muted ${getActionColor()}`}>
              {getActionIcon()}
            </div>
            {currentStatus === 'SUSPENDED' ? 'Unsuspend User' : `${action === 'suspend' ? 'Suspend' : 'Ban'} User`}
          </DialogTitle>
          <DialogDescription>
            {currentStatus === 'SUSPENDED' 
              ? `Unsuspend ${userName} and restore their account access.`
              : `${action === 'suspend' ? 'Suspend' : 'Permanently ban'} ${userName}'s account. This action will be logged and can be reviewed later.`
            }
          </DialogDescription>
        </DialogHeader>

        {currentStatus === 'SUSPENDED' ? (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  User is currently suspended
                </p>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Click "Unsuspend User" to restore their account access.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentStatus !== 'SUSPENDED' && (
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={action} onValueChange={(value: 'suspend' | 'ban') => setAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suspend">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Suspend (Temporary)
                      </div>
                    </SelectItem>
                    <SelectItem value="ban">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4" />
                        Ban (Permanent)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for this action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {action === 'suspend' && (
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                    <SelectItem value="720">1 month</SelectItem>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>

                {duration === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="customDate">Expiration Date</Label>
                    <Input
                      id="customDate"
                      type="datetime-local"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {currentStatus === 'SUSPENDED' ? (
            <Button onClick={handleUnsuspend} disabled={loading}>
              {loading ? 'Unsuspending...' : 'Unsuspend User'}
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !reason.trim()}
              className={action === 'ban' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {loading ? `${action === 'suspend' ? 'Suspending' : 'Banning'}...` : `${action === 'suspend' ? 'Suspend' : 'Ban'} User`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
