import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Codaloo - Design, Build, and Deploy Systems with AI',
  description: 'Codaloo helps you design, build, and deploy system architectures with AI assistance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/codaloo-favicon.svg" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
        {children}
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
