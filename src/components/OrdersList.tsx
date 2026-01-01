import { useState, useEffect } from 'react';
import { Package, Calendar, DollarSign, Eye } from 'lucide-react';
import type { Order, Vehicle } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import type { Language } from '../lib/i18n';

interface OrdersListProps {
  lang: Language;
  t: (key: string) => string;
  onSelectOrder: (orderId: string) => void;
}

export function OrdersList({ lang, t, onSelectOrder }: OrdersListProps) {
  const [orders, setOrders] = useState<Array<Order & { vehicle: Vehicle }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          distributors (
            code,
            name,
            type
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersData) {
        const ordersWithVehicles = await Promise.all(
          ordersData.map(async (order) => {
            const { data: vehicle } = await supabase
              .from('vehicles')
              .select('*')
              .eq('id', order.vehicle_id)
              .maybeSingle();
            return { ...order, vehicle: vehicle! };
          })
        );
        setOrders(ordersWithVehicles);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-600">{t('loading')}</div>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    paid: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-yellow-100 text-yellow-800',
    customs: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('myOrders')}</h1>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <div className="flex flex-col md:flex-row gap-4 p-4">
                <div className="md:w-48 h-32 flex-shrink-0">
                  <img
                    src={order.vehicle.images[0]}
                    alt={`${order.vehicle.brand} ${order.vehicle.model}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {order.vehicle.brand} {order.vehicle.model} {order.vehicle.year}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('orderNumber')}: {order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.order_status]}`}>
                      {t(order.order_status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>${order.payment_amount.toLocaleString()}</span>
                    </div>
                    {order.estimated_delivery_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Package className="w-4 h-4" />
                        <span>{new Date(order.estimated_delivery_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectOrder(order.id)}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {t('viewDetails')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
