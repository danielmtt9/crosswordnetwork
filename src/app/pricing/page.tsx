"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Star, 
  Zap, 
  Users, 
  Puzzle, 
  Lightbulb,
  Crown,
  ArrowRight,
  Sparkles
} from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out crossword puzzles",
    features: [
      "Access to free puzzles",
      "5 hints per puzzle",
      "Progress saving",
      "Basic multiplayer (spectator mode)",
      "1-week premium trial"
    ],
    limitations: [
      "Limited puzzle library",
      "No multiplayer hosting",
      "No unlimited hints"
    ],
    cta: "Start Free Trial",
    ctaLink: "/signup",
    popular: false,
    icon: Puzzle
  },
  {
    name: "Premium",
    price: "$2",
    period: "month",
    description: "Full access to all puzzles and features",
    features: [
      "All puzzles (free + premium)",
      "Unlimited hints",
      "Multiplayer hosting & editing",
      "Progress sync across devices",
      "Priority support",
      "Early access to new puzzles"
    ],
    limitations: [],
    cta: "Start Premium",
    ctaLink: "/signup?plan=premium",
    popular: true,
    icon: Crown,
    savings: null
  },
  {
    name: "Premium Yearly",
    price: "$20",
    period: "year",
    description: "Best value for crossword enthusiasts",
    features: [
      "All puzzles (free + premium)",
      "Unlimited hints",
      "Multiplayer hosting & editing",
      "Progress sync across devices",
      "Priority support",
      "Early access to new puzzles",
      "Exclusive yearly puzzles"
    ],
    limitations: [],
    cta: "Start Yearly",
    ctaLink: "/signup?plan=yearly",
    popular: false,
    icon: Star,
    savings: "Save $4/year"
  }
];

const faqs = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes! You can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period."
  },
  {
    question: "What happens after my free trial?",
    answer: "After your 1-week free trial, you'll automatically be moved to the free plan. You can upgrade to premium anytime to continue enjoying all features."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 30-day money-back guarantee for all premium subscriptions. If you're not satisfied, contact us for a full refund."
  },
  {
    question: "Can I change my plan later?",
    answer: "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences."
  },
  {
    question: "What's included in multiplayer?",
    answer: "Premium users can host multiplayer rooms, invite friends, and collaborate in real-time. Free users can join rooms as spectators."
  },
  {
    question: "How many puzzles are available?",
    answer: "We have over 200 puzzles and add new ones weekly. Premium users get access to our entire library plus early access to new releases."
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-16">
          <motion.div 
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="w-fit mx-auto">
              <Sparkles className="mr-2 h-4 w-4" />
              Simple, transparent pricing
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Choose your crossword adventure
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start with our free plan and upgrade when you're ready for unlimited puzzles and multiplayer fun.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Star className="mr-1 h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <Card className={`h-full relative overflow-hidden ${
                  plan.popular 
                    ? 'ring-2 ring-primary shadow-lg scale-105' 
                    : 'ring-1 ring-border'
                }`}>
                  <CardHeader className="text-center pb-8">
                    <div className="flex justify-center mb-4">
                      <div className={`p-3 rounded-full ${
                        plan.popular 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <plan.icon className="h-6 w-6" />
                      </div>
                    </div>
                    
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-base">
                      {plan.description}
                    </CardDescription>
                    
                    <div className="mt-4">
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground ml-1">/{plan.period}</span>
                      </div>
                      {plan.savings && (
                        <Badge variant="secondary" className="mt-2">
                          {plan.savings}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <Button 
                      asChild 
                      className="w-full" 
                      size="lg"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      <Link href={plan.ctaLink}>
                        {plan.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        What's included:
                      </h4>
                      <ul className="space-y-2">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {plan.limitations.length > 0 && (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Limitations:
                        </h4>
                        <ul className="space-y-2">
                          {plan.limitations.map((limitation, limitationIndex) => (
                            <li key={limitationIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-muted-foreground mt-0.5">•</span>
                              <span>{limitation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div 
            className="text-center space-y-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Feature comparison
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See exactly what you get with each plan
            </p>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold">Features</th>
                  <th className="text-center py-4 px-4 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 font-semibold">Premium</th>
                  <th className="text-center py-4 px-4 font-semibold">Premium Yearly</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b">
                  <td className="py-4 px-4">Free puzzles</td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Premium puzzles</td>
                  <td className="text-center py-4 px-4">
                    <span className="text-muted-foreground">—</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Hints per puzzle</td>
                  <td className="text-center py-4 px-4">5</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Multiplayer hosting</td>
                  <td className="text-center py-4 px-4">
                    <span className="text-muted-foreground">—</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Progress sync</td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4">Priority support</td>
                  <td className="text-center py-4 px-4">
                    <span className="text-muted-foreground">—</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div 
            className="text-center space-y-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Frequently asked questions
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about our pricing
            </p>
          </motion.div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary/60">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to start solving?
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Join thousands of crossword enthusiasts. Start your free trial today, no credit card required.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-6">
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-primary">
                <Link href="/puzzles">
                  Browse Puzzles
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
