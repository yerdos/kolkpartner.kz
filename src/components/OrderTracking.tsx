import { useState, useEffect } from 'react';
import { ArrowLeft, Package, MapPin, Calendar, DollarSign, CheckCircle, FileText, Download } from 'lucide-react';
import type { Order, TrackingUpdate, Vehicle, OrderDocument } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import type { Language } from '../lib/i18n';

interface OrderTrackingProps {
  orderId: string;
  lang: Language;
  t: (key: string) => string;
  onBack: () => void;
}

export function OrderTracking({ orderId, lang, t, onBack }: OrderTrackingProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tracking, setTracking] = useState<TrackingUpdate[]>([]);
  const [documents, setDocuments] = useState<OrderDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderData();
  }, [orderId]);

  const loadOrderData = async () => {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (orderData) {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', orderData.vehicle_id)
          .maybeSingle();

        const { data: trackingData } = await supabase
          .from('tracking_updates')
          .select('*')
          .eq('order_id', orderId)
          .order('timestamp', { ascending: false });

        const { data: documentsData } = await supabase
          .from('order_documents')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false });

        setVehicle(vehicleData);
        setTracking(trackingData || []);
        setDocuments(documentsData || []);
      }

      setOrder(orderData);
    } catch (error) {
      console.error('Error loading order data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: OrderDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('order-documents')
        .download(doc.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert(lang === 'ru' ? 'Ошибка загрузки файла' : 'Файл жүктеу қатесі');
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      contract: lang === 'ru' ? 'Договор' : 'Келісімшарт',
      payment_proof: lang === 'ru' ? 'Подтверждение оплаты' : 'Төлем растамасы',
      chat_log: lang === 'ru' ? 'Переписка' : 'Хабарласу',
      invoice: lang === 'ru' ? 'Счет' : 'Шот',
      other: lang === 'ru' ? 'Другое' : 'Басқа',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">{t('loading')}</div>
      </div>
    );
  }

  if (!order || !vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">{t('error')}</div>
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        {t('backToOrders')}
      </button>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('orderDetails')}</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <img
              src={vehicle.images[0]}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="mt-4">
              <h2 className="text-xl font-bold text-gray-900">
                {vehicle.brand} {vehicle.model} {vehicle.year}
              </h2>
              <p className="text-gray-600">{vehicle.source_region}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">{t('orderNumber')}</div>
                <div className="font-semibold text-gray-900">{order.id.slice(0, 8).toUpperCase()}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">{t('orderDate')}</div>
                <div className="font-semibold text-gray-900">
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">{t('paymentAmount')}</div>
                <div className="font-semibold text-gray-900">${order.payment_amount.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">{t('orderStatus')}</div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusColors[order.order_status]}`}>
                  {t(order.order_status)}
                </span>
              </div>
            </div>

            {order.estimated_delivery_date && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">{t('estimatedDelivery')}</div>
                  <div className="font-semibold text-gray-900">
                    {new Date(order.estimated_delivery_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('trackingHistory')}</h2>

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-6">
            {tracking.map((update, index) => {
              const description = lang === 'ru' ? update.description_ru : update.description_kk;
              return (
                <div key={update.id} className="relative flex gap-4">
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                    index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    {index === 0 ? (
                      <MapPin className="w-4 h-4 text-white" />
                    ) : (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{update.location}</h3>
                          <p className="text-sm text-gray-600">{description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                          index === 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {update.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(update.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {lang === 'ru' ? 'Документы заказа' : 'Тапсырыс құжаттары'}
          </h2>

          <div className="space-y-3">
            {documents.map((doc) => {
              const description = lang === 'ru' ? doc.description_ru : doc.description_kk;
              return (
                <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{doc.file_name}</h3>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                            {getDocumentTypeLabel(doc.document_type)}
                          </span>
                        </div>
                        {description && (
                          <p className="text-sm text-gray-600 mb-1">{description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline text-sm font-medium">
                        {lang === 'ru' ? 'Скачать' : 'Жүктеу'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
