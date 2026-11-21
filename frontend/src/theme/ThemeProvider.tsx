'use client';

import type { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';

import { cssVariablesResolver, theme } from './theme';

/**
 * Client-side Mantine provider. Lives in its own 'use client' file because the
 * theme includes a function (cssVariablesResolver), which can't be passed from
 * a Server Component (app/layout.tsx) as a prop.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      forceColorScheme="light"
    >
      {children}
    </MantineProvider>
  );
}
