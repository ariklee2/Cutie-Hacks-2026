/** Copy for the upload page. */
export const uploadContent = {
  pageTitle: 'Add your Instagram files',
  screen: {
    title: 'From your Instagram data export add:',
    hint: 'Click or drag them in',
    dragging: 'Drop to add',
    complete: 'All three files are in',
    completeNote: 'Name your snapshot below, then create it.',
    saving: 'Saving and processing…',
    savingNote: 'Saving your files to data/, then running the transform and every feature.',
    done: 'Snapshot created',
    doneNote: (reels: number | null, name: string) =>
      reels === null
        ? `Saved to data/${name}_snapshot.json.`
        : `Processed ${reels.toLocaleString()} reels and saved data/${name}_snapshot.json.`,
    /** Shown under the counter if some features failed but the rest saved. */
    partial: (sections: string[]) => `These parts of the snapshot couldn't be built: ${sections.join(', ')}.`,
  },
  /** Counter under the screen, to the right of the file names. */
  counter: (added: number, total: number) => `${added} of ${total} files added`,
  /** Screen-reader suffix on a file name that's been added (it also turns green). */
  fileAdded: 'added',
  /** A recognised file that couldn't be read. */
  problem: (fileName: string, reason: string) => `${fileName}: ${reason}`,
  notAFile: (name: string) =>
    `${name} isn't one of the three files. Use liked_posts.json, saved_posts.json and videos_watched.json.`,
  form: {
    nameLabel: 'Name',
    namePlaceholder: 'e.g. justin',
    nameHint: 'Letters, numbers, - and _. Files are saved as data/<name>_….json; an existing name is replaced.',
    submit: 'Create Snapshot',
    submitting: 'Creating…',
  },
};
