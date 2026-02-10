import { MarkdownDocPage } from '@/components/markdown/MarkdownDocPage';

export default function PrivacyPage() {
  return (
    <MarkdownDocPage
      title="Privacy Policy"
      markdownRelativePath="content/legal/privacy.md"
      lastUpdated="February 9, 2026"
      backHref="/"
      backLabel="Back to Home"
      nav={[
        { href: '/terms', label: 'Terms of Service', variant: 'outline' },
        { href: '/cookies', label: 'Cookie Policy', variant: 'outline' },
        { href: '/contact', label: 'Contact Us', variant: 'outline' },
      ]}
    />
  );
}

