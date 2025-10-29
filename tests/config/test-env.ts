// Test environment configuration
import { config } from 'dotenv'
import { join } from 'path'

// Load test environment variables
config({ path: join(process.cwd(), '.env.test') })

// Test environment configuration
export const testConfig = {
  // Database configuration
  database: {
    url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    shadowUrl: process.env.SHADOW_DATABASE_URL || process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.TEST_DB_MAX_CONNECTIONS || '10'),
    connectionTimeout: parseInt(process.env.TEST_DB_CONNECTION_TIMEOUT || '30000'),
    queryTimeout: parseInt(process.env.TEST_DB_QUERY_TIMEOUT || '30000'),
  },

  // Test configuration
  test: {
    timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
    retries: parseInt(process.env.TEST_RETRIES || '3'),
    parallel: process.env.TEST_PARALLEL === 'true',
    verbose: process.env.TEST_VERBOSE === 'true',
    coverage: process.env.TEST_COVERAGE === 'true',
    watch: process.env.TEST_WATCH === 'true',
  },

  // API configuration
  api: {
    baseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.TEST_API_TIMEOUT || '10000'),
    retries: parseInt(process.env.TEST_API_RETRIES || '3'),
    rateLimit: parseInt(process.env.TEST_API_RATE_LIMIT || '100'),
  },

  // Authentication configuration
  auth: {
    secret: process.env.TEST_AUTH_SECRET || 'test-secret-key',
    expiresIn: process.env.TEST_AUTH_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.TEST_AUTH_REFRESH_EXPIRES_IN || '7d',
    algorithm: process.env.TEST_AUTH_ALGORITHM || 'HS256',
  },

  // Email configuration
  email: {
    provider: process.env.TEST_EMAIL_PROVIDER || 'resend',
    apiKey: process.env.TEST_EMAIL_API_KEY || 'test-api-key',
    from: process.env.TEST_EMAIL_FROM || 'test@crossword.network',
    templates: {
      welcome: process.env.TEST_EMAIL_WELCOME_TEMPLATE || 'welcome',
      reset: process.env.TEST_EMAIL_RESET_TEMPLATE || 'reset',
      invite: process.env.TEST_EMAIL_INVITE_TEMPLATE || 'invite',
    },
  },

  // WebSocket configuration
  websocket: {
    url: process.env.TEST_WEBSOCKET_URL || 'ws://localhost:3000',
    timeout: parseInt(process.env.TEST_WEBSOCKET_TIMEOUT || '5000'),
    retries: parseInt(process.env.TEST_WEBSOCKET_RETRIES || '3'),
    heartbeat: parseInt(process.env.TEST_WEBSOCKET_HEARTBEAT || '30000'),
  },

  // Performance testing configuration
  performance: {
    loadTest: {
      users: parseInt(process.env.TEST_LOAD_USERS || '100'),
      duration: parseInt(process.env.TEST_LOAD_DURATION || '30000'),
      rampUp: parseInt(process.env.TEST_LOAD_RAMP_UP || '10000'),
    },
    stressTest: {
      users: parseInt(process.env.TEST_STRESS_USERS || '500'),
      duration: parseInt(process.env.TEST_STRESS_DURATION || '60000'),
      rampUp: parseInt(process.env.TEST_STRESS_RAMP_UP || '30000'),
    },
    spikeTest: {
      users: parseInt(process.env.TEST_SPIKE_USERS || '1000'),
      duration: parseInt(process.env.TEST_SPIKE_DURATION || '10000'),
      rampUp: parseInt(process.env.TEST_SPIKE_RAMP_UP || '1000'),
    },
  },

  // Security testing configuration
  security: {
    sqlInjection: {
      enabled: process.env.TEST_SECURITY_SQL_INJECTION === 'true',
      payloads: process.env.TEST_SECURITY_SQL_PAYLOADS?.split(',') || [],
    },
    xss: {
      enabled: process.env.TEST_SECURITY_XSS === 'true',
      payloads: process.env.TEST_SECURITY_XSS_PAYLOADS?.split(',') || [],
    },
    csrf: {
      enabled: process.env.TEST_SECURITY_CSRF === 'true',
      tokenName: process.env.TEST_SECURITY_CSRF_TOKEN_NAME || 'csrf-token',
    },
    rateLimit: {
      enabled: process.env.TEST_SECURITY_RATE_LIMIT === 'true',
      maxRequests: parseInt(process.env.TEST_SECURITY_RATE_LIMIT_MAX || '100'),
      windowMs: parseInt(process.env.TEST_SECURITY_RATE_LIMIT_WINDOW || '60000'),
    },
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.TEST_MONITORING_ENABLED === 'true',
    metrics: {
      enabled: process.env.TEST_MONITORING_METRICS === 'true',
      interval: parseInt(process.env.TEST_MONITORING_METRICS_INTERVAL || '1000'),
    },
    logging: {
      enabled: process.env.TEST_MONITORING_LOGGING === 'true',
      level: process.env.TEST_MONITORING_LOGGING_LEVEL || 'info',
    },
    alerts: {
      enabled: process.env.TEST_MONITORING_ALERTS === 'true',
      webhook: process.env.TEST_MONITORING_ALERTS_WEBHOOK,
    },
  },

  // Data generation configuration
  dataGeneration: {
    users: {
      count: parseInt(process.env.TEST_DATA_USERS_COUNT || '1000'),
      roles: process.env.TEST_DATA_USERS_ROLES?.split(',') || ['FREE', 'PREMIUM', 'ADMIN'],
    },
    puzzles: {
      count: parseInt(process.env.TEST_DATA_PUZZLES_COUNT || '100'),
      tiers: process.env.TEST_DATA_PUZZLES_TIERS?.split(',') || ['free', 'premium'],
      difficulties: process.env.TEST_DATA_PUZZLES_DIFFICULTIES?.split(',') || ['easy', 'medium', 'hard'],
    },
    rooms: {
      count: parseInt(process.env.TEST_DATA_ROOMS_COUNT || '50'),
      types: process.env.TEST_DATA_ROOMS_TYPES?.split(',') || ['public', 'private'],
    },
  },

  // Cleanup configuration
  cleanup: {
    enabled: process.env.TEST_CLEANUP_ENABLED === 'true',
    afterEach: process.env.TEST_CLEANUP_AFTER_EACH === 'true',
    afterAll: process.env.TEST_CLEANUP_AFTER_ALL === 'true',
    patterns: process.env.TEST_CLEANUP_PATTERNS?.split(',') || ['test_%', '%@test.com'],
  },

  // Reporting configuration
  reporting: {
    enabled: process.env.TEST_REPORTING_ENABLED === 'true',
    format: process.env.TEST_REPORTING_FORMAT || 'json',
    output: process.env.TEST_REPORTING_OUTPUT || './test-results',
    includeCoverage: process.env.TEST_REPORTING_INCLUDE_COVERAGE === 'true',
    includePerformance: process.env.TEST_REPORTING_INCLUDE_PERFORMANCE === 'true',
    includeSecurity: process.env.TEST_REPORTING_INCLUDE_SECURITY === 'true',
  },
}

