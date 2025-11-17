import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Health Checker',
  description: 'Automated health check monitoring for kahani.xyz',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

