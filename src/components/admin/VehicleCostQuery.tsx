import { useState } from 'react';
import { Search, DollarSign, Truck, FileText, Calculator, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Vehicle {
  id: string;
  vehicle_number: string;
  brand: string;
  model: string;
  year: number;
  price_usd: number;
  source_country: string;
  mileage_km: number;
  fuel_type: string;
  transmission: string;
}

interface CostBreakdown {
  domestic_transport: number;
  international_shipping: number;
  customs_declaration: number;
  customs_clearance: number;
  local_delivery: number;
  registration_fee: number;
  tax_fee: number;
  service_fee: number;
  other_fees: number;
  discount_amount: number;
  discount_percentage: number;
  total_cost_usd: number;
  estimated_landing_price: number;
}

interface VehicleCost {
  customs_price: number;
  tariff_amount: number;
  vat_amount: number;
  total_tax: number;
  disposal_tax: number;
  registration_fee: number;
  epts_fee: number;
  sbkts_fee: number;
  broker_fee: number;
  inspection_fee: number;
  towing_fee: number;
  total_cost: number;
  calculated_at: string;
}

export default function VehicleCostQuery() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [vehicleCost, setVehicleCost] = useState<VehicleCost | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!vehicleNumber.trim()) {
      setError('请输入车辆编号');
      return;
    }

    setLoading(true);
    setError('');
    setVehicle(null);
    setCostBreakdown(null);
    setVehicleCost(null);

    try {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('vehicle_number', vehicleNumber.trim())
        .maybeSingle();

      if (vehicleError) throw vehicleError;

      if (!vehicleData) {
        setError('未找到该车辆编号对应的车辆');
        return;
      }

      setVehicle(vehicleData);

      const { data: costData } = await supabase
        .from('cost_breakdown')
        .select('*')
        .eq('vehicle_id', vehicleData.id)
        .maybeSingle();

      if (costData) {
        setCostBreakdown(costData);
      }

      const { data: vehicleCostData } = await supabase
        .from('vehicle_costs')
        .select('*')
        .eq('vehicle_id', vehicleData.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vehicleCostData) {
        setVehicleCost(vehicleCostData);
      }
    } catch (err) {
      console.error('查询失败:', err);
      setError('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">车辆成本查询</h2>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="请输入车辆编号"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {loading ? '查询中...' : '查询'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {vehicle && (
        <>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">车辆信息</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">车辆编号</p>
                <p className="font-semibold text-gray-900">{vehicle.vehicle_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">品牌型号</p>
                <p className="font-semibold text-gray-900">{vehicle.brand} {vehicle.model}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">年份</p>
                <p className="font-semibold text-gray-900">{vehicle.year}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">车价（美元）</p>
                <p className="font-semibold text-gray-900">${formatCurrency(vehicle.price_usd)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">来源国家</p>
                <p className="font-semibold text-gray-900">{vehicle.source_country}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">里程</p>
                <p className="font-semibold text-gray-900">{vehicle.mileage_km.toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">燃料类型</p>
                <p className="font-semibold text-gray-900">{vehicle.fuel_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">变速箱</p>
                <p className="font-semibold text-gray-900">{vehicle.transmission}</p>
              </div>
            </div>
          </div>

          {costBreakdown && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-bold text-gray-900">成本明细</h3>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b">
                  <div>
                    <p className="text-sm text-gray-500">国内运输</p>
                    <p className="font-semibold text-gray-900">${formatCurrency(costBreakdown.domestic_transport)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">国际运输</p>
                    <p className="font-semibold text-gray-900">${formatCurrency(costBreakdown.international_shipping)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">报关费用</p>
                    <p className="font-semibold text-gray-900">${formatCurrency(costBreakdown.customs_declaration)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">清关费用</p>
                    <p className="font-semibold text-gray-900">${formatCurrency(costBreakdown.customs_clearance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">本地配送</p>
                    <p className="font-semibold text-gray-900">${formatCurrency(costBreakdown.local_delivery)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">上牌费用</p>
                    <p className="font-semibold text-gray-900">${formatCurrency(costBreakdown.registration_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">税费</p>
                    <p className="font-semibold text-gray-900">${formatCurrency(costBreakdown.tax_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">服务费</p>
                    <p className="font-semibold text-gray-900">${formatCurrency(costBreakdown.service_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">其他费用</p>
                    <p className="font-semibold text-gray-900">${formatCurrency(costBreakdown.other_fees)}</p>
                  </div>
                </div>

                {(costBreakdown.discount_amount > 0 || costBreakdown.discount_percentage > 0) && (
                  <div className="grid grid-cols-2 gap-4 pb-3 border-b">
                    <div>
                      <p className="text-sm text-gray-500">折扣金额</p>
                      <p className="font-semibold text-red-600">-${formatCurrency(costBreakdown.discount_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">折扣比例</p>
                      <p className="font-semibold text-red-600">{costBreakdown.discount_percentage}%</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-3 bg-blue-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">总成本（美元）</p>
                    <p className="text-xl font-bold text-blue-600">${formatCurrency(costBreakdown.total_cost_usd)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">预估落地价</p>
                    <p className="text-xl font-bold text-green-600">${formatCurrency(costBreakdown.estimated_landing_price)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {vehicleCost && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">税费计算</h3>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-3 border-b">
                  <div>
                    <p className="text-sm text-gray-500">报关价格</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.customs_price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">关税</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.tariff_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">增值税</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.vat_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">总税额</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.total_tax)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">处置税</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.disposal_tax)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">上牌费</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.registration_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">EPTS费</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.epts_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">SBKTS费</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.sbkts_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">经纪费</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.broker_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">检测费</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.inspection_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">拖车费</p>
                    <p className="font-semibold text-gray-900">₸{formatCurrency(vehicleCost.towing_fee)}</p>
                  </div>
                </div>

                <div className="pt-3 bg-purple-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">总费用（坚戈）</p>
                      <p className="text-xl font-bold text-purple-600">₸{formatCurrency(vehicleCost.total_cost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">计算时间</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(vehicleCost.calculated_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!costBreakdown && !vehicleCost && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 text-gray-500">
                <FileText className="w-5 h-5" />
                <p>该车辆暂无成本数据</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
