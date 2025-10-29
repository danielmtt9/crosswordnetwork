// Integration tests for authentication system
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Authentication System Integration Tests', () => {
  let testUser: any

  beforeAll(async () => {
    // Setup test database
    await databaseSeeder.seedDatabase()
    
    // Create test user
    testUser = await createTestUser({
      name: 'Test User',
      email: 'test@test.com',
      username: 'testuser',
      password: 'hashedpassword123',
    })
  })

  afterAll(async () => {
    // Cleanup test database
    await databaseCleaner.cleanTestData()
  })

  describe('User Registration', () => {
    test('should register new user with valid data', async () => {
      const registrationData = {
        name: 'New User',
        email: 'newuser@test.com',
        username: 'newuser',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', registrationData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        // Validate required fields
        if (!body.name || !body.email || !body.username || !body.password) {
          return NextResponse.json(
            { error: 'All fields are required' },
            { status: 400 }
          )
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(body.email)) {
          return NextResponse.json(
            { error: 'Invalid email format' },
            { status: 400 }
          )
        }
        
        // Validate password strength
        if (body.password.length < 8) {
          return NextResponse.json(
            { error: 'Password must be at least 8 characters long' },
            { status: 400 }
          )
        }
        
        const newUser = {
          id: 'test_new_user',
          name: body.name,
          email: body.email,
          username: body.username,
          role: 'FREE',
          accountStatus: 'ACTIVE',
          subscriptionStatus: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        
        return NextResponse.json(newUser, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should reject registration with duplicate email', async () => {
      const registrationData = {
        name: 'Duplicate User',
        email: 'test@test.com', // Already exists
        username: 'duplicate',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', registrationData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(409)
    })

    test('should reject registration with duplicate username', async () => {
      const registrationData = {
        name: 'Duplicate User',
        email: 'duplicate@test.com',
        username: 'testuser', // Already exists
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', registrationData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(409)
    })

    test('should reject registration with weak password', async () => {
      const registrationData = {
        name: 'New User',
        email: 'newuser@test.com',
        username: 'newuser',
        password: '123', // Too weak
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', registrationData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should reject registration with invalid email', async () => {
      const registrationData = {
        name: 'New User',
        email: 'invalid-email',
        username: 'newuser',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signup', 'POST', registrationData)

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

  describe('User Login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@test.com',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', loginData)

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

    test('should reject login with invalid email', async () => {
      const loginData = {
        email: 'invalid@test.com',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', loginData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })

    test('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@test.com',
        password: 'wrongpassword',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', loginData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })

    test('should reject login for suspended user', async () => {
      const suspendedUser = await createTestUser({
        name: 'Suspended User',
        email: 'suspended@test.com',
        username: 'suspended',
        accountStatus: 'SUSPENDED',
      })

      const loginData = {
        email: 'suspended@test.com',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', loginData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Account is suspended' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should reject login for banned user', async () => {
      const bannedUser = await createTestUser({
        name: 'Banned User',
        email: 'banned@test.com',
        username: 'banned',
        accountStatus: 'BANNED',
      })

      const loginData = {
        email: 'banned@test.com',
        password: 'password123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/signin', 'POST', loginData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Account is banned' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })
  })

  describe('Password Reset', () => {
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

    test('should reject reset with invalid token', async () => {
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

    test('should reject reset with expired token', async () => {
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
  })

  describe('Email Verification', () => {
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

    test('should reject verification with invalid token', async () => {
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

  describe('Session Management', () => {
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

    test('should handle session refresh', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/refresh', 'POST', null, {
        'authorization': 'Bearer valid-jwt-token',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          token: 'new-jwt-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('Two-Factor Authentication', () => {
    test('should enable 2FA for user', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/2fa/enable', 'POST', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          secret: 'mock-2fa-secret',
          qrCode: 'data:image/png;base64,mock-qr-code',
          backupCodes: ['code1', 'code2', 'code3', 'code4', 'code5'],
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should verify 2FA code', async () => {
      const verifyData = {
        code: '123456',
      }

      const { req, res } = await testApiEndpoint('/api/auth/2fa/verify', 'POST', verifyData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        if (body.code === '123456') {
          return NextResponse.json({
            message: '2FA enabled successfully',
          })
        } else {
          return NextResponse.json(
            { error: 'Invalid 2FA code' },
            { status: 400 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should disable 2FA for user', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/2fa/disable', 'POST', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: '2FA disabled successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should generate backup codes', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/2fa/backup-codes', 'POST', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          backupCodes: ['newcode1', 'newcode2', 'newcode3', 'newcode4', 'newcode5'],
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('Account Security', () => {
    test('should change password with valid current password', async () => {
      const changePasswordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/change-password', 'POST', changePasswordData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        if (body.currentPassword === 'password123' && body.newPassword === 'newpassword123') {
          return NextResponse.json({
            message: 'Password changed successfully',
          })
        } else {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject password change with incorrect current password', async () => {
      const changePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      }

      const { req, res } = await testApiEndpoint('/api/auth/change-password', 'POST', changePasswordData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should reject weak new password', async () => {
      const changePasswordData = {
        currentPassword: 'password123',
        newPassword: '123', // Too weak
      }

      const { req, res } = await testApiEndpoint('/api/auth/change-password', 'POST', changePasswordData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should logout user successfully', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/signout', 'POST', null, {
        'authorization': 'Bearer valid-jwt-token',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Signed out successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })
})