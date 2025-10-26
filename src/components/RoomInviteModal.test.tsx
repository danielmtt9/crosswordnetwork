import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomInviteModal } from './RoomInviteModal';

// Mock the UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, onKeyPress, value, placeholder, ...props }: any) => (
    <input
      onChange={onChange}
      onKeyPress={onKeyPress}
      value={value}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ onChange, value, placeholder, ...props }: any) => (
    <textarea
      onChange={onChange}
      value={value}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Users: () => <span>Users</span>,
  Clock: () => <span>Clock</span>,
  Lock: () => <span>Lock</span>,
  Unlock: () => <span>Unlock</span>,
  Crown: () => <span>Crown</span>,
  Eye: () => <span>Eye</span>,
  Play: () => <span>Play</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  XCircle: () => <span>XCircle</span>,
  Mail: () => <span>Mail</span>,
  User: () => <span>User</span>,
  Link: () => <span>Link</span>,
  Send: () => <span>Send</span>,
  Copy: () => <span>Copy</span>,
  Share2: () => <span>Share2</span>,
  AlertCircle: () => <span>AlertCircle</span>,
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window methods
const mockWriteText = jest.fn();
const mockShare = jest.fn();

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
});

Object.defineProperty(navigator, 'share', {
  value: mockShare,
  writable: true,
});

describe('RoomInviteModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    roomCode: 'ABC123',
    roomName: 'Test Room',
    roomId: 'room1',
    onInviteSent: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
    mockShare.mockResolvedValue(undefined);
  });

  it('renders invite modal correctly', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    expect(screen.getByText('Invite Players to Test Room')).toBeInTheDocument();
    expect(screen.getByText('Send invitations to friends to join your crossword room')).toBeInTheDocument();
  });

  it('handles invite type selection', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    const inviteTypeSelect = screen.getByDisplayValue('email');
    fireEvent.change(inviteTypeSelect, { target: { value: 'username' } });
    
    expect(inviteTypeSelect).toHaveValue('username');
  });

  it('handles direct link invitation type', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    const inviteTypeSelect = screen.getByDisplayValue('email');
    fireEvent.change(inviteTypeSelect, { target: { value: 'direct_link' } });
    
    expect(screen.getByText('Share Room Link')).toBeInTheDocument();
    expect(screen.getByDisplayValue('http://localhost/room/ABC123')).toBeInTheDocument();
  });

  it('handles adding recipients', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    const recipientInput = screen.getByPlaceholderText(/enter email addresses/i);
    fireEvent.change(recipientInput, { target: { value: 'test@example.com' } });
    fireEvent.keyPress(recipientInput, { key: 'Enter' });
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('handles removing recipients', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    const recipientInput = screen.getByPlaceholderText(/enter email addresses/i);
    fireEvent.change(recipientInput, { target: { value: 'test@example.com' } });
    fireEvent.keyPress(recipientInput, { key: 'Enter' });
    
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('handles custom message input', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    const messageInput = screen.getByPlaceholderText(/add a personal message/i);
    fireEvent.change(messageInput, { target: { value: 'Join me for fun!' } });
    
    expect(messageInput).toHaveValue('Join me for fun!');
  });

  it('handles expiration time selection', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    const expirationSelect = screen.getByDisplayValue('24');
    fireEvent.change(expirationSelect, { target: { value: '72' } });
    
    expect(expirationSelect).toHaveValue('72');
  });

  it('handles sending invitations successfully', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { recipient: 'test@example.com', success: true, inviteId: 'invite1' },
          { recipient: 'test2@example.com', success: false, error: 'User not found' }
        ]
      }),
    });

    render(<RoomInviteModal {...defaultProps} />);
    
    // Add recipients
    const recipientInput = screen.getByPlaceholderText(/enter email addresses/i);
    fireEvent.change(recipientInput, { target: { value: 'test@example.com' } });
    fireEvent.keyPress(recipientInput, { key: 'Enter' });
    
    fireEvent.change(recipientInput, { target: { value: 'test2@example.com' } });
    fireEvent.keyPress(recipientInput, { key: 'Enter' });
    
    // Send invitations
    const sendButton = screen.getByText('Send Invitations');
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invitation Results')).toBeInTheDocument();
      expect(screen.getByText('test@example.com - Invitation sent successfully')).toBeInTheDocument();
      expect(screen.getByText('test2@example.com - User not found')).toBeInTheDocument();
    });
    
    expect(defaultProps.onInviteSent).toHaveBeenCalledWith([
      { recipient: 'test@example.com', success: true, inviteId: 'invite1' },
      { recipient: 'test2@example.com', success: false, error: 'User not found' }
    ]);
  });

  it('handles sending invitations failure', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<RoomInviteModal {...defaultProps} />);
    
    // Add recipients
    const recipientInput = screen.getByPlaceholderText(/enter email addresses/i);
    fireEvent.change(recipientInput, { target: { value: 'test@example.com' } });
    fireEvent.keyPress(recipientInput, { key: 'Enter' });
    
    // Send invitations
    const sendButton = screen.getByText('Send Invitations');
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('prevents sending invitations without recipients', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    const sendButton = screen.getByText('Send Invitations');
    expect(sendButton).toBeDisabled();
  });

  it('handles copying room link', async () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    // Switch to direct link mode
    const inviteTypeSelect = screen.getByDisplayValue('email');
    fireEvent.change(inviteTypeSelect, { target: { value: 'direct_link' } });
    
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('http://localhost/room/ABC123');
    });
  });

  it('handles sharing room link', async () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    // Switch to direct link mode
    const inviteTypeSelect = screen.getByDisplayValue('email');
    fireEvent.change(inviteTypeSelect, { target: { value: 'direct_link' } });
    
    const shareButton = screen.getByText('Share2');
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Join Test Room',
        text: 'Join me in solving a crossword puzzle!',
        url: 'http://localhost/room/ABC123',
      });
    });
  });

  it('handles closing modal', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('resets form when modal opens', () => {
    const { rerender } = render(<RoomInviteModal {...defaultProps} isOpen={false} />);
    
    // Open modal
    rerender(<RoomInviteModal {...defaultProps} isOpen={true} />);
    
    const recipientInput = screen.getByPlaceholderText(/enter email addresses/i);
    expect(recipientInput).toHaveValue('');
  });

  it('displays loading state when sending invitations', async () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<RoomInviteModal {...defaultProps} />);
    
    // Add recipients
    const recipientInput = screen.getByPlaceholderText(/enter email addresses/i);
    fireEvent.change(recipientInput, { target: { value: 'test@example.com' } });
    fireEvent.keyPress(recipientInput, { key: 'Enter' });
    
    // Send invitations
    const sendButton = screen.getByText('Send Invitations');
    fireEvent.click(sendButton);
    
    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(sendButton).toBeDisabled();
  });

  it('handles username invitation type', () => {
    render(<RoomInviteModal {...defaultProps} />);
    
    const inviteTypeSelect = screen.getByDisplayValue('email');
    fireEvent.change(inviteTypeSelect, { target: { value: 'username' } });
    
    expect(screen.getByPlaceholderText(/enter usernames/i)).toBeInTheDocument();
  });
});
