'use client';

import { Container } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { navigation } from '@/content/navigation';

import classes from './AppHeader.module.css';

/**
 * Site header: one plain white text link.
 *   - Landing page: "Get Snapshot", top right, into the upload page.
 *   - Upload page: "Go Back", top left, to the landing page.
 * (A client component only because it reads the current path.)
 */
export function AppHeader() {
  const onUploadPage = usePathname() === navigation.getSnapshot.href;
  const link = onUploadPage ? navigation.goBack : navigation.getSnapshot;

  return (
    <header>
      <Container
        component="nav"
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
