import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Plus, Edit2, Trash2, Search, Phone, Mail, DollarSign, Car, FileText } from 'lucide-react';

interface CustomerLead {
  id: string;
  distributor_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  interested_vehicle_id: string | null;
  interested_vehicle_description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  notes: string | null;
  status: 'new_lead' | 'contacted' | 'converted' | 'lost';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  distributors?: {
    code: string;
    name: string;
  };
  vehicles?: {
    brand: string;
    model: string;
    year: number;
  };
}

interface Distributor {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  price_cny: number;
}

interface CustomerLeadFormData {
  distributor_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  interested_vehicle_id: string;
  interested_vehicle_description: string;
  budget_min: string;
  budget_max: string;
  notes: string;
  status: 'new_lead' | 'contacted' | 'converted' | 'lost';
}

export default function CustomerLeadsManagement() {
  const [language] = useState<'zh' | 'ru' | 'kk'>('zh');
  const [leads, setLeads] = useState<CustomerLead[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<CustomerLead | null>(null);
  const [formData, setFormData] = useState<CustomerLeadFormData>({
    distributor_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    interested_vehicle_id: '',
    interested_vehicle_description: '',
    budget_min: '',
    budget_max: '',
    notes: '',
    status: 'new_lead',
  });

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      customerLeads: {
        zh: '客户线索管理',
        ru: 'Управление клиентскими лидами',
        kk: 'Клиент лидтерін басқару',
      },
      addLead: {
        zh: '添加客户',
        ru: 'Добавить клиента',
        kk: 'Клиент қосу',
      },
      search: {
        zh: '搜索客户...',
        ru: 'Поиск клиента...',
        kk: 'Клиентті іздеу...',
      },
      distributor: {
        zh: '分销商',
        ru: 'Дистрибьютор',
        kk: 'Дистрибьютор',
      },
      customerName: {
        zh: '客户姓名',
        ru: 'Имя клиента',
        kk: 'Клиент аты',
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
      interestedVehicle: {
        zh: '意向车辆',
        ru: 'Интересующий автомобиль',
        kk: 'Қызықты көлік',
      },
      vehicleDescription: {
        zh: '车辆描述',
        ru: 'Описание автомобиля',
        kk: 'Көлік сипаттамасы',
      },
      budget: {
        zh: '预算',
        ru: 'Бюджет',
        kk: 'Бюджет',
      },
      budgetMin: {
        zh: '最低预算',
        ru: 'Минимальный бюджет',
        kk: 'Ең төменгі бюджет',
      },
      budgetMax: {
        zh: '最高预算',
        ru: 'Максимальный бюджет',
        kk: 'Ең жоғары бюджет',
      },
      notes: {
        zh: '备注',
        ru: 'Примечания',
        kk: 'Ескертпелер',
      },
      status: {
        zh: '状态',
        ru: 'Статус',
        kk: 'Күйі',
      },
      newLead: {
        zh: '新线索',
        ru: 'Новый лид',
        kk: 'Жаңа лид',
      },
      contacted: {
        zh: '已联系',
        ru: 'Связались',
        kk: 'Байланысты',
      },
      converted: {
        zh: '已转化',
        ru: 'Конвертирован',
        kk: 'Түрлендірілген',
      },
      lost: {
        zh: '已失败',
        ru: 'Проигран',
        kk: 'Жоғалтылған',
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
        zh: '确认删除此客户？',
        ru: 'Подтвердить удаление этого клиента?',
        kk: 'Бұл клиентті жоюды растайсыз ба?',
      },
      noLeads: {
        zh: '暂无客户线索',
        ru: 'Нет клиентских лидов',
        kk: 'Клиент лидтер жоқ',
      },
      createdAt: {
        zh: '创建时间',
        ru: 'Дата создания',
        kk: 'Жасалған күні',
      },
      selectDistributor: {
        zh: '选择分销商',
        ru: 'Выберите дистрибьютора',
        kk: 'Дистрибьюторды таңдаңыз',
      },
      selectVehicle: {
        zh: '选择车辆（可选）',
        ru: 'Выберите автомобиль (опционально)',
        kk: 'Көлікті таңдаңыз (қосымша)',
      },
      noVehicle: {
        zh: '无具体车辆',
        ru: 'Нет конкретного автомобиля',
        kk: 'Нақты көлік жоқ',
      },
    };
    return translations[key]?.[language] || key;
  };

  useEffect(() => {
    Promise.all([
      fetchLeads(),
      fetchDistributors(),
      fetchVehicles(),
    ]);
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_leads')
        .select(`
          *,
          distributors (
            code,
            name
          ),
          vehicles (
            brand,
            model,
            year
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('id, code, name, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error fetching distributors:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, brand, model, year, price_cny')
        .order('brand');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        distributor_id: formData.distributor_id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email || null,
        interested_vehicle_id: formData.interested_vehicle_id || null,
        interested_vehicle_description: formData.interested_vehicle_description || null,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        notes: formData.notes || null,
        status: formData.status,
        created_by: user.id,
      };

      if (editingLead) {
        const { error } = await supabase
          .from('customer_leads')
          .update(payload)
          .eq('id', editingLead.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customer_leads')
          .insert([payload]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingLead(null);
      resetForm();
      fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Error saving lead');
    }
  };

  const handleEdit = (lead: CustomerLead) => {
    setEditingLead(lead);
    setFormData({
      distributor_id: lead.distributor_id,
      customer_name: lead.customer_name,
      customer_phone: lead.customer_phone,
      customer_email: lead.customer_email || '',
      interested_vehicle_id: lead.interested_vehicle_id || '',
      interested_vehicle_description: lead.interested_vehicle_description || '',
      budget_min: lead.budget_min?.toString() || '',
      budget_max: lead.budget_max?.toString() || '',
      notes: lead.notes || '',
      status: lead.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('customer_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Error deleting lead');
    }
  };

  const resetForm = () => {
    setFormData({
      distributor_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      interested_vehicle_id: '',
      interested_vehicle_description: '',
      budget_min: '',
      budget_max: '',
      notes: '',
      status: 'new_lead',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new_lead':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'converted':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.customer_phone.includes(searchTerm) ||
    lead.distributors?.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <Users className="w-6 h-6" />
          {t('customerLeads')}
        </h2>
        <button
          onClick={() => {
            resetForm();
            setEditingLead(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('addLead')}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customerName')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('phone')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('distributor')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('interestedVehicle')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('budget')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {t('noLeads')}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.customer_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="w-3 h-3" />
                        {lead.customer_phone}
                      </div>
                      {lead.customer_email && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Mail className="w-3 h-3" />
                          {lead.customer_email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.distributors && (
                        <div>
                          <div className="font-medium text-gray-900">{lead.distributors.name}</div>
                          <div className="text-xs text-gray-500">{lead.distributors.code}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.vehicles ? (
                        <div className="flex items-center gap-1">
                          <Car className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-900">
                            {lead.vehicles.brand} {lead.vehicles.model} {lead.vehicles.year}
                          </span>
                        </div>
                      ) : lead.interested_vehicle_description ? (
                        <div className="text-gray-600 text-xs">{lead.interested_vehicle_description}</div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.budget_min || lead.budget_max ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <DollarSign className="w-3 h-3" />
                          <span>
                            {lead.budget_min && `$${lead.budget_min.toLocaleString()}`}
                            {lead.budget_min && lead.budget_max && ' - '}
                            {lead.budget_max && `$${lead.budget_max.toLocaleString()}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {t(lead.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(lead)}
                          className="text-blue-600 hover:text-blue-800"
                          title={t('edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="text-red-600 hover:text-red-800"
                          title={t('delete')}
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
                {editingLead ? t('edit') : t('addLead')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('distributor')} *
                  </label>
                  <select
                    required
                    value={formData.distributor_id}
                    onChange={(e) => setFormData({ ...formData, distributor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('selectDistributor')}</option>
                    {distributors.map((dist) => (
                      <option key={dist.id} value={dist.id}>
                        {dist.name} ({dist.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('customerName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('phone')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('selectVehicle')}
                  </label>
                  <select
                    value={formData.interested_vehicle_id}
                    onChange={(e) => setFormData({ ...formData, interested_vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('noVehicle')}</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand} {vehicle.model} {vehicle.year} - ¥{vehicle.price_cny.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('vehicleDescription')}
                  </label>
                  <input
                    type="text"
                    value={formData.interested_vehicle_description}
                    onChange={(e) => setFormData({ ...formData, interested_vehicle_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：2020年左右的宝马X5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('budgetMin')} (USD)
                    </label>
                    <input
                      type="number"
                      value={formData.budget_min}
                      onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('budgetMax')} (USD)
                    </label>
                    <input
                      type="number"
                      value={formData.budget_max}
                      onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('status')} *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new_lead">{t('newLead')}</option>
                    <option value="contacted">{t('contacted')}</option>
                    <option value="converted">{t('converted')}</option>
                    <option value="lost">{t('lost')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('notes')}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
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
                      setEditingLead(null);
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
