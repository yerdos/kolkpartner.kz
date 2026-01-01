import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ExternalLink } from 'lucide-react';
import { supabase, type Vehicle } from '../../lib/supabase';

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    price_usd: 0,
    mileage_km: 0,
    fuel_type: 'Gasoline',
    transmission: 'Automatic',
    color: '',
    engine_capacity: '',
    seats: 5,
    source_country: 'korea',
    source_region: '',
    images: [],
    description_ru: '',
    description_kk: '',
    status: 'available',
    has_inspection_report: false,
    estimated_delivery_days: 30,
    original_url: '',
  });

  useEffect(() => {
    loadVehicles();
  }, [currentPage]);

  const loadVehicles = async () => {
    try {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) setVehicles(data);
      if (count !== null) setTotalCount(count);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanImages = (formData.images || []).filter(img => img.trim() !== '');

      if (cleanImages.length === 0) {
        alert('请至少添加一张图片');
        return;
      }

      const dataToSave = {
        brand: formData.brand,
        model: formData.model,
        year: formData.year,
        price_usd: formData.price_usd,
        mileage_km: formData.mileage_km,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        color: formData.color,
        engine_capacity: formData.engine_capacity,
        seats: formData.seats || 5,
        source_country: formData.source_country,
        source_region: formData.source_region,
        images: cleanImages,
        description_ru: formData.description_ru || '',
        description_kk: formData.description_kk || '',
        status: formData.status,
        has_inspection_report: formData.has_inspection_report || false,
        estimated_delivery_days: formData.estimated_delivery_days || 30,
        original_url: formData.original_url || '',
      };

      console.log('保存数据:', dataToSave);
      console.log('图片数组:', cleanImages);

      if (editingId) {
        const { data, error } = await supabase
          .from('vehicles')
          .update(dataToSave)
          .eq('id', editingId)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        console.log('更新结果:', data);
      } else {
        const { data, error } = await supabase
          .from('vehicles')
          .insert([dataToSave])
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        console.log('插入结果:', data);
      }

      resetForm();
      await loadVehicles();
      alert('保存成功！');
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert(`保存失败: ${error.message || '未知错误'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这辆车吗？')) return;
    try {
      await supabase.from('vehicles').delete().eq('id', id);
      loadVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('删除失败');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setFormData({
      ...vehicle,
      images: vehicle.images && vehicle.images.length > 0 ? vehicle.images : ['']
    });
    setEditingId(vehicle.id);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      price_usd: 0,
      mileage_km: 0,
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      color: '',
      engine_capacity: '',
      seats: 5,
      source_country: 'korea',
      source_region: '',
      images: [''],
      description_ru: '',
      description_kk: '',
      status: 'available',
      has_inspection_report: false,
      estimated_delivery_days: 30,
      original_url: '',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">车辆列表 ({totalCount})</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          添加车辆
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? '编辑车辆' : '添加新车辆'}
              </h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">品牌</label>
                <input
                  type="text"
                  required
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">型号</label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">年份</label>
                <input
                  type="number"
                  required
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">价格 (USD)</label>
                <input
                  type="number"
                  required
                  value={formData.price_usd}
                  onChange={(e) => setFormData({ ...formData, price_usd: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">里程 (KM)</label>
                <input
                  type="number"
                  required
                  value={formData.mileage_km}
                  onChange={(e) => setFormData({ ...formData, mileage_km: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">燃油类型</label>
                <select
                  value={formData.fuel_type}
                  onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                >
                  <option value="Gasoline">汽油</option>
                  <option value="Diesel">柴油</option>
                  <option value="Electric">电动</option>
                  <option value="Hybrid">混动</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">变速箱</label>
                <select
                  value={formData.transmission}
                  onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                >
                  <option value="Automatic">自动</option>
                  <option value="Manual">手动</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">颜色</label>
                <input
                  type="text"
                  required
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">排量</label>
                <input
                  type="text"
                  required
                  value={formData.engine_capacity}
                  onChange={(e) => setFormData({ ...formData, engine_capacity: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">座位数</label>
                <input
                  type="number"
                  required
                  min="2"
                  max="9"
                  value={formData.seats}
                  onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 5 })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">来源国家</label>
                <select
                  value={formData.source_country}
                  onChange={(e) => setFormData({ ...formData, source_country: e.target.value as any })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                >
                  <option value="korea">韩国</option>
                  <option value="china">中国</option>
                  <option value="georgia">格鲁吉亚</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">来源地区</label>
                <input
                  type="text"
                  required
                  value={formData.source_region}
                  onChange={(e) => setFormData({ ...formData, source_region: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                >
                  <option value="available">可售</option>
                  <option value="reserved">已预定</option>
                  <option value="sold">已售出</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">预计运输天数</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.estimated_delivery_days}
                  onChange={(e) => setFormData({ ...formData, estimated_delivery_days: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  placeholder="30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">原始链接</label>
              <input
                type="url"
                value={formData.original_url}
                onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                placeholder="https://example.com/vehicle/12345"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                图片链接 (第一张为主图，其余为附图)
              </label>
              <div className="space-y-2">
                {(formData.images && formData.images.length > 0 ? formData.images : ['']).map((img, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1 flex gap-2 items-center">
                      <span className="text-xs font-semibold text-gray-600 w-16">
                        {index === 0 ? '主图' : `附图${index}`}
                      </span>
                      <input
                        type="url"
                        value={img}
                        onChange={(e) => {
                          const newImages = [...(formData.images || [])];
                          newImages[index] = e.target.value;
                          setFormData({ ...formData, images: newImages });
                        }}
                        className="flex-1 px-2 py-1.5 border rounded-lg text-sm"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    {img && (
                      <img
                        src={img}
                        alt={`预览 ${index + 1}`}
                        className="w-12 h-12 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = (formData.images || []).filter((_, i) => i !== index);
                        setFormData({ ...formData, images: newImages });
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, images: [...(formData.images || []), ''] });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Plus className="w-4 h-4" />
                  添加图片
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">描述 (俄语)</label>
              <textarea
                value={formData.description_ru}
                onChange={(e) => setFormData({ ...formData, description_ru: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">描述 (哈萨克语)</label>
              <textarea
                value={formData.description_kk}
                onChange={(e) => setFormData({ ...formData, description_kk: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-semibold"
              >
                取消
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">图片</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">品牌/型号</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">年份</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">价格</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">里程</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">来源</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">状态</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <img
                        src={vehicle.images[0]}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-12 h-12 object-cover rounded border"
                      />
                      {vehicle.images.length > 1 && (
                        <div className="text-xs text-gray-500 flex items-center">
                          +{vehicle.images.length - 1}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-semibold">{vehicle.brand} {vehicle.model}</div>
                    {vehicle.vehicle_number && (
                      <div className="text-xs text-blue-600 font-semibold">{vehicle.vehicle_number}</div>
                    )}
                    <div className="text-xs text-gray-500">{vehicle.color}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">{vehicle.year}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-blue-600">
                    ${vehicle.price_usd.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm">{vehicle.mileage_km.toLocaleString()} km</td>
                  <td className="px-3 py-2 text-sm">{vehicle.source_region}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      vehicle.status === 'available' ? 'bg-green-100 text-green-800' :
                      vehicle.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.status === 'available' ? '可售' : vehicle.status === 'reserved' ? '已预定' : '已售'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {vehicle.original_url && (
                        <a
                          href={vehicle.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="查看原始链接"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleEdit(vehicle)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="删除"
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

        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} 共 {totalCount} 条
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                .filter(page => {
                  const totalPages = Math.ceil(totalCount / pageSize);
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                  if (page === 2 && currentPage <= 3) return true;
                  if (page === totalPages - 1 && currentPage >= totalPages - 2) return true;
                  return false;
                })
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsis && <span className="px-2">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded-lg ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
