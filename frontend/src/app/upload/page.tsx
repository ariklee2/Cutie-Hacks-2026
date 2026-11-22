import { Container } from '@mantine/core';
import type { Metadata } from 'next';

import { OpenSavedSnapshot } from '@/components/upload/OpenSavedSnapshot';
import { UploadScreen } from '@/components/upload/UploadScreen';
import { uploadContent } from '@/content/upload';

import classes from './page.module.css';

export const metadata: Metadata = {
  title: `${uploadContent.pageTitle} · Insta Snapshot`,
};

/** The upload page: the drop zone on a white ("light") page, then a way to reopen a saved snapshot by name. */
export default function UploadPage() {
  return (
    // data-surface="light": white page, black text (see globals.css).
    <Container component="section" className={classes.stage} data-surface="light">
      {/* The screen carries the visible instructions; the heading is for
          screen readers and the document outline. */}
      <h1 className={classes.visuallyHidden}>{uploadContent.pageTitle}</h1>
      {/* The drop zone fills the middle; "Already made one?" sits at the bottom. */}
      <div className={classes.main}>
        <UploadScreen />
      </div>
      <OpenSavedSnapshot />
    </Container>
  );
}
