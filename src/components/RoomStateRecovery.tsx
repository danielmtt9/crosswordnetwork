"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History, 
  RotateCcw, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  Upload,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StateVersion {
  version: number;
  createdAt: Date;
  checksum: string;
}

interface RoomStateRecoveryProps {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  onStateRestored?: (version: number) => void;
  className?: string;
}

export function RoomStateRecovery({ 
  roomId, 
  roomCode, 
  isHost, 
  onStateRestored,
  className = "" 
}: RoomStateRecoveryProps) {
  const [versions, setVersions] = useState<StateVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Load available state versions
  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/multiplayer/rooms/${roomCode}/state/versions`);
      if (!response.ok) {
        throw new Error(`Failed to load state versions: ${response.status}`);
      }
      
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load state versions');
      console.error('Error loading state versions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Restore state to selected version
  const restoreState = async () => {
    if (!selectedVersion) return;

    try {
      setIsRestoring(true);
      setError(null);
      
      const response = await fetch(`/api/multiplayer/rooms/${roomCode}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: selectedVersion })
      });

      if (!response.ok) {
        throw new Error(`Failed to restore state: ${response.status}`);
      }

      const result = await response.json();
      onStateRestored?.(selectedVersion);
      
      // Reload versions to update the list
      await loadVersions();
      
    } catch (err: any) {
      setError(err.message || 'Failed to restore state');
      console.error('Error restoring state:', err);
    } finally {
      setIsRestoring(false);
    }
  };

  // Load versions on mount
  useEffect(() => {
    if (isHost) {
      loadVersions();
    }
  }, [isHost, roomCode]);

  if (!isHost) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          State Recovery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading versions...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-4">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No state versions available</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Version to Restore</label>
              <Select 
                value={selectedVersion?.toString() || ''} 
                onValueChange={(value) => setSelectedVersion(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a state version..." />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.version} value={version.version.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>Version {version.version}</span>
                        <Badge variant="outline" className="ml-2">
                          {new Date(version.createdAt).toLocaleString()}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Versions</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                <AnimatePresence>
                  {versions.map((version) => (
                    <motion.div
                      key={version.version}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex items-center justify-between p-2 rounded border ${
                        selectedVersion === version.version 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <History className="h-3 w-3" />
                        <span className="text-sm font-medium">v{version.version}</span>
                        <Badge variant="secondary" className="text-xs">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(version.createdAt).toLocaleTimeString()}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={restoreState}
                disabled={!selectedVersion || isRestoring}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Restore State
                  </>
                )}
              </Button>
              <Button
                onClick={loadVersions}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>• State is automatically saved every 30 seconds</p>
              <p>• Only the last 10 versions are kept</p>
              <p>• Restoring will overwrite the current state</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
