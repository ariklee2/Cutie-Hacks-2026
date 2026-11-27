/** Header navigation. Only link to pages that exist. */
export const navigation = {
  /** Landing page only, top left: a ticket out to Instagram (opens in a new tab). */
  instagram: { label: 'Go to Instagram', href: 'https://www.instagram.com/', newTab: 'opens in a new tab' },
  /** Landing page only, top right: into the upload page. (Not on the snapshot scenes.) */
  getSnapshot: { label: 'Get Snapshot', href: '/upload' },
  /**
   * Landing page only, beside Get Snapshot, when this browser remembers a
   * snapshot that still exists: straight back into it, no re-upload.
   */
  viewSaved: { label: (name: string) => `View @${name}’s snapshot`, href: (name: string) => `/snapshot/${name}/top-creators` },
  /** Snapshot scenes, top left: back to the landing page. */
  goHome: { label: 'Go Home', href: '/' },
  /** Upload page only, top left: back to the landing page. */
  goBack: { label: 'Go Back', href: '/' },
};
