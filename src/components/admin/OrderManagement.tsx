import { useState, useEffect } from 'react';
import { Edit2, FileText, Upload, X, Download, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { OrderDocument } from '../../lib/supabase';

interface Order {
  id: string;
  vehicle_id: string;
  customer_name: string;
  customer_phone: string;
  order_status: string;
  payment_amount: number;
  estimated_delivery_date: string;
  created_at: string;
  distributor_id?: string;
  vehicles?: {
    brand: string;
    model: string;
    year: number;
  };
  distributors?: {
    code: string;
    name: string;
    type: string;
  };
}

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<OrderDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [currentPage]);

  const loadOrders = async () => {
    try {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('orders')
        .select(`
          *,
          vehicles (
            brand,
            model,
            year
          ),
          distributors (
            code,
            name,
            type
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) setOrders(data);
      if (count !== null) setTotalCount(count);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: editStatus })
        .eq('id', orderId);

      if (error) throw error;

      setEditingId(null);
      await loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('更新失败: ' + (error as Error).message);
    }
  };

  const statusOptions = [
    { value: 'pending', label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'paid', label: '已付款', color: 'bg-blue-100 text-blue-800' },
    { value: 'in_transit', label: '运输中', color: 'bg-purple-100 text-purple-800' },
    { value: 'customs', label: '清关中', color: 'bg-orange-100 text-orange-800' },
    { value: 'delivered', label: '已送达', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: '已作废', color: 'bg-red-100 text-red-800' },
  ];

  const getStatusLabel = (status: string) => {
    return statusOptions.find(s => s.value === status)?.label || status;
  };

  const getStatusColor = (status: string) => {
    return statusOptions.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const handleShowDocuments = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowDocModal(true);
    try {
      const { data } = await supabase
        .from('order_documents')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedOrderId) return;

    const file = files[0];
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedOrderId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('order-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('order_documents')
        .insert({
          order_id: selectedOrderId,
          document_type: 'other',
          file_name: file.name,
          file_url: fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      await handleShowDocuments(selectedOrderId);
      alert('文档上传成功');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('上传失败: ' + (error as Error).message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownloadDocument = async (doc: OrderDocument) => {
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
      alert('下载失败');
    }
  };

  const handleDeleteDocument = async (doc: OrderDocument) => {
    if (!confirm('确认删除此文档？')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('order-documents')
        .remove([doc.file_url]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('order_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      if (selectedOrderId) {
        await handleShowDocuments(selectedOrderId);
      }
      alert('文档删除成功');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('删除失败: ' + (error as Error).message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">订单列表 ({totalCount})</h2>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">订单信息</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">车辆</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">客户</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">分销商</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">金额</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">预计交付</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">状态</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">
                    <div className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('zh-CN')}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {order.id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {order.vehicles && (
                      <div>
                        <div className="font-semibold">
                          {order.vehicles.brand} {order.vehicles.model}
                        </div>
                        <div className="text-xs text-gray-500">{order.vehicles.year}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-semibold">{order.customer_name}</div>
                    <div className="text-xs text-gray-500">{order.customer_phone}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {order.distributors ? (
                      <div>
                        <div className="font-semibold text-xs">{order.distributors.name}</div>
                        <div className="text-xs text-gray-500">{order.distributors.code}</div>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${
                          order.distributors.type === 'self_operated'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {order.distributors.type === 'self_operated' ? '自营' : '三方'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold text-blue-600">
                    ${order.payment_amount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {new Date(order.estimated_delivery_date).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === order.id ? (
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="text-xs px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      >
                        {statusOptions.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.order_status)}`}>
                        {getStatusLabel(order.order_status)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {editingId === order.id ? (
                        <>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleUpdateStatus(order.id);
                            }}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(order.id);
                              setEditStatus(order.order_status);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑状态"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShowDocuments(order.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="文档管理"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </>
                      )}
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

      {showDocModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">订单文档管理</h3>
              <button
                onClick={() => {
                  setShowDocModal(false);
                  setSelectedOrderId(null);
                  setDocuments([]);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer w-fit">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">{uploading ? '上传中...' : '上传文档'}</span>
                <input
                  type="file"
                  onChange={handleUploadDocument}
                  disabled={uploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无文档
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-3 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{doc.file_name}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{new Date(doc.created_at).toLocaleString('zh-CN')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="下载"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
