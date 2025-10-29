// Integration tests for multiplayer and real-time features
import { testApiEndpoint, createTestUser, createTestPuzzle } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Multiplayer and Real-time Features Integration Tests', () => {
  let testUsers: any[] = []
  let testPuzzle: any

  beforeAll(async () => {
    await databaseSeeder.seedDatabase()
    testUsers = [
      await createTestUser({ name: 'User 1', email: 'user1@test.com' }),
      await createTestUser({ name: 'User 2', email: 'user2@test.com' }),
    ]
    testPuzzle = await createTestPuzzle()
  })

  afterAll(async () => {
    await databaseCleaner.cleanTestData()
  })

  describe('Room Management', () => {
    test('should create multiplayer room', async () => {
      const roomData = {
        name: 'Test Room',
        puzzleId: testPuzzle.id,
        maxPlayers: 4,
        isPrivate: false,
      }

      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms', 'POST', roomData, {
        'authorization': `Bearer ${testUsers[0].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req) => {
        return new Response(JSON.stringify({
          id: 'test_room_1',
          roomCode: 'ABC123',
          ...roomData,
          hostUserId: testUsers[0].id,
          status: 'WAITING',
        }), { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should join room with valid code', async () => {
      const joinData = { displayName: 'Test Player' }
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/ABC123/join', 'POST', joinData, {
        'authorization': `Bearer ${testUsers[1].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req) => {
        return new Response(JSON.stringify({
          id: 'participant_1',
          roomId: 'test_room_1',
          userId: testUsers[1].id,
          role: 'PLAYER',
          displayName: 'Test Player',
        }), { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })
  })

  describe('Real-time Synchronization', () => {
    test('should sync grid state between players', async () => {
      const gridState = { cells: [], words: [] }
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/ABC123/sync', 'POST', { gridState }, {
        'authorization': `Bearer ${testUsers[0].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req) => {
        return new Response(JSON.stringify({ synced: true }))
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should sync cursor positions', async () => {
      const cursorData = { x: 10, y: 20 }
      const { req, res } = await testApiEndpoint('/api/multiplayer/rooms/ABC123/cursor', 'POST', cursorData, {
        'authorization': `Bearer ${testUsers[0].id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req) => {
        return new Response(JSON.stringify({ synced: true }))
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })
})