import type { Metadata } from 'next';
import Link from 'next/link';
import { GoogleAnalytics } from '@next/third-parties/google'; // <-- 1. Import GA
import ClientCanvasWrapper from '../components/ClientCanvasWrapper';
import TopNavInfo from '../components/TopNavInfo';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prem Jena | Product Strategist & NPM',
  description: 'Operating at the intersection of data, operations, and product.',
  metadataBase: new URL('https://premjena.com'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FAF7F2] text-slate-800 antialiased selection:bg-teal-200 selection:text-teal-900 overflow-x-hidden min-h-screen relative">
        
        <ClientCanvasWrapper />

        {/* Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/50 bg-[#FAF7F2]/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="font-bold text-sm text-slate-900 hover:text-teal-600 transition-colors shrink-0">
              ~/prem-jena
            </Link>
            
            <TopNavInfo />

            <nav className="flex gap-6 text-xs font-mono font-medium text-slate-500 overflow-x-auto no-scrollbar whitespace-nowrap pl-4">
              <Link href="/apps" className="hover:text-slate-900 transition-colors">Builds (/apps)</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Drafts (/blog)</Link>
              <Link href="/cv" className="hover:text-slate-900 transition-colors">Ledger (/cv)</Link>
            </nav>
          </div>
        </header>

        <div className="pt-16 w-full">
          {children}
        </div>

      </body>

      {/* 2. Add your Measurement ID here */}
      <GoogleAnalytics gaId="G-YOUR-MEASUREMENT-ID" />
    </html>
  );
}