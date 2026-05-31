import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FeedShift — Reclaim Your YouTube Feed',
  description:
    'FeedShift classifies every YouTube video against your personal interest profile, hides irrelevant content, and programmatically retrains your algorithm.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
