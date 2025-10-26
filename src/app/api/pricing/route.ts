import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    // TODO: Replace with database query when pricing table exists
    // const plans = await prisma.pricingPlan.findMany({
    //   where: { isActive: true },
    //   orderBy: { price: 'asc' }
    // });

    // For now, return static pricing data
    const plans = [
      {
        id: "free",
        name: "Free",
        description: "Perfect for casual crossword enthusiasts",
        price: 0,
        currency: "USD",
        interval: "month",
        features: [
          "5 puzzles per day",
          "Basic hints (5 per puzzle)",
          "Community leaderboards",
          "Mobile app access",
          "Email support"
        ],
        limitations: [
          "Limited puzzle selection",
          "No multiplayer rooms",
          "Basic statistics"
        ],
        isPopular: false,
        isActive: true
      },
      {
        id: "premium",
        name: "Premium",
        description: "For serious crossword solvers who want unlimited access",
        price: 9.99,
        currency: "USD",
        interval: "month",
        features: [
          "Unlimited puzzles",
          "Unlimited hints",
          "Multiplayer rooms",
          "Advanced statistics",
          "Priority support",
          "Early access to new puzzles",
          "Custom themes",
          "Export progress"
        ],
        limitations: [],
        isPopular: true,
        isActive: true
      },
      {
        id: "annual",
        name: "Premium Annual",
        description: "Best value for dedicated crossword fans",
        price: 99.99,
        currency: "USD",
        interval: "year",
        features: [
          "Everything in Premium",
          "2 months free",
          "Exclusive annual puzzles",
          "Priority feature requests"
        ],
        limitations: [],
        isPopular: false,
        isActive: true,
        savings: "17%"
      }
    ];

    const features = [
      {
        name: "Unlimited Puzzles",
        description: "Access to our entire library of crossword puzzles",
        icon: "puzzle"
      },
      {
        name: "Smart Hints",
        description: "Get intelligent hints that adapt to your skill level",
        icon: "lightbulb"
      },
      {
        name: "Multiplayer Rooms",
        description: "Compete with friends in real-time crossword battles",
        icon: "users"
      },
      {
        name: "Progress Tracking",
        description: "Detailed statistics and achievement tracking",
        icon: "chart"
      },
      {
        name: "Mobile App",
        description: "Play on any device with our responsive design",
        icon: "smartphone"
      },
      {
        name: "Community",
        description: "Join our vibrant community of crossword enthusiasts",
        icon: "message-circle"
      }
    ];

    const faqs = [
      {
        question: "Can I cancel my subscription anytime?",
        answer: "Yes, you can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period."
      },
      {
        question: "Do you offer student discounts?",
        answer: "Yes, we offer a 50% discount for students with valid .edu email addresses. Contact support for verification."
      },
      {
        question: "Is there a free trial?",
        answer: "Yes, all new users get a 7-day free trial of Premium features. No credit card required to start."
      },
      {
        question: "Can I switch between plans?",
        answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards, PayPal, and Apple Pay. All payments are processed securely through Stripe."
      },
      {
        question: "Do you offer refunds?",
        answer: "We offer a 30-day money-back guarantee. If you're not satisfied, contact support for a full refund."
      }
    ];

    return NextResponse.json({
      plans,
      features,
      faqs,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}
