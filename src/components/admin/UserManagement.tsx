import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  distributor_id: string | null;
  created_at: string;
  distributors?: {
    code: string;
    name: string;
  };
}

interface Distributor {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    distributor_id: '',
  });

  useEffect(() => {
    loadUsers();
    loadDistributors();
  }, [currentPage]);

  const loadUsers = async () => {
    try {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('user_profiles')
        .select(`
          *,
          distributors (
            code,
            name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) setUsers(data);
      if (count !== null) setTotalCount(count);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('id, code, name, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error loading distributors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            distributor_id: formData.distributor_id || null,
          })
          .eq('user_id', editingUser.user_id);

        if (error) throw error;
        alert('用户更新成功');
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              phone: formData.phone,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          await supabase.from('user_profiles').insert([
            {
              user_id: authData.user.id,
              name: formData.name,
              phone: formData.phone,
              email: formData.email,
              distributor_id: formData.distributor_id || null,
            },
          ]);
        }

        alert('用户添加成功');
      }

      resetForm();
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert('保存失败: ' + error.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;
    try {
      await supabase.from('user_profiles').delete().eq('user_id', userId);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('删除失败');
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      phone: user.phone,
      distributor_id: user.distributor_id || '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      distributor_id: '',
    });
    setShowAddForm(false);
    setEditingUser(null);
  };

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">用户列表 ({totalCount})</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            添加用户
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">
            {editingUser ? '编辑用户' : '添加新用户'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  disabled={!!editingUser}
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">密码</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">分销商（可选）</label>
                <select
                  value={formData.distributor_id}
                  onChange={(e) => setFormData({ ...formData, distributor_id: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                >
                  <option value="">无分销商</option>
                  {distributors.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name} ({dist.code})
                    </option>
                  ))}
                </select>
              </div>
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
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">姓名</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">邮箱</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">手机号</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">角色</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">分销商</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">注册时间</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm font-semibold">{user.name}</td>
                  <td className="px-3 py-2 text-sm">{user.email}</td>
                  <td className="px-3 py-2 text-sm">{user.phone}</td>
                  <td className="px-3 py-2 text-sm">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {user.distributors ? (
                      <div>
                        <div className="font-medium text-xs">{user.distributors.name}</div>
                        <div className="text-xs text-gray-500">{user.distributors.code}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.user_id)}
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
