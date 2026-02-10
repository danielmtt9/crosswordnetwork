import { MarkdownDocPage } from '@/components/markdown/MarkdownDocPage';

export default function CookiesPage() {
  return (
    <MarkdownDocPage
      title="Cookie Policy"
      markdownRelativePath="content/legal/cookies.md"
      lastUpdated="February 9, 2026"
      backHref="/"
      backLabel="Back to Home"
      nav={[
        { href: '/privacy', label: 'Privacy Policy', variant: 'outline' },
        { href: '/terms', label: 'Terms of Service', variant: 'outline' },
        { href: '/help', label: 'Help Center', variant: 'outline' },
      ]}
    />
  );
}

