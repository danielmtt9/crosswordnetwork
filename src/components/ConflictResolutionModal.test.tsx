import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictResolutionModal, ConflictResolutionModalCompact } from './ConflictResolutionModal';
import { Operation, ConflictResolutionStrategy } from '@/lib/operationalTransformation';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockOperations: Operation[] = [
  {
    id: 'op1',
    userId: 'user1',
    timestamp: Date.now(),
    type: 'INSERT',
    position: 5,
    content: 'Hello',
    length: 5
  },
  {
    id: 'op2',
    userId: 'user2',
    timestamp: Date.now() + 100,
    type: 'INSERT',
    position: 5,
    content: 'Hi',
    length: 2
  }
];

const mockParticipants = [
  {
    id: 'user1',
    name: 'John Doe',
    avatar: 'https://example.com/avatar1.jpg',
    isOnline: true
  },
  {
    id: 'user2',
    name: 'Jane Smith',
    avatar: 'https://example.com/avatar2.jpg',
    isOnline: true
  }
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  conflicts: mockOperations,
  onResolve: jest.fn(),
  participants: mockParticipants
};

describe('ConflictResolutionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<ConflictResolutionModal {...defaultProps} />);
    
    expect(screen.getByText('Resolve Edit Conflicts')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ConflictResolutionModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Resolve Edit Conflicts')).not.toBeInTheDocument();
  });

  it('should display conflict count', () => {
    render(<ConflictResolutionModal {...defaultProps} />);
    
    expect(screen.getByText('2 conflicts detected in the puzzle')).toBeInTheDocument();
  });

  it('should display resolution strategies', () => {
    render(<ConflictResolutionModal {...defaultProps} />);
    
    expect(screen.getByText('Last Write Wins')).toBeInTheDocument();
    expect(screen.getByText('First Write Wins')).toBeInTheDocument();
    expect(screen.getByText('Manual Resolution')).toBeInTheDocument();
    expect(screen.getByText('Automatic Merge')).toBeInTheDocument();
  });

  it('should handle strategy selection', async () => {
    const user = userEvent.setup();
    render(<ConflictResolutionModal {...defaultProps} />);
    
    const firstWriteWinsButton = screen.getByText('First Write Wins');
    await user.click(firstWriteWinsButton);
    
    // The button should be clickable and not throw an error
    expect(firstWriteWinsButton).toBeInTheDocument();
  });

  it('should handle resolve action', async () => {
    const user = userEvent.setup();
    const onResolve = jest.fn();
    render(<ConflictResolutionModal {...defaultProps} onResolve={onResolve} />);
    
    const resolveButton = screen.getByText('Resolve Conflicts');
    await user.click(resolveButton);
    
    expect(onResolve).toHaveBeenCalledWith({
      strategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      selectedOperations: [],
      customResolution: undefined
    });
  });

  it('should handle cancel action', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ConflictResolutionModal {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should handle empty conflicts', () => {
    render(<ConflictResolutionModal {...defaultProps} conflicts={[]} />);
    
    expect(screen.getByText('0 conflicts detected in the puzzle')).toBeInTheDocument();
  });
});

describe('ConflictResolutionModalCompact', () => {
  it('should render compact version', () => {
    render(<ConflictResolutionModalCompact {...defaultProps} />);
    
    expect(screen.getByText('Resolve Conflicts')).toBeInTheDocument();
    expect(screen.getByText('2 conflicts detected')).toBeInTheDocument();
  });

  it('should handle resolution', async () => {
    const user = userEvent.setup();
    const onResolve = jest.fn();
    render(<ConflictResolutionModalCompact {...defaultProps} onResolve={onResolve} />);
    
    const resolveButton = screen.getByText('Resolve');
    await user.click(resolveButton);
    
    expect(onResolve).toHaveBeenCalledWith({
      strategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      selectedOperations: [],
      customResolution: undefined
    });
  });

  it('should handle cancel action', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ConflictResolutionModalCompact {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });
});
