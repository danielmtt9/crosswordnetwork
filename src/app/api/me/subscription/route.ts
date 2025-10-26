import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // TODO: Integrate with Stripe for real subscription data
    // const subscription = await stripe.subscriptions.list({
    //   customer: user.stripeCustomerId,
    //   status: 'active',
    //   limit: 1
    // });

    // For now, return mock subscription data based on user status
    const subscription = {
      id: `sub_${user.id}`,
      status: user.subscriptionStatus.toLowerCase(),
      currentPeriodStart: user.createdAt,
      currentPeriodEnd: user.trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancelAtPeriodEnd: false,
      plan: {
        id: user.role === 'PREMIUM' ? 'premium' : 'free',
        name: user.role === 'PREMIUM' ? 'Premium' : 'Free',
        amount: user.role === 'PREMIUM' ? 999 : 0, // in cents
        currency: 'usd',
        interval: 'month'
      },
      // Mock payment method
      paymentMethod: user.role === 'PREMIUM' ? {
        id: 'pm_mock',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025
        }
      } : null
    };

    return NextResponse.json({
      subscription,
      user: {
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt
      }
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, planId } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    // TODO: Integrate with Stripe for real subscription management
    // const user = await prisma.user.findUnique({
    //   where: { id: session.userId },
    //   select: { stripeCustomerId: true }
    // });

    switch (action) {
      case 'create':
        // Create new subscription
        // const subscription = await stripe.subscriptions.create({
        //   customer: user.stripeCustomerId,
        //   items: [{ price: planId }],
        //   payment_behavior: 'default_incomplete',
        //   payment_settings: { save_default_payment_method: 'on_subscription' },
        //   expand: ['latest_invoice.payment_intent']
        // });
        break;

      case 'update':
        // Update existing subscription
        // await stripe.subscriptions.update(subscriptionId, {
        //   items: [{ price: planId }]
        // });
        break;

      case 'cancel':
        // Cancel subscription
        // await stripe.subscriptions.update(subscriptionId, {
        //   cancel_at_period_end: true
        // });
        break;

      case 'reactivate':
        // Reactivate subscription
        // await stripe.subscriptions.update(subscriptionId, {
        //   cancel_at_period_end: false
        // });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error managing subscription:", error);
    return NextResponse.json(
      { error: "Failed to manage subscription" },
      { status: 500 }
    );
  }
}
