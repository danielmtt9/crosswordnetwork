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
  Smartphone, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Copy,
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface TwoFactorStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  backupCodesCount: number;
}

interface TwoFactorSetup {
  qrCodeUrl: string;
  backupCodes: string[];
}

export function TwoFactorAuth({ userId }: { userId: string }) {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/2fa/status?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch 2FA status');
      
      const data = await response.json();
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch 2FA status');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to setup 2FA');
      }
      
      const data = await response.json();
      setSetup(data.setup);
      setShowBackupCodes(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup 2FA');
    }
  };

  const handleVerification = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: verificationToken })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify 2FA');
      }
      
      setSuccess('2FA has been successfully enabled!');
      setSetup(null);
      setVerificationToken('');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify 2FA');
    }
  };

  const handleDisable = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password: disablePassword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disable 2FA');
      }
      
      setSuccess('2FA has been successfully disabled!');
      setDisablePassword('');
      setShowDisableForm(false);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    }
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate backup codes');
      }
      
      const data = await response.json();
      setSetup({ qrCodeUrl: '', backupCodes: data.backupCodes });
      setShowBackupCodes(true);
      setSuccess('Backup codes have been regenerated!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate backup codes');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const downloadBackupCodes = () => {
    if (!setup?.backupCodes) return;
    
    const content = `Crossword Network Admin - 2FA Backup Codes\n\n${setup.backupCodes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}\n\nKeep these codes in a secure location. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2fa-backup-codes-${userId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading 2FA status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Secure your admin account with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {status && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">2FA Status</h3>
                  <Badge variant={status.enabled ? "default" : "secondary"}>
                    {status.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {status.enabled 
                    ? `Backup codes available: ${status.backupCodesCount}`
                    : 'Two-factor authentication is not enabled'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {status.enabled ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRegenerateBackupCodes}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Codes
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowDisableForm(!showDisableForm)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Disable 2FA
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSetup}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </Button>
                )}
              </div>
            </div>
          )}

          {showDisableForm && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Disable Two-Factor Authentication</CardTitle>
                <CardDescription>
                  This will remove 2FA protection from this admin account. Please confirm your password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="disable-password">Confirm Password</Label>
                  <Input
                    id="disable-password"
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDisable}
                    disabled={!disablePassword}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Disable 2FA
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDisableForm(false);
                      setDisablePassword('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {setup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-6 w-6" />
              Setup Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Follow these steps to enable 2FA on your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Step 1: Install an Authenticator App</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Download and install an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator on your mobile device.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Step 2: Scan QR Code</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Open your authenticator app and scan this QR code:
                </p>
                <div className="flex justify-center p-4 bg-white border rounded-lg">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setup.qrCodeUrl)}`}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Step 3: Enter Verification Code</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="w-32"
                  />
                  <Button
                    onClick={handleVerification}
                    disabled={verificationToken.length !== 6}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showBackupCodes && setup?.backupCodes && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Key className="h-6 w-6" />
              Backup Codes
            </CardTitle>
            <CardDescription>
              Save these backup codes in a secure location. Each code can only be used once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                These backup codes are only shown once. Save them in a secure location.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
              {setup.backupCodes.map((code, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <code className="font-mono text-sm">{code}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(code)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={downloadBackupCodes}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Codes
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBackupCodes(false)}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Codes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Security Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Never share your authenticator app or backup codes with anyone</li>
            <li>• Keep backup codes in a secure, offline location</li>
            <li>• Use a dedicated device for your authenticator app when possible</li>
            <li>• Regularly check your 2FA settings and regenerate backup codes if needed</li>
            <li>• If you lose access to your authenticator, use backup codes to regain access</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
