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

  it('should render desktop-single layout', () => {
    mockUseDeviceType.mockReturnValue('desktop');
    render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-desktop-single')).toBeInTheDocument();
  });

  it('should render mobile-single layout', () => {
    mockUseDeviceType.mockReturnValue('mobile');
    render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-mobile-single')).toBeInTheDocument();
  });

  it('should treat tablet as mobile-single', () => {
    mockUseDeviceType.mockReturnValue('tablet');
    render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-mobile-single')).toBeInTheDocument();
  });

  it('should switch layouts based on device type', () => {
    mockUseDeviceType.mockReturnValue('desktop');
    const { unmount } = render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-desktop-single')).toBeInTheDocument();
    unmount();

    mockUseDeviceType.mockReturnValue('mobile');
    render(
      <AdaptiveLayout {...mockProps} participantCount={1} roomCode={null} />
    );

    expect(screen.getByTestId('adaptive-mobile-single')).toBeInTheDocument();
  });
});
