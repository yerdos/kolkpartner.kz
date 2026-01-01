import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Plus, Edit2, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';

interface Distributor {
  id: string;
  code: string;
  name: string;
  type: 'self_operated' | 'third_party';
  country: string;
  city: string;
  region: string | null;
  address: string | null;
  account: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DistributorFormData {
  code: string;
  name: string;
  type: 'self_operated' | 'third_party';
  country: string;
  city: string;
  region: string;
  address: string;
  account: string;
  contact_person: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export default function DistributorManagement() {
  const [language] = useState<'zh' | 'ru' | 'kk'>('zh');
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null);
  const [formData, setFormData] = useState<DistributorFormData>({
    code: '',
    name: '',
    type: 'third_party',
    country: '',
    city: '',
    region: '',
    address: '',
    account: '',
    contact_person: '',
    phone: '',
    email: '',
    is_active: true,
  });

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      distributorManagement: {
        zh: '分销商管理',
        ru: 'Управление дистрибьюторами',
        kk: 'Дистрибьюторларды басқару',
      },
      addDistributor: {
        zh: '添加分销商',
        ru: 'Добавить дистрибьютора',
        kk: 'Дистрибьютор қосу',
      },
      search: {
        zh: '搜索分销商...',
        ru: 'Поиск дистрибьютора...',
        kk: 'Дистрибьюторды іздеу...',
      },
      code: {
        zh: '编号',
        ru: 'Код',
        kk: 'Код',
      },
      name: {
        zh: '名称',
        ru: 'Название',
        kk: 'Атауы',
      },
      type: {
        zh: '类型',
        ru: 'Тип',
        kk: 'Түрі',
      },
      selfOperated: {
        zh: '自营',
        ru: 'Собственный',
        kk: 'Өзіндік',
      },
      thirdParty: {
        zh: '三方',
        ru: 'Третья сторона',
        kk: 'Үшінші тарап',
      },
      country: {
        zh: '国家',
        ru: 'Страна',
        kk: 'Ел',
      },
      city: {
        zh: '城市',
        ru: 'Город',
        kk: 'Қала',
      },
      region: {
        zh: '区域',
        ru: 'Район',
        kk: 'Аудан',
      },
      address: {
        zh: '地址',
        ru: 'Адрес',
        kk: 'Мекенжай',
      },
      account: {
        zh: '账号',
        ru: 'Аккаунт',
        kk: 'Аккаунт',
      },
      contactPerson: {
        zh: '联系人',
        ru: 'Контактное лицо',
        kk: 'Байланыс адамы',
      },
      phone: {
        zh: '电话',
        ru: 'Телефон',
        kk: 'Телефон',
      },
      email: {
        zh: '邮箱',
        ru: 'Email',
        kk: 'Email',
      },
      status: {
        zh: '状态',
        ru: 'Статус',
        kk: 'Күйі',
      },
      active: {
        zh: '激活',
        ru: 'Активен',
        kk: 'Белсенді',
      },
      inactive: {
        zh: '停用',
        ru: 'Неактивен',
        kk: 'Белсенді емес',
      },
      actions: {
        zh: '操作',
        ru: 'Действия',
        kk: 'Әрекеттер',
      },
      edit: {
        zh: '编辑',
        ru: 'Редактировать',
        kk: 'Өңдеу',
      },
      delete: {
        zh: '删除',
        ru: 'Удалить',
        kk: 'Жою',
      },
      save: {
        zh: '保存',
        ru: 'Сохранить',
        kk: 'Сақтау',
      },
      cancel: {
        zh: '取消',
        ru: 'Отмена',
        kk: 'Болдырмау',
      },
      confirmDelete: {
        zh: '确认删除此分销商？',
        ru: 'Подтвердить удаление этого дистрибьютора?',
        kk: 'Бұл дистрибьюторды жоюды растайсыз ба?',
      },
      noDistributors: {
        zh: '暂无分销商',
        ru: 'Нет дистрибьюторов',
        kk: 'Дистрибьюторлар жоқ',
      },
      createdAt: {
        zh: '创建时间',
        ru: 'Дата создания',
        kk: 'Жасалған күні',
      },
    };
    return translations[key]?.[language] || key;
  };

  useEffect(() => {
    fetchDistributors();
  }, []);

  const fetchDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error fetching distributors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDistributor) {
        const { error } = await supabase
          .from('distributors')
          .update(formData)
          .eq('id', editingDistributor.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('distributors')
          .insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingDistributor(null);
      resetForm();
      fetchDistributors();
    } catch (error) {
      console.error('Error saving distributor:', error);
      alert('Error saving distributor');
    }
  };

  const handleEdit = (distributor: Distributor) => {
    setEditingDistributor(distributor);
    setFormData({
      code: distributor.code,
      name: distributor.name,
      type: distributor.type,
      country: distributor.country,
      city: distributor.city,
      region: distributor.region || '',
      address: distributor.address || '',
      account: distributor.account || '',
      contact_person: distributor.contact_person || '',
      phone: distributor.phone || '',
      email: distributor.email || '',
      is_active: distributor.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('distributors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDistributors();
    } catch (error) {
      console.error('Error deleting distributor:', error);
      alert('Error deleting distributor');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: 'third_party',
      country: '',
      city: '',
      region: '',
      address: '',
      account: '',
      contact_person: '',
      phone: '',
      email: '',
      is_active: true,
    });
  };

  const filteredDistributors = distributors.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{language === 'zh' ? '加载中...' : language === 'ru' ? 'Загрузка...' : 'Жүктелуде...'}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          {t('distributorManagement')}
        </h2>
        <button
          onClick={() => {
            resetForm();
            setEditingDistributor(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('addDistributor')}
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('code')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('type')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('country')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('city')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('contactPerson')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('phone')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDistributors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {t('noDistributors')}
                  </td>
                </tr>
              ) : (
                filteredDistributors.map((distributor) => (
                  <tr key={distributor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{distributor.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{distributor.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        distributor.type === 'self_operated'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {distributor.type === 'self_operated' ? t('selfOperated') : t('thirdParty')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{distributor.country}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{distributor.city}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{distributor.contact_person || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{distributor.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {distributor.is_active ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          {t('active')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          {t('inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(distributor)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(distributor.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {editingDistributor ? t('edit') : t('addDistributor')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('code')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('type')} *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'self_operated' | 'third_party' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="self_operated">{t('selfOperated')}</option>
                      <option value="third_party">{t('thirdParty')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('country')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('city')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('region')}
                    </label>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('address')}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('account')}
                    </label>
                    <input
                      type="text"
                      value={formData.account}
                      onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contactPerson')}
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('phone')}
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('active')}</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingDistributor(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
