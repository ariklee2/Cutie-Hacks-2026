/** Copy for the upload page. */
export const uploadContent = {
  pageTitle: 'Add your Instagram files',
  screen: {
    /** The one line on the screen while waiting for files. */
    prompt: 'Click or Drag',
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
    /** Shown under the toolbar if some features failed but the rest saved. */
    partial: (sections: string[]) => `These parts of the snapshot couldn't be built: ${sections.join(', ')}.`,
  },
  /** Screen-reader suffix on a file name that's been added (it also turns green). */
  fileAdded: 'added',
  /** A recognised file that couldn't be read. */
  /** A file with the right name whose contents aren't that export. `reason` starts "it …". */
  problem: (fileName: string, reason: string) => `${fileName} can't be used: ${reason}`,
  /** A file whose name isn't one of the three. */
  notAFile: (name: string) => `${name} isn't one of the files Insta Snapshot needs.`,
  /** Shown after any problem, listing what's still missing. */
  stillNeeded: (fileNames: string[]) =>
    `Still needed: ${
      fileNames.length === 1
        ? fileNames[0]
        : `${fileNames.slice(0, -1).join(', ')} and ${fileNames[fileNames.length - 1]}`
    }.`,
  /** Under the toolbar: reopen a snapshot made earlier, without uploading again. */
  openSaved: {
    prompt: 'Already made one? Open it by name, no upload needed.',
    nameLabel: 'Name of a saved snapshot',
    namePlaceholder: 'Name',
    submit: 'Open Snapshot',
    checking: 'Opening…',
    notFound: (name: string) => `There’s no saved snapshot called “${name}” yet. Upload your files above to make one.`,
    invalid: 'Names are letters, numbers, - or _.',
    failed: 'Couldn’t check for that snapshot. Is the server running?',
  },
  form: {
    /** Read by screen readers; the field shows the placeholder instead. */
    nameLabel: 'Name',
    namePlaceholder: 'Name',
    submit: 'Create Snapshot',
    submitting: 'Creating…',
  },
};
