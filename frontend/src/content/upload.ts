/** Copy for the upload page. */
export const uploadContent = {
  pageTitle: 'Add your Instagram files',
  /** Slate above the heading. */
  eyebrow: 'Box office',
  /** Fine print under the drop zone: who can see a snapshot, and what's kept. */
  privacy: (uploadsDeleted: boolean) =>
    `Your snapshot is saved on this server under the name you choose, and anyone who knows that name can open it. ${
      uploadsDeleted
        ? 'The files you upload are deleted as soon as your snapshot is built.'
        : 'The files you upload are kept on this server.'
    }`,
  screen: {
    /** The one line on the screen while waiting for files. */
    prompt: 'Click or Drag',
    /** Under the prompt: what to drop. */
    promptFiles: 'Your Instagram download (.zip)',
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
  /** Instagram's whole download (.zip): while it's opened, and what can go wrong. */
  unzipping: 'Finding your files in the download…',
  zipMissing: (zipName: string, fileNames: string[]) =>
    `${zipName} doesn't contain ${fileNames.join(', ')}. Make sure your download includes your activity and ads information.`,
  zipHtml: (zipName: string) =>
    `${zipName} is in HTML format. Download your information again with Format set to JSON.`,
  zipUnreadable: (zipName: string) => `${zipName} couldn't be opened as a zip file.`,
  /** Shown after any problem, listing what's still missing. */
  stillNeeded: (fileNames: string[]) =>
    `Still needed: ${
      fileNames.length === 1
        ? fileNames[0]
        : `${fileNames.slice(0, -1).join(', ')} and ${fileNames[fileNames.length - 1]}`
    }.`,
  /** Under the toolbar: reopen a snapshot made earlier, without uploading again. */
  form: {
    /** Read by screen readers; the field shows the placeholder instead. */
    nameLabel: 'Name',
    namePlaceholder: 'Name',
    submit: 'Create Snapshot',
    submitting: 'Creating…',
  },
};
