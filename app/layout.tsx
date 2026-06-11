import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexys · Blockly Studio',
  description: '라즈베리파이 기반 산업·방산 계측 모듈을 코딩 없이 30% 커스터마이즈하는 비주얼 IDE',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before React paints, to avoid dark→light flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full bg-bg text-text font-sans antialiased overflow-hidden">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--surface))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--text))',
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: '13px',
              borderRadius: '0px',
            },
          }}
        />
      </body>
    </html>
  );
}
