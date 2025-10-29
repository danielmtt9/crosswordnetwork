import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import AdminPage from '@/app/admin/page';
import { isSuperAdmin } from '@/lib/superAdmin';

// Mock dependencies
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/superAdmin', () => ({
  isSuperAdmin: vi.fn(),
}));

vi.mock('@/components/RoomLifecycleStats', () => ({
  RoomLifecycleStats: () => <div data-testid="room-lifecycle-stats">Room Lifecycle Stats</div>,
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockUseSession = vi.mocked(useSession);
const mockIsSuperAdmin = vi.mocked(isSuperAdmin);
const mockFetch = vi.mocked(fetch);

describe('Admin Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render admin dashboard for regular admin', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'admin@example.com' },
        userId: 'admin123',
      },
      status: 'authenticated',
    } as any);

    mockIsSuperAdmin.mockReturnValue(false);

    // Mock API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalUsers: 1000,
          activeUsers: 150,
          totalPuzzles: 50,
          newUsersThisMonth: 25,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          recentUsers: [],
          recentProgress: [],
          auditLogs: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: { status: 'healthy', latency: 10, message: 'Connected' },
            email: { status: 'healthy', message: 'Service available' },
            storage: { status: 'healthy', message: 'Storage accessible' },
          },
          metrics: {
            totalUsers: 1000,
            totalPuzzles: 50,
            activeUsers24h: 150,
            uptime: 3600,
            memoryUsage: { rss: 1000000, heapTotal: 500000, heapUsed: 300000, external: 100000 },
            nodeVersion: 'v18.0.0',
          },
        }),
      });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Total Puzzles')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should render super admin badge for super admin', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'superadmin@crossword.network' },
        userId: 'superadmin123',
      },
      status: 'authenticated',
    } as any);

    mockIsSuperAdmin.mockReturnValue(true);

    // Mock API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalUsers: 1000,
          activeUsers: 150,
          totalPuzzles: 50,
          newUsersThisMonth: 25,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          recentUsers: [],
          recentProgress: [],
          auditLogs: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: { status: 'healthy', latency: 10, message: 'Connected' },
            email: { status: 'healthy', message: 'Service available' },
            storage: { status: 'healthy', message: 'Storage accessible' },
          },
          metrics: {
            totalUsers: 1000,
            totalPuzzles: 50,
            activeUsers24h: 150,
            uptime: 3600,
            memoryUsage: { rss: 1000000, heapTotal: 500000, heapUsed: 300000, external: 100000 },
            nodeVersion: 'v18.0.0',
          },
        }),
      });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
    });

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'admin@example.com' },
        userId: 'admin123',
      },
      status: 'authenticated',
    } as any);

    mockIsSuperAdmin.mockReturnValue(false);

    // Mock slow API response
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<AdminPage />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getAllByTestId('loader')).toHaveLength(6); // 6 loading spinners
  });

  it('should display error state when API fails', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'admin@example.com' },
        userId: 'admin123',
      },
      status: 'authenticated',
    } as any);

    mockIsSuperAdmin.mockReturnValue(false);

    // Mock API failure
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });

  it('should display system health status correctly', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'admin@example.com' },
        userId: 'admin123',
      },
      status: 'authenticated',
    } as any);

    mockIsSuperAdmin.mockReturnValue(false);

    // Mock API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalUsers: 1000,
          activeUsers: 150,
          totalPuzzles: 50,
          newUsersThisMonth: 25,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          recentUsers: [],
          recentProgress: [],
          auditLogs: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'degraded',
          timestamp: new Date().toISOString(),
          services: {
            database: { status: 'healthy', latency: 10, message: 'Connected' },
            email: { status: 'warning', message: 'Slow response' },
            storage: { status: 'unhealthy', message: 'Connection failed' },
          },
          metrics: {
            totalUsers: 1000,
            totalPuzzles: 50,
            activeUsers24h: 150,
            uptime: 3600,
            memoryUsage: { rss: 1000000, heapTotal: 500000, heapUsed: 300000, external: 100000 },
            nodeVersion: 'v18.0.0',
          },
        }),
      });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument();
    });

    expect(screen.getByText('database')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('storage')).toBeInTheDocument();
  });

  it('should display recent activity when available', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'admin@example.com' },
        userId: 'admin123',
      },
      status: 'authenticated',
    } as any);

    mockIsSuperAdmin.mockReturnValue(false);

    const mockAuditLogs = [
      {
        id: 'log1',
        action: 'USER_CREATED',
        entityType: 'User',
        actor: { name: 'Admin User', email: 'admin@example.com' },
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'log2',
        action: 'USER_UPDATED',
        entityType: 'User',
        actor: { name: 'Admin User', email: 'admin@example.com' },
        createdAt: new Date('2024-01-01T11:00:00Z'),
      },
    ];

    // Mock API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalUsers: 1000,
          activeUsers: 150,
          totalPuzzles: 50,
          newUsersThisMonth: 25,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          recentUsers: [],
          recentProgress: [],
          auditLogs: mockAuditLogs,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: { status: 'healthy', latency: 10, message: 'Connected' },
            email: { status: 'healthy', message: 'Service available' },
            storage: { status: 'healthy', message: 'Storage accessible' },
          },
          metrics: {
            totalUsers: 1000,
            totalPuzzles: 50,
            activeUsers24h: 150,
            uptime: 3600,
            memoryUsage: { rss: 1000000, heapTotal: 500000, heapUsed: 300000, external: 100000 },
            nodeVersion: 'v18.0.0',
          },
        }),
      });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    expect(screen.getByText('USER_CREATED on User')).toBeInTheDocument();
    expect(screen.getByText('USER_UPDATED on User')).toBeInTheDocument();
  });

  it('should display quick actions correctly', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'admin@example.com' },
        userId: 'admin123',
      },
      status: 'authenticated',
    } as any);

    mockIsSuperAdmin.mockReturnValue(false);

    // Mock API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalUsers: 1000,
          activeUsers: 150,
          totalPuzzles: 50,
          newUsersThisMonth: 25,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          recentUsers: [],
          recentProgress: [],
          auditLogs: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: { status: 'healthy', latency: 10, message: 'Connected' },
            email: { status: 'healthy', message: 'Service available' },
            storage: { status: 'healthy', message: 'Storage accessible' },
          },
          metrics: {
            totalUsers: 1000,
            totalPuzzles: 50,
            activeUsers24h: 150,
            uptime: 3600,
            memoryUsage: { rss: 1000000, heapTotal: 500000, heapUsed: 300000, external: 100000 },
            nodeVersion: 'v18.0.0',
          },
        }),
      });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    expect(screen.getByText('Manage Users')).toBeInTheDocument();
    expect(screen.getByText('Manage Puzzles')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
  });

  it('should display alerts section', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'admin@example.com' },
        userId: 'admin123',
      },
      status: 'authenticated',
    } as any);

    mockIsSuperAdmin.mockReturnValue(false);

    // Mock API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalUsers: 1000,
          activeUsers: 150,
          totalPuzzles: 50,
          newUsersThisMonth: 25,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          recentUsers: [],
          recentProgress: [],
          auditLogs: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: { status: 'healthy', latency: 10, message: 'Connected' },
            email: { status: 'healthy', message: 'Service available' },
            storage: { status: 'healthy', message: 'Storage accessible' },
          },
          metrics: {
            totalUsers: 1000,
            totalPuzzles: 50,
            activeUsers24h: 150,
            uptime: 3600,
            memoryUsage: { rss: 1000000, heapTotal: 500000, heapUsed: 300000, external: 100000 },
            nodeVersion: 'v18.0.0',
          },
        }),
      });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    expect(screen.getByText('Payment Processing Warning')).toBeInTheDocument();
    expect(screen.getByText('System Update Available')).toBeInTheDocument();
  });
});