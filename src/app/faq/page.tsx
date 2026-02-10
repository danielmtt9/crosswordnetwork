import { MarkdownDocPage } from '@/components/markdown/MarkdownDocPage';

export default function FAQPage() {
  return (
    <MarkdownDocPage
      title="FAQ"
      markdownRelativePath="content/help/faq.md"
      lastUpdated="February 9, 2026"
      backHref="/help"
      backLabel="Back to Help"
      nav={[
        { href: '/help', label: 'Help Center', variant: 'outline' },
        { href: '/contact', label: 'Contact Us', variant: 'outline' },
        { href: '/terms', label: 'Terms of Service', variant: 'outline' },
      ]}
    />
  );
}

