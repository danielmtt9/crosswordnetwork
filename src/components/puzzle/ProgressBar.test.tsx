import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('should render with progress information', () => {
    render(<ProgressBar completed={50} total={100} />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should calculate percentage correctly', () => {
    render(<ProgressBar completed={25} total={100} />);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('should handle zero total', () => {
    render(<ProgressBar completed={0} total={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should hide percentage when showPercentage is false', () => {
    render(<ProgressBar completed={50} total={100} showPercentage={false} />);
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });
});
