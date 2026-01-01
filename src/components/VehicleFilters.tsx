import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

interface VehicleFiltersProps {
  t: (key: string) => string;
  onFilter: (filters: FilterState) => void;
}

export interface FilterState {
  sourceCountry: string;
  brand: string;
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
}

export function VehicleFilters({ t, onFilter }: VehicleFiltersProps) {
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    sourceCountry: '',
    brand: '',
    minPrice: 0,
    maxPrice: 100000,
    minYear: 2015,
    maxYear: new Date().getFullYear(),
  });

  const handleFilterChange = (key: keyof FilterState, value: string | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilter(filters);
  };

  const brands = [
    'Hyundai', 'Kia', 'Genesis', 'Toyota', 'Honda', 'Nissan', 'Mazda',
    'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen'
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          {t('filters')}
        </h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
        >
          {showFilters ? '−' : '+'}
        </button>
      </div>

      {showFilters && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('sourceCountry')}
              </label>
              <select
                value={filters.sourceCountry}
                onChange={(e) => handleFilterChange('sourceCountry', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              >
                <option value="">{t('allCountries')}</option>
                <option value="korea">🇰🇷 {t('korea')}</option>
                <option value="china">🇨🇳 {t('china')}</option>
                <option value="georgia">🇬🇪 {t('georgia')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('brand')}
              </label>
              <select
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              >
                <option value="">{t('allBrands')}</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('year')}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minYear}
                  onChange={(e) => handleFilterChange('minYear', parseInt(e.target.value) || 2015)}
                  className="w-1/2 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxYear}
                  onChange={(e) => handleFilterChange('maxYear', parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-1/2 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('priceRange')} ($)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value) || 0)}
                  className="w-1/2 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value) || 100000)}
                  className="w-1/2 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleApplyFilters}
            className="w-full md:w-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 text-xs"
          >
            <Search className="w-4 h-4" />
            {t('showResults')}
          </button>
        </div>
      )}
    </div>
  );
}
