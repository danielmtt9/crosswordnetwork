import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Users, 
  Clock, 
  CheckCircle, 
  X, 
  RefreshCw,
  GitMerge,
  GitBranch,
  Eye,
  Edit3,
  Save,
  Undo2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Operation, ConflictResolutionStrategy } from '@/lib/operationalTransformation';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Operation[];
  onResolve: (resolution: ConflictResolution) => void;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
  }>;
  className?: string;
}

interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  selectedOperations: string[];
  customResolution?: string;
}

interface ConflictGroup {
  id: string;
  operations: Operation[];
  affectedRange: {
    start: number;
    end: number;
  };
  participants: string[];
  timestamp: number;
}

const strategyLabels = {
  [ConflictResolutionStrategy.LAST_WRITE_WINS]: 'Last Write Wins',
  [ConflictResolutionStrategy.FIRST_WRITE_WINS]: 'First Write Wins',
  [ConflictResolutionStrategy.MANUAL_RESOLUTION]: 'Manual Resolution',
  [ConflictResolutionStrategy.AUTOMATIC_MERGE]: 'Automatic Merge'
};

const strategyDescriptions = {
  [ConflictResolutionStrategy.LAST_WRITE_WINS]: 'Keep the most recent changes',
  [ConflictResolutionStrategy.FIRST_WRITE_WINS]: 'Keep the earliest changes',
  [ConflictResolutionStrategy.MANUAL_RESOLUTION]: 'Manually choose which changes to keep',
  [ConflictResolutionStrategy.AUTOMATIC_MERGE]: 'Automatically merge compatible changes'
};

