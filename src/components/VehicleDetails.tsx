import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Car, Calendar, Gauge, Fuel, Settings, MapPin, FileText, DollarSign, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, X, Clock, Share2, Check, Users, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import type { Vehicle, InspectionReport, InspectionItem, CostBreakdown, TaxCalculatorConfig } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import type { Language } from '../lib/i18n';

interface VehicleDetailsProps {
  vehicleId: string;
  lang: Language;
  t: (key: string) => string;
  onBack: () => void;
  onOrderNow: (vehicle: Vehicle, cost: CostBreakdown) => void;
}

export function VehicleDetails({ vehicleId, lang, t, onBack, onOrderNow }: VehicleDetailsProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [cost, setCost] = useState<CostBreakdown | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(485);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const roundToLastFourDigits = (value: number): number => {
    return Math.round(value / 10000) * 10000;
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = vehicle ? `${vehicle.brand} ${vehicle.model} - ${t('appName')}` : t('appName');
    const text = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year} - ${description}` : '';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          copyToClipboard(url);
        }
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }).catch((error) => {
      console.error('Error copying to clipboard:', error);
    });
  };

  const handleDownloadImage = async () => {
    if (!contentRef.current || !vehicle) return;

    try {
      setShowQRCode(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      const pixelRatio = window.devicePixelRatio || 1;
      const scale = Math.max(3, pixelRatio * 2);

      const canvas = await html2canvas(contentRef.current, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f9fafb',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
      });

      setShowQRCode(false);

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `${vehicle.brand}-${vehicle.model}-${vehicle.year}.png`;
      link.click();
    } catch (error) {
      console.error('Error downloading image:', error);
      setShowQRCode(false);
    }
  };

  useEffect(() => {
    loadVehicleData();
  }, [vehicleId]);

  useEffect(() => {
    if (vehicle && !imagesLoaded) {
      const preloadImages = async () => {
        const imagePromises = vehicle.images.map((src) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
          });
        });

        try {
          await Promise.all(imagePromises);
          setImagesLoaded(true);
        } catch (error) {
          console.error('Error preloading images:', error);
        }
      };

      preloadImages();
    }
  }, [vehicle, imagesLoaded]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const loadVehicleData = async () => {
    try {
      const { data: vehicleData } = await supabase
        .from('vehicles_with_status')
        .select('*')
        .eq('id', vehicleId)
        .maybeSingle();

      const { data: reportData } = await supabase
        .from('inspection_reports')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();

      if (reportData) {
        const { data: itemsData } = await supabase
          .from('inspection_items')
          .select('*')
          .eq('report_id', reportData.id);
        setItems(itemsData || []);
      }

      const { data: costData } = await supabase
        .from('cost_breakdown')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();

      const { data: configData } = await supabase
        .from('tax_calculator_config')
        .select('usd_to_kzt_rate')
        .maybeSingle();

      if (configData?.usd_to_kzt_rate) {
        setExchangeRate(Number(configData.usd_to_kzt_rate));
      }

      setVehicle(vehicleData);
      setReport(reportData);
      setCost(costData);
    } catch (error) {
      console.error('Error loading vehicle data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">{t('loading')}</div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">{t('error')}</div>
      </div>
    );
  }

  const description = lang === 'ru' ? vehicle.description_ru : vehicle.description_kk;

  const statusIcons = {
    good: <CheckCircle className="w-5 h-5 text-green-600" />,
    fair: <AlertCircle className="w-5 h-5 text-yellow-600" />,
    poor: <XCircle className="w-5 h-5 text-orange-600" />,
    needs_repair: <XCircle className="w-5 h-5 text-red-600" />,
  };

  const categoryIcons = {
    paint: '🎨',
    engine: '⚙️',
    transmission: '🔧',
    electrical: '⚡',
    interior: '🪑',
    exterior: '🚗',
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InspectionItem[]>);

  const handlePrevImage = () => {
    if (!vehicle) return;
    setCurrentImageIndex((prev) => (prev === 0 ? vehicle.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!vehicle) return;
    setCurrentImageIndex((prev) => (prev === vehicle.images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToVehicles')}
        </button>

        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={handleDownloadImage}
            className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs md:text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('downloadImage')}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs md:text-sm transition-colors"
          >
            {showCopied ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'ru' ? 'Скопировано' : 'Көшірілді'}</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'ru' ? 'Поделиться' : 'Бөлісу'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div ref={contentRef}>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-3">
          <div className="grid md:grid-cols-2 gap-3 p-3">
            <div className="space-y-3">
            <div className="relative group">
              <img
                src={vehicle.images[currentImageIndex]}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-full h-80 object-cover rounded-lg cursor-pointer"
                onClick={() => setIsFullscreen(true)}
              />
              {vehicle.images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {vehicle.images.length}
                  </div>
                </>
              )}
            </div>
            {vehicle.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {vehicle.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`${vehicle.brand} ${vehicle.model} - ${index + 1}`}
                    className={`flex-shrink-0 object-cover rounded cursor-pointer transition-all duration-200 ${
                      index === currentImageIndex
                        ? 'w-24 h-24 ring-4 ring-blue-500 scale-105'
                        : 'w-20 h-20 opacity-60 hover:opacity-100'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1.5">
              {vehicle.brand} {vehicle.model}
            </h1>
            {vehicle.vehicle_number && (
              <div className="mb-2">
                <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {t('vehicleNumber')}: {vehicle.vehicle_number}
                </span>
              </div>
            )}
            <p className="text-gray-600 mb-3 text-sm">{description}</p>

            <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 mb-3">
              {cost && cost.discount_amount > 0 ? (
                <>
                  <div className="text-xs text-gray-600 mb-1">{t('finalPrice')}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm text-gray-500 line-through">
                      {roundToLastFourDigits((cost.estimated_landing_price + cost.discount_amount) * exchangeRate).toLocaleString()} ₸
                    </div>
                    <div className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                      {t('commission')} -{cost.discount_percentage}%
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {roundToLastFourDigits(cost.estimated_landing_price * exchangeRate).toLocaleString()} ₸
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    ${cost.estimated_landing_price.toLocaleString()}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-gray-600 mb-1">{t('estimatedLandingPrice')}</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {cost ? roundToLastFourDigits(cost.estimated_landing_price * exchangeRate).toLocaleString() : roundToLastFourDigits(vehicle.price_usd * exchangeRate).toLocaleString()} ₸
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    ${cost ? cost.estimated_landing_price.toLocaleString() : vehicle.price_usd.toLocaleString()}
                  </div>
                </>
              )}
            </div>

            {vehicle.estimated_delivery_days && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg p-3 mb-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-0.5">
                      {t('estimatedDeliveryDays')}
                    </div>
                    <div className="text-lg font-bold text-green-700">
                      {vehicle.estimated_delivery_days} {t('days')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{t('year')}:</span>
                <span>{vehicle.year}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Gauge className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{t('mileage')}:</span>
                <span>{vehicle.mileage_km.toLocaleString()} {t('km')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Fuel className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{t('fuelType')}:</span>
                <span>{t(vehicle.fuel_type as any)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{t('transmission')}:</span>
                <span>{t(vehicle.transmission as any)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Car className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{t('color')}:</span>
                <span>{vehicle.color}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{t('engineCapacity')}:</span>
                <span>{vehicle.engine_capacity}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{t('seats')}:</span>
                <span>{vehicle.seats}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{t('sourceRegion')}:</span>
                <span>{vehicle.source_region}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {report && (
        <div className="bg-white rounded-lg shadow-lg p-3 mb-3">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t('inspectionReport')}
          </h2>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-green-800 mb-2">
                  {t('qualityGuaranteeTitle')}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {t('qualityGuaranteeText')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className={`p-3 rounded-lg ${
              report.overall_condition === 'S' ? 'bg-purple-50' :
              report.overall_condition === 'A' ? 'bg-blue-50' :
              report.overall_condition === 'B' ? 'bg-green-50' :
              'bg-yellow-50'
            }`}>
              <div className="text-xs text-gray-600 mb-1">{t('conditionGrade')}</div>
              <div className={`text-2xl font-bold ${
                report.overall_condition === 'S' ? 'text-purple-600' :
                report.overall_condition === 'A' ? 'text-blue-600' :
                report.overall_condition === 'B' ? 'text-green-600' :
                'text-yellow-600'
              }`}>
                {report.overall_condition} {t('grade')}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">{t('newnessRating')}</div>
              <div className="text-2xl font-bold text-blue-600">{report.newness_rating} {t('newness')}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div className={`p-3 rounded-lg ${report.major_accident ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="text-xs text-gray-600 mb-1">{t('majorAccident')}</div>
              <div className={`text-sm font-semibold ${report.major_accident ? 'text-red-600' : 'text-green-600'}`}>
                {report.major_accident ? t('yes') : t('no')}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${report.fire_damage ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="text-xs text-gray-600 mb-1">{t('fireDamage')}</div>
              <div className={`text-sm font-semibold ${report.fire_damage ? 'text-red-600' : 'text-green-600'}`}>
                {report.fire_damage ? t('yes') : t('no')}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${report.water_damage ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="text-xs text-gray-600 mb-1">{t('waterDamage')}</div>
              <div className={`text-sm font-semibold ${report.water_damage ? 'text-red-600' : 'text-green-600'}`}>
                {report.water_damage ? t('yes') : t('no')}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div className={`p-3 rounded-lg ${report.claim_count > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
              <div className="text-xs text-gray-600 mb-1">{t('claimCount')}</div>
              <div className={`text-lg font-bold ${report.claim_count > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {report.claim_count} {t('times')}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${report.transfer_count > 2 ? 'bg-orange-50' : 'bg-gray-50'}`}>
              <div className="text-xs text-gray-600 mb-1">{t('transferCount')}</div>
              <div className={`text-lg font-bold ${report.transfer_count > 2 ? 'text-orange-600' : 'text-gray-600'}`}>
                {report.transfer_count} {t('times')}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${report.has_accidents ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="text-xs text-gray-600 mb-1">{t('hasAccidents')}</div>
              <div className={`text-lg font-bold ${report.has_accidents ? 'text-red-600' : 'text-green-600'}`}>
                {report.has_accidents ? t('yes') : t('no')}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-2 mb-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">{t('inspectionDate')}</div>
              <div className="font-semibold text-sm">{new Date(report.inspection_date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">{t('inspector')}</div>
              <div className="font-semibold text-sm">{report.inspector_name}</div>
            </div>
          </div>

          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900 mb-1.5">{t('inspectionItems')}</h3>
            <div className="space-y-2">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="border border-gray-200 rounded-lg p-2">
                  <h4 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5 text-xs">
                    <span className="text-base">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                    {t(category)}
                  </h4>
                  <div className="space-y-1.5">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 text-xs">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.item_name}</div>
                          {item.notes && <div className="text-sm text-gray-600">{item.notes}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          {statusIcons[item.status]}
                          <span className="text-sm font-semibold">{t(item.status)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {cost && (
        <div className="bg-white rounded-lg shadow-lg p-3 mb-3">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {t('costBreakdown')}
          </h2>

          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b-2 border-gray-300">
              <span className="text-sm font-bold text-gray-900">{t('vehiclePrice')}</span>
              <span className="text-sm font-bold text-gray-900">${vehicle.price_usd.toLocaleString()}</span>
            </div>

            <div className="bg-blue-50 p-2 rounded-lg">
              <div className="text-xs font-bold text-blue-900 mb-1.5">1. {t('procurementCosts')}</div>
              <div className="space-y-1">
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('transferFee')}</span>
                  <span className="font-semibold">${cost.transfer_fee.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-2 rounded-lg">
              <div className="text-xs font-bold text-green-900 mb-1.5">2. {t('transportCustoms')}</div>
              <div className="space-y-1">
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('domesticTransport')}</span>
                  <span className="font-semibold">${cost.domestic_transport.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('permitFee')}</span>
                  <span className="font-semibold">${cost.permit_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('internationalShipping')}</span>
                  <span className="font-semibold">${cost.international_shipping.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('declarationAgentFee')}</span>
                  <span className="font-semibold">${cost.declaration_agent_fee.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-2 rounded-lg">
              <div className="text-xs font-bold text-purple-900 mb-1.5">3. {t('customsClearance')}</div>
              <div className="space-y-1">
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('tariff')}</span>
                  <span className="font-semibold">${cost.tariff.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('vat')}</span>
                  <span className="font-semibold">${cost.vat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('disposalTax')}</span>
                  <span className="font-semibold">${cost.disposal_tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('eptsFee')}</span>
                  <span className="font-semibold">${cost.epts_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('sbktsFee')}</span>
                  <span className="font-semibold">${cost.sbkts_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('customsAgentFee')}</span>
                  <span className="font-semibold">${cost.customs_agent_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('registrationFee')}</span>
                  <span className="font-semibold">${cost.registration_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('inspectionAndPlateFee')}</span>
                  <span className="font-semibold">${cost.inspection_and_plate_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-700">{t('towingFee')}</span>
                  <span className="font-semibold">${cost.towing_fee.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {cost.other_fees > 0 && (
              <div className="bg-yellow-50 p-2 rounded-lg border-2 border-yellow-400">
                <div className="text-xs font-bold text-yellow-900 mb-1.5">4. {t('platformCommission')}</div>
                <div className="space-y-1">
                  {cost.discount_amount > 0 ? (
                    <>
                      <div className="flex justify-between py-0.5 text-xs">
                        <span className="text-gray-700">{t('platformCommission')} ({t('originalPrice')})</span>
                        <span className="font-semibold line-through text-gray-500">${cost.other_fees.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-xs">
                        <span className="text-red-700 font-bold">{t('discount')} ({cost.discount_percentage}%)</span>
                        <span className="font-bold text-red-700">-${cost.discount_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 text-xs border-t border-yellow-300 pt-1.5">
                        <span className="text-green-700 font-bold">{t('platformCommission')} ({t('finalPrice')})</span>
                        <span className="font-bold text-green-700">${(cost.other_fees - cost.discount_amount).toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between py-0.5 text-xs">
                      <span className="text-gray-700">{t('platformCommission')}</span>
                      <span className="font-semibold">${cost.other_fees.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-100 border border-gray-300 rounded-lg p-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">
                  {lang === 'ru' ? 'Цена без растаможки' : 'Кедендеусіз баға'}
                </span>
                <div className="text-right">
                  <div className="text-base font-bold text-gray-900">
                    {roundToLastFourDigits((cost.estimated_landing_price - (
                      cost.tariff +
                      cost.vat +
                      cost.disposal_tax +
                      cost.epts_fee +
                      cost.sbkts_fee +
                      cost.customs_agent_fee +
                      cost.registration_fee +
                      cost.inspection_and_plate_fee +
                      cost.towing_fee
                    )) * exchangeRate).toLocaleString()} ₸
                  </div>
                  <div className="text-xs text-gray-600">
                    ${(cost.estimated_landing_price - (
                      cost.tariff +
                      cost.vat +
                      cost.disposal_tax +
                      cost.epts_fee +
                      cost.sbkts_fee +
                      cost.customs_agent_fee +
                      cost.registration_fee +
                      cost.inspection_and_plate_fee +
                      cost.towing_fee
                    )).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white -mx-3 px-3 mt-2 rounded-lg py-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">{t('estimatedLandingPrice')}</span>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {roundToLastFourDigits(cost.estimated_landing_price * exchangeRate).toLocaleString()} ₸
                  </div>
                  <div className="text-sm opacity-80 mt-1">
                    ${cost.estimated_landing_price.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {vehicle.is_sold || vehicle.status === 'sold' ? (
            <div className="w-full mt-3 bg-gray-400 text-white font-bold py-2 px-4 rounded-lg text-sm text-center cursor-not-allowed">
              {lang === 'ru' ? 'Sold out' : 'Sold out'}
            </div>
          ) : (
            <button
              onClick={() => onOrderNow(vehicle, cost)}
              className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              {t('orderNow')}
            </button>
          )}
        </div>
      )}

        {showQRCode && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-3">
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                  <QRCodeSVG
                    value={window.location.href}
                    size={150}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  www.kolk.kz
                </p>
                <p className="text-sm text-gray-600">
                  {t('scanQRCode')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-50"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevImage();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-4 rounded-full transition-colors z-50"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextImage();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-4 rounded-full transition-colors z-50"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 text-white px-6 py-3 rounded-full text-lg font-semibold">
            {currentImageIndex + 1} / {vehicle.images.length}
          </div>

          <img
            src={vehicle.images[currentImageIndex]}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
