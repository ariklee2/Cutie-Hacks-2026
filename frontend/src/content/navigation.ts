/** Header navigation. Only link to pages that exist. */
export const navigation = {
  /** Landing page only, top left: the Instagram glyph (public/instagram-glyph-white.svg). */
  logo: { src: '/instagram-glyph-white.svg', alt: 'Instagram' },
  /** Landing page only, top right: into the upload page. (Not on the snapshot scenes.) */
  getSnapshot: { label: 'Get Snapshot', href: '/upload' },
  /**
   * Landing page only, beside Get Snapshot, when this browser remembers a
   * snapshot that still exists: straight back into it, no re-upload.
   */
  viewSaved: { label: (name: string) => `View @${name}’s snapshot`, href: (name: string) => `/snapshot/${name}/top-creators` },
  /** Upload page only, top left: back to the landing page. */
  goBack: { label: 'Go Back', href: '/' },
};
