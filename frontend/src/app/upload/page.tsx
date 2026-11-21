import { Container } from '@mantine/core';
import type { Metadata } from 'next';

import { UploadScreen } from '@/components/upload/UploadScreen';
import { uploadContent } from '@/content/upload';

import classes from './page.module.css';

export const metadata: Metadata = {
  title: `${uploadContent.pageTitle} · Insta Snapshot`,
};

/** The upload page: the movie screen (drop zone) on the deep red background. */
export default function UploadPage() {
  return (
    <Container component="section" className={classes.stage}>
      {/* The screen carries the visible instructions; the heading is for
          screen readers and the document outline. */}
      <h1 className={classes.visuallyHidden}>{uploadContent.pageTitle}</h1>
      <UploadScreen />
    </Container>
  );
}
