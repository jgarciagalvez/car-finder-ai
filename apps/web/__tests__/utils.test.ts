import { Vehicle } from '@car-finder/types';
import {
  sortVehicles,
  sortVehiclesCompound,
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
    virtualMechanicSummary: null,
    aiDataSanityCheck: 'OK',
    distanceFromWroclaw: null,
    status: 'new',
    personalNotes: null,
    isRemovedFromSource: false,
    lastExistenceCheck: null,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    hasTailgate: false,
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

    it('should sort by distance ascending (closest first)', () => {
      const vehicles = [
        createMockVehicle({ id: '1', distanceFromWroclaw: 150 }),
        createMockVehicle({ id: '2', distanceFromWroclaw: 50 }),
        createMockVehicle({ id: '3', distanceFromWroclaw: 300 })
      ];
      const sorted = sortVehicles(vehicles, 'distance_asc');
      expect(sorted[0].distanceFromWroclaw).toBe(50);
      expect(sorted[1].distanceFromWroclaw).toBe(150);
      expect(sorted[2].distanceFromWroclaw).toBe(300);
    });

    it('should sort by distance descending (farthest first)', () => {
      const vehicles = [
        createMockVehicle({ id: '1', distanceFromWroclaw: 150 }),
        createMockVehicle({ id: '2', distanceFromWroclaw: 50 }),
        createMockVehicle({ id: '3', distanceFromWroclaw: 300 })
      ];
      const sorted = sortVehicles(vehicles, 'distance_desc');
      expect(sorted[0].distanceFromWroclaw).toBe(300);
      expect(sorted[1].distanceFromWroclaw).toBe(150);
      expect(sorted[2].distanceFromWroclaw).toBe(50);
    });

    it('should sort null distances to end when sorting distance ascending', () => {
      const vehicles = [
        createMockVehicle({ id: '1', distanceFromWroclaw: null }),
        createMockVehicle({ id: '2', distanceFromWroclaw: 100 }),
        createMockVehicle({ id: '3', distanceFromWroclaw: null }),
        createMockVehicle({ id: '4', distanceFromWroclaw: 50 })
      ];
      const sorted = sortVehicles(vehicles, 'distance_asc');
      expect(sorted[0].distanceFromWroclaw).toBe(50);
      expect(sorted[1].distanceFromWroclaw).toBe(100);
      expect(sorted[2].distanceFromWroclaw).toBe(null);
      expect(sorted[3].distanceFromWroclaw).toBe(null);
    });

    it('should sort null distances to end when sorting distance descending', () => {
      const vehicles = [
        createMockVehicle({ id: '1', distanceFromWroclaw: null }),
        createMockVehicle({ id: '2', distanceFromWroclaw: 100 }),
        createMockVehicle({ id: '3', distanceFromWroclaw: null }),
        createMockVehicle({ id: '4', distanceFromWroclaw: 50 })
      ];
      const sorted = sortVehicles(vehicles, 'distance_desc');
      expect(sorted[0].distanceFromWroclaw).toBe(100);
      expect(sorted[1].distanceFromWroclaw).toBe(50);
      expect(sorted[2].distanceFromWroclaw).toBe(null);
      expect(sorted[3].distanceFromWroclaw).toBe(null);
    });

    it('should handle empty array', () => {
      const sorted = sortVehicles([], 'priority');
      expect(sorted).toEqual([]);
    });

    it('should sort by date added descending', () => {
      const vehicles = [
        createMockVehicle({ id: '1', createdAt: new Date('2024-01-15') }),
        createMockVehicle({ id: '2', createdAt: new Date('2024-01-20') }),
        createMockVehicle({ id: '3', createdAt: new Date('2024-01-10') })
      ];
      const sorted = sortVehicles(vehicles, 'date_added_desc');
      expect(sorted[0].id).toBe('2'); // Newest
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('3'); // Oldest
    });

    it('should sort tailgate vehicles first before applying other sorts', () => {
      // Story 4.5 AC4: Primary sort is hasTailgate, regardless of other criteria
      const vehicles = [
        createMockVehicle({ id: '1', hasTailgate: false, aiPriorityRating: 95, priceEur: 10000 }),
        createMockVehicle({ id: '2', hasTailgate: true, aiPriorityRating: 70, priceEur: 20000 }),
        createMockVehicle({ id: '3', hasTailgate: false, aiPriorityRating: 90, priceEur: 8000 }),
        createMockVehicle({ id: '4', hasTailgate: true, aiPriorityRating: 80, priceEur: 15000 })
      ];
      const sorted = sortVehicles(vehicles, 'price_asc');

      // All tailgate vehicles must appear before non-tailgate vehicles
      expect(sorted[0].hasTailgate).toBe(true);
      expect(sorted[1].hasTailgate).toBe(true);
      expect(sorted[2].hasTailgate).toBe(false);
      expect(sorted[3].hasTailgate).toBe(false);

      // Within tailgate group: sorted by priority (secondary), then price (tertiary)
      expect(sorted[0].id).toBe('4'); // tailgate: true, priority: 80, price: 15000
      expect(sorted[1].id).toBe('2'); // tailgate: true, priority: 70, price: 20000

      // Within non-tailgate group: sorted by priority (secondary), then price (tertiary)
      expect(sorted[2].id).toBe('1'); // tailgate: false, priority: 95, price: 10000
      expect(sorted[3].id).toBe('3'); // tailgate: false, priority: 90, price: 8000
    });
  });

  describe('sortVehiclesCompound', () => {
    it('should handle empty stack', () => {
      const vehicles = [
        createMockVehicle({ id: '1' }),
        createMockVehicle({ id: '2' })
      ];
      const sorted = sortVehiclesCompound(vehicles, []);
      expect(sorted).toEqual(vehicles);
    });

    it('should handle empty vehicles array', () => {
      const sorted = sortVehiclesCompound([], ['priority']);
      expect(sorted).toEqual([]);
    });

    it('should handle single vehicle', () => {
      const vehicles = [createMockVehicle({ id: '1' })];
      const sorted = sortVehiclesCompound(vehicles, ['priority', 'price_asc']);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('1');
    });

    it('should work with single sort (backward compatible)', () => {
      const vehicles = [
        createMockVehicle({ id: '1', priceEur: 15000 }),
        createMockVehicle({ id: '2', priceEur: 10000 }),
        createMockVehicle({ id: '3', priceEur: 20000 })
      ];
      const sorted = sortVehiclesCompound(vehicles, ['price_asc']);
      expect(sorted[0].priceEur).toBe(10000);
      expect(sorted[1].priceEur).toBe(15000);
      expect(sorted[2].priceEur).toBe(20000);
    });

    it('should apply two-level sort: price then priority', () => {
      // Story 4.5: 3-tier sorting always applies: tailgate first, priority second, user's sort third
      const vehicles = [
        createMockVehicle({ id: '1', priceEur: 10000, aiPriorityRating: 70 }),
        createMockVehicle({ id: '2', priceEur: 10000, aiPriorityRating: 90 }),
        createMockVehicle({ id: '3', priceEur: 15000, aiPriorityRating: 85 }),
        createMockVehicle({ id: '4', priceEur: 10000, aiPriorityRating: 80 })
      ];
      const sorted = sortVehiclesCompound(vehicles, ['priority', 'price_asc']);
      // Primary: tailgate (all false, no effect)
      // Secondary: priority descending (90, 85, 80, 70)
      // Tertiary: price_asc (for tied priorities)
      expect(sorted[0].id).toBe('2'); // priority 90, price 10000
      expect(sorted[1].id).toBe('3'); // priority 85, price 15000
      expect(sorted[2].id).toBe('4'); // priority 80, price 10000
      expect(sorted[3].id).toBe('1'); // priority 70, price 10000
    });

    it('should apply three-level sort: mileage, price, year', () => {
      // Stack: ['mileage_asc', 'price_asc', 'year_desc'] means year_desc is primary
      const vehicles = [
        createMockVehicle({ id: '1', year: 2020, priceEur: 10000, mileage: 100000 }),
        createMockVehicle({ id: '2', year: 2020, priceEur: 10000, mileage: 80000 }),
        createMockVehicle({ id: '3', year: 2020, priceEur: 15000, mileage: 90000 }),
        createMockVehicle({ id: '4', year: 2022, priceEur: 12000, mileage: 50000 })
      ];
      const sorted = sortVehiclesCompound(vehicles, ['mileage_asc', 'price_asc', 'year_desc']);
      // Primary: year_desc (2022, 2020, 2020, 2020)
      // Tiebreaker: price_asc (10000, 10000, 15000)
      // Third level: mileage_asc (80000, 100000)
      expect(sorted[0].id).toBe('4'); // 2022
      expect(sorted[1].id).toBe('2'); // 2020, 10000, 80000
      expect(sorted[2].id).toBe('1'); // 2020, 10000, 100000
      expect(sorted[3].id).toBe('3'); // 2020, 15000
    });

    it('should not mutate the original array', () => {
      const vehicles = [
        createMockVehicle({ id: '1', priceEur: 15000 }),
        createMockVehicle({ id: '2', priceEur: 10000 })
      ];
      const original = [...vehicles];
      sortVehiclesCompound(vehicles, ['price_asc']);
      expect(vehicles).toEqual(original);
    });

    it('should handle null distances in compound sort', () => {
      const vehicles = [
        createMockVehicle({ id: '1', distanceFromWroclaw: null, priceEur: 10000 }),
        createMockVehicle({ id: '2', distanceFromWroclaw: 100, priceEur: 10000 }),
        createMockVehicle({ id: '3', distanceFromWroclaw: 50, priceEur: 10000 }),
        createMockVehicle({ id: '4', distanceFromWroclaw: null, priceEur: 10000 })
      ];
      const sorted = sortVehiclesCompound(vehicles, ['price_asc', 'distance_asc']);
      // Primary: distance_asc (50, 100, null, null)
      expect(sorted[0].id).toBe('3'); // 50km
      expect(sorted[1].id).toBe('2'); // 100km
      // Nulls at end
      expect(sorted[2].distanceFromWroclaw).toBe(null);
      expect(sorted[3].distanceFromWroclaw).toBe(null);
    });

    it('should handle unwanted statuses in priority sort', () => {
      const vehicles = [
        createMockVehicle({ id: '1', status: 'new', aiPriorityRating: 90, priceEur: 10000 }),
        createMockVehicle({ id: '2', status: 'not_interested', aiPriorityRating: 95, priceEur: 10000 }),
        createMockVehicle({ id: '3', status: 'new', aiPriorityRating: 85, priceEur: 10000 }),
        createMockVehicle({ id: '4', status: 'deleted', aiPriorityRating: 100, priceEur: 10000 })
      ];
      const sorted = sortVehiclesCompound(vehicles, ['price_asc', 'priority']);
      // Primary: priority (but unwanted pushed to end)
      // All have same price, so priority is tiebreaker
      expect(sorted[0].id).toBe('1'); // 90, new
      expect(sorted[1].id).toBe('3'); // 85, new
      // Unwanted statuses at end
      const lastTwoStatuses = [sorted[2].status, sorted[3].status];
      expect(lastTwoStatuses).toContain('not_interested');
      expect(lastTwoStatuses).toContain('deleted');
    });

    it('should maintain stable order when all criteria are equal', () => {
      const vehicles = [
        createMockVehicle({ id: '1', priceEur: 10000, year: 2020, mileage: 100000 }),
        createMockVehicle({ id: '2', priceEur: 10000, year: 2020, mileage: 100000 }),
        createMockVehicle({ id: '3', priceEur: 10000, year: 2020, mileage: 100000 })
      ];
      const sorted = sortVehiclesCompound(vehicles, ['mileage_asc', 'year_desc', 'price_asc']);
      // All equal, should maintain original order
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    it('should handle date_added_desc in compound sort', () => {
      const vehicles = [
        createMockVehicle({ id: '1', priceEur: 10000, createdAt: new Date('2024-01-15') }),
        createMockVehicle({ id: '2', priceEur: 10000, createdAt: new Date('2024-01-20') }),
        createMockVehicle({ id: '3', priceEur: 15000, createdAt: new Date('2024-01-10') })
      ];
      const sorted = sortVehiclesCompound(vehicles, ['price_asc', 'date_added_desc']);
      // Primary: date_added_desc (20th, 15th, 10th)
      expect(sorted[0].id).toBe('2'); // Newest
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('3'); // Oldest
    });

    it('should handle null scores in compound sort', () => {
      const vehicles = [
        createMockVehicle({ id: '1', personalFitScore: null, priceEur: 10000 }),
        createMockVehicle({ id: '2', personalFitScore: 80, priceEur: 10000 }),
        createMockVehicle({ id: '3', personalFitScore: 90, priceEur: 10000 })
      ];
      const sorted = sortVehiclesCompound(vehicles, ['price_asc', 'personal_fit']);
      // Primary: personal_fit (90, 80, null->0)
      expect(sorted[0].id).toBe('3'); // 90
      expect(sorted[1].id).toBe('2'); // 80
      expect(sorted[2].id).toBe('1'); // null (treated as 0)
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
        expect(getStatusColor('processed')).toBe('bg-green-100 text-green-800');
        expect(getStatusColor('skipped')).toBe('bg-gray-100 text-gray-800');
        expect(getStatusColor('to_contact')).toBe('bg-yellow-100 text-yellow-800');
        expect(getStatusColor('contacted')).toBe('bg-orange-100 text-orange-800');
        expect(getStatusColor('to_visit')).toBe('bg-purple-100 text-purple-800');
        expect(getStatusColor('visited')).toBe('bg-green-100 text-green-800');
        expect(getStatusColor('not_interested')).toBe('bg-red-100 text-red-800');
        expect(getStatusColor('deleted')).toBe('bg-red-100 text-red-800');
        expect(getStatusColor('unknown')).toBe('bg-gray-100 text-gray-800');
      });
    });

    describe('getStatusLabel', () => {
      it('should return correct labels for all statuses', () => {
        expect(getStatusLabel('new')).toBe('New');
        expect(getStatusLabel('processed')).toBe('Processed');
        expect(getStatusLabel('skipped')).toBe('Skipped');
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
