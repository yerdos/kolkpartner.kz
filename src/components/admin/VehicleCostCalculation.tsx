import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calculator, DollarSign } from 'lucide-react';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  price_usd: number;
  engine_capacity: string;
}

interface TaxConfig {
  tariff_rate: number;
  vat_rate: number;
  disposal_tax_rate: number;
  registration_fee_new: number;
  registration_fee_2023: number;
  registration_fee_2022: number;
  registration_fee_2021: number;
  registration_fee_old: number;
  epts_fee_min: number;
  epts_fee_max: number;
  sbkts_fee_min: number;
  sbkts_fee_max: number;
  broker_fee: number;
  inspection_fee: number;
  towing_fee: number;
}

interface VehicleCost {
  vehicle_id: string;
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
}

export default function VehicleCostCalculation() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [config, setConfig] = useState<TaxConfig | null>(null);
  const [customsPrice, setCustomsPrice] = useState<string>('');
  const [calculatedCost, setCalculatedCost] = useState<VehicleCost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number>(480);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vehiclesRes, configRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select('id, brand, model, year, price_usd, engine_capacity')
          .order('brand', { ascending: true }),
        supabase
          .from('tax_calculator_config')
          .select('*')
          .limit(1)
          .maybeSingle()
      ]);

      if (vehiclesRes.error) throw vehiclesRes.error;
      if (configRes.error) throw configRes.error;

      setVehicles(vehiclesRes.data || []);
      setConfig(configRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getRegistrationFee = (year: number): number => {
    if (!config) return 0;
    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - year;

    if (vehicleAge <= 0) return config.registration_fee_new;
    if (vehicleAge === 1) return config.registration_fee_2023;
    if (vehicleAge === 2) return config.registration_fee_2022;
    if (vehicleAge >= 3) return config.registration_fee_2021;
    return config.registration_fee_old;
  };

  const getDisposalTaxCoefficient = (engineCC: number): number => {
    if (engineCC <= 1000) return 0.5;
    if (engineCC <= 2000) return 1.0;
    if (engineCC <= 3000) return 3.5;
    if (engineCC <= 4000) return 5.0;
    return 7.0;
  };

  const calculateDisposalTax = (engineCapacity: string, mrp: number): number => {
    const engineCC = parseInt(engineCapacity.replace(/\D/g, ''));
    if (isNaN(engineCC) || engineCC === 0) return 0;

    const coefficient = getDisposalTaxCoefficient(engineCC);
    return 50 * mrp * coefficient;
  };

  const calculateCosts = () => {
    if (!selectedVehicle || !config || !customsPrice) {
      setMessage('请选择车辆并输入海关价格');
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle) return;

    const priceUSD = parseFloat(customsPrice);
    const tariffAmount = priceUSD * config.tariff_rate;
    const vatAmount = priceUSD * config.vat_rate;
    const totalTax = tariffAmount + vatAmount;
    const registrationFee = getRegistrationFee(vehicle.year);
    const eptsFee = (config.epts_fee_min + config.epts_fee_max) / 2;
    const sbktsFee = (config.sbkts_fee_min + config.sbkts_fee_max) / 2;
    const disposalTax = calculateDisposalTax(vehicle.engine_capacity, config.disposal_tax_rate);

    const totalCostKZT =
      totalTax * exchangeRate +
      disposalTax +
      registrationFee +
      eptsFee +
      sbktsFee +
      config.broker_fee +
      config.inspection_fee +
      config.towing_fee;

    const cost: VehicleCost = {
      vehicle_id: selectedVehicle,
      customs_price: priceUSD,
      tariff_amount: tariffAmount,
      vat_amount: vatAmount,
      total_tax: totalTax,
      disposal_tax: disposalTax,
      registration_fee: registrationFee,
      epts_fee: eptsFee,
      sbkts_fee: sbktsFee,
      broker_fee: config.broker_fee,
      inspection_fee: config.inspection_fee,
      towing_fee: config.towing_fee,
      total_cost: totalCostKZT
    };

    setCalculatedCost(cost);
    setMessage('');
  };

  const saveCost = async () => {
    if (!calculatedCost) return;

    setSaving(true);
    setMessage('');

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('vehicle_costs')
        .upsert({
          ...calculatedCost,
          calculated_by: userData.user?.id,
          calculated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage('保存成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving cost:', error);
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!config) {
    return <div className="text-center py-8">请先配置税费计算器</div>;
  }

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
  const engineCC = selectedVehicleData ? parseInt(selectedVehicleData.engine_capacity.replace(/\D/g, '')) : 0;
  const disposalCoefficient = engineCC > 0 ? getDisposalTaxCoefficient(engineCC) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">车辆费用计算</h2>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('成功') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              选择车辆
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => {
                setSelectedVehicle(e.target.value);
                const vehicle = vehicles.find(v => v.id === e.target.value);
                if (vehicle) {
                  setCustomsPrice(vehicle.price_usd.toString());
                }
                setCalculatedCost(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择车辆</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.year} {vehicle.brand} {vehicle.model} ({vehicle.engine_capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              海关平均价格 (美金)
            </label>
            <input
              type="number"
              value={customsPrice}
              onChange={(e) => {
                setCustomsPrice(e.target.value);
                setCalculatedCost(null);
              }}
              placeholder="输入海关价格"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              美元汇率 (坚戈)
            </label>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => {
                setExchangeRate(parseFloat(e.target.value) || 480);
                setCalculatedCost(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {selectedVehicleData && engineCC > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <div className="text-sm">
              <p className="font-medium text-gray-900 mb-1">报废税计算公式:</p>
              <p className="text-gray-700">
                50 × MRP({config.disposal_tax_rate.toLocaleString()} KZT) × 系数({disposalCoefficient}) = {(50 * config.disposal_tax_rate * disposalCoefficient).toLocaleString()} KZT
              </p>
              <p className="text-xs text-gray-600 mt-1">
                排量 {engineCC}cc 对应系数 {disposalCoefficient}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={calculateCosts}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          计算费用
        </button>

        {calculatedCost && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">计算结果</h3>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">海关费用 (美金)</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>海关价格:</span>
                    <span className="font-medium">${calculatedCost.customs_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>关税 ({(config.tariff_rate * 100).toFixed(0)}%):</span>
                    <span className="font-medium">${calculatedCost.tariff_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>增值税 ({(config.vat_rate * 100).toFixed(0)}%):</span>
                    <span className="font-medium">${calculatedCost.vat_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                    <span className="font-semibold">税费总计:</span>
                    <span className="font-semibold text-blue-600">${calculatedCost.total_tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">折合坚戈:</span>
                    <span className="text-gray-600 text-xs">₸{(calculatedCost.total_tax * exchangeRate).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">其他费用 (坚戈)</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>报废税 (Утильсбор):</span>
                    <span className="font-medium">₸{calculatedCost.disposal_tax.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>首次注册费:</span>
                    <span className="font-medium">₸{calculatedCost.registration_fee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ЭПТS机动车电子护照:</span>
                    <span className="font-medium">₸{calculatedCost.epts_fee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>СБКТС合格证+SOS按钮:</span>
                    <span className="font-medium">₸{calculatedCost.sbkts_fee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>清关代理费:</span>
                    <span className="font-medium">₸{calculatedCost.broker_fee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>车管所审验+上牌:</span>
                    <span className="font-medium">₸{calculatedCost.inspection_fee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>拖车费:</span>
                    <span className="font-medium">₸{calculatedCost.towing_fee.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm opacity-90 mb-1">清关落地总费用</div>
                    <div className="text-3xl font-bold">₸{calculatedCost.total_cost.toFixed(0)}</div>
                    <div className="text-sm opacity-90 mt-1">
                      约 ${(calculatedCost.total_cost / exchangeRate).toFixed(2)} 美金
                    </div>
                  </div>
                  <DollarSign className="w-12 h-12 opacity-50" />
                </div>
              </div>

              <button
                onClick={saveCost}
                disabled={saving}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {saving ? '保存中...' : '保存到数据库'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
