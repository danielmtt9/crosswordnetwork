"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Verify the token
    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
      } else {
        if (data.error?.includes('expired')) {
          setStatus('expired');
          setMessage('Verification link has expired. Please request a new one.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('An error occurred during verification');
    }
  };

  const resendVerification = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('New verification email sent! Please check your inbox.');
      } else {
        setMessage(data.error || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Resend error:', error);
      setMessage('An error occurred while sending verification email');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
      case 'expired':
        return <XCircle className="h-16 w-16 text-red-500" />;
      default:
        return <Mail className="h-16 w-16 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
      case 'expired':
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
              {status === 'loading' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
              {status === 'expired' && 'Link Expired'}
            </CardTitle>
            <CardDescription className="text-center">
              {message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {status === 'success' && (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  Your email has been successfully verified. You can now access all features of Crossword Network.
                </p>
                <div className="flex flex-col space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/dashboard">
                      Go to Dashboard
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/">
                      Return Home
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {(status === 'error' || status === 'expired') && (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  {status === 'expired' 
                    ? 'Your verification link has expired. Please request a new one.'
                    : 'There was an issue verifying your email. Please try again.'
                  }
                </p>
                
                {status === 'expired' && (
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <Button 
                      onClick={resendVerification}
                      disabled={!email}
                      className="w-full"
                    >
                      Resend Verification Email
                    </Button>
                  </div>
                )}

                <div className="flex flex-col space-y-2">
                  <Button asChild variant="outline" className="w-full">
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
            )}

            {status === 'loading' && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Please wait while we verify your email address...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20 flex items-center justify-center p-4">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <Loader2 className="h-16 w-16 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
