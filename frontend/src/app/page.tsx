import { AboutSection } from '@/components/landing/AboutSection';
import { Hero } from '@/components/landing/Hero';
import { landingContent } from '@/content/landing';

export default function HomePage() {
  return (
    <>
      <Hero title={landingContent.title} credit={landingContent.credit} inspiration={landingContent.inspiration} />
      <AboutSection sections={landingContent.sections} />
    </>
  );
}
