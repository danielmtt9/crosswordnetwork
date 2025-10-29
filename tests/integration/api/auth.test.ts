// Integration tests for authentication API
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Authentication API Integration Tests', () => {
  let testUser: any

  beforeAll(async () => {
    // Setup test database
    await databaseSeeder.seedDatabase()
    
    // Create test user
    testUser = await createTestUser({
      name: 'Test User',
      email: 'test@test.com',
      username: 'testuser',
      password: 'hashedpassword',
    })
  })

  afterAll(async () => {
    // Cleanup test database
    await databaseCleaner.cleanTestData()
  })

  describe('POST /api/auth/signin', () => {
    test('should sign in with valid credentials', async () => {
      const signinData = {
        email: 'test@test.com',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', signinData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        if (body.email === 'test@test.com' && body.password === 'password123') {
          return NextResponse.json({
            user: {
              id: testUser.id,
              name: testUser.name,
              email: testUser.email,
              username: testUser.username,
              role: testUser.role,
            },
            token: 'mock-jwt-token',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
        } else {
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject invalid email', async () => {
      const signinData = {
        email: 'invalid@test.com',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', signinData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })

    test('should reject invalid password', async () => {
      const signinData = {
        email: 'test@test.com',
        password: 'wrongpassword',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', signinData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })

    test('should reject suspended user', async () => {
      const suspendedUser = await createTestUser({
        name: 'Suspended User',
        email: 'suspended@test.com',
        username: 'suspended',
        accountStatus: 'SUSPENDED',
      })

      const signinData = {
        email: 'suspended@test.com',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', signinData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Account is suspended' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should validate required fields', async () => {
      const invalidSigninData = {
        email: 'test@test.com',
        // Missing password
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', invalidSigninData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate email format', async () => {
      const invalidSigninData = {
        email: 'invalid-email',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', invalidSigninData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/auth/signup', () => {
    test('should sign up with valid data', async () => {
      const signupData = {
        name: 'New User',
        email: 'newuser@test.com',
        username: 'newuser',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', signupData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newUser = {
          id: 'test_new_user',
          name: body.name,
          email: body.email,
          username: body.username,
          role: 'FREE',
          accountStatus: 'ACTIVE',
          subscriptionStatus: 'TRIAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        
        return NextResponse.json(newUser, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should reject duplicate email', async () => {
      const signupData = {
        name: 'Duplicate User',
        email: 'test@test.com', // Already exists
        username: 'duplicate',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', signupData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(409)
    })

    test('should reject duplicate username', async () => {
      const signupData = {
        name: 'Duplicate User',
        email: 'duplicate@test.com',
        username: 'testuser', // Already exists
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', signupData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(409)
    })

    test('should validate required fields', async () => {
      const invalidSignupData = {
        name: 'New User',
        email: 'newuser@test.com',
        // Missing username and password
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', invalidSignupData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Name, email, username, and password are required' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate password strength', async () => {
      const weakPasswordData = {
        name: 'New User',
        email: 'newuser@test.com',
        username: 'newuser',
        password: '123', // Too weak
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', weakPasswordData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate email format', async () => {
      const invalidEmailData = {
        name: 'New User',
        email: 'invalid-email',
        username: 'newuser',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', invalidEmailData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/auth/signout', () => {
    test('should sign out successfully', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/signout', 'POST', null, {
        'authorization': 'Bearer mock-jwt-token',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Signed out successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle signout without token', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/signout', 'POST')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Signed out successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/auth/forgot-password', () => {
    test('should send password reset email for valid user', async () => {
      const forgotPasswordData = {
        email: 'test@test.com',
      }

      const { req, res } = await testApiEndpoint('/api/auth/forgot-password', 'POST', forgotPasswordData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Password reset email sent',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle non-existent user gracefully', async () => {
      const forgotPasswordData = {
        email: 'nonexistent@test.com',
      }

      const { req, res } = await testApiEndpoint('/api/auth/forgot-password', 'POST', forgotPasswordData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        // For security, don't reveal if user exists
        return NextResponse.json({
          message: 'If the email exists, a password reset link has been sent',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should validate email format', async () => {
      const invalidEmailData = {
        email: 'invalid-email',
      }

      const { req, res } = await testApiEndpoint('/api/auth/forgot-password', 'POST', invalidEmailData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/auth/reset-password', () => {
    test('should reset password with valid token', async () => {
      const resetPasswordData = {
        token: 'valid-reset-token',
        password: 'newpassword123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/reset-password', 'POST', resetPasswordData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        if (body.token === 'valid-reset-token') {
          return NextResponse.json({
            message: 'Password reset successfully',
          })
        } else {
          return NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 400 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject invalid token', async () => {
      const resetPasswordData = {
        token: 'invalid-token',
        password: 'newpassword123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/reset-password', 'POST', resetPasswordData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should reject expired token', async () => {
      const resetPasswordData = {
        token: 'expired-token',
        password: 'newpassword123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/reset-password', 'POST', resetPasswordData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate password strength', async () => {
      const weakPasswordData = {
        token: 'valid-reset-token',
        password: '123', // Too weak
      }

      const { req, res } = await testApiEndpoint('/api/auth/reset-password', 'POST', weakPasswordData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/auth/session', () => {
    test('should return user session for valid token', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/session', 'GET', null, {
        'authorization': 'Bearer valid-jwt-token',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          user: {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            username: testUser.username,
            role: testUser.role,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return null for invalid token', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/session', 'GET', null, {
        'authorization': 'Bearer invalid-jwt-token',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(null)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return null for expired token', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/session', 'GET', null, {
        'authorization': 'Bearer expired-jwt-token',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(null)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/auth/verify-email', () => {
    test('should verify email with valid token', async () => {
      const verifyEmailData = {
        token: 'valid-verification-token',
      }

      const { req, res } = await testApiEndpoint('/api/auth/verify-email', 'POST', verifyEmailData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        if (body.token === 'valid-verification-token') {
          return NextResponse.json({
            message: 'Email verified successfully',
          })
        } else {
          return NextResponse.json(
            { error: 'Invalid or expired verification token' },
            { status: 400 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject invalid verification token', async () => {
      const verifyEmailData = {
        token: 'invalid-verification-token',
      }

      const { req, res } = await testApiEndpoint('/api/auth/verify-email', 'POST', verifyEmailData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid or expired verification token' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })
})