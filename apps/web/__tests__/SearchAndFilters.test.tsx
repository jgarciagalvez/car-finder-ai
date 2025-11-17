import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchAndFilters } from '@/components/SearchAndFilters';
import { SortOption } from '@/lib/utils';

describe('SearchAndFilters', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: jest.fn(),
    vehicleCount: 0,
    sortBy: 'priority' as SortOption,
    onSortChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the component', () => {
      render(<SearchAndFilters {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search cars...')).toBeInTheDocument();
    });

    it('should display vehicle count', () => {
      render(<SearchAndFilters {...defaultProps} vehicleCount={42} />);
      expect(screen.getByText('42 cars')).toBeInTheDocument();
    });

    it('should display zero cars when count is 0', () => {
      render(<SearchAndFilters {...defaultProps} vehicleCount={0} />);
      expect(screen.getByText('0 cars')).toBeInTheDocument();
    });

    it('should display total count when provided', () => {
      render(<SearchAndFilters {...defaultProps} vehicleCount={0} totalCount={100} />);
      expect(screen.getByText('100 total')).toBeInTheDocument();
    });
  });

  describe('Search Bar', () => {
    it('should render search input', () => {
      render(<SearchAndFilters {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search cars...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should display search query value', () => {
      render(<SearchAndFilters {...defaultProps} searchQuery="Fiat Ducato" />);
      const searchInput = screen.getByPlaceholderText('Search cars...');
      expect(searchInput).toHaveValue('Fiat Ducato');
    });

    it('should call onSearchChange when typing', () => {
      const onSearchChange = jest.fn();
      render(<SearchAndFilters {...defaultProps} onSearchChange={onSearchChange} />);

      const searchInput = screen.getByPlaceholderText('Search cars...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(onSearchChange).toHaveBeenCalledWith('test search');
    });
  });

  describe('Sort Dropdown', () => {
    it('should render sort dropdown', () => {
      render(<SearchAndFilters {...defaultProps} />);
      expect(screen.getByDisplayValue('Sort: Priority')).toBeInTheDocument();
    });

    it('should display current sort option', () => {
      render(<SearchAndFilters {...defaultProps} sortBy="price_asc" />);
      expect(screen.getByDisplayValue('Sort: Price (Low to High)')).toBeInTheDocument();
    });

    it('should have all sort options', () => {
      render(<SearchAndFilters {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Sort: Priority' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Price (Low to High)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Price (High to Low)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Year (Newest)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Year (Oldest)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Mileage (Lowest)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Mileage (Highest)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Distance (Closest)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Distance (Farthest)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Personal Fit' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sort: Date Added (Newest)' })).toBeInTheDocument();
    });

    it('should call onSortChange when sort option is selected', () => {
      const onSortChange = jest.fn();
      render(<SearchAndFilters {...defaultProps} onSortChange={onSortChange} />);

      const sortDropdown = screen.getByDisplayValue('Sort: Priority');
      fireEvent.change(sortDropdown, { target: { value: 'price_asc' } });

      expect(onSortChange).toHaveBeenCalledWith('price_asc');
    });

    it('should call onSortChange with correct value for each option', () => {
      const onSortChange = jest.fn();
      render(<SearchAndFilters {...defaultProps} onSortChange={onSortChange} />);

      const sortDropdown = screen.getByDisplayValue('Sort: Priority');

      const sortOptions: SortOption[] = [
        'priority',
        'price_asc',
        'price_desc',
        'year_desc',
        'year_asc',
        'mileage_asc',
        'mileage_desc',
        'distance_asc',
        'distance_desc',
        'personal_fit',
        'date_added_desc'
      ];

      sortOptions.forEach(option => {
        fireEvent.change(sortDropdown, { target: { value: option } });
        expect(onSortChange).toHaveBeenCalledWith(option);
      });

      expect(onSortChange).toHaveBeenCalledTimes(sortOptions.length);
    });

    it('should display Date Added sort option when selected', () => {
      render(<SearchAndFilters {...defaultProps} sortBy="date_added_desc" />);
      expect(screen.getByDisplayValue('Sort: Date Added (Newest)')).toBeInTheDocument();
    });
  });

  describe('Status Filter', () => {
    it('should render status filter dropdown', () => {
      render(<SearchAndFilters {...defaultProps} />);
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    });

    it('should have all status filter options', () => {
      render(<SearchAndFilters {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'All Status' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'New' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'To Contact' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Contacted' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'To Visit' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Visited' })).toBeInTheDocument();
    });
  });

  describe('Filters Button', () => {
    it('should render advanced filters button', () => {
      render(<SearchAndFilters {...defaultProps} />);
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible search input', () => {
      render(<SearchAndFilters {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search cars...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should have accessible sort dropdown', () => {
      render(<SearchAndFilters {...defaultProps} />);
      const sortDropdown = screen.getByDisplayValue('Sort: Priority');
      expect(sortDropdown.tagName).toBe('SELECT');
    });

    it('should have accessible status filter dropdown', () => {
      render(<SearchAndFilters {...defaultProps} />);
      const statusDropdown = screen.getByDisplayValue('All Status');
      expect(statusDropdown.tagName).toBe('SELECT');
    });
  });

  describe('Optional Callbacks', () => {
    it('should not crash when onSearchChange is undefined', () => {
      render(<SearchAndFilters {...defaultProps} onSearchChange={undefined} />);
      const searchInput = screen.getByPlaceholderText('Search cars...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      // Should not throw
    });

    it('should not crash when onSortChange is undefined', () => {
      render(<SearchAndFilters {...defaultProps} onSortChange={undefined} />);
      const sortDropdown = screen.getByDisplayValue('Sort: Priority');
      fireEvent.change(sortDropdown, { target: { value: 'price_asc' } });
      // Should not throw
    });
  });
});
