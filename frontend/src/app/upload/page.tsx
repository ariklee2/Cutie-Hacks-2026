import { Container } from '@mantine/core';
import type { Metadata } from 'next';

import { Slate } from '@/components/cinema/Slate';
import { UploadScreen } from '@/components/upload/UploadScreen';
import { uploadContent } from '@/content/upload';
import { keepUploads } from '@/lib/server/deployPolicy';

import classes from './page.module.css';

// Rendered per request: the privacy note reads KEEP_UPLOADS at run time, not build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${uploadContent.pageTitle} · Insta Snapshot`,
};

/**
 * The upload page: a near-square drop zone on a white ("light") page,
 * centered in the window under its heading. (A saved snapshot is reopened
 * from the landing page's header, not here.)
 */
export default function UploadPage() {
  return (
    // data-surface="light": white page, black text (see globals.css).
    <Container component="section" className={classes.stage} data-surface="light">
      {/* Heading, drop zone, toolbar and note: one column, centered both ways. */}
      <div className={classes.main}>
        <div className={classes.head}>
          <Slate label={uploadContent.eyebrow} />
          <h1 className={classes.heading}>{uploadContent.pageTitle}</h1>
        </div>
        <UploadScreen />
        <p className={classes.privacy}>{uploadContent.privacy(!keepUploads)}</p>
      </div>
    </Container>
  );
}
