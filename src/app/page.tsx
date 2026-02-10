import HeroSection from '@/components/HeroSection';
import StorySection from '@/components/StorySection';
import GamificationPreview from '@/components/GamificationPreview';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      
      <StorySection />
      
      <GamificationPreview />
    </div>
  );
}
