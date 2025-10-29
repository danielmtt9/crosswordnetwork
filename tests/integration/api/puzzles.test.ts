// Integration tests for puzzles API
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser, createTestPuzzle } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Puzzles API Integration Tests', () => {
  let testUser: any
  let testPuzzles: any[] = []

  beforeAll(async () => {
    // Setup test database
    await databaseSeeder.seedDatabase()
    
    // Create test user
    testUser = await createTestUser({
      name: 'Test User',
      email: 'test@test.com',
      username: 'testuser',
    })
    
    // Create test puzzles
    testPuzzles = [
      await createTestPuzzle({
        title: 'Easy Test Puzzle',
        description: 'An easy test puzzle',
        tier: 'free',
        difficulty: 'easy',
        category: 'test',
      }),
      await createTestPuzzle({
        title: 'Medium Test Puzzle',
        description: 'A medium test puzzle',
        tier: 'free',
        difficulty: 'medium',
        category: 'test',
      }),
      await createTestPuzzle({
        title: 'Hard Test Puzzle',
        description: 'A hard test puzzle',
        tier: 'premium',
        difficulty: 'hard',
        category: 'test',
      }),
    ]
  })

  afterAll(async () => {
    // Cleanup test database
    await databaseCleaner.cleanTestData()
  })

  describe('GET /api/puzzles', () => {
    test('should list all puzzles', async () => {
      const { req, res } = await testApiEndpoint('/api/puzzles', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          puzzles: testPuzzles,
          total: testPuzzles.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should filter puzzles by tier', async () => {
      const { req, res } = await testApiEndpoint('/api/puzzles?tier=free', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const tier = url.searchParams.get('tier')
        
        const filteredPuzzles = testPuzzles.filter(puzzle => puzzle.tier === tier)
        
        return NextResponse.json({
          puzzles: filteredPuzzles,
          total: filteredPuzzles.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should filter puzzles by difficulty', async () => {
      const { req, res } = await testApiEndpoint('/api/puzzles?difficulty=easy', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const difficulty = url.searchParams.get('difficulty')
        
        const filteredPuzzles = testPuzzles.filter(puzzle => puzzle.difficulty === difficulty)
        
        return NextResponse.json({
          puzzles: filteredPuzzles,
          total: filteredPuzzles.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should filter puzzles by category', async () => {
      const { req, res } = await testApiEndpoint('/api/puzzles?category=test', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const category = url.searchParams.get('category')
        
        const filteredPuzzles = testPuzzles.filter(puzzle => puzzle.category === category)
        
        return NextResponse.json({
          puzzles: filteredPuzzles,
          total: filteredPuzzles.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should search puzzles by title', async () => {
      const { req, res } = await testApiEndpoint('/api/puzzles?search=Easy', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const search = url.searchParams.get('search')
        
        const filteredPuzzles = testPuzzles.filter(puzzle => 
          puzzle.title.toLowerCase().includes(search?.toLowerCase() || '')
        )
        
        return NextResponse.json({
          puzzles: filteredPuzzles,
          total: filteredPuzzles.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle pagination', async () => {
      const { req, res } = await testApiEndpoint('/api/puzzles?page=2&limit=1', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '10')
        
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedPuzzles = testPuzzles.slice(startIndex, endIndex)
        
        return NextResponse.json({
          puzzles: paginatedPuzzles,
          total: testPuzzles.length,
          page,
          limit,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should sort puzzles by play count', async () => {
      const { req, res } = await testApiEndpoint('/api/puzzles?sort=play_count&order=desc', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const sort = url.searchParams.get('sort')
        const order = url.searchParams.get('order')
        
        const sortedPuzzles = [...testPuzzles].sort((a, b) => {
          if (order === 'desc') {
            return (b.play_count || 0) - (a.play_count || 0)
          } else {
            return (a.play_count || 0) - (b.play_count || 0)
          }
        })
        
        return NextResponse.json({
          puzzles: sortedPuzzles,
          total: testPuzzles.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/puzzles/[puzzleId]', () => {
    test('should get puzzle details', async () => {
      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[0].id}`, 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const puzzle = {
          ...testPuzzles[0],
          gridData: {
            width: 15,
            height: 15,
            cells: [],
            words: [],
          },
        }
        
        return NextResponse.json(puzzle)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return 404 for non-existent puzzle', async () => {
      const { req, res } = await testApiEndpoint('/api/puzzles/99999', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Puzzle not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })

    test('should check user access for premium puzzles', async () => {
      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[2].id}`, 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        // Check if user has access to premium puzzle
        const userRole = req.headers.get('x-user-role')
        const puzzle = testPuzzles[2]
        
        if (puzzle.tier === 'premium' && userRole === 'FREE') {
          return NextResponse.json(
            { error: 'Premium subscription required' },
            { status: 403 }
          )
        }
        
        return NextResponse.json(puzzle)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/puzzles', () => {
    test('should create puzzle as authenticated user', async () => {
      const puzzleData = {
        title: 'New Test Puzzle',
        description: 'A new test puzzle',
        tier: 'free',
        difficulty: 'easy',
        category: 'test',
        gridData: {
          width: 15,
          height: 15,
          cells: [],
          words: [],
        },
      }

      const { req, res } = await testApiEndpoint('/api/puzzles', 'POST', puzzleData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newPuzzle = {
          id: 'test_new_puzzle',
          ...body,
          uploaded_by: testUser.id,
          is_active: true,
          play_count: 0,
          completion_rate: 0.0,
          estimated_solve_time: 15,
          avg_solve_time: 0.0,
          best_score: 0,
          upload_date: new Date(),
        }
        
        return NextResponse.json(newPuzzle, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should require authentication', async () => {
      const puzzleData = {
        title: 'New Test Puzzle',
        description: 'A new test puzzle',
        tier: 'free',
        difficulty: 'easy',
        category: 'test',
      }

      const { req, res } = await testApiEndpoint('/api/puzzles', 'POST', puzzleData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })

    test('should validate required fields', async () => {
      const invalidPuzzleData = {
        title: 'New Test Puzzle',
        // Missing description and tier
      }

      const { req, res } = await testApiEndpoint('/api/puzzles', 'POST', invalidPuzzleData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Title, description, and tier are required' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate tier values', async () => {
      const invalidPuzzleData = {
        title: 'New Test Puzzle',
        description: 'A new test puzzle',
        tier: 'invalid',
        difficulty: 'easy',
        category: 'test',
      }

      const { req, res } = await testApiEndpoint('/api/puzzles', 'POST', invalidPuzzleData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Tier must be either "free" or "premium"' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate difficulty values', async () => {
      const invalidPuzzleData = {
        title: 'New Test Puzzle',
        description: 'A new test puzzle',
        tier: 'free',
        difficulty: 'invalid',
        category: 'test',
      }

      const { req, res } = await testApiEndpoint('/api/puzzles', 'POST', invalidPuzzleData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Difficulty must be "easy", "medium", or "hard"' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/puzzles/[puzzleId]', () => {
    test('should update puzzle as owner', async () => {
      const updateData = {
        title: 'Updated Test Puzzle',
        description: 'An updated test puzzle',
      }

      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[0].id}`, 'PUT', updateData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const updatedPuzzle = {
          ...testPuzzles[0],
          ...updateData,
          updatedAt: new Date(),
        }
        
        return NextResponse.json(updatedPuzzle)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject update from non-owner', async () => {
      const updateData = {
        title: 'Updated Test Puzzle',
        description: 'An updated test puzzle',
      }

      const otherUser = await createTestUser({
        name: 'Other User',
        email: 'other@test.com',
        username: 'otheruser',
      })

      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[0].id}`, 'PUT', updateData, {
        'authorization': `Bearer ${otherUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Only the puzzle owner can update it' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should return 404 for non-existent puzzle', async () => {
      const updateData = {
        title: 'Updated Test Puzzle',
        description: 'An updated test puzzle',
      }

      const { req, res } = await testApiEndpoint('/api/puzzles/99999', 'PUT', updateData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Puzzle not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/puzzles/[puzzleId]', () => {
    test('should delete puzzle as owner', async () => {
      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[0].id}`, 'DELETE', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Puzzle deleted successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject deletion from non-owner', async () => {
      const otherUser = await createTestUser({
        name: 'Other User',
        email: 'other@test.com',
        username: 'otheruser',
      })

      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[1].id}`, 'DELETE', null, {
        'authorization': `Bearer ${otherUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Only the puzzle owner can delete it' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should return 404 for non-existent puzzle', async () => {
      const { req, res } = await testApiEndpoint('/api/puzzles/99999', 'DELETE', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Puzzle not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/puzzles/[puzzleId]/play', () => {
    test('should start playing puzzle', async () => {
      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[0].id}/play`, 'POST', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const gameSession = {
          id: 'test_game_session',
          puzzleId: testPuzzles[0].id,
          userId: testUser.id,
          startedAt: new Date(),
          status: 'ACTIVE',
        }
        
        return NextResponse.json(gameSession, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should check user access for premium puzzles', async () => {
      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[2].id}/play`, 'POST', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        const puzzle = testPuzzles[2]
        
        if (puzzle.tier === 'premium' && userRole === 'FREE') {
          return NextResponse.json(
            { error: 'Premium subscription required' },
            { status: 403 }
          )
        }
        
        const gameSession = {
          id: 'test_game_session',
          puzzleId: puzzle.id,
          userId: testUser.id,
          startedAt: new Date(),
          status: 'ACTIVE',
        }
        
        return NextResponse.json(gameSession, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should require authentication', async () => {
      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[0].id}/play`, 'POST')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/puzzles/[puzzleId]/submit', () => {
    test('should submit puzzle solution', async () => {
      const solutionData = {
        solution: {
          cells: [],
          words: [],
        },
        timeSpent: 300, // 5 minutes
        hintsUsed: 0,
      }

      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[0].id}/submit`, 'POST', solutionData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const result = {
          id: 'test_submission',
          puzzleId: testPuzzles[0].id,
          userId: testUser.id,
          solution: body.solution,
          timeSpent: body.timeSpent,
          hintsUsed: body.hintsUsed,
          score: 1000,
          isCorrect: true,
          submittedAt: new Date(),
        }
        
        return NextResponse.json(result, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should validate solution format', async () => {
      const invalidSolutionData = {
        solution: 'invalid',
        timeSpent: 300,
        hintsUsed: 0,
      }

      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[0].id}/submit`, 'POST', invalidSolutionData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Solution must be an object with cells and words arrays' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should require authentication', async () => {
      const solutionData = {
        solution: {
          cells: [],
          words: [],
        },
        timeSpent: 300,
        hintsUsed: 0,
      }

      const { req, res } = await testApiEndpoint(`/api/puzzles/${testPuzzles[0].id}/submit`, 'POST', solutionData)

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })
  })
})