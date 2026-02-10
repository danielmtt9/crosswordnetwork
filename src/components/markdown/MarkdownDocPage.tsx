import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  variant?: 'outline' | 'default' | 'ghost';
};

export type MarkdownDocPageProps = {
  title: string;
  markdownRelativePath: string; // relative to repo root, e.g. "content/legal/privacy.md"
  lastUpdated?: string;
  backHref?: string;
  backLabel?: string;
  nav?: NavItem[];
};

export function MarkdownDocPage(props: MarkdownDocPageProps) {
  const markdownPath = path.join(process.cwd(), props.markdownRelativePath);
  const markdownContent = fs.readFileSync(markdownPath, 'utf8');
  const htmlContent = marked(markdownContent);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={props.backHref || '/'}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {props.backLabel || 'Back'}
              </Link>
            </Button>
            <h1 className="text-xl font-bold" data-testid="doc-title">
              {props.title}
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{props.title}</CardTitle>
                  {props.lastUpdated && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <Calendar className="h-4 w-4" />
                      Last updated: {props.lastUpdated}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="prose prose-gray dark:prose-invert max-w-none">
              <div className="markdown-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </CardContent>
          </Card>

          {props.nav && props.nav.length > 0 && (
            <div className="flex flex-wrap justify-between gap-2">
              {props.nav.map((item) => (
                <Button
                  key={item.href}
                  variant={item.variant || 'outline'}
                  asChild
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

