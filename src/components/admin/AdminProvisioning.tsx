"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  UserPlus, 
  UserMinus, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  AlertTriangle,
  Users,
  FileText,
  Trash2,
  Archive,
  Eye
} from 'lucide-react';

interface AdminRequest {
  id: string;
  requestedBy: string;
  requestedFor: {
    email: string;
    name: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
    department?: string;
    justification: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROVISIONED' | 'DEPROVISIONED';
  createdAt: string;
  expiresAt?: string;
}

interface AdminStatistics {
  totalAdmins: number;
  activeAdmins: number;
  pendingRequests: number;
  recentProvisionings: number;
  recentDeprovisionings: number;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  PROVISIONED: 'bg-green-100 text-green-800',
  DEPROVISIONED: 'bg-gray-100 text-gray-800'
};

export function AdminProvisioning() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deprovisionReason, setDeprovisionReason] = useState('');
  const [dataRetention, setDataRetention] = useState<'DELETE' | 'ANONYMIZE' | 'ARCHIVE'>('ANONYMIZE');

  // Request form state
  const [requestForm, setRequestForm] = useState({
    email: '',
    name: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
    department: '',
    justification: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRequests(),
        fetchStatistics()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    const response = await fetch('/api/admin/provisioning/requests');
    if (!response.ok) throw new Error('Failed to fetch requests');
    const data = await response.json();
    setRequests(data.requests);
  };

  const fetchStatistics = async () => {
    const response = await fetch('/api/admin/provisioning/statistics');
    if (!response.ok) throw new Error('Failed to fetch statistics');
    const data = await response.json();
    setStatistics(data.statistics);
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/provisioning/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessLevel: 'FULL_ACCESS',
          permissions: []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve request');
      }
      
      setSuccess('Admin request approved successfully');
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/admin/provisioning/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject request');
      }
      
      setSuccess('Admin request rejected');
      setRejectionReason('');
      setSelectedRequest(null);
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  const handleProvisionAccount = async (requestId: string) => {
    try {
      setError(null);
      const response = await fetch('/api/admin/provisioning/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to provision account');
      }
      
      const data = await response.json();
      setSuccess(`Admin account provisioned successfully for ${data.user.email}`);
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision account');
    }
  };

  const handleDeprovisionAccount = async (userId: string) => {
    if (!deprovisionReason.trim()) {
      setError('Please provide a deprovisioning reason');
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/admin/provisioning/deprovision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reason: deprovisionReason,
          dataRetention
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deprovision account');
      }
      
      setSuccess('Admin account deprovisioned successfully');
      setDeprovisionReason('');
      setSelectedRequest(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deprovision account');
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.email || !requestForm.name || !requestForm.justification) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/admin/provisioning/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedFor: requestForm })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }
      
      setSuccess('Admin access request submitted successfully');
      setRequestForm({
        email: '',
        name: '',
        role: 'ADMIN',
        department: '',
        justification: ''
      });
      setShowRequestForm(false);
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    }
  };

  const isExpired = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Admin Provisioning</h2>
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Admin Provisioning
          </h2>
          <p className="text-gray-600">Manage admin account lifecycle</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowRequestForm(!showRequestForm)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Request Access
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Admins</p>
                  <p className="text-2xl font-bold">{statistics.totalAdmins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Admins</p>
                  <p className="text-2xl font-bold">{statistics.activeAdmins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold">{statistics.pendingRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserPlus className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Recent Provisions</p>
                  <p className="text-2xl font-bold">{statistics.recentProvisionings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserMinus className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Recent Deprovisions</p>
                  <p className="text-2xl font-bold">{statistics.recentDeprovisionings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Form */}
      {showRequestForm && (
        <Card>
          <CardHeader>
            <CardTitle>Request Admin Access</CardTitle>
            <CardDescription>Submit a request for admin account provisioning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={requestForm.email}
                  onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={requestForm.name}
                  onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={requestForm.role}
                  onChange={(e) => setRequestForm({ ...requestForm, role: e.target.value as 'ADMIN' | 'SUPER_ADMIN' })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={requestForm.department}
                  onChange={(e) => setRequestForm({ ...requestForm, department: e.target.value })}
                  placeholder="IT Department"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="justification">Justification *</Label>
              <textarea
                id="justification"
                value={requestForm.justification}
                onChange={(e) => setRequestForm({ ...requestForm, justification: e.target.value })}
                placeholder="Explain why admin access is needed..."
                className="w-full p-2 border rounded-md h-24"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSubmitRequest}>
                <FileText className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
              <Button variant="outline" onClick={() => setShowRequestForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Admin Requests</CardTitle>
          <CardDescription>Review and manage admin access requests</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
              <p className="text-gray-600">No admin access requests are currently pending.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{request.requestedFor.name}</h4>
                      <Badge className={statusColors[request.status]}>
                        {request.status}
                      </Badge>
                      {isExpired(request.expiresAt) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Email: {request.requestedFor.email}</p>
                      <p>Role: {request.requestedFor.role}</p>
                      {request.requestedFor.department && (
                        <p>Department: {request.requestedFor.department}</p>
                      )}
                      <p>Justification: {request.requestedFor.justification}</p>
                      <p>Requested: {new Date(request.createdAt).toLocaleString()}</p>
                      {request.expiresAt && (
                        <p>Expires: {new Date(request.expiresAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === 'PENDING' && !isExpired(request.expiresAt) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveRequest(request.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        onClick={() => handleProvisionAccount(request.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Provision
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      {selectedRequest && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Reject Admin Request</CardTitle>
            <CardDescription>Provide a reason for rejecting this admin access request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                className="w-full p-2 border rounded-md h-24"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => handleRejectRequest(selectedRequest.id)}
                disabled={!rejectionReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Request
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
