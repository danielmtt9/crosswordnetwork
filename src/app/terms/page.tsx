import { MarkdownDocPage } from '@/components/markdown/MarkdownDocPage';

export default function TermsPage() {
  return (
    <MarkdownDocPage
      title="Terms of Service"
      markdownRelativePath="content/legal/terms.md"
      lastUpdated="February 9, 2026"
      backHref="/"
      backLabel="Back to Home"
      nav={[
        { href: '/privacy', label: 'Privacy Policy', variant: 'outline' },
        { href: '/cookies', label: 'Cookie Policy', variant: 'outline' },
        { href: '/contact', label: 'Contact Us', variant: 'outline' },
      ]}
    />
  );
}

