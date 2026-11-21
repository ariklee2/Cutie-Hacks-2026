import { Container, SimpleGrid } from '@mantine/core';

import type { LandingSection } from '@/content/landing';

import { PlaceholderBlock } from './PlaceholderBlock';
import classes from './AboutSection.module.css';

/** The landing copy blocks, below the film, in white on the deep red. */
export function AboutSection({ sections }: { sections: LandingSection[] }) {
  return (
    <Container component="section" className={classes.about} aria-label="About">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
        {sections.map((section) => (
          <PlaceholderBlock key={section.label} label={section.label} content={section.content} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
