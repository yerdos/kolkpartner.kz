import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InspectionReport {
  id: string;
  vehicle_id: string;
  inspection_date: string;
  inspector_name: string;
  overall_condition: 'S' | 'A' | 'B' | 'C';
  newness_rating: number;
  paint_condition: string;
  has_accidents: boolean;
  major_accident: boolean;
  fire_damage: boolean;
  water_damage: boolean;
  claim_count: number;
  transfer_count: number;
  vehicles?: {
    brand: string;
    model: string;
    year: number;
  };
}

interface InspectionItem {
  id: string;
  report_id: string;
  category: string;
  item_name: string;
  status: string;
  notes: string;
}

export function InspectionManagement() {
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspector_name: '',
    overall_condition: 'A' as 'S' | 'A' | 'B' | 'C',
    newness_rating: 85,
    paint_condition: 'good',
    has_accidents: false,
    major_accident: false,
    fire_damage: false,
    water_damage: false,
    claim_count: 0,
    transfer_count: 0,
  });
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFormData, setItemFormData] = useState({
    report_id: '',
    category: 'paint',
    item_name: '',
    status: 'good',
    notes: '',
  });
  const [tempItems, setTempItems] = useState<Omit<InspectionItem, 'id' | 'report_id'>[]>([]);
  const [showTempItemForm, setShowTempItemForm] = useState(false);
  const [editingTempItemIndex, setEditingTempItemIndex] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (expandedReportId) {
      loadInspectionItems(expandedReportId);
    }
  }, [expandedReportId]);

  const loadData = async () => {
    try {
      const [reportsResult, vehiclesResult] = await Promise.all([
        supabase
          .from('inspection_reports')
          .select(`
            *,
            vehicles (
              brand,
              model,
              year
            )
          `)
          .order('inspection_date', { ascending: false }),
        supabase
          .from('vehicles')
          .select('id, vehicle_number, brand, model, year')
          .order('created_at', { ascending: false })
      ]);
      if (reportsResult.data) setReports(reportsResult.data);
      if (vehiclesResult.data) setVehicles(vehiclesResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await supabase
          .from('inspection_reports')
          .update(formData)
          .eq('id', editingId);

        await supabase
          .from('vehicles')
          .update({ has_inspection_report: true })
          .eq('id', formData.vehicle_id);
      } else {
        const { data: newReport, error: reportError } = await supabase
          .from('inspection_reports')
          .insert([formData])
          .select()
          .single();

        if (reportError) throw reportError;

        if (newReport && tempItems.length > 0) {
          const itemsToInsert = tempItems.map(item => ({
            ...item,
            report_id: newReport.id,
          }));

          const { error: itemsError } = await supabase
            .from('inspection_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }

        await supabase
          .from('vehicles')
          .update({ has_inspection_report: true })
          .eq('id', formData.vehicle_id);
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving inspection report:', error);
      alert('保存失败');
    }
  };

  const handleDelete = async (id: string, vehicleId: string) => {
    if (!confirm('确定要删除这份检测报告吗？')) return;
    try {
      await supabase.from('inspection_reports').delete().eq('id', id);

      const { data: otherReports } = await supabase
        .from('inspection_reports')
        .select('id')
        .eq('vehicle_id', vehicleId);

      if (!otherReports || otherReports.length === 0) {
        await supabase
          .from('vehicles')
          .update({ has_inspection_report: false })
          .eq('id', vehicleId);
      }

      loadData();
    } catch (error) {
      console.error('Error deleting inspection report:', error);
      alert('删除失败');
    }
  };

  const handleEdit = (report: InspectionReport) => {
    setFormData({
      vehicle_id: report.vehicle_id,
      inspection_date: report.inspection_date,
      inspector_name: report.inspector_name,
      overall_condition: report.overall_condition,
      newness_rating: report.newness_rating,
      paint_condition: report.paint_condition,
      has_accidents: report.has_accidents,
      major_accident: report.major_accident,
      fire_damage: report.fire_damage,
      water_damage: report.water_damage,
      claim_count: report.claim_count,
      transfer_count: report.transfer_count,
    });
    setEditingId(report.id);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      inspection_date: new Date().toISOString().split('T')[0],
      inspector_name: '',
      overall_condition: 'A',
      newness_rating: 85,
      paint_condition: 'good',
      has_accidents: false,
      major_accident: false,
      fire_damage: false,
      water_damage: false,
      claim_count: 0,
      transfer_count: 0,
    });
    setEditingId(null);
    setShowAddForm(false);
    setTempItems([]);
    setShowTempItemForm(false);
    setEditingTempItemIndex(null);
  };

  const loadInspectionItems = async (reportId: string) => {
    try {
      const { data, error } = await supabase
        .from('inspection_items')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setInspectionItems(data);
    } catch (error) {
      console.error('Error loading inspection items:', error);
    }
  };

  const handleToggleExpand = (reportId: string) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
      setInspectionItems([]);
      setShowItemForm(false);
    } else {
      setExpandedReportId(reportId);
    }
  };

  const handleAddItem = (reportId: string) => {
    setItemFormData({
      report_id: reportId,
      category: 'paint',
      item_name: '',
      status: 'good',
      notes: '',
    });
    setEditingItemId(null);
    setShowItemForm(true);
  };

  const handleEditItem = (item: InspectionItem) => {
    setItemFormData({
      report_id: item.report_id,
      category: item.category,
      item_name: item.item_name,
      status: item.status,
      notes: item.notes,
    });
    setEditingItemId(item.id);
    setShowItemForm(true);
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItemId) {
        await supabase
          .from('inspection_items')
          .update(itemFormData)
          .eq('id', editingItemId);
      } else {
        await supabase
          .from('inspection_items')
          .insert([itemFormData]);
      }
      resetItemForm();
      if (expandedReportId) {
        loadInspectionItems(expandedReportId);
      }
    } catch (error) {
      console.error('Error saving inspection item:', error);
      alert('保存失败');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('确定要删除这个检测项目吗？')) return;
    try {
      await supabase
        .from('inspection_items')
        .delete()
        .eq('id', id);
      if (expandedReportId) {
        loadInspectionItems(expandedReportId);
      }
    } catch (error) {
      console.error('Error deleting inspection item:', error);
      alert('删除失败');
    }
  };

  const resetItemForm = () => {
    setItemFormData({
      report_id: '',
      category: 'paint',
      item_name: '',
      status: 'good',
      notes: '',
    });
    setEditingItemId(null);
    setShowItemForm(false);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      paint: '漆面',
      engine: '发动机',
      transmission: '变速箱',
      electrical: '电气系统',
      interior: '内饰',
      exterior: '外观',
    };
    return labels[category] || category;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      good: '良好',
      fair: '一般',
      poor: '较差',
      needs_repair: '需要维修',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      good: 'bg-green-100 text-green-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-orange-100 text-orange-800',
      needs_repair: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaintConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      poor: '较差',
    };
    return labels[condition] || condition;
  };

  const handleAddTempItem = () => {
    setItemFormData({
      report_id: '',
      category: 'paint',
      item_name: '',
      status: 'good',
      notes: '',
    });
    setEditingTempItemIndex(null);
    setShowTempItemForm(true);
  };

  const handleEditTempItem = (index: number) => {
    const item = tempItems[index];
    setItemFormData({
      report_id: '',
      category: item.category,
      item_name: item.item_name,
      status: item.status,
      notes: item.notes,
    });
    setEditingTempItemIndex(index);
    setShowTempItemForm(true);
  };

  const handleSubmitTempItem = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      category: itemFormData.category,
      item_name: itemFormData.item_name,
      status: itemFormData.status,
      notes: itemFormData.notes,
    };

    if (editingTempItemIndex !== null) {
      const updatedItems = [...tempItems];
      updatedItems[editingTempItemIndex] = newItem;
      setTempItems(updatedItems);
    } else {
      setTempItems([...tempItems, newItem]);
    }

    resetTempItemForm();
  };

  const handleDeleteTempItem = (index: number) => {
    setTempItems(tempItems.filter((_, i) => i !== index));
  };

  const resetTempItemForm = () => {
    setItemFormData({
      report_id: '',
      category: 'paint',
      item_name: '',
      status: 'good',
      notes: '',
    });
    setEditingTempItemIndex(null);
    setShowTempItemForm(false);
  };

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">检测报告 ({reports.length})</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            添加报告
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">
            {editingId ? '编辑检测报告' : '添加检测报告'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
                      {vehicle.vehicle_number} - {vehicle.brand} {vehicle.model} ({vehicle.year})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">检测日期</label>
                <input
                  type="date"
                  required
                  value={formData.inspection_date}
                  onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">检测员</label>
                <input
                  type="text"
                  required
                  value={formData.inspector_name}
                  onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">车况级别</label>
                <select
                  required
                  value={formData.overall_condition}
                  onChange={(e) => setFormData({ ...formData, overall_condition: e.target.value as 'S' | 'A' | 'B' | 'C' })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                >
                  <option value="S">S级 - 极品车况</option>
                  <option value="A">A级 - 优秀车况</option>
                  <option value="B">B级 - 良好车况</option>
                  <option value="C">C级 - 一般车况</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">新旧程度</label>
                <input
                  type="number"
                  min="50"
                  max="99"
                  required
                  value={formData.newness_rating}
                  onChange={(e) => setFormData({ ...formData, newness_rating: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  placeholder="例如: 95表示95新"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">理赔次数</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.claim_count}
                  onChange={(e) => setFormData({ ...formData, claim_count: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">过户次数</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.transfer_count}
                  onChange={(e) => setFormData({ ...formData, transfer_count: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">漆面状况</label>
                <select
                  value={formData.paint_condition}
                  onChange={(e) => setFormData({ ...formData, paint_condition: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                >
                  <option value="excellent">优秀</option>
                  <option value="good">良好</option>
                  <option value="fair">一般</option>
                  <option value="poor">较差</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_accidents}
                  onChange={(e) => setFormData({ ...formData, has_accidents: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">有小磕碰</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.major_accident}
                  onChange={(e) => setFormData({ ...formData, major_accident: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">重大事故</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.fire_damage}
                  onChange={(e) => setFormData({ ...formData, fire_damage: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">火烧</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.water_damage}
                  onChange={(e) => setFormData({ ...formData, water_damage: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">水泡</span>
              </label>
            </div>

            {!editingId && (
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">检测项目明细 ({tempItems.length})</h4>
                  {!showTempItemForm && (
                    <button
                      type="button"
                      onClick={handleAddTempItem}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      添加项目
                    </button>
                  )}
                </div>

                {showTempItemForm && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <h5 className="font-semibold text-gray-900 mb-2 text-xs">
                      {editingTempItemIndex !== null ? '编辑检测项目' : '添加检测项目'}
                    </h5>
                    <form onSubmit={handleSubmitTempItem} className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            类别
                          </label>
                          <select
                            required
                            value={itemFormData.category}
                            onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-xs"
                          >
                            <option value="paint">漆面</option>
                            <option value="engine">发动机</option>
                            <option value="transmission">变速箱</option>
                            <option value="electrical">电气系统</option>
                            <option value="interior">内饰</option>
                            <option value="exterior">外观</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            状态
                          </label>
                          <select
                            required
                            value={itemFormData.status}
                            onChange={(e) => setItemFormData({ ...itemFormData, status: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-xs"
                          >
                            <option value="good">良好</option>
                            <option value="fair">一般</option>
                            <option value="poor">较差</option>
                            <option value="needs_repair">需要维修</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          项目名称
                        </label>
                        <input
                          type="text"
                          required
                          value={itemFormData.item_name}
                          onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="例如：前保险杠划痕"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          备注
                        </label>
                        <textarea
                          value={itemFormData.notes}
                          onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-xs"
                          rows={2}
                          placeholder="详细说明..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={resetTempItemForm}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {tempItems.length === 0 ? (
                  <div className="text-center py-3 text-gray-500 text-xs bg-gray-50 rounded">
                    暂无检测项目，点击上方按钮添加
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                            类别
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                            项目名称
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                            状态
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y bg-white">
                        {tempItems.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 text-xs">
                              {getCategoryLabel(item.category)}
                            </td>
                            <td className="px-2 py-1.5 text-xs font-medium">
                              {item.item_name}
                            </td>
                            <td className="px-2 py-1.5 text-xs">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs ${getStatusColor(item.status)}`}>
                                {getStatusLabel(item.status)}
                              </span>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditTempItem(index)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTempItem(index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
              >
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
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">检测日期</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">检测员</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">车况级别</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">新旧程度</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">理赔</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">过户</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">小磕碰</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">重大事故</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">火烧</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">水泡</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <>
                  <tr key={report.id} className="hover:bg-gray-50 border-b">
                    <td className="px-3 py-2 text-sm">
                      {report.vehicles && (
                        <div>
                          <div className="font-semibold">
                            {report.vehicles.brand} {report.vehicles.model}
                          </div>
                          <div className="text-xs text-gray-500">{report.vehicles.year}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {new Date(report.inspection_date).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-3 py-2 text-sm">{report.inspector_name}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`inline-block px-2 py-1 rounded-lg text-sm font-bold ${
                        report.overall_condition === 'S' ? 'bg-purple-100 text-purple-800' :
                        report.overall_condition === 'A' ? 'bg-blue-100 text-blue-800' :
                        report.overall_condition === 'B' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.overall_condition}级
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className="font-semibold text-blue-600">{report.newness_rating}新</span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`font-semibold ${report.claim_count > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {report.claim_count}次
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`font-semibold ${report.transfer_count > 2 ? 'text-orange-600' : 'text-gray-600'}`}>
                        {report.transfer_count}次
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        report.has_accidents ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {report.has_accidents ? '有' : '无'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        report.major_accident ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {report.major_accident ? '有' : '无'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        report.fire_damage ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {report.fire_damage ? '有' : '无'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        report.water_damage ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {report.water_damage ? '有' : '无'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleExpand(report.id)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          title="查看检测项目"
                        >
                          {expandedReportId === report.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(report)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(report.id, report.vehicle_id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedReportId === report.id && (
                    <tr key={`${report.id}-details`}>
                      <td colSpan={12} className="bg-gray-50 px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-gray-900">检测项目明细</h4>
                            {!showItemForm && (
                              <button
                                onClick={() => handleAddItem(report.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                添加项目
                              </button>
                            )}
                          </div>

                          {showItemForm && (
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h5 className="font-semibold text-gray-900 mb-3 text-sm">
                                {editingItemId ? '编辑检测项目' : '添加检测项目'}
                              </h5>
                              <form onSubmit={handleSubmitItem} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      类别
                                    </label>
                                    <select
                                      required
                                      value={itemFormData.category}
                                      onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                                      className="w-full px-2 py-1.5 border rounded-lg text-sm"
                                    >
                                      <option value="paint">漆面</option>
                                      <option value="engine">发动机</option>
                                      <option value="transmission">变速箱</option>
                                      <option value="electrical">电气系统</option>
                                      <option value="interior">内饰</option>
                                      <option value="exterior">外观</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      状态
                                    </label>
                                    <select
                                      required
                                      value={itemFormData.status}
                                      onChange={(e) => setItemFormData({ ...itemFormData, status: e.target.value })}
                                      className="w-full px-2 py-1.5 border rounded-lg text-sm"
                                    >
                                      <option value="good">良好</option>
                                      <option value="fair">一般</option>
                                      <option value="poor">较差</option>
                                      <option value="needs_repair">需要维修</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    项目名称
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={itemFormData.item_name}
                                    onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                                    placeholder="例如：前保险杠划痕"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    备注
                                  </label>
                                  <textarea
                                    value={itemFormData.notes}
                                    onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
                                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                                    rows={2}
                                    placeholder="详细说明..."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                  >
                                    保存
                                  </button>
                                  <button
                                    type="button"
                                    onClick={resetItemForm}
                                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                                  >
                                    取消
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}

                          {inspectionItems.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              暂无检测项目
                            </div>
                          ) : (
                            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                              <table className="w-full">
                                <thead className="bg-gray-100 border-b">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                      类别
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                      项目名称
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                      状态
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                      备注
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                      操作
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {inspectionItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 text-sm">
                                        {getCategoryLabel(item.category)}
                                      </td>
                                      <td className="px-3 py-2 text-sm font-medium">
                                        {item.item_name}
                                      </td>
                                      <td className="px-3 py-2 text-sm">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                                          {getStatusLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-600">
                                        {item.notes || '-'}
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => handleEditItem(item)}
                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
