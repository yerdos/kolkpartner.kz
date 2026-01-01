import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CostBreakdown {
  id: string;
  vehicle_id: string;
  transfer_fee: number;
  domestic_transport: number;
  permit_fee: number;
  international_shipping: number;
  declaration_agent_fee: number;
  tariff: number;
  vat: number;
  disposal_tax: number;
  epts_fee: number;
  sbkts_fee: number;
  customs_agent_fee: number;
  registration_fee: number;
  inspection_and_plate_fee: number;
  towing_fee: number;
  other_fees: number;
  total_cost_usd: number;
  estimated_landing_price: number;
  discount_amount: number;
  discount_percentage: number;
  vehicles?: {
    brand: string;
    model: string;
    year: number;
    price_usd: number;
  };
}

export function CostManagement() {
  const [costs, setCosts] = useState<CostBreakdown[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    transfer_fee: 0,
    domestic_transport: 0,
    permit_fee: 0,
    international_shipping: 0,
    declaration_agent_fee: 0,
    tariff: 0,
    vat: 0,
    disposal_tax: 0,
    epts_fee: 0,
    sbkts_fee: 0,
    customs_agent_fee: 0,
    registration_fee: 0,
    inspection_and_plate_fee: 0,
    towing_fee: 0,
    other_fees: 0,
    discount_percentage: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [costsResult, vehiclesResult] = await Promise.all([
        supabase
          .from('cost_breakdown')
          .select(`
            *,
            vehicles (
              brand,
              model,
              year,
              price_usd
            )
          `),
        supabase
          .from('vehicles')
          .select('id, brand, model, year, price_usd')
          .order('created_at', { ascending: false })
      ]);
      if (costsResult.data) setCosts(costsResult.data);
      if (vehiclesResult.data) setVehicles(vehiclesResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (data: typeof formData, basePrice: number = 0) => {
    return (
      basePrice +
      data.transfer_fee +
      data.domestic_transport +
      data.permit_fee +
      data.international_shipping +
      data.declaration_agent_fee +
      data.tariff +
      data.vat +
      data.disposal_tax +
      data.epts_fee +
      data.sbkts_fee +
      data.customs_agent_fee +
      data.registration_fee +
      data.inspection_and_plate_fee +
      data.towing_fee +
      data.other_fees
    );
  };

  const calculateCostOnly = (data: typeof formData) => {
    return (
      data.transfer_fee +
      data.domestic_transport +
      data.permit_fee +
      data.international_shipping +
      data.declaration_agent_fee +
      data.tariff +
      data.vat +
      data.disposal_tax +
      data.epts_fee +
      data.sbkts_fee +
      data.customs_agent_fee +
      data.registration_fee +
      data.inspection_and_plate_fee +
      data.towing_fee +
      data.other_fees
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      const discount_amount = (formData.other_fees * formData.discount_percentage) / 100;
      const discounted_commission = formData.other_fees - discount_amount;

      const total_cost_usd = calculateCostOnly(formData) - formData.other_fees + discounted_commission;
      const estimated_landing_price = calculateTotal(formData, vehicle?.price_usd || 0) - formData.other_fees + discounted_commission;

      const dataToSave = {
        ...formData,
        total_cost_usd,
        estimated_landing_price,
        discount_amount,
      };

      if (editingId) {
        await supabase
          .from('cost_breakdown')
          .update(dataToSave)
          .eq('id', editingId);
      } else {
        await supabase
          .from('cost_breakdown')
          .insert([dataToSave]);
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving cost breakdown:', error);
      alert('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条价格记录吗？')) return;
    try {
      await supabase.from('cost_breakdown').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error deleting cost breakdown:', error);
      alert('删除失败');
    }
  };

  const handleEdit = (cost: CostBreakdown) => {
    setFormData({
      vehicle_id: cost.vehicle_id,
      transfer_fee: cost.transfer_fee,
      domestic_transport: cost.domestic_transport,
      permit_fee: cost.permit_fee,
      international_shipping: cost.international_shipping,
      declaration_agent_fee: cost.declaration_agent_fee,
      tariff: cost.tariff,
      vat: cost.vat,
      disposal_tax: cost.disposal_tax,
      epts_fee: cost.epts_fee,
      sbkts_fee: cost.sbkts_fee,
      customs_agent_fee: cost.customs_agent_fee,
      registration_fee: cost.registration_fee,
      inspection_and_plate_fee: cost.inspection_and_plate_fee,
      towing_fee: cost.towing_fee,
      other_fees: cost.other_fees,
      discount_percentage: cost.discount_percentage || 0,
    });
    setEditingId(cost.id);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      transfer_fee: 0,
      domestic_transport: 0,
      permit_fee: 0,
      international_shipping: 0,
      declaration_agent_fee: 0,
      tariff: 0,
      vat: 0,
      disposal_tax: 0,
      epts_fee: 0,
      sbkts_fee: 0,
      customs_agent_fee: 0,
      registration_fee: 0,
      inspection_and_plate_fee: 0,
      towing_fee: 0,
      other_fees: 0,
      discount_percentage: 0,
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">价格管理 ({costs.length})</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            添加价格
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold text-gray-900">
              {editingId ? '编辑价格' : '添加价格明细'}
            </h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">选择车辆</label>
              <select
                required
                value={formData.vehicle_id}
                onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              >
                <option value="">选择车辆</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.brand} {vehicle.model} ({vehicle.year}) - ${vehicle.price_usd.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-bold text-gray-700 mb-2">1. 采购费用</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">过户费</label>
                  <input
                    type="number"
                    value={formData.transfer_fee}
                    onChange={(e) => setFormData({ ...formData, transfer_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-bold text-gray-700 mb-2">2. 运输报关</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">国内运输费用</label>
                  <input
                    type="number"
                    value={formData.domestic_transport}
                    onChange={(e) => setFormData({ ...formData, domestic_transport: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">许可证</label>
                  <input
                    type="number"
                    value={formData.permit_fee}
                    onChange={(e) => setFormData({ ...formData, permit_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">跨境运输</label>
                  <input
                    type="number"
                    value={formData.international_shipping}
                    onChange={(e) => setFormData({ ...formData, international_shipping: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">报关代理费</label>
                  <input
                    type="number"
                    value={formData.declaration_agent_fee}
                    onChange={(e) => setFormData({ ...formData, declaration_agent_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-bold text-gray-700 mb-2">3. 清关落地</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">关税 (15%)</label>
                  <input
                    type="number"
                    value={formData.tariff}
                    onChange={(e) => setFormData({ ...formData, tariff: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">增值税 (16%)</label>
                  <input
                    type="number"
                    value={formData.vat}
                    onChange={(e) => setFormData({ ...formData, vat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">报废税 (Утильсбор)</label>
                  <input
                    type="number"
                    value={formData.disposal_tax}
                    onChange={(e) => setFormData({ ...formData, disposal_tax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ЭПТС机动车电子护照</label>
                  <input
                    type="number"
                    value={formData.epts_fee}
                    onChange={(e) => setFormData({ ...formData, epts_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">СБКТС合格证+SOS按钮</label>
                  <input
                    type="number"
                    value={formData.sbkts_fee}
                    onChange={(e) => setFormData({ ...formData, sbkts_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">清关代理费</label>
                  <input
                    type="number"
                    value={formData.customs_agent_fee}
                    onChange={(e) => setFormData({ ...formData, customs_agent_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">首次注册费</label>
                  <input
                    type="number"
                    value={formData.registration_fee}
                    onChange={(e) => setFormData({ ...formData, registration_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">车管所审验+上牌</label>
                  <input
                    type="number"
                    value={formData.inspection_and_plate_fee}
                    onChange={(e) => setFormData({ ...formData, inspection_and_plate_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">拖车费</label>
                  <input
                    type="number"
                    value={formData.towing_fee}
                    onChange={(e) => setFormData({ ...formData, towing_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-bold text-gray-700 mb-2">4. 平台佣金与折扣</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">平台佣金</label>
                  <input
                    type="number"
                    value={formData.other_fees}
                    onChange={(e) => setFormData({ ...formData, other_fees: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">折扣百分比 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                    placeholder="0-100"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-700">费用总计</div>
                  <div className="text-xl font-bold text-gray-900">
                    ${calculateCostOnly(formData).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700">预计落地价</div>
                  <div className="text-xl font-bold text-blue-600">
                    ${calculateTotal(formData, vehicles.find(v => v.id === formData.vehicle_id)?.price_usd || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-semibold"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">车辆</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">车价</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">采购费用</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">运输报关</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">清关落地</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">其他</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">落地价</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {costs.map((cost) => (
                <tr key={cost.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">
                    {cost.vehicles && (
                      <div>
                        <div className="font-semibold">
                          {cost.vehicles.brand} {cost.vehicles.model}
                        </div>
                        <div className="text-xs text-gray-500">{cost.vehicles.year}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold">
                    ${cost.vehicles?.price_usd.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    ${cost.transfer_fee.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    ${(cost.domestic_transport + cost.permit_fee + cost.international_shipping + cost.declaration_agent_fee).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    ${(cost.tariff + cost.vat + cost.disposal_tax + cost.epts_fee + cost.sbkts_fee + cost.customs_agent_fee + cost.registration_fee + cost.inspection_and_plate_fee + cost.towing_fee).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    ${cost.other_fees.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm font-bold text-blue-600">
                    ${cost.estimated_landing_price.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(cost)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cost.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
