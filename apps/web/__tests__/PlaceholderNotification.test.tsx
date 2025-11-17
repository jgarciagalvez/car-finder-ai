import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlaceholderNotification } from '@/components/PlaceholderNotification';

describe('PlaceholderNotification', () => {
  const defaultProps = {
    vehicleId: 'vehicle-123',
    message: 'Vehicle Added to Not Interested List',
    onDismiss: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the notification with message', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      expect(screen.getByText('Vehicle Added to Not Interested List')).toBeInTheDocument();
    });

    it('should render dismiss button', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();
    });

    it('should display deleted message', () => {
      render(
        <PlaceholderNotification
          {...defaultProps}
          message="Vehicle Deleted"
        />
      );
      expect(screen.getByText('Vehicle Deleted')).toBeInTheDocument();
    });

    it('should have subtle gray background styling', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      const notification = screen.getByText('Vehicle Added to Not Interested List').closest('div');
      expect(notification).toHaveClass('bg-gray-100');
    });

    it('should have border styling', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      const notification = screen.getByText('Vehicle Added to Not Interested List').closest('div');
      expect(notification).toHaveClass('border', 'border-gray-200');
    });

    it('should be slim with proper padding', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      const notification = screen.getByText('Vehicle Added to Not Interested List').closest('div');
      expect(notification).toHaveClass('p-3');
    });
  });

  describe('Dismiss Functionality', () => {
    it('should call onDismiss with vehicleId when X button is clicked', () => {
      const onDismiss = jest.fn();
      render(
        <PlaceholderNotification
          {...defaultProps}
          vehicleId="vehicle-456"
          onDismiss={onDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledWith('vehicle-456');
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should handle different vehicle IDs', () => {
      const onDismiss = jest.fn();
      render(
        <PlaceholderNotification
          {...defaultProps}
          vehicleId="abc-789"
          onDismiss={onDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledWith('abc-789');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible dismiss button', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Dismiss notification');
    });

    it('should have proper text contrast', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      const message = screen.getByText('Vehicle Added to Not Interested List');
      expect(message).toHaveClass('text-gray-600');
    });
  });

  describe('Styling', () => {
    it('should have rounded corners', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      const notification = screen.getByText('Vehicle Added to Not Interested List').closest('div');
      expect(notification).toHaveClass('rounded-lg');
    });

    it('should use flexbox for layout', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      const notification = screen.getByText('Vehicle Added to Not Interested List').closest('div');
      expect(notification).toHaveClass('flex', 'justify-between', 'items-center');
    });

    it('should have small text size', () => {
      render(<PlaceholderNotification {...defaultProps} />);
      const message = screen.getByText('Vehicle Added to Not Interested List');
      expect(message).toHaveClass('text-sm');
    });
  });
});
