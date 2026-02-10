import { MarkdownDocPage } from '@/components/markdown/MarkdownDocPage';

export default function HelpPage() {
  return (
    <MarkdownDocPage
      title="Help Center"
      markdownRelativePath="content/help/help-center.md"
      lastUpdated="February 9, 2026"
      backHref="/"
      backLabel="Back to Home"
      nav={[
        { href: '/faq', label: 'FAQ', variant: 'outline' },
        { href: '/contact', label: 'Contact Us', variant: 'outline' },
        { href: '/privacy', label: 'Privacy Policy', variant: 'outline' },
      ]}
    />
  );
}

