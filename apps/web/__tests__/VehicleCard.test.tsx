import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VehicleCard } from '@/components/VehicleCard';
import { Vehicle } from '@car-finder/types';
import * as useVehiclesHook from '@/hooks/useVehicles';

// Mock the useVehicles hook
jest.mock('@/hooks/useVehicles');

const mockForceTranslateVehicle = jest.fn();
const mockForceAnalyzeVehicle = jest.fn();

const mockUseVehicles = useVehiclesHook as jest.Mocked<typeof useVehiclesHook>;

// Create a state container to simulate React state
let mockOperationStates: Record<string, any> = {};
let mockFeedback: { type: 'success' | 'error' | null; message: string | null; vehicleId?: string } = {
  type: null,
  message: null,
};

// Store base mock return value
let baseHookReturn: any;

beforeEach(() => {
  // Reset mock states
  mockOperationStates = {};
  mockFeedback = { type: null, message: null };

  const mockSetOperationState = jest.fn((vehicleId: string, operation: string, isLoading: boolean) => {
    if (!mockOperationStates[vehicleId]) {
      mockOperationStates[vehicleId] = {};
    }
    mockOperationStates[vehicleId][operation] = isLoading;
  });

  const mockSetFeedback = jest.fn((type: 'success' | 'error', message: string, vehicleId?: string) => {
    mockFeedback = { type, message, vehicleId };
  });

  baseHookReturn = {
    forceTranslateVehicle: mockForceTranslateVehicle,
    forceAnalyzeVehicle: mockForceAnalyzeVehicle,
    vehicles: [],
    loading: false,
    error: null,
    sortBy: 'priority',
    setSortBy: jest.fn(),
    loadVehicles: jest.fn(),
    loadVehicleById: jest.fn(),
    updateVehicle: jest.fn(),
    clearError: jest.fn(),
    refetch: jest.fn(),
    // New centralized state management properties with dynamic state
    get operationStates() {
      return mockOperationStates;
    },
    setOperationState: mockSetOperationState,
    clearOperationState: jest.fn(),
    get feedback() {
      return mockFeedback;
    },
    setFeedback: mockSetFeedback,
    clearFeedback: jest.fn(() => {
      mockFeedback = { type: null, message: null };
    })
  };

  mockUseVehicles.useVehicles = jest.fn(() => baseHookReturn);
  mockForceTranslateVehicle.mockClear();
  mockForceAnalyzeVehicle.mockClear();
  global.confirm = jest.fn(() => true);
  global.open = jest.fn();
});

const createMockVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: '1',
  source: 'otomoto',
  sourceId: '123',
  sourceUrl: 'https://example.com/vehicle/123',
  sourceCreatedAt: new Date('2024-01-15'),
  sourceTitle: 'Fiat Ducato 2.3 Multijet',
  sourceDescriptionHtml: '<p>Test description</p>',
  sourceParameters: {},
  sourceEquipment: {},
  sourcePhotos: [],
  title: 'Fiat Ducato 2.3 Multijet',
  description: 'Great condition van',
  features: ['air_conditioning', 'cruise_control', 'bluetooth'],
  pricePln: 50000,
  priceEur: 10000,
  year: 2020,
  mileage: 100000,
  sellerInfo: {
    name: 'John Doe',
    id: 'seller123',
    type: 'private',
    location: 'Warsaw',
    memberSince: '2020-01'
  },
  photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
  personalFitScore: 85,
  marketValueScore: '-5%',
  aiPriorityRating: 90,
  aiPrioritySummary: 'Excellent condition with low mileage',
  aiMechanicReport: 'No major issues found',
  virtualMechanicSummary: null,
  aiDataSanityCheck: 'All data looks good',
  distanceFromWroclaw: null,
  status: 'new',
  personalNotes: null,
  isRemovedFromSource: false,
  lastExistenceCheck: null,
  scrapedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

