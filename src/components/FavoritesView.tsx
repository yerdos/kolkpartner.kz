import { useState, useEffect } from 'react';
import { VehicleCard } from './VehicleCard';
import { supabase, type Vehicle } from '../lib/supabase';
import type { Language } from '../lib/i18n';

interface FavoritesViewProps {
  lang: Language;
  t: (key: string) => string;
  favorites: Set<string>;
  onSelectVehicle: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function FavoritesView({
  lang,
  t,
  favorites,
  onSelectVehicle,
  onToggleFavorite,
}: FavoritesViewProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState<number>(485);
  const [vehicleCosts, setVehicleCosts] = useState<Map<string, number>>(new Map());
  const itemsPerPage = 12;

  useEffect(() => {
    loadFavoriteVehicles();
    loadExchangeRate();
  }, [favorites, currentPage]);

  const loadExchangeRate = async () => {
    try {
      const { data } = await supabase
        .from('tax_calculator_config')
        .select('usd_to_kzt_rate')
        .maybeSingle();

      if (data?.usd_to_kzt_rate) {
        setExchangeRate(Number(data.usd_to_kzt_rate));
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
    }
  };

  const loadVehicleCosts = async (vehicleIds: string[]) => {
    try {
      const { data } = await supabase
        .from('cost_breakdown')
        .select('vehicle_id, estimated_landing_price')
        .in('vehicle_id', vehicleIds);

      if (data) {
        const costsMap = new Map<string, number>();
        data.forEach(cost => {
          costsMap.set(cost.vehicle_id, cost.estimated_landing_price);
        });
        setVehicleCosts(costsMap);
      }
    } catch (error) {
      console.error('Error loading vehicle costs:', error);
    }
  };

  const loadFavoriteVehicles = async () => {
    if (favorites.size === 0) {
      setVehicles([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const favoriteIds = Array.from(favorites);
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await supabase
        .from('vehicles_with_status')
        .select('*', { count: 'exact' })
        .in('id', favoriteIds)
        .order('is_sold', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        setVehicles(data);
        await loadVehicleCosts(data.map(v => v.id));
      }
      if (count !== null) {
        setTotalCount(count);
      }
    } catch (error) {
      console.error('Error loading favorite vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-xl text-gray-600">加载中...</div>
        </div>
      </div>
    );
  }

  if (favorites.size === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">我的收藏</h2>
        <div className="text-center py-12 text-gray-500">
          还没有收藏任何车辆
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">我的收藏 ({totalCount})</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            lang={lang}
            t={t}
            onSelect={onSelectVehicle}
            onToggleFavorite={onToggleFavorite}
            isFavorite={true}
            exchangeRate={exchangeRate}
            estimatedPrice={vehicleCosts.get(vehicle.id)}
          />
        ))}
      </div>

      {totalCount > itemsPerPage && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            上一页
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, i) => i + 1)
              .filter(page => {
                const totalPages = Math.ceil(totalCount / itemsPerPage);
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                if (page === 2 && currentPage <= 3) return true;
                if (page === totalPages - 1 && currentPage >= totalPages - 2) return true;
                return false;
              })
              .map((page, idx, arr) => {
                const prevPage = arr[idx - 1];
                const showEllipsis = prevPage && page - prevPage > 1;
                return (
                  <div key={page} className="flex items-center gap-1">
                    {showEllipsis && <span className="px-2 text-gray-500">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))}
            disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
            className="px-4 py-2 rounded-lg font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
