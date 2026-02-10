"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  User,
  Clock,
  Ban,
  Trash2,
} from "lucide-react";

interface BulkUserOperationsProps {
  selectedUsers: string[];
  onSuccess: () => void;
  isSuperAdmin: boolean;
}

interface BulkOperationResult {
  userId: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface BulkOperationResponse {
  success: boolean;
  results: BulkOperationResult[];
  errors: BulkOperationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export function BulkUserOperations({ selectedUsers, onSuccess, isSuperAdmin }: BulkUserOperationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkOperationResponse | null>(null);
  
  // Form data for different actions
  const [formData, setFormData] = useState({
    role: "",
    reason: "",
    expiresAt: ""
  });

  const handleSubmit = async () => {
    if (!action) {
      setError("Please select an action");
      return;
    }

    if (selectedUsers.length === 0) {
      setError("No users selected");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const requestBody: any = {
        action,
        userIds: selectedUsers
      };

      // Add action-specific data
      switch (action) {
        case 'updateRole':
          if (!formData.role) {
            setError("Role is required");
            setLoading(false);
            return;
          }
          requestBody.data = { role: formData.role };
          break;

        case 'suspend':
          if (!formData.reason) {
            setError("Suspension reason is required");
            setLoading(false);
            return;
          }
          requestBody.data = { 
            reason: formData.reason,
            ...(formData.expiresAt && { expiresAt: formData.expiresAt })
          };
          break;

        case 'unsuspend':
          // No additional data needed
          break;

        case 'delete':
          // No additional data needed, but requires confirmation
          if (!confirm(`Are you sure you want to permanently delete ${selectedUsers.length} users? This action cannot be undone.`)) {
            setLoading(false);
            return;
          }
          break;
      }

      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to perform bulk operation');
      }

      setResults(data);
      
      // If all operations were successful, close modal and refresh
      if (data.errors.length === 0) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk operation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setAction("");
    setFormData({
      role: "",
      reason: "",
      expiresAt: ""
    });
    setError(null);
    setResults(null);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'updateRole':
        return <Shield className="h-4 w-4" />;
      case 'suspend':
        return <Clock className="h-4 w-4" />;
      case 'unsuspend':
        return <CheckCircle className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'updateRole':
        return 'text-blue-600';
      case 'suspend':
        return 'text-yellow-600';
      case 'unsuspend':
        return 'text-green-600';
      case 'delete':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={selectedUsers.length === 0}
        variant="outline"
        size="sm"
      >
        <Users className="h-4 w-4 mr-2" />
        Bulk Operations ({selectedUsers.length})
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk User Operations
            </DialogTitle>
            <DialogDescription>
              Perform operations on {selectedUsers.length} selected users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updateRole">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Update Role
                    </div>
                  </SelectItem>
                  <SelectItem value="suspend">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Suspend Users
                    </div>
                  </SelectItem>
                  <SelectItem value="unsuspend">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Unsuspend Users
                    </div>
                  </SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="delete">
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Users
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Action-specific form fields */}
            {action === 'updateRole' && (
              <div className="space-y-2">
                <Label>New Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Player</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {action === 'suspend' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Suspension Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for suspension..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
                <Label htmlFor="expiresAt">Expires At (optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
            )}

            {/* Results display */}
            {results && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {results.summary.successful} successful
                  </Badge>
                  {results.summary.failed > 0 && (
                    <Badge variant="destructive">
                      {results.summary.failed} failed
                    </Badge>
                  )}
                </div>

                {results.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-600">Errors:</p>
                    {results.errors.slice(0, 3).map((error, index) => (
                      <p key={index} className="text-xs text-red-500">
                        User {error.userId}: {error.error}
                      </p>
                    ))}
                    {results.errors.length > 3 && (
                      <p className="text-xs text-red-500">
                        ... and {results.errors.length - 3} more errors
                      </p>
                    )}
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

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !action}
              className={action === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {getActionIcon(action)}
                  <span className="ml-2">
                    {action === 'updateRole' ? 'Update Roles' :
                     action === 'suspend' ? 'Suspend Users' :
                     action === 'unsuspend' ? 'Unsuspend Users' :
                     action === 'delete' ? 'Delete Users' :
                     'Execute'}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
