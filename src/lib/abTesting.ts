import { prisma } from "@/lib/prisma";

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  variants: ABTestVariant[];
  targetAudience: ABTestAudience;
  metrics: ABTestMetrics;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  trafficPercentage: number;
  configuration: Record<string, any>;
  isControl: boolean;
}

export interface ABTestAudience {
  userSegments: string[];
  userRoles: string[];
  userAttributes: Record<string, any>;
  geographicFilters: string[];
  deviceFilters: string[];
  customConditions: Record<string, any>;
}

export interface ABTestMetrics {
  primaryMetric: string;
  secondaryMetrics: string[];
  conversionEvents: string[];
  successCriteria: {
    metric: string;
    threshold: number;
    comparison: 'greater_than' | 'less_than' | 'equal_to';
  }[];
}

export interface ABTestResult {
  testId: string;
  variant: string;
  userId: string;
  assignedAt: Date;
  conversionEvents: ABTestConversion[];
  metrics: Record<string, number>;
}

export interface ABTestConversion {
  event: string;
  timestamp: Date;
  value?: number;
  metadata?: Record<string, any>;
}

/**
 * Create a new A/B test
 */
export async function createABTest(
  name: string,
  description: string,
  variants: ABTestVariant[],
  targetAudience: ABTestAudience,
  metrics: ABTestMetrics,
  createdBy: string
): Promise<ABTest> {
  // Validate variants
  const totalTraffic = variants.reduce((sum, variant) => sum + variant.trafficPercentage, 0);
  if (Math.abs(totalTraffic - 100) > 0.01) {
    throw new Error('Variant traffic percentages must sum to 100%');
  }

  const controlVariants = variants.filter(v => v.isControl);
  if (controlVariants.length !== 1) {
    throw new Error('Exactly one variant must be marked as control');
  }

  const test = await prisma.aBTest.create({
    data: {
      name,
      description,
      status: 'DRAFT',
      variants: variants as any,
      targetAudience: targetAudience as any,
      metrics: metrics as any,
      startDate: null,
      endDate: null,
      createdBy
    }
  });

  return test as ABTest;
}

/**
 * Start an A/B test
 */
export async function startABTest(testId: string, actorUserId: string): Promise<ABTest> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId }
  });

  if (!test) {
    throw new Error('A/B test not found');
  }

  if (test.status !== 'DRAFT') {
    throw new Error('Only draft tests can be started');
  }

  const updatedTest = await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'ACTIVE',
      startDate: new Date()
    }
  });

  // Log the action
  await prisma.auditLog.create({
    data: {
      action: 'AB_TEST_STARTED',
      entityType: 'AB_TEST',
      entityId: testId,
      actorUserId,
      details: {
        testName: test.name,
        startDate: new Date()
      }
    }
  });

  return updatedTest as ABTest;
}

/**
 * Pause an A/B test
 */
export async function pauseABTest(testId: string, actorUserId: string): Promise<ABTest> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId }
  });

  if (!test) {
    throw new Error('A/B test not found');
  }

  if (test.status !== 'ACTIVE') {
    throw new Error('Only active tests can be paused');
  }

  const updatedTest = await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'PAUSED'
    }
  });

  // Log the action
  await prisma.auditLog.create({
    data: {
      action: 'AB_TEST_PAUSED',
      entityType: 'AB_TEST',
      entityId: testId,
      actorUserId,
      details: {
        testName: test.name
      }
    }
  });

  return updatedTest as ABTest;
}

/**
 * Complete an A/B test
 */
export async function completeABTest(testId: string, actorUserId: string): Promise<ABTest> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId }
  });

  if (!test) {
    throw new Error('A/B test not found');
  }

  if (!['ACTIVE', 'PAUSED'].includes(test.status)) {
    throw new Error('Only active or paused tests can be completed');
  }

  const updatedTest = await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'COMPLETED',
      endDate: new Date()
    }
  });

  // Log the action
  await prisma.auditLog.create({
    data: {
      action: 'AB_TEST_COMPLETED',
      entityType: 'AB_TEST',
      entityId: testId,
      actorUserId,
      details: {
        testName: test.name,
        endDate: new Date()
      }
    }
  });

  return updatedTest as ABTest;
}

/**
 * Assign user to A/B test variant
 */
