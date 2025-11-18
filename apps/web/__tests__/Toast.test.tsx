import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { Toast } from '@/components/Toast';

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render toast with message', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-notification')).toBeInTheDocument();
  });

  it('should render warning toast with correct styling', () => {
    const onClose = jest.fn();
    render(<Toast message="Warning message" type="warning" onClose={onClose} />);

    const toast = screen.getByTestId('toast-notification');
    expect(toast).toHaveClass('bg-orange-50', 'border-orange-300', 'text-orange-900');
  });

  it('should render error toast with correct styling', () => {
    const onClose = jest.fn();
    render(<Toast message="Error message" type="error" onClose={onClose} />);

    const toast = screen.getByTestId('toast-notification');
    expect(toast).toHaveClass('bg-red-50', 'border-red-300', 'text-red-900');
  });

  it('should render success toast with correct styling', () => {
    const onClose = jest.fn();
    render(<Toast message="Success message" type="success" onClose={onClose} />);

    const toast = screen.getByTestId('toast-notification');
    expect(toast).toHaveClass('bg-green-50', 'border-green-300', 'text-green-900');
  });

  it('should render info toast with correct styling by default', () => {
    const onClose = jest.fn();
    render(<Toast message="Info message" onClose={onClose} />);

    const toast = screen.getByTestId('toast-notification');
    expect(toast).toHaveClass('bg-blue-50', 'border-blue-300', 'text-blue-900');
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();

    render(<Toast message="Test message" onClose={onClose} />);

    const closeButton = screen.getByTestId('toast-close-button');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should auto-close after duration', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" duration={3000} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    // Fast-forward time by 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not auto-close if duration is 0', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" duration={0} onClose={onClose} />);

    // Fast-forward time by 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} />);

    const toast = screen.getByTestId('toast-notification');
    expect(toast).toHaveAttribute('role', 'alert');

    const closeButton = screen.getByTestId('toast-close-button');
    expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
  });
});
