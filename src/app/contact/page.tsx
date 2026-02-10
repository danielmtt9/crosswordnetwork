'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

type FormState = {
  email: string;
  subject: string;
  message: string;
  company: string; // honeypot
  startedAt: number;
};

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    email: '',
    subject: '',
    message: '',
    company: '',
    startedAt: Date.now(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset startedAt on mount so bot timing checks are meaningful.
  useEffect(() => {
    setForm((f) => ({ ...f, startedAt: Date.now() }));
  }, []);

  const supportEmail = 'support@crossword.network';
  const mailto = useMemo(() => `mailto:${supportEmail}`, [supportEmail]);

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError('Please fill in email, subject, and message.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          subject: form.subject,
          message: form.message,
          company: form.company,
          startedAt: form.startedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to send message. Please try again.');
        return;
      }
      setSuccess('Message sent. We will reply as soon as we can.');
      setForm({
        email: form.email,
        subject: '',
        message: '',
        company: '',
        startedAt: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-xl font-bold">Contact Us</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Get help from the crossword.network team</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    For fastest help, include the puzzle ID and what device/browser you are using.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                Prefer email? Write us at{' '}
                <a className="underline underline-offset-4" href={mailto}>
                  {supportEmail}
                </a>
                .
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {success}
                </div>
              )}

              {/* Honeypot (hidden visually) */}
              <div className="hidden">
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your email</label>
                <Input
                  data-testid="contact-email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  data-testid="contact-subject"
                  placeholder="What can we help with?"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  data-testid="contact-message"
                  placeholder="Tell us what happened, and include the puzzle ID if relevant."
                  rows={7}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" asChild>
                  <Link href="/help">Help Center</Link>
                </Button>
                <Button onClick={onSubmit} disabled={submitting} data-testid="contact-submit">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send message'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

