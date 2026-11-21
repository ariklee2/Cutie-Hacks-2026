import '@mantine/core/styles.css';
import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';

import { IntroClapper } from '@/components/cinema/IntroClapper';
import { introSeenScript } from '@/components/cinema/introSession';
import { AppHeader } from '@/components/layout/AppHeader';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { instrumentSans } from './fonts';

export const metadata: Metadata = {
  title: 'Insta Snapshot',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={instrumentSans.variable} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
        <script dangerouslySetInnerHTML={{ __html: introSeenScript }} />
      </head>
      <body>
        <ThemeProvider>
          <IntroClapper />
          <AppHeader />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
