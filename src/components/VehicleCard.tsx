import { Car, MapPin, Fuel, Gauge, Heart } from 'lucide-react';
import type { Vehicle } from '../lib/supabase';
import type { Language } from '../lib/i18n';

interface VehicleCardProps {
  vehicle: Vehicle;
  lang: Language;
  t: (key: string) => string;
  onSelect: (id: string) => void;
  onToggleFavorite?: (vehicleId: string) => void;
  isFavorite?: boolean;
  exchangeRate?: number;
  estimatedPrice?: number;
}

export function VehicleCard({ vehicle, lang, t, onSelect, onToggleFavorite, isFavorite, exchangeRate = 485, estimatedPrice }: VehicleCardProps) {
  const statusColors = {
    available: 'bg-green-100 text-green-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    sold: 'bg-gray-100 text-gray-800',
  };

  const countryFlags = {
    korea: '🇰🇷',
    china: '🇨🇳',
    georgia: '🇬🇪',
  };

  const roundToLastFourDigits = (value: number): number => {
    return Math.round(value / 10000) * 10000;
  };

  const description = lang === 'ru' ? vehicle.description_ru : vehicle.description_kk;
  const isSold = vehicle.is_sold || vehicle.status === 'sold';

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 ${isSold ? 'opacity-75' : ''}`}>
      <div className="relative h-32 overflow-hidden">
        <img
          src={vehicle.images[0]}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className={`w-full h-full object-cover transition-transform duration-300 hover:scale-110 ${isSold ? 'grayscale' : ''}`}
        />
        {isSold && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg transform rotate-[-10deg] shadow-xl">
              {lang === 'ru' ? 'Sold out' : 'Sold out'}
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="text-2xl leading-none shadow-lg">{countryFlags[vehicle.source_country]}</span>
        </div>
        {onToggleFavorite && !isSold && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(vehicle.id);
            }}
            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
            />
          </button>
        )}
        {!isSold && (
          <div className="absolute top-2 right-12 flex gap-1.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[vehicle.status]}`}>
              {t(vehicle.status)}
            </span>
            {vehicle.has_inspection_report && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                ✓ {t('inspectionReport')}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-start justify-between mb-1.5">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {vehicle.brand} {vehicle.model}
            </h3>
            {vehicle.vehicle_number && (
              <p className="text-xs text-gray-500 font-semibold mt-0.5">
                {vehicle.vehicle_number}
              </p>
            )}
            <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
              <span className="text-sm">{countryFlags[vehicle.source_country]}</span>
              {vehicle.source_region}
            </p>
          </div>
          <div className="text-right">
            {estimatedPrice ? (
              <>
                <div className="text-lg font-bold text-blue-600">
                  {roundToLastFourDigits(estimatedPrice * exchangeRate).toLocaleString()} ₸
                </div>
                <div className="text-xs text-gray-500">
                  ≈ ${estimatedPrice.toLocaleString()}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-blue-600">
                  {roundToLastFourDigits(vehicle.price_usd * exchangeRate).toLocaleString()} ₸
                </div>
                <div className="text-xs text-gray-500">
                  ≈ ${vehicle.price_usd.toLocaleString()}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-1.5 line-clamp-2">{description}</p>

        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div className="flex items-center justify-center gap-1 bg-gray-50 rounded px-1 py-1">
            <Car className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-bold text-gray-800 whitespace-nowrap">{vehicle.year}</span>
          </div>
          <div className="flex items-center justify-center gap-0.5 bg-gray-50 rounded px-1 py-1 overflow-hidden">
            <Gauge className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{vehicle.mileage_km.toLocaleString()}{t('km')}</span>
          </div>
          <div className="flex items-center justify-center gap-1 bg-gray-50 rounded px-1 py-1 overflow-hidden">
            <Fuel className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{t(vehicle.fuel_type as any)}</span>
          </div>
        </div>

        <button
          onClick={() => onSelect(vehicle.id)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors duration-200 text-sm"
        >
          {t('viewDetails')}
        </button>
      </div>
    </div>
  );
}
