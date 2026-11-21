import { AboutSection } from '@/components/landing/AboutSection';
import { Hero } from '@/components/landing/Hero';
import { landingContent } from '@/content/landing';

export default function HomePage() {
  return (
    <>
      <Hero title={landingContent.title} />
      <AboutSection sections={landingContent.sections} />
    </>
  );
}
