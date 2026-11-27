import { Container } from '@mantine/core';
import type { Metadata } from 'next';

import { Slate } from '@/components/cinema/Slate';
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
      {/* The drop zone fills the middle under a poster-type heading; "Already made one?" sits at the bottom. */}
      <div className={classes.main}>
        <div className={classes.head}>
          <Slate label={uploadContent.eyebrow} />
          <h1 className={classes.heading}>{uploadContent.pageTitle}</h1>
        </div>
        <UploadScreen />
      </div>
      <OpenSavedSnapshot />
    </Container>
  );
}
