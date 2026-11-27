'use client';

import { Container } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { navigation } from '@/content/navigation';
import { snapshotExists } from '@/lib/api/snapshot';
import { forgetSnapshot, savedSnapshotName } from '@/lib/savedSnapshot';

import classes from './AppHeader.module.css';

/**
 * Site header: its links are small cinema tickets in poster type (notched
 * ends) that straighten up and grow slightly on hover: Get Snapshot gold,
 * View @name's snapshot paper, Go Back ink (on the white upload page).
 *   - Landing page: the Instagram glyph in the window's top-left corner;
 *     "Get Snapshot", at the window's top right, into the upload page;
 *     beside it, "View @name's snapshot" when this browser remembers a
 *     snapshot (lib/savedSnapshot.ts) that still exists on the server.
 *   - Upload page: "Go Back", in the window's top-left corner, to the landing page.
 *   - Snapshot scenes (/snapshot/…): no link — the files are already in, and
 *     the scenes have their own Back / Next. The empty header keeps its
 *     height so the scenes' full-screen sizing stays the same.
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
        <div className={classes.inner} />
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
          // eslint-disable-next-line @next/next/no-img-element -- a tiny static SVG; next/image adds nothing here
          <img src={navigation.logo.src} alt={navigation.logo.alt} className={classes.logo} width={32} height={32} />
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

/**
 * The snapshot this browser remembers, once the server confirms it still
 * exists (a stale name — deleted or renamed data — is forgotten). Only
 * checked when `enabled`.
 */
function useSavedSnapshot(enabled: boolean): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const remembered = savedSnapshotName();
    if (!remembered) return;
    let cancelled = false;
    snapshotExists(remembered)
      .then((exists) => {
        if (cancelled) return;
        if (exists) setName(remembered);
        else forgetSnapshot();
      })
      .catch(() => {}); // Offline or server error: just don't offer it.
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? name : null;
}
