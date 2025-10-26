"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('Please enter your email address');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Reset request error:', error);
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Mail className="h-16 w-16 animate-pulse text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-16 w-16 text-red-500" />;
      default:
        return <Mail className="h-16 w-16 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
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
              {status === 'loading' && 'Sending Reset Link...'}
              {status === 'success' && 'Check Your Email'}
              {status === 'error' && 'Reset Failed'}
              {status === 'idle' && 'Reset Password'}
            </CardTitle>
            <CardDescription className="text-center">
              {status === 'idle' && 'Enter your email address and we\'ll send you a link to reset your password.'}
              {status === 'success' && 'We\'ve sent a password reset link to your email address.'}
              {status === 'error' && 'There was an error sending the reset link.'}
              {status === 'loading' && 'Please wait while we process your request...'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {status === 'success' ? (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  If an account with that email exists, you should receive a password reset link shortly.
                </p>
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/signin">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/">
                      Return Home
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
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
                  {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
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
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
