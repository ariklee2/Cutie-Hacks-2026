import { Container } from '@mantine/core';
import type { CSSProperties } from 'react';

import type { LandingSection } from '@/content/landing';

import classes from './AboutSection.module.css';

/**
 * The landing copy below the film: each section is its own full-width band, a
 * large heading on the left and the text on the right. Each band is one shade
 * lighter red than the one above (--snapshot-color-band-1, -2, …).
 */
export function AboutSection({ sections }: { sections: LandingSection[] }) {
  return (
    <>
      {sections.map((section, i) => (
        <section
          key={section.label}
          className={classes.band}
          style={{ '--band-color': `var(--snapshot-color-band-${i + 1})` } as CSSProperties}
          aria-labelledby={`about-${i}`}
        >
          <Container className={classes.inner}>
            <h2 id={`about-${i}`} className={classes.heading}>
              {section.label}
            </h2>
            {section.content === null ? (
              <p className={classes.placeholder}>Placeholder — to be written</p>
            ) : typeof section.content === 'string' ? (
              <p className={classes.text}>{section.content}</p>
            ) : (
              <ul className={classes.list}>
                {section.content.map((item) => (
                  <li key={item.name} className={classes.item}>
                    <strong className={classes.itemName}>{item.name}</strong> — {item.detail}
                  </li>
                ))}
              </ul>
            )}
          </Container>
        </section>
      ))}
    </>
  );
}