export async function assignUserToVariant(
  testId: string,
  userId: string,
  variantId: string
): Promise<ABTestResult> {
  // Check if user is already assigned
  const existingAssignment = await prisma.aBTestResult.findFirst({
    where: {
      testId,
      userId
    }
  });

  if (existingAssignment) {
    return existingAssignment as ABTestResult;
  }

  // Create new assignment
  const assignment = await prisma.aBTestResult.create({
    data: {
      testId,
      userId,
      variant: variantId,
      assignedAt: new Date(),
      conversionEvents: [],
      metrics: {}
    }
  });

  return assignment as ABTestResult;
}

/**
 * Record conversion event for A/B test
 */
export async function recordABTestConversion(
  testId: string,
  userId: string,
  event: string,
  value?: number,
  metadata?: Record<string, any>
): Promise<void> {
  const assignment = await prisma.aBTestResult.findFirst({
    where: {
      testId,
      userId
    }
  });

  if (!assignment) {
    // User not assigned to test, skip
    return;
  }

  const conversion: ABTestConversion = {
    event,
    timestamp: new Date(),
    value,
    metadata
  };

  const updatedConversions = [...(assignment.conversionEvents as ABTestConversion[]), conversion];

  await prisma.aBTestResult.update({
    where: { id: assignment.id },
    data: {
      conversionEvents: updatedConversions as any
    }
  });
}

/**
 * Get A/B test results
 */
export async function getABTestResults(testId: string): Promise<{
  test: ABTest;
  results: ABTestResult[];
  summary: {
    totalUsers: number;
    variantBreakdown: Record<string, number>;
    conversionRates: Record<string, number>;
    statisticalSignificance: Record<string, number>;
  };
}> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId }
  });

  if (!test) {
    throw new Error('A/B test not found');
  }

  const results = await prisma.aBTestResult.findMany({
    where: { testId }
  });

  // Calculate summary statistics
  const totalUsers = results.length;
  const variantBreakdown: Record<string, number> = {};
  const conversionRates: Record<string, number> = {};
  const statisticalSignificance: Record<string, number> = {};

  // Group by variant
  const variantGroups = results.reduce((groups, result) => {
    const variant = result.variant as string;
    if (!groups[variant]) {
      groups[variant] = [];
    }
    groups[variant].push(result);
    return groups;
  }, {} as Record<string, ABTestResult[]>);

  // Calculate metrics for each variant
  Object.entries(variantGroups).forEach(([variant, variantResults]) => {
    variantBreakdown[variant] = variantResults.length;
    
    // Calculate conversion rate (simplified - using first conversion event)
    const conversions = variantResults.filter(result => 
      (result.conversionEvents as ABTestConversion[]).length > 0
    );
    conversionRates[variant] = variantResults.length > 0 
      ? (conversions.length / variantResults.length) * 100 
      : 0;

    // Calculate statistical significance (simplified)
    statisticalSignificance[variant] = Math.random() * 100; // Placeholder
  });

  return {
    test: test as ABTest,
    results: results as ABTestResult[],
    summary: {
      totalUsers,
      variantBreakdown,
      conversionRates,
      statisticalSignificance
    }
  };
}

/**
 * Get all A/B tests
 */
export async function getAllABTests(): Promise<ABTest[]> {
  const tests = await prisma.aBTest.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return tests as ABTest[];
}

/**
 * Check if user should be included in A/B test
 */
export async function shouldIncludeUserInTest(
  testId: string,
  userId: string,
  userRole?: string,
  userEmail?: string
): Promise<boolean> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId }
  });

  if (!test || test.status !== 'ACTIVE') {
    return false;
  }

  const audience = test.targetAudience as ABTestAudience;

  // Check user role
  if (audience.userRoles.length > 0 && userRole && !audience.userRoles.includes(userRole)) {
    return false;
  }

  // Check user segments (simplified)
  if (audience.userSegments.length > 0) {
    // In a real implementation, you would check user segments
    // For now, we'll include all users
  }

  // Check custom conditions
  if (audience.customConditions && Object.keys(audience.customConditions).length > 0) {
    // In a real implementation, you would evaluate custom conditions
    // For now, we'll include all users
  }

  return true;
}

/**
 * Get user's A/B test assignment
 */
export async function getUserABTestAssignment(
  testId: string,
  userId: string
): Promise<ABTestResult | null> {
  const assignment = await prisma.aBTestResult.findFirst({
    where: {
      testId,
      userId
    }
  });

  return assignment as ABTestResult | null;
}
