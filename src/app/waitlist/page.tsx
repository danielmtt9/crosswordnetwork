'use client';

import { useState } from 'react';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('Submitting...');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result?.success) {
        setStatus('success');
        setMessage(
          result.message ||
            "Thanks for joining the waitlist! We've sent a confirmation email to your inbox."
        );
        setEmail('');
      } else {
        setStatus('error');
        setMessage(
          result?.message ||
            'Something went wrong while adding you to the waitlist. Please try again.'
        );
      }
    } catch (error) {
      console.error('Waitlist submission error:', error);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-4 py-12 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Join Our Waitlist
        </h1>
        <p className="mb-8 text-center text-gray-600 dark:text-gray-300">
          Be the first to know when Crossword.Network goes live. Enter your email below to get notified.
        </p>
        
        {/* About Section */}
        <div className="mb-8 rounded-lg bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-6 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            What is Crossword.Network?
          </h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Crossword.Network is a calm, single-player crossword platform built for focused solving. Enjoy curated puzzles, thoughtful pacing, and progress tracking in a cozy space.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Solo Focus</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">A distraction-free space designed for deep solving</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Curated Puzzles</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">A growing library of hand-picked crosswords</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Progress Tracking</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track your solving streaks and achievements</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Daily Momentum</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Stay consistent with gentle daily goals</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2 font-semibold text-white hover:from-orange-700 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-gray-800"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
          </button>
        </form>
        {message && status !== 'loading' && (
          <p
            className={`mt-6 text-center text-sm font-medium ${
              status === 'success'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
