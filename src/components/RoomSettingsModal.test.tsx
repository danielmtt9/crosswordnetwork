import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomSettingsModal } from './RoomSettingsModal';
import { RoomRoleSettings } from '@/lib/enhancedRoleSystem';

// Mock fetch
global.fetch = jest.fn();

const mockSettings: RoomRoleSettings = {
  maxCollaborators: 5,
  allowSpectators: true,
  requirePremiumToHost: true,
  allowRoleChanges: true,
  defaultRole: 'SPECTATOR'
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  roomId: 'room123',
  currentSettings: mockSettings,
  onSettingsUpdate: jest.fn(),
  currentCollaboratorCount: 3,
  isHost: true
};

describe('RoomSettingsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should render when open', () => {
    render(<RoomSettingsModal {...defaultProps} />);
    
    expect(screen.getByText('Room Settings')).toBeInTheDocument();
    expect(screen.getByText('Collaborator Limits')).toBeInTheDocument();
    expect(screen.getByText('Spectator Access')).toBeInTheDocument();
    expect(screen.getByText('Premium Requirements')).toBeInTheDocument();
    expect(screen.getByText('Role Management')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<RoomSettingsModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Room Settings')).not.toBeInTheDocument();
  });

  it('should display current settings', () => {
    render(<RoomSettingsModal {...defaultProps} />);
    
    expect(screen.getByText('5 collaborators')).toBeInTheDocument();
    expect(screen.getByText('Current: 3')).toBeInTheDocument();
  });

  it('should allow changing collaborator limit', () => {
    render(<RoomSettingsModal {...defaultProps} />);
    
    const selects = screen.getAllByRole('combobox');
    const collaboratorSelect = selects[0]; // First combobox is for collaborator limit
    fireEvent.click(collaboratorSelect);
    
    const option = screen.getByText('8 collaborators');
    fireEvent.click(option);
    
    expect(screen.getByText('8 collaborators')).toBeInTheDocument();
  });

  it('should allow toggling spectator access', () => {
    render(<RoomSettingsModal {...defaultProps} />);
    
    const switchElement = screen.getByRole('switch', { name: /allow spectators/i });
    expect(switchElement).toBeChecked();
    
    fireEvent.click(switchElement);
    expect(switchElement).not.toBeChecked();
  });

  it('should allow toggling premium requirements', () => {
    render(<RoomSettingsModal {...defaultProps} />);
    
    const switchElement = screen.getByRole('switch', { name: /premium required to host/i });
    expect(switchElement).toBeChecked();
    
    fireEvent.click(switchElement);
    expect(switchElement).not.toBeChecked();
  });

  it('should allow toggling role changes', () => {
    render(<RoomSettingsModal {...defaultProps} />);
    
    const switchElement = screen.getByRole('switch', { name: /allow role changes/i });
    expect(switchElement).toBeChecked();
    
    fireEvent.click(switchElement);
    expect(switchElement).not.toBeChecked();
  });

  it('should allow changing default role', () => {
    render(<RoomSettingsModal {...defaultProps} />);
    
    const selects = screen.getAllByRole('combobox');
    const defaultRoleSelect = selects[1]; // Second combobox is for default role
    fireEvent.click(defaultRoleSelect);
    
    const option = screen.getByText('Player (Collaborator)');
    fireEvent.click(option);
    
    expect(screen.getByText('Player (Collaborator)')).toBeInTheDocument();
  });

  it('should save settings successfully', async () => {
    const mockOnSettingsUpdate = jest.fn();
    const mockOnClose = jest.fn();
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettings)
    });

    render(
      <RoomSettingsModal
        {...defaultProps}
        onSettingsUpdate={mockOnSettingsUpdate}
        onClose={mockOnClose}
      />
    );
    
    // Make a change to enable the save button
    const switchElement = screen.getByRole('switch', { name: /allow spectators/i });
    fireEvent.click(switchElement);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/multiplayer/rooms/room123/role-settings',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
    
    expect(mockOnSettingsUpdate).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle save error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid settings' })
    });

    render(<RoomSettingsModal {...defaultProps} />);
    
    // Make a change to enable the save button
    const switchElement = screen.getByRole('switch', { name: /allow spectators/i });
    fireEvent.click(switchElement);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid settings')).toBeInTheDocument();
    });
  });

  it('should disable save button when no changes', () => {
    render(<RoomSettingsModal {...defaultProps} />);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when changes are made', () => {
    render(<RoomSettingsModal {...defaultProps} />);
    
    const switchElement = screen.getByRole('switch', { name: /allow spectators/i });
    fireEvent.click(switchElement);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('should show error for non-host', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Only room host can modify settings' })
    });

    render(<RoomSettingsModal {...defaultProps} isHost={false} />);
    
    // Make a change to enable the save button
    const switchElement = screen.getByRole('switch', { name: /allow spectators/i });
    fireEvent.click(switchElement);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Only room host can modify settings')).toBeInTheDocument();
    });
  });

  it('should cancel changes on cancel button', () => {
    const mockOnClose = jest.fn();
    
    render(<RoomSettingsModal {...defaultProps} onClose={mockOnClose} />);
    
    const switchElement = screen.getByRole('switch', { name: /allow spectators/i });
    fireEvent.click(switchElement);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should cancel changes on backdrop click', () => {
    const mockOnClose = jest.fn();
    
    render(<RoomSettingsModal {...defaultProps} onClose={mockOnClose} />);
    
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement;
    fireEvent.click(backdrop!);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show loading state during save', async () => {
    (fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve(mockSettings)
      }), 100))
    );

    render(<RoomSettingsModal {...defaultProps} />);
    
    const switchElement = screen.getByRole('switch', { name: /allow spectators/i });
    fireEvent.click(switchElement);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });
});
