"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  ArrowLeft,
  Loader2,
  Filter,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Activity,
  Download,
  Settings
} from "lucide-react";

interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: string | null;
  after: string | null;
  ip: string | null;
  createdAt: string;
  actor: {
    name: string | null;
    email: string | null;
  };
}

interface AuditResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: "",
    entityType: ""
  });

  const [exportFilters, setExportFilters] = useState({
    format: 'json',
    startDate: '',
    endDate: '',
    action: '',
    entityType: '',
    actorUserId: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.action) params.append("action", filters.action);
      if (filters.entityType) params.append("entityType", filters.entityType);
      
      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      
      const data: AuditResponse = await response.json();
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams();
      params.append('format', exportFilters.format);
      
      if (exportFilters.startDate) params.append('startDate', exportFilters.startDate);
      if (exportFilters.endDate) params.append('endDate', exportFilters.endDate);
      if (exportFilters.action) params.append('action', exportFilters.action);
      if (exportFilters.entityType) params.append('entityType', exportFilters.entityType);
      if (exportFilters.actorUserId) params.append('actorUserId', exportFilters.actorUserId);

      const response = await fetch(`/api/admin/audit/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to export audit logs');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${exportFilters.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (action.includes('UPDATE')) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (action.includes('DELETE')) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  const formatJson = (jsonString: string | null) => {
    if (!jsonString) return null;
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Audit Log</h1>
                <p className="text-sm text-muted-foreground">View system activity and changes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setExportModalOpen(true)}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({...filters, action: e.target.value})}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">All Actions</option>
                  <option value="USER_UPDATE">User Update</option>
                  <option value="PUZZLE_UPDATE">Puzzle Update</option>
                  <option value="PUZZLE_DELETE">Puzzle Delete</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Entity Type</label>
                <select
                  value={filters.entityType}
                  onChange={(e) => setFilters({...filters, entityType: e.target.value})}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">All Entities</option>
                  <option value="User">User</option>
                  <option value="Puzzle">Puzzle</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs ({logs.length})</CardTitle>
            <CardDescription>
              Complete history of system changes and admin actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading audit logs...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchLogs}>Try Again</Button>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
                <p className="text-muted-foreground">
                  No system changes have been recorded yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border rounded-lg"
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpanded(log.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {expandedLog === log.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Activity className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{log.action}</h3>
                            <p className="text-sm text-muted-foreground">
                              {log.entityType} #{log.entityId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                          <Badge variant="outline">
                            {log.entityType}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{log.actor.name || log.actor.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        {log.ip && (
                          <span>IP: {log.ip}</span>
                        )}
                      </div>
                    </div>

                    {expandedLog === log.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t bg-muted/30 p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          {log.before && (
                            <div>
                              <h4 className="font-medium mb-2 text-sm">Before</h4>
                              <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-40">
                                {formatJson(log.before)}
                              </pre>
                            </div>
                          )}
                          {log.after && (
                            <div>
                              <h4 className="font-medium mb-2 text-sm">After</h4>
                              <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-40">
                                {formatJson(log.after)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Audit Logs
            </DialogTitle>
            <DialogDescription>
              Export audit logs in your preferred format with optional filters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFilters.format} onValueChange={(value) => setExportFilters({ ...exportFilters, format: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={exportFilters.startDate}
                  onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={exportFilters.endDate}
                  onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exportAction">Action Filter</Label>
              <Input
                id="exportAction"
                value={exportFilters.action}
                onChange={(e) => setExportFilters({ ...exportFilters, action: e.target.value })}
                placeholder="e.g., USER_CREATED, USER_UPDATED"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exportEntityType">Entity Type Filter</Label>
              <Input
                id="exportEntityType"
                value={exportFilters.entityType}
                onChange={(e) => setExportFilters({ ...exportFilters, entityType: e.target.value })}
                placeholder="e.g., USER, PUZZLE, ROOM"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exportActorUserId">Actor User ID Filter</Label>
              <Input
                id="exportActorUserId"
                value={exportFilters.actorUserId}
                onChange={(e) => setExportFilters({ ...exportFilters, actorUserId: e.target.value })}
                placeholder="Filter by specific admin user ID"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Export Information
                </p>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Exports are limited to 10,000 records. Use date filters to export specific time periods.
                All exports are logged for audit purposes.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Logs
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
