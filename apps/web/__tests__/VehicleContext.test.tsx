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
  aiDataSanityCheck: 'All data looks good',
  status: 'new',
  personalNotes: null,
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
});
