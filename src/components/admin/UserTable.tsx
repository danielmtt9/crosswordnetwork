"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Crown,
  User,
  Mail,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    progress: number;
    hostedRooms: number;
    notifications: number;
  };
}

interface UserTableProps {
  users: User[];
  onUpdateUser: (userId: string, updates: any) => Promise<void>;
  onDeleteUser: (userId: string, userName: string) => Promise<void>;
  isSuperAdmin: boolean;
  loading?: boolean;
}

const roleColors = {
  FREE: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  PREMIUM: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const statusColors = {
  TRIAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  INACTIVE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function UserTable({ users, onUpdateUser, onDeleteUser, isSuperAdmin, loading = false }: UserTableProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    subscriptionStatus: '',
    trialEndsAt: ''
  });

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-4 w-4" />;
      case 'PREMIUM':
        return <Crown className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'TRIAL':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'INACTIVE':
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt ? new Date(user.trialEndsAt).toISOString().split('T')[0] : ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    const updates: any = {};
    
    if (editForm.name !== editingUser.name) {
      updates.name = editForm.name;
    }
    if (editForm.role !== editingUser.role) {
      updates.role = editForm.role;
    }
    if (editForm.subscriptionStatus !== editingUser.subscriptionStatus) {
      updates.subscriptionStatus = editForm.subscriptionStatus;
    }
    if (editForm.trialEndsAt !== (editingUser.trialEndsAt ? new Date(editingUser.trialEndsAt).toISOString().split('T')[0] : '')) {
      updates.trialEndsAt = editForm.trialEndsAt ? new Date(editForm.trialEndsAt) : null;
    }

    if (Object.keys(updates).length > 0) {
      await onUpdateUser(editingUser.id, updates);
    }

    setEditingUser(null);
  };

  const handleQuickRoleChange = async (userId: string, newRole: string) => {
    await onUpdateUser(userId, { role: newRole });
  };

  const handleQuickStatusChange = async (userId: string, newStatus: string) => {
    await onUpdateUser(userId, { subscriptionStatus: newStatus });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 p-4 border rounded-lg animate-pulse">
            <div className="col-span-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
            <div className="col-span-2">
              <div className="h-6 w-20 bg-muted rounded" />
            </div>
            <div className="col-span-2">
              <div className="space-y-1">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </div>
            <div className="col-span-2">
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="col-span-1">
              <div className="h-8 w-8 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 rounded-lg font-medium text-sm">
          <div className="col-span-3">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Activity</div>
          <div className="col-span-2">Joined</div>
          <div className="col-span-1">Actions</div>
        </div>

        {/* Users List */}
        {users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.05 }}
            className="grid grid-cols-12 gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            {/* User Info */}
            <div className="col-span-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {getRoleIcon(user.role)}
                </div>
                <div>
                  <p className="font-medium">{user.name || 'Unnamed User'}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Role */}
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                  {user.role}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleQuickRoleChange(user.id, 'FREE')}>
                      <User className="h-4 w-4 mr-2" />
                      Free
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickRoleChange(user.id, 'PREMIUM')}>
                      <Crown className="h-4 w-4 mr-2" />
                      Premium
                    </DropdownMenuItem>
                    {isSuperAdmin && (
                      <DropdownMenuItem onClick={() => handleQuickRoleChange(user.id, 'ADMIN')}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Status */}
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[user.subscriptionStatus as keyof typeof statusColors]}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(user.subscriptionStatus)}
                    {user.subscriptionStatus}
                  </div>
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleQuickStatusChange(user.id, 'TRIAL')}>
                      Trial
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickStatusChange(user.id, 'ACTIVE')}>
                      Active
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickStatusChange(user.id, 'INACTIVE')}>
                      Inactive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickStatusChange(user.id, 'CANCELLED')}>
                      Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {user.trialEndsAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Trial until {formatDate(user.trialEndsAt)}
                </p>
              )}
            </div>

            {/* Activity */}
            <div className="col-span-2">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>Puzzles: {user._count.progress}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Rooms: {user._count.hostedRooms}</span>
                </div>
                <p className="text-muted-foreground">
                  Last activity: {formatDate(user.updatedAt)}
                </p>
              </div>
            </div>

            {/* Joined */}
            <div className="col-span-2">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(user.createdAt)}</span>
                </div>
                <p className="text-muted-foreground">
                  {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="col-span-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteUser(user.id, user.name || user.email)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="User name"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                  {isSuperAdmin && <SelectItem value="ADMIN">Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subscription Status</Label>
              <Select value={editForm.subscriptionStatus} onValueChange={(value) => setEditForm({ ...editForm, subscriptionStatus: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trialEndsAt">Trial Ends At</Label>
              <Input
                id="trialEndsAt"
                type="date"
                value={editForm.trialEndsAt}
                onChange={(e) => setEditForm({ ...editForm, trialEndsAt: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