describe('VehicleCard', () => {
  describe('Basic Rendering', () => {
    it('should render vehicle title', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Fiat Ducato 2.3 Multijet')).toBeInTheDocument();
    });

    it('should render vehicle year, mileage, and location', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('2020')).toBeInTheDocument();
      expect(screen.getByText(/100.*km/)).toBeInTheDocument();
      expect(screen.getByText('Warsaw')).toBeInTheDocument();
    });

    it('should render price in PLN and EUR', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      const priceElement = screen.getByText(/PLN/);
      expect(priceElement.textContent).toContain('50');
      expect(priceElement.textContent).toContain('000');
    });

    it('should render seller information', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('private')).toBeInTheDocument();
    });
  });

  describe('AI Scores Display', () => {
    it('should display all AI scores when present', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('90')).toBeInTheDocument(); // aiPriorityRating
      expect(screen.getByText('85')).toBeInTheDocument(); // personalFitScore
      expect(screen.getByText('-5%')).toBeInTheDocument(); // marketValueScore
    });

    it('should display N/A for null AI scores', () => {
      const vehicle = createMockVehicle({
        aiPriorityRating: null,
        personalFitScore: null,
        marketValueScore: null
      });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });

    it('should display aiPrioritySummary when present', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Excellent condition with low mileage')).toBeInTheDocument();
    });

    it('should not display aiPrioritySummary section when null', () => {
      const vehicle = createMockVehicle({ aiPrioritySummary: null });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.queryByText(/Excellent condition/)).not.toBeInTheDocument();
    });
  });

  describe('Features Display', () => {
    it('should display features when present', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText(/Air Conditioning/)).toBeInTheDocument();
      expect(screen.getByText(/Cruise Control/)).toBeInTheDocument();
    });

    it('should display "No features listed" when features array is empty', () => {
      const vehicle = createMockVehicle({ features: [] });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('No features listed')).toBeInTheDocument();
    });

    it('should show "+X more" when there are more than 5 features', () => {
      const vehicle = createMockVehicle({
        features: ['feat1', 'feat2', 'feat3', 'feat4', 'feat5', 'feat6', 'feat7']
      });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });
  });

  describe('Image Carousel', () => {
    it('should render first image by default', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      const img = screen.getByAltText('Fiat Ducato 2.3 Multijet');
      expect(img).toHaveAttribute('src', 'https://example.com/photo1.jpg');
    });

    it('should show image counter', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });

    it('should navigate to next image on button click', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      const nextButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg path[d*="8.25 4.5"]')
      );
      fireEvent.click(nextButton!);
      const img = screen.getByAltText('Fiat Ducato 2.3 Multijet');
      expect(img).toHaveAttribute('src', 'https://example.com/photo2.jpg');
      expect(screen.getByText('2/2')).toBeInTheDocument();
    });

    it('should navigate to previous image on button click', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      const prevButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg path[d*="15.75 19.5"]')
      );
      fireEvent.click(prevButton!);
      const img = screen.getByAltText('Fiat Ducato 2.3 Multijet');
      expect(img).toHaveAttribute('src', 'https://example.com/photo2.jpg');
    });

    it('should show "No Image Available" when photos array is empty', () => {
      const vehicle = createMockVehicle({ photos: [] });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('No Image Available')).toBeInTheDocument();
    });
  });

  describe('Status Dropdown', () => {
    it('should render status dropdown with all options', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      const select = screen.getByDisplayValue('New');
      expect(select).toBeInTheDocument();
    });

    it('should have all status options', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByRole('option', { name: 'New' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Processed' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Skipped' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'To Contact' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Contacted' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'To Visit' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Visited' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Not Interested' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Deleted' })).toBeInTheDocument();
    });
  });

  describe('Status Dropdown Interactions', () => {
    it('should call updateVehicle when status is changed', async () => {
      const mockUpdateVehicle = jest.fn().mockResolvedValue(undefined);
      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...mockUseVehicles.useVehicles(),
        updateVehicle: mockUpdateVehicle,
      });

      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);

      const select = screen.getByDisplayValue('New');
      fireEvent.change(select, { target: { value: 'to_contact' } });

      await waitFor(() => {
        expect(mockUpdateVehicle).toHaveBeenCalledWith('1', { status: 'to_contact' });
      });
    });

    it('should show loading state during status update', async () => {
      const vehicle = createMockVehicle();

      // Override mock to show updating state
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        operationStates: { '1': { isUpdatingStatus: true } },
        updateVehicle: jest.fn(),
      }));

      render(<VehicleCard vehicle={vehicle} />);

      const select = screen.getByDisplayValue('New');
      expect(select).toBeDisabled();
    });

    it('should show success message after status update', async () => {
      const vehicle = createMockVehicle();

      // Override mock to show success feedback
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        feedback: { type: 'success' as const, message: 'Status updated successfully!', vehicleId: '1' },
        updateVehicle: jest.fn(),
      }));

      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Status updated successfully!')).toBeInTheDocument();
    });

    it('should show error message on status update failure', async () => {
      const vehicle = createMockVehicle();

      // Override mock to show error feedback
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        feedback: { type: 'error' as const, message: 'Update failed', vehicleId: '1' },
        updateVehicle: jest.fn(),
      }));

      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });

    it('should re-enable dropdown after status update completes', async () => {
      const mockUpdateVehicle = jest.fn().mockResolvedValue(undefined);
      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...mockUseVehicles.useVehicles(),
        updateVehicle: mockUpdateVehicle,
      });

      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);

      const select = screen.getByDisplayValue('New');
      fireEvent.change(select, { target: { value: 'to_contact' } });

      // Should be enabled after update completes
      await waitFor(() => {
        expect(select).not.toBeDisabled();
      });
    });
  });

  describe('Personal Notes', () => {
    it('should show collapsed notes section with placeholder when notes are null', () => {
      const vehicle = createMockVehicle({ personalNotes: null });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('💭 Add personal notes...')).toBeInTheDocument();
    });

    it('should show collapsed notes section with existing notes', () => {
      const vehicle = createMockVehicle({ personalNotes: 'Great vehicle, need to call seller' });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('📝 Personal Notes')).toBeInTheDocument();
      expect(screen.getByText('Great vehicle, need to call seller')).toBeInTheDocument();
    });

    it('should expand notes section when clicked', () => {
      const vehicle = createMockVehicle({ personalNotes: null });
      render(<VehicleCard vehicle={vehicle} />);

      const notesButton = screen.getByText('💭 Add personal notes...');
      fireEvent.click(notesButton);

      expect(screen.getByPlaceholderText(/Add your thoughts/)).toBeInTheDocument();
      expect(screen.getByText('Save Notes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call updateVehicle when Save Notes is clicked', async () => {
      const mockUpdateVehicle = jest.fn().mockResolvedValue(undefined);
      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...mockUseVehicles.useVehicles(),
        updateVehicle: mockUpdateVehicle,
      });

      const vehicle = createMockVehicle({ personalNotes: null });
      render(<VehicleCard vehicle={vehicle} />);

      // Expand notes section
      fireEvent.click(screen.getByText('💭 Add personal notes...'));

      // Type notes
      const textarea = screen.getByPlaceholderText(/Add your thoughts/);
      fireEvent.change(textarea, { target: { value: 'This is a test note' } });

      // Save notes
      fireEvent.click(screen.getByText('Save Notes'));

      await waitFor(() => {
        expect(mockUpdateVehicle).toHaveBeenCalledWith('1', { personalNotes: 'This is a test note' });
      });
    });

    it('should show loading state during notes save', async () => {
      const vehicle = createMockVehicle({ personalNotes: null });

      // Override mock to show saving state
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        operationStates: { '1': { isSavingNotes: true } },
        updateVehicle: jest.fn(),
      }));

      render(<VehicleCard vehicle={vehicle} />);

      fireEvent.click(screen.getByText('💭 Add personal notes...'));
      const textarea = screen.getByPlaceholderText(/Add your thoughts/);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(textarea).toBeDisabled();
    });

    it('should show success message after notes save', async () => {
      const vehicle = createMockVehicle({ personalNotes: null });

      // Override mock to show success feedback
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        feedback: { type: 'success' as const, message: 'Notes saved successfully!', vehicleId: '1' },
        updateVehicle: jest.fn(),
      }));

      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Notes saved successfully!')).toBeInTheDocument();
    });

    it('should show error message on notes save failure', async () => {
      const vehicle = createMockVehicle({ personalNotes: null });

      // Override mock to show error feedback
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        feedback: { type: 'error' as const, message: 'Failed to save notes', vehicleId: '1' },
        updateVehicle: jest.fn(),
      }));

      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Failed to save notes')).toBeInTheDocument();
    });

    it('should cancel and revert notes when Cancel is clicked', () => {
      const vehicle = createMockVehicle({ personalNotes: 'Original note' });
      render(<VehicleCard vehicle={vehicle} />);

      // Expand notes
      fireEvent.click(screen.getByText('Original note'));

      // Modify notes
      const textarea = screen.getByPlaceholderText(/Add your thoughts/);
      fireEvent.change(textarea, { target: { value: 'Modified note' } });

      // Cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Should show original note in collapsed state
      expect(screen.getByText('Original note')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/Add your thoughts/)).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show action buttons for not_interested status', () => {
      const vehicle = createMockVehicle({ status: 'not_interested' });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Force Translate')).toBeInTheDocument();
      expect(screen.getByText('Force Analyze')).toBeInTheDocument();
    });

    it('should show action buttons when description is missing', () => {
      const vehicle = createMockVehicle({ description: '' });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Force Translate')).toBeInTheDocument();
      expect(screen.getByText('Force Analyze')).toBeInTheDocument();
    });

    it('should show action buttons when aiPriorityRating is null', () => {
      const vehicle = createMockVehicle({ aiPriorityRating: null });
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Force Translate')).toBeInTheDocument();
      expect(screen.getByText('Force Analyze')).toBeInTheDocument();
    });

    it('should not show action buttons for complete vehicles with good status', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.queryByText('Force Translate')).not.toBeInTheDocument();
      expect(screen.queryByText('Force Analyze')).not.toBeInTheDocument();
    });

    it('should call forceTranslateVehicle on Force Translate button click', async () => {
      const vehicle = createMockVehicle({ status: 'not_interested' });
      mockForceTranslateVehicle.mockResolvedValue(undefined);
      render(<VehicleCard vehicle={vehicle} />);

      const translateButton = screen.getByText('Force Translate');
      fireEvent.click(translateButton);

      await waitFor(() => {
        expect(mockForceTranslateVehicle).toHaveBeenCalledWith('1');
      });
    });

    it('should call forceAnalyzeVehicle on Force Analyze button click', async () => {
      const vehicle = createMockVehicle({ status: 'not_interested' });
      mockForceAnalyzeVehicle.mockResolvedValue(undefined);
      render(<VehicleCard vehicle={vehicle} />);

      const analyzeButton = screen.getByText('Force Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(mockForceAnalyzeVehicle).toHaveBeenCalledWith('1');
      });
    });

    it('should show loading state during translation', async () => {
      const vehicle = createMockVehicle({ status: 'not_interested' });

      // Override mock to show translating state
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        operationStates: { '1': { isTranslating: true } },
      }));

      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Translating...')).toBeInTheDocument();
    });

    it('should show loading state during analysis', async () => {
      const vehicle = createMockVehicle({ status: 'not_interested' });

      // Override mock to show analyzing state
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        operationStates: { '1': { isAnalyzing: true } },
      }));

      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });

    it('should show success message after successful translation', async () => {
      const vehicle = createMockVehicle({ status: 'not_interested' });

      // Override mock to show success feedback
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        feedback: { type: 'success' as const, message: 'Vehicle translated successfully!', vehicleId: '1' },
      }));

      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText('Vehicle translated successfully!')).toBeInTheDocument();
    });

    it('should show error message on translation failure', async () => {
      const vehicle = createMockVehicle({ status: 'not_interested' });

      // Override mock to show error feedback
      mockUseVehicles.useVehicles = jest.fn(() => ({
        ...baseHookReturn,
        feedback: { type: 'error' as const, message: 'Translation failed', vehicleId: '1' },
      }));

      render(<VehicleCard vehicle={vehicle} />);
      expect(screen.getByText(/Translation failed/)).toBeInTheDocument();
    });

    it('should not call API if user cancels confirmation', async () => {
      global.confirm = jest.fn(() => false);
      const vehicle = createMockVehicle({ status: 'not_interested' });
      render(<VehicleCard vehicle={vehicle} />);

      const translateButton = screen.getByText('Force Translate');
      fireEvent.click(translateButton);

      await waitFor(() => {
        expect(mockForceTranslateVehicle).not.toHaveBeenCalled();
      });
    });
  });

  describe('Original Post Link', () => {
    it('should open original post in new tab on click', () => {
      const vehicle = createMockVehicle();
      render(<VehicleCard vehicle={vehicle} />);

      const linkButton = screen.getByText('otomoto');
      fireEvent.click(linkButton);

      expect(global.open).toHaveBeenCalledWith('https://example.com/vehicle/123', '_blank');
    });
  });
});
