import { Vehicle } from '@car-finder/types';
import {
  sortVehicles,
  SortOption,
  getScoreColor,
  getScoreTextColor,
  getMarketValueColor,
  getMarketValueTextColor,
  formatMarketValue,
  formatPrice,
  formatMileage,
  formatYear,
  getStatusColor,
  getStatusLabel
} from '@/lib/utils';

describe('Sorting Functions', () => {
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
    sellerInfo: { name: 'Test Seller', id: '1', type: 'private', location: 'Warsaw', memberSince: '2020' },
    photos: [],
    personalFitScore: 80,
    marketValueScore: '-5%',
    aiPriorityRating: 85,
    aiPrioritySummary: 'Good deal',
    aiMechanicReport: 'No issues',
    aiDataSanityCheck: 'OK',
    status: 'new',
    personalNotes: null,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  describe('sortVehicles', () => {
    it('should not mutate the original array', () => {
      const vehicles = [createMockVehicle({ id: '1' }), createMockVehicle({ id: '2' })];
      const original = [...vehicles];
      sortVehicles(vehicles, 'priority');
      expect(vehicles).toEqual(original);
    });

    it('should sort by priority (aiPriorityRating descending)', () => {
      const vehicles = [
        createMockVehicle({ id: '1', aiPriorityRating: 70 }),
        createMockVehicle({ id: '2', aiPriorityRating: 90 }),
        createMockVehicle({ id: '3', aiPriorityRating: 80 })
      ];
      const sorted = sortVehicles(vehicles, 'priority');
      expect(sorted[0].aiPriorityRating).toBe(90);
      expect(sorted[1].aiPriorityRating).toBe(80);
      expect(sorted[2].aiPriorityRating).toBe(70);
    });

    it('should push not_interested and deleted to end when sorting by priority', () => {
      const vehicles = [
        createMockVehicle({ id: '1', aiPriorityRating: 90, status: 'new' }),
        createMockVehicle({ id: '2', aiPriorityRating: 95, status: 'not_interested' }),
        createMockVehicle({ id: '3', aiPriorityRating: 85, status: 'new' }),
        createMockVehicle({ id: '4', aiPriorityRating: 100, status: 'deleted' })
      ];
      const sorted = sortVehicles(vehicles, 'priority');
      expect(sorted[0].id).toBe('1'); // 90, new
      expect(sorted[1].id).toBe('3'); // 85, new
      // Both unwanted statuses should be at the end (order between them doesn't matter)
      const lastTwoStatuses = [sorted[2].status, sorted[3].status];
      expect(lastTwoStatuses).toContain('not_interested');
      expect(lastTwoStatuses).toContain('deleted');
    });

    it('should fallback to personalFitScore when aiPriorityRating is null', () => {
      const vehicles = [
        createMockVehicle({ id: '1', aiPriorityRating: null, personalFitScore: 60 }),
        createMockVehicle({ id: '2', aiPriorityRating: null, personalFitScore: 80 }),
        createMockVehicle({ id: '3', aiPriorityRating: 90, personalFitScore: 50 })
      ];
      const sorted = sortVehicles(vehicles, 'priority');
      expect(sorted[0].id).toBe('3'); // aiPriorityRating 90
      expect(sorted[1].id).toBe('2'); // personalFitScore 80
      expect(sorted[2].id).toBe('1'); // personalFitScore 60
    });

    it('should sort by price ascending', () => {
      const vehicles = [
        createMockVehicle({ id: '1', priceEur: 15000 }),
        createMockVehicle({ id: '2', priceEur: 10000 }),
        createMockVehicle({ id: '3', priceEur: 20000 })
      ];
      const sorted = sortVehicles(vehicles, 'price_asc');
      expect(sorted[0].priceEur).toBe(10000);
      expect(sorted[1].priceEur).toBe(15000);
      expect(sorted[2].priceEur).toBe(20000);
    });

    it('should sort by price descending', () => {
      const vehicles = [
        createMockVehicle({ id: '1', priceEur: 15000 }),
        createMockVehicle({ id: '2', priceEur: 10000 }),
        createMockVehicle({ id: '3', priceEur: 20000 })
      ];
      const sorted = sortVehicles(vehicles, 'price_desc');
      expect(sorted[0].priceEur).toBe(20000);
      expect(sorted[1].priceEur).toBe(15000);
      expect(sorted[2].priceEur).toBe(10000);
    });

    it('should sort by year descending (newest first)', () => {
      const vehicles = [
        createMockVehicle({ id: '1', year: 2020 }),
        createMockVehicle({ id: '2', year: 2022 }),
        createMockVehicle({ id: '3', year: 2018 })
      ];
      const sorted = sortVehicles(vehicles, 'year_desc');
      expect(sorted[0].year).toBe(2022);
      expect(sorted[1].year).toBe(2020);
      expect(sorted[2].year).toBe(2018);
    });

    it('should sort by year ascending (oldest first)', () => {
      const vehicles = [
        createMockVehicle({ id: '1', year: 2020 }),
        createMockVehicle({ id: '2', year: 2022 }),
        createMockVehicle({ id: '3', year: 2018 })
      ];
      const sorted = sortVehicles(vehicles, 'year_asc');
      expect(sorted[0].year).toBe(2018);
      expect(sorted[1].year).toBe(2020);
      expect(sorted[2].year).toBe(2022);
    });

    it('should sort by mileage ascending', () => {
      const vehicles = [
        createMockVehicle({ id: '1', mileage: 150000 }),
        createMockVehicle({ id: '2', mileage: 80000 }),
        createMockVehicle({ id: '3', mileage: 200000 })
      ];
      const sorted = sortVehicles(vehicles, 'mileage_asc');
      expect(sorted[0].mileage).toBe(80000);
      expect(sorted[1].mileage).toBe(150000);
      expect(sorted[2].mileage).toBe(200000);
    });

    it('should sort by mileage descending', () => {
      const vehicles = [
        createMockVehicle({ id: '1', mileage: 150000 }),
        createMockVehicle({ id: '2', mileage: 80000 }),
        createMockVehicle({ id: '3', mileage: 200000 })
      ];
      const sorted = sortVehicles(vehicles, 'mileage_desc');
      expect(sorted[0].mileage).toBe(200000);
      expect(sorted[1].mileage).toBe(150000);
      expect(sorted[2].mileage).toBe(80000);
    });

    it('should sort by personal fit score', () => {
      const vehicles = [
        createMockVehicle({ id: '1', personalFitScore: 70 }),
        createMockVehicle({ id: '2', personalFitScore: 90 }),
        createMockVehicle({ id: '3', personalFitScore: null })
      ];
      const sorted = sortVehicles(vehicles, 'personal_fit');
      expect(sorted[0].personalFitScore).toBe(90);
      expect(sorted[1].personalFitScore).toBe(70);
      expect(sorted[2].personalFitScore).toBe(null);
    });

    it('should handle empty array', () => {
      const sorted = sortVehicles([], 'priority');
      expect(sorted).toEqual([]);
    });
  });

  describe('Score Color Functions', () => {
    describe('getScoreColor', () => {
      it('should return green classes for scores >= 80', () => {
        expect(getScoreColor(80)).toBe('bg-green-50 border-green-200 text-green-700');
        expect(getScoreColor(100)).toBe('bg-green-50 border-green-200 text-green-700');
      });

      it('should return yellow classes for scores 60-79', () => {
        expect(getScoreColor(60)).toBe('bg-yellow-50 border-yellow-200 text-yellow-700');
        expect(getScoreColor(79)).toBe('bg-yellow-50 border-yellow-200 text-yellow-700');
      });

      it('should return red classes for scores < 60', () => {
        expect(getScoreColor(59)).toBe('bg-red-50 border-red-200 text-red-700');
        expect(getScoreColor(0)).toBe('bg-red-50 border-red-200 text-red-700');
      });

      it('should return gray classes for null', () => {
        expect(getScoreColor(null)).toBe('bg-gray-50 border-gray-200 text-gray-600');
      });
    });

    describe('getScoreTextColor', () => {
      it('should return correct text colors', () => {
        expect(getScoreTextColor(85)).toBe('text-green-600');
        expect(getScoreTextColor(65)).toBe('text-yellow-600');
        expect(getScoreTextColor(45)).toBe('text-red-600');
        expect(getScoreTextColor(null)).toBe('text-gray-600');
      });
    });

    describe('getMarketValueColor', () => {
      it('should return green for negative percentages (good deal)', () => {
        expect(getMarketValueColor('-5%')).toBe('bg-green-50 border-green-200 text-green-700');
        expect(getMarketValueColor('-10%')).toBe('bg-green-50 border-green-200 text-green-700');
      });

      it('should return gray for market_avg', () => {
        expect(getMarketValueColor('market_avg')).toBe('bg-gray-50 border-gray-200 text-gray-600');
      });

      it('should return red for positive percentages (overpriced)', () => {
        expect(getMarketValueColor('+5%')).toBe('bg-red-50 border-red-200 text-red-700');
        expect(getMarketValueColor('10%')).toBe('bg-red-50 border-red-200 text-red-700');
      });

      it('should return gray for null', () => {
        expect(getMarketValueColor(null)).toBe('bg-gray-50 border-gray-200 text-gray-600');
      });
    });

    describe('getMarketValueTextColor', () => {
      it('should return correct text colors', () => {
        expect(getMarketValueTextColor('-5%')).toBe('text-green-600');
        expect(getMarketValueTextColor('market_avg')).toBe('text-gray-600');
        expect(getMarketValueTextColor('+10%')).toBe('text-red-600');
        expect(getMarketValueTextColor(null)).toBe('text-gray-600');
      });
    });

    describe('formatMarketValue', () => {
      it('should format market values correctly', () => {
        expect(formatMarketValue('-5%')).toBe('-5%');
        expect(formatMarketValue('market_avg')).toBe('Market');
        expect(formatMarketValue('+10%')).toBe('+10%');
        expect(formatMarketValue(null)).toBe('N/A');
      });
    });
  });

  describe('Formatting Functions', () => {
    describe('formatPrice', () => {
      it('should format price with both PLN and EUR', () => {
        const result = formatPrice(50000, 10000);
        expect(result).toContain('50');
        expect(result).toContain('000');
        expect(result).toContain('PLN');
        expect(result).toContain('10');
        expect(result).toContain('000');
      });
    });

    describe('formatMileage', () => {
      it('should format mileage with km suffix', () => {
        expect(formatMileage(100000)).toContain('100');
        expect(formatMileage(100000)).toContain('km');
      });
    });

    describe('formatYear', () => {
      it('should convert year to string', () => {
        expect(formatYear(2020)).toBe('2020');
      });
    });

    describe('getStatusColor', () => {
      it('should return correct colors for all statuses', () => {
        expect(getStatusColor('new')).toBe('bg-blue-100 text-blue-800');
        expect(getStatusColor('to_contact')).toBe('bg-yellow-100 text-yellow-800');
        expect(getStatusColor('contacted')).toBe('bg-orange-100 text-orange-800');
        expect(getStatusColor('to_visit')).toBe('bg-purple-100 text-purple-800');
        expect(getStatusColor('visited')).toBe('bg-green-100 text-green-800');
        expect(getStatusColor('not_interested')).toBe('bg-gray-100 text-gray-800');
        expect(getStatusColor('deleted')).toBe('bg-red-100 text-red-800');
        expect(getStatusColor('unknown')).toBe('bg-gray-100 text-gray-800');
      });
    });

    describe('getStatusLabel', () => {
      it('should return correct labels for all statuses', () => {
        expect(getStatusLabel('new')).toBe('New');
        expect(getStatusLabel('to_contact')).toBe('To Contact');
        expect(getStatusLabel('contacted')).toBe('Contacted');
        expect(getStatusLabel('to_visit')).toBe('To Visit');
        expect(getStatusLabel('visited')).toBe('Visited');
        expect(getStatusLabel('not_interested')).toBe('Not Interested');
        expect(getStatusLabel('deleted')).toBe('Deleted');
        expect(getStatusLabel('unknown')).toBe('unknown');
      });
    });
  });
});
