import '@mantine/core/styles.css';
import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';

import { AppHeader } from '@/components/layout/AppHeader';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { anton, instrumentSans } from './fonts';

export const metadata: Metadata = {
  title: 'Insta Snapshot',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${anton.variable}`} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>
      <body>
        <ThemeProvider>
          <AppHeader />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
