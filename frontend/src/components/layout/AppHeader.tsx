'use client';

import { Container } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { navigation } from '@/content/navigation';

import classes from './AppHeader.module.css';

/**
 * Site header: one link in a square box that lights up and grows slightly on
 * hover (like Create Snapshot).
 *   - Landing page: "Get Snapshot", at the window's top right, into the upload page.
 *   - Upload page: "Go Back", top left, to the landing page.
 * (A client component only because it reads the current path.)
 */
export function AppHeader() {
  const onUploadPage = usePathname() === navigation.getSnapshot.href;
  const link = onUploadPage ? navigation.goBack : navigation.getSnapshot;

  return (
    <header>
      {/* Landing: full window width, so Get Snapshot sits above the film's
          top-right corner (the film runs edge to edge). Upload: the normal
          content width. */}
      <Container
        component="nav"
        fluid={!onUploadPage}
        className={classes.inner}
        data-align={onUploadPage ? 'start' : 'end'}
        aria-label="Main"
      >
        <Link href={link.href} className={classes.link}>
          {link.label}
        </Link>
      </Container>
    </header>
  );
}