export function ConflictResolutionModal({
  isOpen,
  onClose,
  conflicts,
  onResolve,
  participants,
  className
}: ConflictResolutionModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy>(
    ConflictResolutionStrategy.LAST_WRITE_WINS
  );
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [customResolution, setCustomResolution] = useState('');
  const [conflictGroups, setConflictGroups] = useState<ConflictGroup[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  // Group conflicts by affected ranges
  useEffect(() => {
    const groups: ConflictGroup[] = [];
    const processed = new Set<string>();

    conflicts.forEach(conflict => {
      if (processed.has(conflict.id)) return;

      const relatedConflicts = conflicts.filter(c => 
        c.id !== conflict.id && 
        Math.abs(c.timestamp - conflict.timestamp) < 5000 && // Within 5 seconds
        Math.abs(c.position - conflict.position) < 10 // Within 10 characters
      );

      const allConflicts = [conflict, ...relatedConflicts];
      const start = Math.min(...allConflicts.map(c => c.position));
      const end = Math.max(...allConflicts.map(c => c.position + (c.length || 0)));

      groups.push({
        id: `group_${conflict.id}`,
        operations: allConflicts,
        affectedRange: { start, end },
        participants: [...new Set(allConflicts.map(c => c.userId))],
        timestamp: Math.max(...allConflicts.map(c => c.timestamp))
      });

      allConflicts.forEach(c => processed.add(c.id));
    });

    setConflictGroups(groups);
  }, [conflicts]);

  const handleStrategyChange = (strategy: ConflictResolutionStrategy) => {
    setSelectedStrategy(strategy);
    setSelectedOperations([]);
    setCustomResolution('');
  };

  const handleOperationToggle = (operationId: string) => {
    setSelectedOperations(prev => 
      prev.includes(operationId) 
        ? prev.filter(id => id !== operationId)
        : [...prev, operationId]
    );
  };

  const handleResolve = async () => {
    setIsResolving(true);
    
    try {
      const resolution: ConflictResolution = {
        strategy: selectedStrategy,
        selectedOperations,
        customResolution: customResolution || undefined
      };

      await onResolve(resolution);
      onClose();
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const getParticipantInfo = (userId: string) => {
    return participants.find(p => p.id === userId) || {
      id: userId,
      name: 'Unknown User',
      avatar: undefined,
      isOnline: false
    };
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getOperationIcon = (type: Operation['type']) => {
    switch (type) {
      case 'INSERT':
        return <Edit3 className="h-4 w-4 text-green-600" />;
      case 'DELETE':
        return <X className="h-4 w-4 text-red-600" />;
      case 'REPLACE':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'MOVE':
        return <GitBranch className="h-4 w-4 text-purple-600" />;
      default:
        return <Edit3 className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className={cn('w-full max-w-4xl mx-4', className)}
        >
          <Card className="max-h-[90vh] overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Resolve Edit Conflicts</CardTitle>
                  <CardDescription>
                    {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected in the puzzle
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Strategy Selection */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Resolution Strategy</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(strategyLabels).map(([strategy, label]) => (
                    <Button
                      key={strategy}
                      variant={selectedStrategy === strategy ? 'default' : 'outline'}
                      onClick={() => handleStrategyChange(strategy as ConflictResolutionStrategy)}
                      className="h-auto p-3 flex flex-col items-start"
                    >
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {strategyDescriptions[strategy as ConflictResolutionStrategy]}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Conflict Groups */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Conflicts</h3>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {conflictGroups.map((group) => (
                      <Card key={group.id} className="border-orange-200 bg-orange-50/50">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Position {group.affectedRange.start}-{group.affectedRange.end}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {group.operations.length} operations
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatTimestamp(group.timestamp)}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {group.operations.map((operation) => {
                                const participant = getParticipantInfo(operation.userId);
                                const isSelected = selectedOperations.includes(operation.id);
                                
                                return (
                                  <div
                                    key={operation.id}
                                    className={cn(
                                      'flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer',
                                      isSelected 
                                        ? 'bg-blue-50 border-blue-200' 
                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                    )}
                                    onClick={() => handleOperationToggle(operation.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      {getOperationIcon(operation.type)}
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={participant.avatar} />
                                        <AvatarFallback className="text-xs">
                                          {participant.name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                          {participant.name}
                                        </span>
                                        <div className={cn(
                                          'w-2 h-2 rounded-full',
                                          participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                        )} />
                                        <span className="text-xs text-muted-foreground">
                                          {formatTimestamp(operation.timestamp)}
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {operation.type} at position {operation.position}
                                        {operation.content && `: "${operation.content}"`}
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <CheckCircle className="h-4 w-4 text-blue-600" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Custom Resolution */}
              {selectedStrategy === ConflictResolutionStrategy.MANUAL_RESOLUTION && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Custom Resolution</h3>
                  <textarea
                    value={customResolution}
                    onChange={(e) => setCustomResolution(e.target.value)}
                    placeholder="Enter your custom resolution..."
                    className="w-full h-20 p-3 border rounded-lg resize-none"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={isResolving}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleResolve} 
                  disabled={isResolving || (selectedStrategy === ConflictResolutionStrategy.MANUAL_RESOLUTION && !customResolution)}
                  className="min-w-24"
                >
                  {isResolving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <GitMerge className="h-4 w-4 mr-2" />
                      Resolve Conflicts
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact version for smaller conflicts
export function ConflictResolutionModalCompact({
  isOpen,
  onClose,
  conflicts,
  onResolve,
  participants,
  className
}: ConflictResolutionModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy>(
    ConflictResolutionStrategy.LAST_WRITE_WINS
  );

  const handleResolve = async () => {
    const resolution: ConflictResolution = {
      strategy: selectedStrategy,
      selectedOperations: [],
      customResolution: undefined
    };

    await onResolve(resolution);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn('w-full max-w-md mx-4', className)}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-base">Resolve Conflicts</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution Strategy</label>
                <select
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value as ConflictResolutionStrategy)}
                  className="w-full p-2 border rounded-lg"
                >
                  {Object.entries(strategyLabels).map(([strategy, label]) => (
                    <option key={strategy} value={strategy}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={onClose} size="sm">
                  Cancel
                </Button>
                <Button onClick={handleResolve} size="sm">
                  Resolve
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
