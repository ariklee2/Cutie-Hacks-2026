import { Finale } from '@/components/landing/Finale';
import { Hero } from '@/components/landing/Hero';
import { LandingBand } from '@/components/landing/LandingBand';
import { SceneCards } from '@/components/landing/SceneCards';
import { StepTickets } from '@/components/landing/StepTickets';
import { landingContent } from '@/content/landing';

import classes from './page.module.css';

export default function HomePage() {
  const { plot, showing, steps } = landingContent;
  return (
    <>
      <Hero title={landingContent.title} credits={landingContent.credits} />

      <LandingBand id="plot" eyebrow={plot.eyebrow} heading={plot.heading} layout="split">
        <p className={classes.plot}>{plot.text}</p>
      </LandingBand>

      <LandingBand id="showing" eyebrow={showing.eyebrow} heading={showing.heading}>
        <SceneCards scenes={showing.scenes} />
      </LandingBand>

      <LandingBand id="steps" eyebrow={steps.eyebrow} heading={steps.heading}>
        <StepTickets steps={steps.items} />
      </LandingBand>

      <Finale />
    </>
  );
}
