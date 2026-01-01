import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Package, Settings, Eye, EyeOff } from 'lucide-react';
import { supabase, type Vehicle, type CostBreakdown } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Distributor = {
  id: string;
  code: string;
  name: string;
  profit_margin: number;
  domain: string;
};

type VehicleWithCost = Vehicle & {
  cost?: CostBreakdown;
  display_price?: number;
};

export function DistributorCenter() {
  const { user } = useAuth();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [vehicles, setVehicles] = useState<VehicleWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [profitMargin, setProfitMargin] = useState<number>(10);
  const [showCostDetails, setShowCostDetails] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(485);

  useEffect(() => {
    if (user) {
      loadDistributorInfo();
      loadExchangeRate();
    }
  }, [user]);

  useEffect(() => {
    if (distributor) {
      loadVehicles();
    }
  }, [distributor]);

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

  const loadDistributorInfo = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('distributor_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.distributor_id) {
        const { data: dist } = await supabase
          .from('distributors')
          .select('*')
          .eq('id', profile.distributor_id)
          .maybeSingle();

        if (dist) {
          setDistributor(dist as Distributor);
          setProfitMargin(Number(dist.profit_margin || 10));
        }
      }
    } catch (error) {
      console.error('Error loading distributor info:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const { data: vehiclesData } = await supabase
        .from('vehicles_with_status')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(50);

      if (vehiclesData) {
        const vehicleIds = vehiclesData.map(v => v.id);
        const { data: costsData } = await supabase
          .from('cost_breakdown')
          .select('*')
          .in('vehicle_id', vehicleIds);

        const vehiclesWithCost = vehiclesData.map(vehicle => {
          const cost = costsData?.find(c => c.vehicle_id === vehicle.id);
          const display_price = cost
            ? cost.estimated_landing_price * (1 + profitMargin / 100)
            : vehicle.price_usd * (1 + profitMargin / 100);

          return {
            ...vehicle,
            cost: cost as CostBreakdown,
            display_price
          };
        });

        setVehicles(vehiclesWithCost);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfitMargin = async () => {
    if (!distributor) return;

    try {
      const { error } = await supabase
        .from('distributors')
        .update({ profit_margin: profitMargin })
        .eq('id', distributor.id);

      if (error) throw error;

      alert('利润率更新成功！');
      loadVehicles();
    } catch (error) {
      console.error('Error updating profit margin:', error);
      alert('利润率更新失败');
    }
  };

  if (!distributor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">未授权访问</h2>
          <p className="text-gray-600">您的账户未关联到任何分销商</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">分销商中心</h1>
        <p className="text-gray-600">{distributor.name} - {distributor.code}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8" />
            <span className="text-2xl font-bold">{profitMargin}%</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">当前利润率</h3>
          <p className="text-blue-100 text-sm">可在下方调整</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Package className="w-8 h-8" />
            <span className="text-2xl font-bold">{vehicles.length}</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">可售车辆</h3>
          <p className="text-green-100 text-sm">当前库存数量</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8" />
            <span className="text-2xl font-bold">
              {vehicles.length > 0
                ? Math.round(vehicles.reduce((sum, v) => sum + (v.display_price || 0) - (v.cost?.estimated_landing_price || v.price_usd), 0) / vehicles.length)
                : 0} USD
            </span>
          </div>
          <h3 className="text-lg font-semibold mb-1">平均利润</h3>
          <p className="text-purple-100 text-sm">每辆车平均利润</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">利润率设置</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              利润率百分比
            </label>
            <input
              type="number"
              value={profitMargin}
              onChange={(e) => setProfitMargin(Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="pt-6">
            <button
              onClick={handleUpdateProfitMargin}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              保存设置
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          显示价格 = 成本价 × (1 + {profitMargin}%) = 成本价 × {(1 + profitMargin / 100).toFixed(3)}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">车辆成本管理</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">加载中...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">车辆信息</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">成本价 (USD)</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">成本价 (KZT)</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">显示价 (USD)</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">显示价 (KZT)</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">利润 (USD)</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => {
                  const costPrice = vehicle.cost?.estimated_landing_price || vehicle.price_usd;
                  const displayPrice = vehicle.display_price || costPrice;
                  const profit = displayPrice - costPrice;

                  return (
                    <>
                      <tr key={vehicle.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {vehicle.brand} {vehicle.model}
                          </div>
                          <div className="text-sm text-gray-600">
                            {vehicle.year} • {vehicle.mileage_km.toLocaleString()} км
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          ${costPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          ₸{(costPrice * exchangeRate).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600">
                          ${Math.round(displayPrice).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600">
                          ₸{Math.round(displayPrice * exchangeRate).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          ${Math.round(profit).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setShowCostDetails(showCostDetails === vehicle.id ? null : vehicle.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {showCostDetails === vehicle.id ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {showCostDetails === vehicle.id && vehicle.cost && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3">成本明细</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">过户费</span>
                                    <span className="font-medium">${vehicle.cost.transfer_fee}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">国内运输</span>
                                    <span className="font-medium">${vehicle.cost.domestic_transport}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">许可证费</span>
                                    <span className="font-medium">${vehicle.cost.permit_fee}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">国际运输</span>
                                    <span className="font-medium">${vehicle.cost.international_shipping}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">报关代理费</span>
                                    <span className="font-medium">${vehicle.cost.declaration_agent_fee}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">关税</span>
                                    <span className="font-medium">${vehicle.cost.tariff}</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3">&nbsp;</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">增值税</span>
                                    <span className="font-medium">${vehicle.cost.vat}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">处置税</span>
                                    <span className="font-medium">${vehicle.cost.disposal_tax}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">EPTS费用</span>
                                    <span className="font-medium">${vehicle.cost.epts_fee}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">SBKTS费用</span>
                                    <span className="font-medium">${vehicle.cost.sbkts_fee}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">海关代理费</span>
                                    <span className="font-medium">${vehicle.cost.customs_agent_fee}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">其他费用</span>
                                    <span className="font-medium">${vehicle.cost.other_fees}</span>
                                  </div>
                                  <div className="flex justify-between pt-2 border-t border-gray-300">
                                    <span className="text-gray-900 font-semibold">成本总计</span>
                                    <span className="font-bold text-gray-900">${vehicle.cost.estimated_landing_price.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