// Test environment validation
export const validateTestEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Validate database configuration
  if (!testConfig.database.url) {
    errors.push('TEST_DATABASE_URL is required')
  }

  // Validate API configuration
  if (!testConfig.api.baseUrl) {
    errors.push('TEST_API_BASE_URL is required')
  }

  // Validate authentication configuration
  if (!testConfig.auth.secret) {
    errors.push('TEST_AUTH_SECRET is required')
  }

  // Validate email configuration
  if (!testConfig.email.apiKey) {
    errors.push('TEST_EMAIL_API_KEY is required')
  }

  // Validate WebSocket configuration
  if (!testConfig.websocket.url) {
    errors.push('TEST_WEBSOCKET_URL is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Test environment setup
export const setupTestEnvironment = async (): Promise<void> => {
  console.log('Setting up test environment...')

  // Validate environment
  const validation = validateTestEnvironment()
  if (!validation.valid) {
    throw new Error(`Test environment validation failed: ${validation.errors.join(', ')}`)
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NEXTAUTH_URL = testConfig.api.baseUrl
  process.env.NEXTAUTH_SECRET = testConfig.auth.secret

  console.log('Test environment setup completed')
}

// Test environment teardown
export const teardownTestEnvironment = async (): Promise<void> => {
  console.log('Tearing down test environment...')

  // Clean up any test-specific resources
  // This would typically include:
  // - Closing database connections
  // - Stopping test servers
  // - Cleaning up temporary files
  // - Resetting environment variables

  console.log('Test environment teardown completed')
}

// Export configuration
export default testConfig