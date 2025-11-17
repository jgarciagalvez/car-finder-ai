import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VehicleDashboard } from '@/components/VehicleDashboard';
import { Vehicle } from '@car-finder/types';
import * as useVehiclesHook from '@/hooks/useVehicles';

// Mock the useVehicles hook
jest.mock('@/hooks/useVehicles');
// Mock VehicleCard component
jest.mock('@/components/VehicleCard', () => ({
  VehicleCard: ({ vehicle }: { vehicle: Vehicle }) => (
    <div data-testid={`vehicle-card-${vehicle.id}`}>{vehicle.title}</div>
  )
}));

const mockUseVehicles = useVehiclesHook as jest.Mocked<typeof useVehiclesHook>;

// Base mock properties for useVehicles
const baseMockUseVehicles = {
  vehicles: [],
  filteredVehicles: [],
  allVehicles: [],
  loading: false,
  error: null,
  sortBy: 'priority' as const,
  statusFilter: null,
  vehiclesToRender: 50,
  loadMoreForRendering: jest.fn(),
  setVehiclesToRender: jest.fn(),
  clearError: jest.fn(),
  forceTranslateVehicle: jest.fn(),
  forceAnalyzeVehicle: jest.fn(),
  showNotInterested: false,
  recentlyHiddenVehicles: new Map(),
  dismissedPlaceholders: new Set(),
  dismissPlaceholder: jest.fn(),
};

const createMockVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: '1',
  source: 'otomoto',
  sourceId: '123',
  sourceUrl: 'https://example.com',
  sourceCreatedAt: new Date(),
  sourceTitle: 'Test Vehicle',
  sourceDescriptionHtml: '<p>Test</p>',
  sourceParameters: {},
  sourceEquipment: {},
  sourcePhotos: [],
  title: 'Test Vehicle',
  description: 'Test description',
  features: [],
  pricePln: 50000,
  priceEur: 10000,
  year: 2020,
  mileage: 100000,
  sellerInfo: { name: 'Test', id: '1', type: 'private', location: 'Warsaw', memberSince: '2020' },
  photos: [],
  personalFitScore: 80,
  marketValueScore: '-5%',
  aiPriorityRating: 85,
  aiPrioritySummary: 'Good deal',
  aiMechanicReport: 'No issues',
  virtualMechanicSummary: null,
  aiDataSanityCheck: 'OK',
  distanceFromWroclaw: null,
  status: 'new',
  personalNotes: null,
  scrapedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

