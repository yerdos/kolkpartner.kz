import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Car, Globe, Package, Settings, Heart, LogIn, LogOut, User as UserIcon, Store } from 'lucide-react';
import { VehicleCard } from './components/VehicleCard';
import { VehicleFilters, type FilterState } from './components/VehicleFilters';
import { VehicleDetails } from './components/VehicleDetails';
import { OrdersList } from './components/OrdersList';
import { OrderTracking } from './components/OrderTracking';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { FavoritesView } from './components/FavoritesView';
import { DistributorCenter } from './components/DistributorCenter';
import { supabase, type Vehicle, type CostBreakdown } from './lib/supabase';
import { useTranslation, type Language } from './lib/i18n';
import { useAuth } from './contexts/AuthContext';

type View = 'vehicles' | 'orders' | 'admin' | 'favorites' | 'distributor';


function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [lang, setLang] = useState<Language>('ru');
  const { t } = useTranslation(lang);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isDistributor, setIsDistributor] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    sourceCountry: null,
    brand: null,
    minPrice: 0,
    maxPrice: 100000,
    minYear: 2000,
    maxYear: new Date().getFullYear(),
  });
  const [exchangeRate, setExchangeRate] = useState<number>(485);
  const [vehicleCosts, setVehicleCosts] = useState<Map<string, number>>(new Map());
  const itemsPerPage = 12;

  const currentView: View = (() => {
    if (location.pathname.startsWith('/admin')) return 'admin';
    if (location.pathname.startsWith('/order')) return 'orders';
    if (location.pathname.startsWith('/favorites')) return 'favorites';
    if (location.pathname.startsWith('/distributor')) return 'distributor';
    return 'vehicles';
  })();

  useEffect(() => {
    loadVehicles();
    loadExchangeRate();
  }, [currentPage, filters]);

  useEffect(() => {
    if (user) {
      loadFavorites();
      loadUserRole();
    } else {
      setFavorites(new Set());
      setUserRole(null);
      setUserName(null);
      setIsDistributor(false);
    }
  }, [user]);

  const loadUserRole = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role, name, distributor_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setUserRole(data.role);
        setUserName(data.name);
        setIsDistributor(!!data.distributor_id);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

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

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('vehicles_with_status')
        .select('*', { count: 'exact' })
        .order('is_sold', { ascending: true })
        .order('created_at', { ascending: false });

      if (filters.sourceCountry) {
        query = query.eq('source_country', filters.sourceCountry);
      }

      if (filters.brand) {
        query = query.eq('brand', filters.brand);
      }

      query = query
        .gte('price_usd', filters.minPrice)
        .lte('price_usd', filters.maxPrice)
        .gte('year', filters.minYear)
        .lte('year', filters.maxYear)
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      if (data) {
        setVehicles(data);
        await loadVehicleCosts(data.map(v => v.id));
      }
      if (count !== null) {
        setTotalCount(count);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
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

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('favorites')
        .select('vehicle_id')
        .eq('user_id', user.id);
      if (data) {
        setFavorites(new Set(data.map(f => f.vehicle_id)));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleToggleFavorite = async (vehicleId: string) => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    try {
      if (favorites.has(vehicleId)) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('vehicle_id', vehicleId);
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(vehicleId);
          return next;
        });
      } else {
        await supabase
          .from('favorites')
          .insert([{ user_id: user.id, vehicle_id: vehicleId }]);
        setFavorites(prev => new Set([...prev, vehicleId]));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleFilter = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSelectVehicle = (id: string) => {
    navigate(`/vehicle/${id}`);
  };

  const handleBackToVehicles = () => {
    navigate('/');
  };

  const handleOrderNow = async (vehicle: Vehicle, cost: CostBreakdown) => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    if (vehicle.is_sold || vehicle.status === 'sold') {
      alert(lang === 'ru' ? 'Этот автомобиль уже продан' : 'Бұл автокөлік сатылды');
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile || !profile.name || !profile.phone) {
        alert('Please complete your profile information first');
        return;
      }

      const { data: order } = await supabase
        .from('orders')
        .insert({
          vehicle_id: vehicle.id,
          user_id: user.id,
          customer_name: profile.name,
          customer_phone: profile.phone,
          order_status: 'pending',
          payment_amount: cost.estimated_landing_price,
          estimated_delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .maybeSingle();

      if (order) {
        await supabase
          .from('tracking_updates')
          .insert({
            order_id: order.id,
            status: 'pending',
            location: vehicle.source_region,
            description_ru: 'Заказ создан, ожидает обработки',
            description_kk: 'Тапсырыс жасалды, өңдеуді күтуде',
          });

        alert('Order created successfully!');
        navigate(`/order/${order.id}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error creating order');
    }
  };

  const handleViewOrders = () => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    navigate('/orders');
  };

  const handleViewFavorites = () => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    navigate('/favorites');
  };

  const handleSelectOrder = (orderId: string) => {
    navigate(`/order/${orderId}`);
  };

  const handleBackToOrders = () => {
    navigate('/orders');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <a className="flex items-center gap-1.5" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              <div className="bg-blue-600 p-1 rounded-lg">
                 <img src="/logo_white.png" alt="logo" className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">{t('appName')}</h1>
                <p className="text-xs text-gray-600 hidden sm:block">{t('tagline')}</p>
              </div>
            </a>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                  currentView === 'vehicles'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('search')}</span>
              </button>

              <button
                onClick={handleViewFavorites}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                  currentView === 'favorites'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('favorite')}</span>
              </button>

              <button
                onClick={handleViewOrders}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                  currentView === 'orders'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('myOrders')}</span>
              </button>

              {isDistributor && (
                <button
                  onClick={() => navigate('/distributor')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                    currentView === 'distributor'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">分销中心</span>
                </button>
              )}

              {userRole === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                    currentView === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">管理</span>
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 hidden md:inline">{userName || user.email}</span>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">登出</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">登录</span>
                </button>
              )}

              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setLang('ru')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-xs transition-colors ${
                    lang === 'ru' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  RU
                </button>
                <button
                  onClick={() => setLang('kk')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-xs transition-colors ${
                    lang === 'kk' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  KK
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="py-3">
        <Routes>
          <Route path="/" element={
            <div className="max-w-7xl mx-auto px-4">
              <VehicleFilters t={t} onFilter={handleFilter} />

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-xl text-gray-600">{t('loading')}</div>
                </div>
              ) : (
                <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 250px)' }}>
                  <div className="mb-3 text-gray-600">
                    <span className="font-bold text-lg text-gray-900">{totalCount}</span>{' '}
                    {t('vehiclesFound')}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 flex-1">
                    {vehicles.map((vehicle) => (
                      <VehicleCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        lang={lang}
                        t={t}
                        onSelect={handleSelectVehicle}
                        onToggleFavorite={handleToggleFavorite}
                        isFavorite={favorites.has(vehicle.id)}
                        exchangeRate={exchangeRate}
                        estimatedPrice={vehicleCosts.get(vehicle.id)}
                      />
                    ))}
                  </div>

                  <div className="h-20 flex items-center justify-center mt-6">
                    {totalCount > itemsPerPage && (
                      <div className="flex justify-center items-center gap-2">
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
                </div>
              )}
            </div>
          } />

          <Route path="/vehicle/:vehicleId" element={
            <VehicleDetailsRoute
              lang={lang}
              t={t}
              onBack={handleBackToVehicles}
              onOrderNow={handleOrderNow}
            />
          } />

          <Route path="/orders" element={
            <OrdersList
              lang={lang}
              t={t}
              onSelectOrder={handleSelectOrder}
            />
          } />

          <Route path="/order/:orderId" element={
            <OrderTrackingRoute
              lang={lang}
              t={t}
              onBack={handleBackToOrders}
            />
          } />

          <Route path="/favorites" element={
            <FavoritesView
              lang={lang}
              t={t}
              favorites={favorites}
              onSelectVehicle={handleSelectVehicle}
              onToggleFavorite={handleToggleFavorite}
            />
          } />

          <Route path="/distributor" element={
            <DistributorCenter />
          } />

          <Route path="/admin" element={
            <AdminPanel onBack={() => navigate('/')} />
          } />
        </Routes>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />

      <footer className="bg-gray-900 text-white py-4 mt-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-bold mb-1.5">{t('appName')}</h3>
              <p className="text-gray-400 text-xs">{t('tagline')}</p>
            </div>
            <div>
              <h3 className="text-base font-bold mb-2">{t('contactUs')}</h3>
              <p className="text-gray-400 text-xs">
                {t('phone')}: +7 (771) 897-77-19<br />
                {t('email')}: service@kolk.kz
              </p>
            </div>
            <div>
              <h3 className="text-base font-bold mb-2">{t('sourceCountry')}</h3>
              <div className="flex gap-3 text-xl">
                🇰🇷 🇨🇳 🇬🇪
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 text-center text-gray-400 text-xs">
            © 2024 {t('appName')}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function VehicleDetailsRoute({ lang, t, onBack, onOrderNow }: { lang: Language; t: (key: string) => string; onBack: () => void; onOrderNow: (vehicle: Vehicle, cost: CostBreakdown) => Promise<void> }) {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  if (!vehicleId) return null;
  return <VehicleDetails vehicleId={vehicleId} lang={lang} t={t} onBack={onBack} onOrderNow={onOrderNow} />;
}

function OrderTrackingRoute({ lang, t, onBack }: { lang: Language; t: (key: string) => string; onBack: () => void }) {
  const { orderId } = useParams<{ orderId: string }>();
  if (!orderId) return null;
  return <OrderTracking orderId={orderId} lang={lang} t={t} onBack={onBack} />;
}

function App() {
  return <AppContent />;
}

export default App;
