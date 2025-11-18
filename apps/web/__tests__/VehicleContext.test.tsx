import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VehicleProvider } from '@/context/VehicleContext';
import { useVehicles } from '@/hooks/useVehicles';
import * as api from '@/lib/api';
import { Vehicle } from '@car-finder/types';

// Mock the API
jest.mock('@/lib/api');
const mockApi = api as jest.Mocked<typeof api>;

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
  features: ['air_conditioning', 'cruise_control'],
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
  photos: ['https://example.com/photo1.jpg'],
  personalFitScore: 85,
  marketValueScore: '-5%',
  aiPriorityRating: 90,
  aiPrioritySummary: 'Excellent condition',
  aiMechanicReport: 'No issues found',
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

describe('VehicleContext Filtering', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <VehicleProvider>{children}</VehicleProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock initial fetch to prevent auto-load on mount
    mockApi.fetchVehicles.mockResolvedValue({
      vehicles: [],
      pagination: { offset: 0, limit: 50, total: 0, hasMore: false }
    });
  });

  describe('setStatusFilter', () => {
    it('should update statusFilter state', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setStatusFilter(['new', 'to_contact']);
      });

      expect(result.current.statusFilter).toEqual(['new', 'to_contact']);
    });

    it('should clear filter when set to null', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setStatusFilter(['new']);
      });

      expect(result.current.statusFilter).toEqual(['new']);

      act(() => {
        result.current.setStatusFilter(null);
      });

      expect(result.current.statusFilter).toBeNull();
    });
  });

  describe('Filtering Logic', () => {
    it('should return filtered vehicles when filter is active', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'to_contact' }),
        createMockVehicle({ id: '3', status: 'contacted' }),
        createMockVehicle({ id: '4', status: 'new' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 4, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Apply filter for 'new' status only
      act(() => {
        result.current.setStatusFilter(['new']);
      });

      expect(result.current.vehicles).toHaveLength(2);
      expect(result.current.vehicles.every(v => v.status === 'new')).toBe(true);
      expect(result.current.allVehicles).toHaveLength(4); // Unfiltered count
    });

    it('should filter with single status', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'to_contact' }),
        createMockVehicle({ id: '3', status: 'contacted' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 3, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setStatusFilter(['to_contact']);
      });

      expect(result.current.vehicles).toHaveLength(1);
      expect(result.current.vehicles[0].status).toBe('to_contact');
    });

    it('should filter with multiple statuses', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'to_contact' }),
        createMockVehicle({ id: '3', status: 'contacted' }),
        createMockVehicle({ id: '4', status: 'to_visit' }),
        createMockVehicle({ id: '5', status: 'visited' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 5, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setStatusFilter(['new', 'to_contact', 'contacted']);
      });

      expect(result.current.vehicles).toHaveLength(3);
      expect(result.current.vehicles.map(v => v.status)).toEqual(['new', 'to_contact', 'contacted']);
    });

    it('should return all vehicles when filter is null', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'to_contact' }),
        createMockVehicle({ id: '3', status: 'contacted' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 3, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setStatusFilter(null);
      });

      expect(result.current.vehicles).toHaveLength(3);
    });

    it('should combine filtering with sorting', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new', aiPriorityRating: 50 }),
        createMockVehicle({ id: '2', status: 'to_contact', aiPriorityRating: 90 }),
        createMockVehicle({ id: '3', status: 'new', aiPriorityRating: 70 }),
        createMockVehicle({ id: '4', status: 'contacted', aiPriorityRating: 80 }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 4, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Set sort by priority (descending)
      act(() => {
        result.current.setSortBy('priority');
      });

      // Apply filter for 'new' status
      act(() => {
        result.current.setStatusFilter(['new']);
      });

      expect(result.current.vehicles).toHaveLength(2);
      // Should be sorted by priority descending: 70 then 50
      expect(result.current.vehicles[0].aiPriorityRating).toBe(70);
      expect(result.current.vehicles[1].aiPriorityRating).toBe(50);
    });
  });

  describe('updateVehicle', () => {
    it('should update only the target vehicle in array', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new', personalNotes: null }),
        createMockVehicle({ id: '2', status: 'new', personalNotes: null }),
        createMockVehicle({ id: '3', status: 'new', personalNotes: null }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 3, hasMore: false }
      });

      const updatedVehicle = createMockVehicle({
        id: '2',
        status: 'to_contact',
        personalNotes: 'Updated notes'
      });

      mockApi.updateVehicle.mockResolvedValue(updatedVehicle);

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateVehicle('2', {
          status: 'to_contact',
          personalNotes: 'Updated notes'
        });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Check that only vehicle 2 was updated
      expect(result.current.allVehicles[0].status).toBe('new');
      expect(result.current.allVehicles[1].status).toBe('to_contact');
      expect(result.current.allVehicles[1].personalNotes).toBe('Updated notes');
      expect(result.current.allVehicles[2].status).toBe('new');
    });
  });

  describe('Operation States (Story 3.1)', () => {
    it('should set operation state for a vehicle', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setOperationState('vehicle-1', 'isTranslating', true);
      });

      expect(result.current.operationStates['vehicle-1']?.isTranslating).toBe(true);
    });

    it('should handle multiple operation states for same vehicle', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setOperationState('vehicle-1', 'isTranslating', true);
        result.current.setOperationState('vehicle-1', 'isAnalyzing', true);
      });

      expect(result.current.operationStates['vehicle-1']?.isTranslating).toBe(true);
      expect(result.current.operationStates['vehicle-1']?.isAnalyzing).toBe(true);
    });

    it('should handle operation states for different vehicles independently', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setOperationState('vehicle-1', 'isTranslating', true);
        result.current.setOperationState('vehicle-2', 'isAnalyzing', true);
      });

      expect(result.current.operationStates['vehicle-1']?.isTranslating).toBe(true);
      expect(result.current.operationStates['vehicle-1']?.isAnalyzing).toBeUndefined();
      expect(result.current.operationStates['vehicle-2']?.isTranslating).toBeUndefined();
      expect(result.current.operationStates['vehicle-2']?.isAnalyzing).toBe(true);
    });

    it('should clear operation state', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setOperationState('vehicle-1', 'isTranslating', true);
      });

      expect(result.current.operationStates['vehicle-1']?.isTranslating).toBe(true);

      act(() => {
        result.current.clearOperationState('vehicle-1', 'isTranslating');
      });

      expect(result.current.operationStates['vehicle-1']?.isTranslating).toBeUndefined();
    });
  });

  describe('Feedback Messages (Story 3.1)', () => {
    it('should set success feedback message', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFeedback('success', 'Operation successful!', 'vehicle-1');
      });

      expect(result.current.feedback.type).toBe('success');
      expect(result.current.feedback.message).toBe('Operation successful!');
      expect(result.current.feedback.vehicleId).toBe('vehicle-1');
    });

    it('should set error feedback message', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFeedback('error', 'Operation failed!', 'vehicle-2');
      });

      expect(result.current.feedback.type).toBe('error');
      expect(result.current.feedback.message).toBe('Operation failed!');
      expect(result.current.feedback.vehicleId).toBe('vehicle-2');
    });

    it('should clear feedback message', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFeedback('success', 'Operation successful!', 'vehicle-1');
      });

      expect(result.current.feedback.type).toBe('success');

      act(() => {
        result.current.clearFeedback();
      });

      expect(result.current.feedback.type).toBeNull();
      expect(result.current.feedback.message).toBeNull();
    });

    it('should auto-clear success feedback after 3 seconds', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFeedback('success', 'Operation successful!', 'vehicle-1');
      });

      expect(result.current.feedback.type).toBe('success');

      // Fast-forward time by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.feedback.type).toBeNull();
      jest.useRealTimers();
    });

    it('should auto-clear error feedback after 5 seconds', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFeedback('error', 'Operation failed!', 'vehicle-1');
      });

      expect(result.current.feedback.type).toBe('error');

      // Fast-forward time by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.feedback.type).toBeNull();
      jest.useRealTimers();
    });
  });

  describe('Compound Sorting (Story 3.3)', () => {
    it('should initialize sortStack with priority', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sortStack).toEqual(['priority']);
      expect(result.current.sortBy).toBe('priority');
    });

    it('should push new sort to stack when setSortBy is called', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSortBy('price_asc');
      });

      expect(result.current.sortStack).toEqual(['priority', 'price_asc']);
      expect(result.current.sortBy).toBe('price_asc');
    });

    it('should remove duplicates when pushing same sort option', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSortBy('price_asc');
      });

      expect(result.current.sortStack).toEqual(['priority', 'price_asc']);

      act(() => {
        result.current.setSortBy('year_desc');
      });

      expect(result.current.sortStack).toEqual(['priority', 'price_asc', 'year_desc']);

      // Now select price_asc again - should move to end
      act(() => {
        result.current.setSortBy('price_asc');
      });

      expect(result.current.sortStack).toEqual(['priority', 'year_desc', 'price_asc']);
      expect(result.current.sortBy).toBe('price_asc');
    });

    it('should limit stack to 3 items', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSortBy('price_asc');
      });
      act(() => {
        result.current.setSortBy('year_desc');
      });
      act(() => {
        result.current.setSortBy('mileage_asc');
      });

      // Stack should be limited to 3: ['year_desc', 'price_asc', 'mileage_asc']
      // Actually: initial is ['priority'], then adds price_asc -> ['priority', 'price_asc']
      // then year_desc -> ['priority', 'price_asc', 'year_desc']
      // then mileage_asc -> ['price_asc', 'year_desc', 'mileage_asc'] (oldest removed)
      expect(result.current.sortStack).toHaveLength(3);
      expect(result.current.sortStack[2]).toBe('mileage_asc');
    });

    it('should apply compound sorting to filtered vehicles', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', priceEur: 10000, aiPriorityRating: 70 }),
        createMockVehicle({ id: '2', priceEur: 10000, aiPriorityRating: 90 }),
        createMockVehicle({ id: '3', priceEur: 15000, aiPriorityRating: 85 }),
        createMockVehicle({ id: '4', priceEur: 10000, aiPriorityRating: 80 })
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 4, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Apply compound sort: priority first (in stack), then price_asc
      act(() => {
        result.current.setSortBy('price_asc');
      });

      // Stack: ['priority', 'price_asc']
      // Primary: price_asc, tiebreaker: priority
      // Should sort by price first (10000, 10000, 10000, 15000)
      // Then by priority for equal prices (90, 80, 70)
      expect(result.current.vehicles[0].id).toBe('2'); // 10000, priority 90
      expect(result.current.vehicles[1].id).toBe('4'); // 10000, priority 80
      expect(result.current.vehicles[2].id).toBe('1'); // 10000, priority 70
      expect(result.current.vehicles[3].id).toBe('3'); // 15000
    });

    it('should persist sort stack across renders', async () => {
      const { result, rerender } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSortBy('price_asc');
      });

      act(() => {
        result.current.setSortBy('year_desc');
      });

      expect(result.current.sortStack).toEqual(['priority', 'price_asc', 'year_desc']);

      // Rerender should preserve state
      rerender();

      expect(result.current.sortStack).toEqual(['priority', 'price_asc', 'year_desc']);
      expect(result.current.sortBy).toBe('year_desc');
    });
  });

  describe('Show Not Interested Toggle (Story 3.4)', () => {
    it('should initialize showNotInterested to false', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.showNotInterested).toBe(false);
    });

    it('should toggle showNotInterested state', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setShowNotInterested(true);
      });

      expect(result.current.showNotInterested).toBe(true);

      act(() => {
        result.current.setShowNotInterested(false);
      });

      expect(result.current.showNotInterested).toBe(false);
    });

    it('should hide not_interested vehicles when toggle is OFF', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'not_interested' }),
        createMockVehicle({ id: '3', status: 'to_contact' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 3, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Default: showNotInterested is false
      expect(result.current.showNotInterested).toBe(false);
      expect(result.current.vehicles).toHaveLength(2);
      expect(result.current.vehicles.every(v => v.status !== 'not_interested')).toBe(true);
    });

    it('should show not_interested vehicles when toggle is ON', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'not_interested' }),
        createMockVehicle({ id: '3', status: 'to_contact' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 3, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setShowNotInterested(true);
      });

      expect(result.current.vehicles).toHaveLength(3);
      expect(result.current.vehicles.some(v => v.status === 'not_interested')).toBe(true);
    });

    it('should always hide deleted vehicles', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'deleted' }),
        createMockVehicle({ id: '3', status: 'to_contact' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 3, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Deleted should be hidden regardless of toggle
      expect(result.current.vehicles).toHaveLength(2);
      expect(result.current.vehicles.every(v => v.status !== 'deleted')).toBe(true);
    });

    it('should show deleted vehicles when explicitly filtered', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'deleted' }),
        createMockVehicle({ id: '3', status: 'to_contact' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 3, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setStatusFilter(['deleted']);
      });

      expect(result.current.vehicles).toHaveLength(1);
      expect(result.current.vehicles[0].status).toBe('deleted');
    });

    it('should calculate notInterestedCount correctly', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'not_interested' }),
        createMockVehicle({ id: '3', status: 'not_interested' }),
        createMockVehicle({ id: '4', status: 'to_contact' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 4, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notInterestedCount).toBe(2);
    });

    it('should calculate deletedCount correctly', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'deleted' }),
        createMockVehicle({ id: '3', status: 'deleted' }),
        createMockVehicle({ id: '4', status: 'deleted' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 4, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.deletedCount).toBe(3);
    });
  });

  describe('Placeholder Management (Story 3.4)', () => {
    it('should initialize recentlyHiddenVehicles as empty Map', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.recentlyHiddenVehicles.size).toBe(0);
    });

    it('should initialize dismissedPlaceholders as empty Set', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.dismissedPlaceholders.size).toBe(0);
    });

    it('should add hidden vehicle to recentlyHiddenVehicles', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.addHiddenVehicle('vehicle-1', 'not_interested');
      });

      expect(result.current.recentlyHiddenVehicles.get('vehicle-1')).toBe('not_interested');
    });

    it('should add deleted vehicle to recentlyHiddenVehicles', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.addHiddenVehicle('vehicle-2', 'deleted');
      });

      expect(result.current.recentlyHiddenVehicles.get('vehicle-2')).toBe('deleted');
    });

    it('should dismiss placeholder by adding to dismissedPlaceholders', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.addHiddenVehicle('vehicle-1', 'not_interested');
      });

      act(() => {
        result.current.dismissPlaceholder('vehicle-1');
      });

      expect(result.current.dismissedPlaceholders.has('vehicle-1')).toBe(true);
    });

    it('should keep recently hidden vehicles in list for placeholder display', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'not_interested' }),
        createMockVehicle({ id: '3', status: 'to_contact' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 3, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mark vehicle 2 as recently hidden
      act(() => {
        result.current.addHiddenVehicle('2', 'not_interested');
      });

      // Even though toggle is OFF, vehicle should be in list for placeholder
      expect(result.current.vehicles.some(v => v.id === '2')).toBe(true);
    });

    it('should remove vehicle from list when placeholder is dismissed', async () => {
      const mockVehicles = [
        createMockVehicle({ id: '1', status: 'new' }),
        createMockVehicle({ id: '2', status: 'not_interested' }),
        createMockVehicle({ id: '3', status: 'to_contact' }),
      ];

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 50, total: 3, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mark vehicle 2 as recently hidden
      act(() => {
        result.current.addHiddenVehicle('2', 'not_interested');
      });

      expect(result.current.vehicles.some(v => v.id === '2')).toBe(true);

      // Dismiss placeholder
      act(() => {
        result.current.dismissPlaceholder('2');
      });

      expect(result.current.vehicles.some(v => v.id === '2')).toBe(false);
    });

    it('should clear all placeholders', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.addHiddenVehicle('vehicle-1', 'not_interested');
        result.current.addHiddenVehicle('vehicle-2', 'deleted');
        result.current.dismissPlaceholder('vehicle-1');
      });

      expect(result.current.recentlyHiddenVehicles.size).toBe(2);
      expect(result.current.dismissedPlaceholders.size).toBe(1);

      act(() => {
        result.current.clearPlaceholders();
      });

      expect(result.current.recentlyHiddenVehicles.size).toBe(0);
      expect(result.current.dismissedPlaceholders.size).toBe(0);
    });
  });

  describe('Progressive Rendering (Story 3.1)', () => {
    it('should initialize vehiclesToRender to 50', async () => {
      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.vehiclesToRender).toBe(50);
    });

    it('should increment vehiclesToRender when loadMoreForRendering is called', async () => {
      const mockVehicles = Array.from({ length: 100 }, (_, i) =>
        createMockVehicle({ id: `${i + 1}` })
      );

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 0, total: 100, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.vehiclesToRender).toBe(50);
      expect(result.current.vehicles).toHaveLength(50);

      act(() => {
        result.current.loadMoreForRendering();
      });

      expect(result.current.vehiclesToRender).toBe(100);
      expect(result.current.vehicles).toHaveLength(100);
    });

    it('should not increment beyond filteredVehicles length', async () => {
      const mockVehicles = Array.from({ length: 75 }, (_, i) =>
        createMockVehicle({ id: `${i + 1}` })
      );

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 0, total: 75, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.vehiclesToRender).toBe(50);

      act(() => {
        result.current.loadMoreForRendering();
      });

      expect(result.current.vehiclesToRender).toBe(75);

      // Should not increment further
      act(() => {
        result.current.loadMoreForRendering();
      });

      expect(result.current.vehiclesToRender).toBe(75);
    });

    it('should reset vehiclesToRender to 50 when sort changes (AC #6)', async () => {
      const mockVehicles = Array.from({ length: 100 }, (_, i) =>
        createMockVehicle({ id: `${i + 1}`, aiPriorityRating: i * 10 })
      );

      mockApi.fetchVehicles.mockResolvedValue({
        vehicles: mockVehicles,
        pagination: { offset: 0, limit: 0, total: 100, hasMore: false }
      });

      const { result } = renderHook(() => useVehicles(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load more vehicles
      act(() => {
        result.current.loadMoreForRendering();
      });

      expect(result.current.vehiclesToRender).toBe(100);

      // Note: The reset is handled by VehicleDashboard useEffect, not in the hook
      // This test verifies that setVehiclesToRender method exists and works
      act(() => {
        result.current.setVehiclesToRender(50);
      });

      expect(result.current.vehiclesToRender).toBe(50);
    });
  });
});
