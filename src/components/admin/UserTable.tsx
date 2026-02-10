"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  User,
  Mail,
  Calendar,
  Activity,
  Puzzle,
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

interface UserRecord {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    progress: number;
    hostedRooms: number;
    notifications: number;
  };
}

interface UserTableProps {
  users: UserRecord[];
  onUpdateUser: (userId: string, updates: any) => Promise<void>;
  onDeleteUser: (userId: string, userName: string) => Promise<void>;
  isSuperAdmin: boolean;
  loading?: boolean;
}

const roleColors = {
  FREE: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function UserTable({ users, onUpdateUser, onDeleteUser, isSuperAdmin, loading = false }: UserTableProps) {
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "",
  });

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const handleEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      role: user.role,
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

    if (Object.keys(updates).length > 0) {
      await onUpdateUser(editingUser.id, updates);
    }

    setEditingUser(null);
  };

  const handleQuickRoleChange = async (userId: string, newRole: string) => {
    await onUpdateUser(userId, { role: newRole });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-10 gap-4 p-4 border rounded-lg animate-pulse">
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
        <div className="grid grid-cols-10 gap-4 p-4 bg-muted/50 rounded-lg font-medium text-sm">
          <div className="col-span-3">User</div>
          <div className="col-span-2">Role</div>
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
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="grid grid-cols-10 gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            {/* User Info */}
            <div className="col-span-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{user.name || "Unnamed User"}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Role */}
            <div className="col-span-2">
              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role as keyof typeof roleColors] || roleColors.FREE}`}>
                {getRoleIcon(user.role)}
                {user.role === "FREE" ? "Player" : user.role}
              </div>
              {isSuperAdmin && (
                <div className="mt-1">
                  <Select value={user.role} onValueChange={(value) => handleQuickRoleChange(user.id, value)}>
                    <SelectTrigger className="h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Player</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Activity */}
            <div className="col-span-2">
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-1">
                  <Puzzle className="h-3 w-3 text-muted-foreground" />
                  {user._count.progress} puzzles
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  {user._count.notifications} alerts
                </div>
              </div>
            </div>

            {/* Joined */}
            <div className="col-span-2">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(user.createdAt)}
              </div>
            </div>

            {/* Actions */}
            <div className="col-span-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteUser(user.id, user.name || user.email)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Player</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
