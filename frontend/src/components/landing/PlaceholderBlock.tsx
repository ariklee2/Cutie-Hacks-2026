import { Text } from '@mantine/core';

import classes from './PlaceholderBlock.module.css';

interface PlaceholderBlockProps {
  /** Short label for the slot, e.g. "Description". */
  label: string;
  /** The real copy. When null, the block renders as an unfilled placeholder. */
  content: string | null;
}

/**
 * A labeled content slot. Shows its copy when provided; otherwise a dashed,
 * clearly unfinished placeholder so nothing on the page pretends to be real.
 */
export function PlaceholderBlock({ label, content }: PlaceholderBlockProps) {
  const isEmpty = content === null;

  return (
    <section className={classes.block} data-empty={isEmpty || undefined} aria-label={label}>
      <Text className={classes.label}>{label}</Text>
      {isEmpty ? (
        <Text className={classes.status}>Placeholder — to be written</Text>
      ) : (
        <Text className={classes.body}>{content}</Text>
      )}
    </section>
  );
}
