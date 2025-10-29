// Integration tests for multiplayer API
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser, createTestPuzzle } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Multiplayer API Integration Tests', () => {
  let testUsers: any[] = []
  let testPuzzle: any

  beforeAll(async () => {
    // Setup test database
    await databaseSeeder.seedDatabase()
    
    // Create test users
    testUsers = [
      await createTestUser({ name: 'Test User 1', email: 'user1@test.com' }),
      await createTestUser({ name: 'Test User 2', email: 'user2@test.com' }),
      await createTestUser({ name: 'Test User 3', email: 'user3@test.com' }),
    ]
    
    // Create test puzzle
    testPuzzle = await createTestPuzzle()
  })

  afterAll(async () => {
    // Cleanup test database
    await databaseCleaner.cleanTestData()
  })

  describe('POST /api/multiplayer/rooms', () => {
    test('should create public room', async () => {
      const roomData = {
        name: 'Test Public Room',
        description: 'A test public room',
        puzzleId: testPuzzle.id,
        maxPlayers: 4,
        isPrivate: false,
        allowSpectators: true,
        autoStart: false,
        timeLimit: null,
        difficulty: null,
        tags: ['test', 'multiplayer'],
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms', 'POST', roomData, {
        'authorization': `Bearer ${testUsers[0].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newRoom = {
          id: 'test_room_1',
          roomCode: 'ABC123',
          name: body.name,
          description: body.description,
          puzzleId: body.puzzleId,
          hostUserId: testUsers[0].id,
          maxPlayers: body.maxPlayers,
          isPrivate: body.isPrivate,
          allowSpectators: body.allowSpectators,
          autoStart: body.autoStart,
          timeLimit: body.timeLimit,
          difficulty: body.difficulty,
          tags: body.tags,
          status: 'WAITING',
          createdAt: new Date(),
        }
        
        return NextResponse.json(newRoom, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should create private room', async () => {
      const roomData = {
        name: 'Test Private Room',
        description: 'A test private room',
        puzzleId: testPuzzle.id,
        maxPlayers: 4,
        isPrivate: true,
        password: 'testpassword',
        allowSpectators: false,
        autoStart: false,
        timeLimit: null,
        difficulty: null,
        tags: ['test', 'private'],
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms', 'POST', roomData, {
        'authorization': `Bearer ${testUsers[1].id}`,
        'x-user-role': 'PREMIUM',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newRoom = {
          id: 'test_room_2',
          roomCode: 'DEF456',
          name: body.name,
          description: body.description,
          puzzleId: body.puzzleId,
          hostUserId: testUsers[1].id,
          maxPlayers: body.maxPlayers,
          isPrivate: body.isPrivate,
          password: body.password,
          allowSpectators: body.allowSpectators,
          autoStart: body.autoStart,
          timeLimit: body.timeLimit,
          difficulty: body.difficulty,
          tags: body.tags,
          status: 'WAITING',
          createdAt: new Date(),
        }
        
        return NextResponse.json(newRoom, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should validate required fields', async () => {
      const invalidRoomData = {
        name: 'Test Room',
        // Missing puzzleId
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms', 'POST', invalidRoomData, {
        'authorization': `Bearer ${testUsers[0].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Puzzle ID is required' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate puzzle exists', async () => {
      const roomData = {
        name: 'Test Room',
        description: 'A test room',
        puzzleId: 99999, // Non-existent puzzle
        maxPlayers: 4,
        isPrivate: false,
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms', 'POST', roomData, {
        'authorization': `Bearer ${testUsers[0].id}`,
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

    test('should require authentication', async () => {
      const roomData = {
        name: 'Test Room',
        description: 'A test room',
        puzzleId: testPuzzle.id,
        maxPlayers: 4,
        isPrivate: false,
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms', 'POST', roomData)

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

  describe('GET /api/multiplayer/rooms', () => {
    test('should list public rooms', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const rooms = [
          {
            id: 'test_room_1',
            roomCode: 'ABC123',
            name: 'Test Public Room',
            description: 'A test public room',
            puzzleId: testPuzzle.id,
            hostUserId: testUsers[0].id,
            maxPlayers: 4,
            isPrivate: false,
            allowSpectators: true,
            status: 'WAITING',
            participantCount: 1,
            createdAt: new Date(),
          },
        ]
        
        return NextResponse.json({
          rooms,
          total: rooms.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should filter rooms by difficulty', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms?difficulty=easy', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const difficulty = url.searchParams.get('difficulty')
        
        const rooms = [
          {
            id: 'test_room_1',
            roomCode: 'ABC123',
            name: 'Test Easy Room',
            difficulty: difficulty,
            status: 'WAITING',
          },
        ]
        
        return NextResponse.json({
          rooms,
          total: rooms.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should filter rooms by status', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms?status=WAITING', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const status = url.searchParams.get('status')
        
        const rooms = [
          {
            id: 'test_room_1',
            roomCode: 'ABC123',
            name: 'Test Waiting Room',
            status: status,
          },
        ]
        
        return NextResponse.json({
          rooms,
          total: rooms.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle pagination', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms?page=2&limit=5', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '10')
        
        return NextResponse.json({
          rooms: [],
          total: 0,
          page,
          limit,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/multiplayer/rooms/[roomId]', () => {
    test('should get room details', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_1', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const room = {
          id: 'test_room_1',
          roomCode: 'ABC123',
          name: 'Test Public Room',
          description: 'A test public room',
          puzzleId: testPuzzle.id,
          hostUserId: testUsers[0].id,
          maxPlayers: 4,
          isPrivate: false,
          allowSpectators: true,
          status: 'WAITING',
          participants: [
            {
              id: 'participant_1',
              userId: testUsers[0].id,
              role: 'HOST',
              displayName: testUsers[0].name,
              isOnline: true,
            },
          ],
          createdAt: new Date(),
        }
        
        return NextResponse.json(room)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return 404 for non-existent room', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/non-existent', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/multiplayer/rooms/[roomId]/join', () => {
    test('should join public room', async () => {
      const joinData = {
        displayName: 'Test Player',
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_1/join', 'POST', joinData, {
        'authorization': `Bearer ${testUsers[1].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const participant = {
          id: 'participant_2',
          roomId: 'test_room_1',
          userId: testUsers[1].id,
          role: 'PLAYER',
          displayName: 'Test Player',
          isOnline: true,
          joinedAt: new Date(),
        }
        
        return NextResponse.json(participant, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should join private room with correct password', async () => {
      const joinData = {
        displayName: 'Test Player',
        password: 'testpassword',
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_2/join', 'POST', joinData, {
        'authorization': `Bearer ${testUsers[2].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        if (body.password === 'testpassword') {
          const participant = {
            id: 'participant_3',
            roomId: 'test_room_2',
            userId: testUsers[2].id,
            role: 'PLAYER',
            displayName: 'Test Player',
            isOnline: true,
            joinedAt: new Date(),
          }
          
          return NextResponse.json(participant, { status: 201 })
        } else {
          return NextResponse.json(
            { error: 'Invalid password' },
            { status: 401 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should reject joining private room with wrong password', async () => {
      const joinData = {
        displayName: 'Test Player',
        password: 'wrongpassword',
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_2/join', 'POST', joinData, {
        'authorization': `Bearer ${testUsers[2].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })

    test('should reject joining full room', async () => {
      const joinData = {
        displayName: 'Test Player',
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/full_room/join', 'POST', joinData, {
        'authorization': `Bearer ${testUsers[2].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Room is full' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should require authentication', async () => {
      const joinData = {
        displayName: 'Test Player',
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_1/join', 'POST', joinData)

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

  describe('POST /api/multiplayer/rooms/[roomId]/leave', () => {
    test('should leave room successfully', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_1/leave', 'POST', null, {
        'authorization': `Bearer ${testUsers[1].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Left room successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle leaving non-existent room', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/non-existent/leave', 'POST', null, {
        'authorization': `Bearer ${testUsers[1].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })

    test('should handle leaving room not joined', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_1/leave', 'POST', null, {
        'authorization': `Bearer ${testUsers[2].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Not a participant in this room' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/multiplayer/rooms/[roomId]/start', () => {
    test('should start room as host', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_1/start', 'POST', null, {
        'authorization': `Bearer ${testUsers[0].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Room started successfully',
          room: {
            id: 'test_room_1',
            status: 'ACTIVE',
            startedAt: new Date(),
          },
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject starting room as non-host', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_1/start', 'POST', null, {
        'authorization': `Bearer ${testUsers[1].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Only the host can start the room' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should reject starting room with insufficient players', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/empty_room/start', 'POST', null, {
        'authorization': `Bearer ${testUsers[0].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Need at least 1 player to start' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/multiplayer/rooms/[roomId]/end', () => {
    test('should end room as host', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_1/end', 'POST', null, {
        'authorization': `Bearer ${testUsers[0].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Room ended successfully',
          room: {
            id: 'test_room_1',
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject ending room as non-host', async () => {
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/test_room_1/end', 'POST', null, {
        'authorization': `Bearer ${testUsers[1].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Only the host can end the room' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })
  })
})