import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserTable } from './UserTable';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }) => (
    <span className={className} {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }) => (
    <div onClick={onClick} data-testid="dropdown-item">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }) => <div data-testid="dropdown-trigger">{children}</div>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <div data-testid="dialog-title">{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }) => (
    <input value={value} onChange={onChange} {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }) => <span>{placeholder}</span>,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  MoreHorizontal: () => <span data-testid="more-horizontal">⋯</span>,
  Edit: () => <span data-testid="edit">✏️</span>,
  Trash2: () => <span data-testid="trash">🗑️</span>,
  Shield: () => <span data-testid="shield">🛡️</span>,
  Crown: () => <span data-testid="crown">👑</span>,
  User: () => <span data-testid="user">👤</span>,
  Mail: () => <span data-testid="mail">📧</span>,
  Calendar: () => <span data-testid="calendar">📅</span>,
  Activity: () => <span data-testid="activity">📊</span>,
  AlertTriangle: () => <span data-testid="alert">⚠️</span>,
  CheckCircle: () => <span data-testid="check">✅</span>,
  XCircle: () => <span data-testid="x-circle">❌</span>,
}));

const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'FREE',
    subscriptionStatus: 'TRIAL',
    trialEndsAt: new Date('2024-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
    _count: {
      progress: 5,
      hostedRooms: 2,
      notifications: 3,
    },
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'PREMIUM',
    subscriptionStatus: 'ACTIVE',
    trialEndsAt: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    lastLoginAt: new Date('2024-01-16'),
    _count: {
      progress: 10,
      hostedRooms: 5,
      notifications: 8,
    },
  },
];

const defaultProps = {
  users: mockUsers,
  onUpdateUser: jest.fn(),
  onDeleteUser: jest.fn(),
  isSuperAdmin: false,
  loading: false,
};

describe('UserTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders users correctly', () => {
    render(<UserTable {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('PREMIUM')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<UserTable {...defaultProps} loading={true} />);
    
    // Should show skeleton loading elements
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('displays user activity information', () => {
    render(<UserTable {...defaultProps} />);
    
    expect(screen.getByText('Puzzles: 5')).toBeInTheDocument();
    expect(screen.getByText('Rooms: 5')).toBeInTheDocument();
    expect(screen.getByText('Puzzles: 10')).toBeInTheDocument();
    expect(screen.getByText('Rooms: 13')).toBeInTheDocument();
  });

  it('shows role badges with correct styling', () => {
    render(<UserTable {...defaultProps} />);
    
    const freeBadge = screen.getByText('FREE');
    const premiumBadge = screen.getByText('PREMIUM');
    
    expect(freeBadge).toHaveClass('bg-gray-100');
    expect(premiumBadge).toHaveClass('bg-purple-100');
  });

  it('shows status badges with correct styling', () => {
    render(<UserTable {...defaultProps} />);
    
    const trialBadge = screen.getByText('TRIAL');
    const activeBadge = screen.getByText('ACTIVE');
    
    expect(trialBadge).toHaveClass('bg-yellow-100');
    expect(activeBadge).toHaveClass('bg-green-100');
  });

  it('displays trial end date for trial users', () => {
    render(<UserTable {...defaultProps} />);
    
    expect(screen.getByText('Trial until 12/31/2024')).toBeInTheDocument();
  });

  it('shows correct role icons', () => {
    render(<UserTable {...defaultProps} />);
    
    const userIcons = screen.getAllByTestId('user');
    const crownIcons = screen.getAllByTestId('crown');
    
    expect(userIcons.length).toBeGreaterThan(0);
    expect(crownIcons.length).toBeGreaterThan(0);
  });

  it('shows correct status icons', () => {
    render(<UserTable {...defaultProps} />);
    
    const alertIcons = screen.getAllByTestId('alert');
    const checkIcons = screen.getAllByTestId('check');
    
    expect(alertIcons.length).toBeGreaterThan(0);
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('opens edit dialog when edit is clicked', async () => {
    render(<UserTable {...defaultProps} />);
    
    const editButtons = screen.getAllByTestId('edit');
    fireEvent.click(editButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Edit User');
    });
  });

  it('calls onDeleteUser when delete is clicked', async () => {
    const mockOnDeleteUser = jest.fn();
    render(<UserTable {...defaultProps} onDeleteUser={mockOnDeleteUser} />);
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    const trashButtons = screen.getAllByTestId('trash');
    fireEvent.click(trashButtons[0]);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete user "John Doe"? This action cannot be undone.');
    expect(mockOnDeleteUser).toHaveBeenCalledWith('1', 'John Doe');
  });

  it('does not call onDeleteUser when confirm is cancelled', async () => {
    const mockOnDeleteUser = jest.fn();
    render(<UserTable {...defaultProps} onDeleteUser={mockOnDeleteUser} />);
    
    // Mock window.confirm to return false
    window.confirm = jest.fn(() => false);
    
    const trashButtons = screen.getAllByTestId('trash');
    fireEvent.click(trashButtons[0]);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDeleteUser).not.toHaveBeenCalled();
  });

  it('shows admin options for super admin', () => {
    render(<UserTable {...defaultProps} isSuperAdmin={true} />);
    
    // Should show admin role options in dropdowns
    const dropdownTriggers = screen.getAllByTestId('dropdown-trigger');
    expect(dropdownTriggers.length).toBeGreaterThan(0);
  });

  it('formats dates correctly', () => {
    render(<UserTable {...defaultProps} />);
    
    expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    expect(screen.getByText('1/2/2024')).toBeInTheDocument();
  });

  it('calculates days since joined correctly', () => {
    render(<UserTable {...defaultProps} />);
    
    // Should show "X days ago" for each user
    const daysAgoTexts = screen.getAllByText(/\d+ days ago/);
    expect(daysAgoTexts.length).toBe(2);
  });

  it('handles users with null names', () => {
    const usersWithNullName = [
      {
        ...mockUsers[0],
        name: null,
      },
    ];
    
    render(<UserTable {...defaultProps} users={usersWithNullName} />);
    
    expect(screen.getByText('Unnamed User')).toBeInTheDocument();
  });

  it('handles users with null last login', () => {
    const usersWithNullLogin = [
      {
        ...mockUsers[0],
        lastLoginAt: null,
      },
    ];
    
    render(<UserTable {...defaultProps} users={usersWithNullLogin} />);
    
    expect(screen.getByText('Last login: Never')).toBeInTheDocument();
  });
});
