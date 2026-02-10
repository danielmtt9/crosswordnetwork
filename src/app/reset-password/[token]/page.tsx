"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordConfirmPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/reset/confirm?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('valid');
        setEmail(data.email || '');
        setMessage('Token is valid. Please enter your new password.');
      } else {
        setStatus('invalid');
        setMessage(data.error || 'Invalid or expired reset token');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setStatus('invalid');
      setMessage('An error occurred while validating the token');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setMessage('Please fill in all fields');
      setStatus('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setStatus('error');
      return;
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      body: JSON.stringify({ token, password }),
    });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Password reset successfully!');
        
        // Redirect to sign in after 3 seconds
        setTimeout(() => {
          router.push('/signin?message=Password reset successfully. Please sign in with your new password.');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 animate-spin text-blue-500" />;
      case 'valid':
        return <Lock className="h-16 w-16 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'invalid':
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
      default:
        return <Lock className="h-16 w-16 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
      case 'invalid':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Validating Token...';
      case 'valid':
        return 'Set New Password';
      case 'success':
        return 'Password Reset!';
      case 'invalid':
        return 'Invalid Token';
      case 'error':
        return 'Reset Failed';
      default:
        return 'Reset Password';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'loading':
        return 'Please wait while we validate your reset token...';
      case 'valid':
        return 'Enter your new password below.';
      case 'success':
        return 'Your password has been successfully reset. You will be redirected to sign in.';
      case 'invalid':
        return 'This reset link is invalid or has expired. Please request a new one.';
      case 'error':
        return 'There was an error resetting your password. Please try again.';
      default:
        return 'Enter your new password below.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className={`text-2xl font-bold ${getStatusColor()}`}>
              {getStatusTitle()}
            </CardTitle>
            <CardDescription className="text-center">
              {getStatusDescription()}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {status === 'success' ? (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  You will be redirected to the sign-in page in a few seconds.
                </p>
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/signin">
                      Go to Sign In
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/">
                      Return Home
                    </Link>
                  </Button>
                </div>
              </div>
            ) : status === 'invalid' ? (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  This reset link is no longer valid. Please request a new password reset.
                </p>
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/reset-password">
                      Request New Reset Link
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/signin">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </Button>
                </div>
              </div>
            ) : status === 'valid' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {email && (
                  <div className="text-center text-sm text-muted-foreground">
                    Resetting password for: <strong>{email}</strong>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
          required
                      disabled={status === 'loading'}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    disabled={status === 'loading'}
                  />
                </div>

                {message && (
                  <div className={`text-sm text-center ${
                    status === 'success' ? 'text-green-600' : 
                    status === 'error' ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {message}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                </Button>

                <div className="text-center">
                  <Button asChild variant="link" className="text-sm">
                    <Link href="/signin">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </Button>
                </div>
      </form>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {message || 'Please wait while we validate your reset token...'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}