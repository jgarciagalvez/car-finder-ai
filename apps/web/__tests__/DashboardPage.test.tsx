import React from 'react';
import { render } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

// Mock all child components to isolate page behavior
jest.mock('@/components/VehicleDashboard', () => ({
  VehicleDashboard: () => <div data-testid="vehicle-dashboard">Dashboard</div>,
}));

jest.mock('@/components/AIChatSidebar', () => ({
  AIChatSidebar: () => <div data-testid="ai-chat-sidebar">Chat</div>,
}));

jest.mock('@/components/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

jest.mock('@/components/SearchAndFilters', () => ({
  SearchAndFilters: () => <div data-testid="search-filters">Filters</div>,
}));

jest.mock('@/hooks/useVehicles', () => ({
  useVehicles: () => ({
    vehicles: [],
    allVehicles: [],
    refetch: jest.fn(),
    sortBy: 'date',
    setSortBy: jest.fn(),
    statusFilter: 'all',
    setStatusFilter: jest.fn(),
    distanceFilter: 'all',
    setDistanceFilter: jest.fn(),
    showNotInterested: false,
    setShowNotInterested: jest.fn(),
    notInterestedCount: 0,
    activePoolCount: 0,
  }),
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    document.title = 'Car Finder AI'; // Reset title
  });

  it('should render dashboard components', () => {
    const { getByTestId } = render(<DashboardPage />);

    expect(getByTestId('header')).toBeInTheDocument();
    expect(getByTestId('search-filters')).toBeInTheDocument();
    expect(getByTestId('vehicle-dashboard')).toBeInTheDocument();
  });

  describe('Page Title Management', () => {
    it('should set dashboard title on mount', () => {
      render(<DashboardPage />);

      expect(document.title).toBe('Dashboard | Car Finder AI');
    });

    it('should maintain title after re-render', () => {
      const { rerender } = render(<DashboardPage />);

      expect(document.title).toBe('Dashboard | Car Finder AI');

      rerender(<DashboardPage />);

      expect(document.title).toBe('Dashboard | Car Finder AI');
    });
  });
});
