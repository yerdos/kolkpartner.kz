import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TrackingUpdate {
  id: string;
  order_id: string;
  status: string;
  location: string;
  description_ru: string;
  description_kk: string;
  timestamp: string;
  orders?: {
    customer_name: string;
    vehicles?: {
      brand: string;
      model: string;
    };
  };
}

export function TrackingManagement() {
  const [updates, setUpdates] = useState<TrackingUpdate[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    status: 'processing',
    location: '',
    description_ru: '',
    description_kk: '',
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [updatesResult, ordersResult] = await Promise.all([
        supabase
          .from('tracking_updates')
          .select(`
            *,
            orders (
              customer_name,
              vehicles (
                brand,
                model
              )
            )
          `)
          .order('timestamp', { ascending: false }),
        supabase
          .from('orders')
          .select(`
            id,
            customer_name,
            vehicles (
              brand,
              model
            )
          `)
      ]);
      if (updatesResult.data) setUpdates(updatesResult.data);
      if (ordersResult.data) setOrders(ordersResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('tracking_updates').insert([formData]);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error adding tracking update:', error);
      alert('添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条追踪记录吗？')) return;
    try {
      await supabase.from('tracking_updates').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error deleting tracking update:', error);
      alert('删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      order_id: '',
      status: 'processing',
      location: '',
      description_ru: '',
      description_kk: '',
      timestamp: new Date().toISOString(),
    });
    setShowAddForm(false);
  };

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">物流追踪 ({updates.length})</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            添加追踪
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">添加追踪更新</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">订单</label>
                <select
                  required
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                >
                  <option value="">选择订单</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.customer_name} - {order.vehicles?.brand} {order.vehicles?.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                >
                  <option value="processing">处理中</option>
                  <option value="shipped">已发货</option>
                  <option value="in_transit">运输中</option>
                  <option value="customs">清关中</option>
                  <option value="delivered">已送达</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">位置</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">日期时间</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.timestamp.slice(0, 16)}
                  onChange={(e) => setFormData({ ...formData, timestamp: new Date(e.target.value).toISOString() })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">描述 (俄语)</label>
              <textarea
                required
                value={formData.description_ru}
                onChange={(e) => setFormData({ ...formData, description_ru: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                rows={2}
                placeholder="俄语描述"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">描述 (哈萨克语)</label>
              <textarea
                required
                value={formData.description_kk}
                onChange={(e) => setFormData({ ...formData, description_kk: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                rows={2}
                placeholder="哈萨克语描述"
              />
            </div>
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
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">日期</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">订单/客户</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">状态</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">位置</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">描述</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {updates.map((update) => (
                <tr key={update.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">
                    {new Date(update.timestamp).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {update.orders && (
                      <div>
                        <div className="font-semibold text-xs">{update.orders.customer_name}</div>
                        <div className="text-xs text-gray-500">
                          {update.orders.vehicles?.brand} {update.orders.vehicles?.model}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {update.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">{update.location}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    <div className="space-y-1">
                      <div><span className="font-semibold">RU:</span> {update.description_ru}</div>
                      <div><span className="font-semibold">KK:</span> {update.description_kk}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(update.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
