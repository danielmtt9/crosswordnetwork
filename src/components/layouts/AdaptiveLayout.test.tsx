import { render, screen } from '@testing-library/react';
import { AdaptiveLayout } from './AdaptiveLayout';
import * as useDeviceTypeModule from '@/hooks/useDeviceType';
import { Clue } from '@/components/puzzle/CluesPanel';

jest.mock('@/hooks/useDeviceType');

const mockUseDeviceType = useDeviceTypeModule.useDeviceType as jest.MockedFunction<
  typeof useDeviceTypeModule.useDeviceType
>;

describe('AdaptiveLayout', () => {
  const mockProps = {
    puzzleUrl: 'https://example.com/puzzle.html',
    acrossClues: [{ number: 1, text: 'Test clue' }] as Clue[],
    downClues: [{ number: 1, text: 'Test down' }] as Clue[],
    progressCompleted: 50,
    progressTotal: 100,
    saveStatus: 'saved' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render desktop-multiplayer layout', () => {
    mockUseDeviceType.mockReturnValue('desktop');
    render(
      <AdaptiveLayout
        {...mockProps}
        participantCount={2}
        roomCode="TEST123"
        multiplayerPanel={<div>Multiplayer</div>}
      />
    );

    expect(screen.getByTestId('adaptive-desktop-multiplayer')).toBeInTheDocument();
  });

  it('should render desktop-single layout', () => {
    mockUseDeviceType.mockReturnValue('desktop');
    render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-desktop-single')).toBeInTheDocument();
  });

  it('should render mobile-multiplayer layout', () => {
    mockUseDeviceType.mockReturnValue('mobile');
    render(
      <AdaptiveLayout
        {...mockProps}
        participantCount={2}
        roomCode="TEST123"
        chatPanel={<div>Chat</div>}
        playersPanel={<div>Players</div>}
      />
    );

    expect(screen.getByTestId('adaptive-mobile-multiplayer')).toBeInTheDocument();
  });

  it('should render mobile-single layout', () => {
    mockUseDeviceType.mockReturnValue('mobile');
    render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-mobile-single')).toBeInTheDocument();
  });

  it('should treat tablet as mobile-multiplayer', () => {
    mockUseDeviceType.mockReturnValue('tablet');
    render(
      <AdaptiveLayout {...mockProps} participantCount={2} roomCode="TEST123" />
    );

    expect(screen.getByTestId('adaptive-mobile-multiplayer')).toBeInTheDocument();
  });

  it('should treat tablet as mobile-single', () => {
    mockUseDeviceType.mockReturnValue('tablet');
    render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-mobile-single')).toBeInTheDocument();
  });

  it('should switch layouts based on device type', () => {
    // Test that different device types render different layouts
    mockUseDeviceType.mockReturnValue('desktop');
    const { unmount } = render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-desktop-single')).toBeInTheDocument();
    unmount();

    // Render again with mobile device type
    mockUseDeviceType.mockReturnValue('mobile');
    render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-mobile-single')).toBeInTheDocument();
  });

  it('should switch layouts based on game mode', () => {
    // Test that different game modes render different layouts
    mockUseDeviceType.mockReturnValue('desktop');
    const { unmount } = render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-desktop-single')).toBeInTheDocument();
    unmount();

    // Render again with multiplayer
    render(
      <AdaptiveLayout
        {...mockProps}
        participantCount={2}
        roomCode="TEST123"
        multiplayerPanel={<div>Multiplayer</div>}
      />
    );

    expect(screen.getByTestId('adaptive-desktop-multiplayer')).toBeInTheDocument();
  });
});