describe('VehicleDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading', () => {
      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        loading: true
      });

      render(<VehicleDashboard />);
      expect(screen.getByText('Loading vehicles...')).toBeInTheDocument();
    });

    it('should display spinner animation when loading', () => {
      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        loading: true
      });

      render(<VehicleDashboard />);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when there is an error', () => {
      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        error: 'Failed to load vehicles'
      });

      render(<VehicleDashboard />);
      expect(screen.getByText('Error loading vehicles')).toBeInTheDocument();
      expect(screen.getByText('Failed to load vehicles')).toBeInTheDocument();
    });

    it('should have dismiss button on error', () => {
      const mockClearError = jest.fn();
      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        error: 'Failed to load vehicles',
        clearError: mockClearError
      });

      render(<VehicleDashboard />);
      const dismissButton = screen.getByText('Dismiss');
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no vehicles', () => {
      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles
      });

      render(<VehicleDashboard />);
      expect(screen.getByText('No vehicles found')).toBeInTheDocument();
      expect(screen.getByText(/No vehicles have been scraped yet/)).toBeInTheDocument();
    });
  });

  describe('Vehicle Display', () => {
    it('should render vehicle cards when vehicles are loaded', () => {
      const vehicles = [
        createMockVehicle({ id: '1', title: 'Vehicle 1' }),
        createMockVehicle({ id: '2', title: 'Vehicle 2' }),
        createMockVehicle({ id: '3', title: 'Vehicle 3' })
      ];

      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        vehicles,
        filteredVehicles: vehicles,
        allVehicles: vehicles
      });

      render(<VehicleDashboard />);
      expect(screen.getByTestId('vehicle-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('vehicle-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('vehicle-card-3')).toBeInTheDocument();
    });

    it('should render correct number of vehicle cards', () => {
      const vehicles = Array.from({ length: 10 }, (_, i) =>
        createMockVehicle({ id: `${i + 1}`, title: `Vehicle ${i + 1}` })
      );

      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        vehicles,
        filteredVehicles: vehicles,
        allVehicles: vehicles
      });

      render(<VehicleDashboard />);
      vehicles.forEach((_, index) => {
        expect(screen.getByTestId(`vehicle-card-${index + 1}`)).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should apply sorting to vehicles', () => {
      // Now vehicles come pre-sorted from the hook
      const vehicles = [
        createMockVehicle({ id: '2', aiPriorityRating: 90 }),
        createMockVehicle({ id: '3', aiPriorityRating: 80 }),
        createMockVehicle({ id: '1', aiPriorityRating: 70 })
      ];

      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        vehicles,
        filteredVehicles: vehicles,
        allVehicles: vehicles
      });

      const { container } = render(<VehicleDashboard />);
      const cards = container.querySelectorAll('[data-testid^="vehicle-card-"]');

      // Vehicles should be rendered in the order they come from the hook
      expect(cards[0]).toHaveAttribute('data-testid', 'vehicle-card-2'); // 90
      expect(cards[1]).toHaveAttribute('data-testid', 'vehicle-card-3'); // 80
      expect(cards[2]).toHaveAttribute('data-testid', 'vehicle-card-1'); // 70
    });

    it('should push not_interested vehicles to end when sorting by priority', () => {
      // Now vehicles come pre-sorted from the hook
      const vehicles = [
        createMockVehicle({ id: '1', aiPriorityRating: 90, status: 'new' }),
        createMockVehicle({ id: '3', aiPriorityRating: 85, status: 'new' }),
        createMockVehicle({ id: '2', aiPriorityRating: 95, status: 'not_interested' })
      ];

      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        vehicles,
        filteredVehicles: vehicles,
        allVehicles: vehicles
      });

      const { container } = render(<VehicleDashboard />);
      const cards = container.querySelectorAll('[data-testid^="vehicle-card-"]');

      // Vehicles should be rendered in the order they come from the hook
      expect(cards[0]).toHaveAttribute('data-testid', 'vehicle-card-1'); // 90, new
      expect(cards[1]).toHaveAttribute('data-testid', 'vehicle-card-3'); // 85, new
      expect(cards[2]).toHaveAttribute('data-testid', 'vehicle-card-2'); // 95, not_interested
    });

    it('should sort by price ascending', () => {
      // Now vehicles come pre-sorted from the hook
      const vehicles = [
        createMockVehicle({ id: '2', priceEur: 10000 }),
        createMockVehicle({ id: '1', priceEur: 15000 }),
        createMockVehicle({ id: '3', priceEur: 20000 })
      ];

      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        vehicles,
        filteredVehicles: vehicles,
        allVehicles: vehicles,
        sortBy: 'price_asc'
      });

      const { container } = render(<VehicleDashboard />);
      const cards = container.querySelectorAll('[data-testid^="vehicle-card-"]');

      expect(cards[0]).toHaveAttribute('data-testid', 'vehicle-card-2'); // 10000
      expect(cards[1]).toHaveAttribute('data-testid', 'vehicle-card-1'); // 15000
      expect(cards[2]).toHaveAttribute('data-testid', 'vehicle-card-3'); // 20000
    });

    it('should sort by price descending', () => {
      // Now vehicles come pre-sorted from the hook
      const vehicles = [
        createMockVehicle({ id: '3', priceEur: 20000 }),
        createMockVehicle({ id: '1', priceEur: 15000 }),
        createMockVehicle({ id: '2', priceEur: 10000 })
      ];

      mockUseVehicles.useVehicles = jest.fn().mockReturnValue({
        ...baseMockUseVehicles,
        vehicles,
        filteredVehicles: vehicles,
        allVehicles: vehicles,
        sortBy: 'price_desc'
      });

      const { container } = render(<VehicleDashboard />);
      const cards = container.querySelectorAll('[data-testid^="vehicle-card-"]');

      expect(cards[0]).toHaveAttribute('data-testid', 'vehicle-card-3'); // 20000
      expect(cards[1]).toHaveAttribute('data-testid', 'vehicle-card-1'); // 15000
      expect(cards[2]).toHaveAttribute('data-testid', 'vehicle-card-2'); // 10000
    });
  });
});
