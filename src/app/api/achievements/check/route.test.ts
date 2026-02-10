import { NextRequest } from 'next/server';
import { POST } from './route';
import { getServerSession } from 'next-auth';
import { checkAchievements } from '@/lib/achievements/checker';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/achievements/checker');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockCheckAchievements = checkAchievements as jest.MockedFunction<typeof checkAchievements>;

describe('/api/achievements/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/achievements/check', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should check achievements for puzzle completion event', async () => {
    const mockUnlockedAchievements = [
      {
        id: 'achievement-1',
        key: 'first_puzzle',
        name: 'First Puzzle',
        description: 'Complete your first puzzle',
        category: 'COMPLETION',
        tier: 'BRONZE',
        points: 10,
        iconName: 'Trophy',
      },
    ];

    mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
    mockCheckAchievements.mockResolvedValueOnce(mockUnlockedAchievements);

    const request = new NextRequest('http://localhost:3000/api/achievements/check', {
      method: 'POST',
      body: JSON.stringify({
        type: 'puzzle_completed',
        data: {
          puzzleId: 1,
          completionTimeSeconds: 300,
          accuracy: 95.0,
        },
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      unlockedAchievements: mockUnlockedAchievements,
      count: 1,
    });

    expect(mockCheckAchievements).toHaveBeenCalledWith('user-1', {
      type: 'puzzle_completed',
      data: {
        puzzleId: 1,
        completionTimeSeconds: 300,
        accuracy: 95.0,
      },
    });
  });

  it('should check achievements for daily activity event', async () => {
    mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
    mockCheckAchievements.mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/achievements/check', {
      method: 'POST',
      body: JSON.stringify({
        type: 'daily_activity',
        data: {
          streakDays: 7,
        },
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      unlockedAchievements: [],
      count: 0,
    });

    expect(mockCheckAchievements).toHaveBeenCalledWith('user-1', {
      type: 'daily_activity',
      data: {
        streakDays: 7,
      },
    });
  });

  it('should check achievements for multiplayer events', async () => {
    mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
    mockCheckAchievements.mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/achievements/check', {
      method: 'POST',
      body: JSON.stringify({
        type: 'multiplayer_join',
        data: {
          roomId: 'room-123',
        },
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCheckAchievements).toHaveBeenCalledWith('user-1', {
      type: 'multiplayer_join',
      data: {
        roomId: 'room-123',
      },
    });
  });

  it('should return 400 for invalid event type', async () => {
    mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });

    const request = new NextRequest('http://localhost:3000/api/achievements/check', {
      method: 'POST',
      body: JSON.stringify({
        type: 'invalid_event',
        data: {},
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid event type');
  });

  it('should handle errors gracefully', async () => {
    mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
    mockCheckAchievements.mockRejectedValueOnce(new Error('Achievement check failed'));

    const request = new NextRequest('http://localhost:3000/api/achievements/check', {
      method: 'POST',
      body: JSON.stringify({
        type: 'puzzle_completed',
        data: {},
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to check achievements');
  });

  it('should handle multiple unlocked achievements', async () => {
    const mockUnlockedAchievements = [
      {
        id: 'achievement-1',
        key: 'first_puzzle',
        name: 'First Puzzle',
        description: 'Complete your first puzzle',
        category: 'COMPLETION',
        tier: 'BRONZE',
        points: 10,
        iconName: 'Trophy',
      },
      {
        id: 'achievement-2',
        key: 'speed_demon',
        name: 'Speed Demon',
        description: 'Complete a puzzle in under 5 minutes',
        category: 'SPEED',
        tier: 'SILVER',
        points: 25,
        iconName: 'Zap',
      },
    ];

    mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
    mockCheckAchievements.mockResolvedValueOnce(mockUnlockedAchievements);

    const request = new NextRequest('http://localhost:3000/api/achievements/check', {
      method: 'POST',
      body: JSON.stringify({
        type: 'puzzle_completed',
        data: {
          puzzleId: 1,
          completionTimeSeconds: 180,
          accuracy: 100.0,
        },
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      unlockedAchievements: mockUnlockedAchievements,
      count: 2,
    });
  });
});
