"use client";

import { Suspense } from "react";
import HeroSection from "@/components/HeroSection";
import SocialPresenceStrip from "@/components/SocialPresenceStrip";
import StorySection from "@/components/StorySection";
import GamificationPreview from "@/components/GamificationPreview";
import TrialMessaging from "@/components/TrialMessaging";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Skip Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Hero Section */}
      <Suspense fallback={<div className="h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20" />}>
        <HeroSection />
      </Suspense>

      {/* Social Presence Strip */}
      <Suspense fallback={<div className="h-16 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10" />}>
        <SocialPresenceStrip />
      </Suspense>

      {/* Story Sections */}
      <section id="main-content">
        <StorySection />
      </section>

      {/* Gamification Preview */}
      <Suspense fallback={<div className="h-96 bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/10" />}>
        <GamificationPreview />
      </Suspense>

      {/* Trial Messaging */}
      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <TrialMessaging />
        </div>
      </section>
    </div>
  );
}
