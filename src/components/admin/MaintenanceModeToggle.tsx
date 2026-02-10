"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle,
  Settings,
  Loader2,
  Wrench,
} from "lucide-react";

interface MaintenanceModeToggleProps {
  onUpdate?: () => void;
}

export function MaintenanceModeToggle({ onUpdate }: MaintenanceModeToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempMessage, setTempMessage] = useState('');

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/maintenance');
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance status');
      }
      const data = await response.json();
      setEnabled(data.enabled);
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (newEnabled: boolean) => {
    if (newEnabled) {
      // Open dialog to set message
      setTempMessage(message);
      setDialogOpen(true);
    } else {
      // Disable maintenance mode
      await updateMaintenanceMode(false, message);
    }
  };

  const handleSave = async () => {
    await updateMaintenanceMode(true, tempMessage);
    setDialogOpen(false);
  };

  const updateMaintenanceMode = async (newEnabled: boolean, newMessage: string) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: newEnabled,
          message: newMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update maintenance mode');
      }

      setEnabled(newEnabled);
      setMessage(newMessage);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update maintenance mode');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading maintenance status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>
            Control system maintenance mode and custom messaging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${enabled ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
                {enabled ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {enabled ? 'Maintenance Mode Active' : 'System Operational'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {enabled ? 'Users will see maintenance message' : 'All features available'}
                </p>
              </div>
            </div>
            
            <Badge className={enabled ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}>
              {enabled ? 'MAINTENANCE' : 'OPERATIONAL'}
            </Badge>
          </div>

          {enabled && message && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Current Message:
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {message}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant={enabled ? "default" : "destructive"}
              onClick={() => handleToggle(!enabled)}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {enabled ? 'Disabling...' : 'Enabling...'}
                </>
              ) : enabled ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Disable Maintenance
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Enable Maintenance
                </>
              )}
            </Button>

            {enabled && (
              <Button
                variant="outline"
                onClick={() => {
                  setTempMessage(message);
                  setDialogOpen(true);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Message
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Message Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {enabled ? 'Edit Maintenance Message' : 'Enable Maintenance Mode'}
            </DialogTitle>
            <DialogDescription>
              {enabled 
                ? 'Update the message shown to users during maintenance'
                : 'Set a custom message to display to users during maintenance'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Maintenance Message</Label>
              <Textarea
                id="message"
                value={tempMessage}
                onChange={(e) => setTempMessage(e.target.value)}
                placeholder="Enter a message to display to users during maintenance..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This message will be shown to all users when maintenance mode is active.
              </p>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Warning
                </p>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Enabling maintenance mode will prevent users from accessing the application.
                Only administrators will be able to access the admin panel.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!tempMessage.trim()}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {enabled ? 'Update Message' : 'Enable Maintenance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
