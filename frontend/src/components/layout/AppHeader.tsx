'use client';

import { Container } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { navigation } from '@/content/navigation';
import { useSavedSnapshot } from '@/lib/useSavedSnapshot';

import classes from './AppHeader.module.css';

/**
 * Site header: its links are small cinema tickets in poster type (notched
 * ends) that straighten up and grow slightly on hover: Get Snapshot gold,
 * View @name's snapshot paper, Go Back ink (on the white upload page).
 *   - Landing page: a "Go to Instagram ↗" ticket (paper, new tab) in the
 *     window's top-left corner;
 *     "Get Snapshot", at the window's top right, into the upload page;
 *     beside it, "View @name's snapshot" when this browser remembers a
 *     snapshot (lib/savedSnapshot.ts) that still exists on the server.
 *   - Upload page: "Go Back", in the window's top-left corner, to the landing page.
 *   - Snapshot scenes (/snapshot/…): a "Go Home" ticket (paper) in the
 *     top-left corner, back to the landing page; the scenes have their own
 *     Back / Next.
 * (A client component only because it reads the current path.)
 */
export function AppHeader() {
  const pathname = usePathname();
  const onUploadPage = pathname === navigation.getSnapshot.href;
  const onLanding = pathname === '/';
  const saved = useSavedSnapshot(onLanding);

  if (pathname.startsWith('/snapshot/')) {
    return (
      <header>
        <Container component="nav" fluid className={classes.inner} data-align="start" aria-label="Main">
          <Link href={navigation.goHome.href} className={classes.link} data-variant="home">
            {navigation.goHome.label}
          </Link>
        </Container>
      </header>
    );
  }

  const link = onUploadPage ? navigation.goBack : navigation.getSnapshot;

  return (
    <header>
      {/* Full window width on both pages: Get Snapshot sits in the window's
          top-right corner (above the film, which runs edge to edge), Go Back
          in its top-left corner. */}
      <Container
        component="nav"
        fluid
        className={classes.inner}
        data-align={onUploadPage ? 'start' : 'end'}
        aria-label="Main"
      >
        {onLanding && (
          <a
            href={navigation.instagram.href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.link}
            data-variant="instagram"
          >
            {navigation.instagram.label} <span aria-hidden="true">↗</span>
            <span className="visually-hidden"> ({navigation.instagram.newTab})</span>
          </a>
        )}
        {saved && (
          <Link href={navigation.viewSaved.href(saved)} className={classes.link} data-variant="secondary">
            {navigation.viewSaved.label(saved)}
          </Link>
        )}
        <Link href={link.href} className={classes.link} data-variant={onUploadPage ? 'back' : 'primary'}>
          {link.label}
        </Link>
      </Container>
    </header>
  );
}
