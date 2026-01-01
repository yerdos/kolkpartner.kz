import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, Save } from 'lucide-react';

interface TaxConfig {
  id: string;
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
  usd_to_kzt_rate: number;
}

export default function TaxCalculatorConfig() {
  const [config, setConfig] = useState<TaxConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_calculator_config')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error loading config:', error);
        setMessage('加载配置失败: ' + error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setConfig(data);
      } else {
        setMessage('未找到配置数据');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setMessage('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage('');

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('tax_calculator_config')
        .update({
          ...config,
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id
        })
        .eq('id', config.id);

      if (error) throw error;

      setMessage('保存成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof TaxConfig, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      [field]: parseFloat(value) || 0
    });
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!config && !message) {
    return <div className="text-center py-8">未找到配置</div>;
  }

  if (!config && message) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">{message}</div>
          <button
            onClick={loadConfig}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">税费计算器配置</h2>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('成功') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">汇率设置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                美元对坚戈汇率 (USD/KZT)
              </label>
              <input
                type="number"
                step="0.01"
                value={config.usd_to_kzt_rate || 485}
                onChange={(e) => handleChange('usd_to_kzt_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">当前汇率用于显示美元价格对应的坚戈价格</p>
            </div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">税率设置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                关税税率 (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={config.tariff_rate * 100}
                onChange={(e) => handleChange('tariff_rate', (parseFloat(e.target.value) / 100).toString())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                增值税率 (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={config.vat_rate * 100}
                onChange={(e) => handleChange('vat_rate', (parseFloat(e.target.value) / 100).toString())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                报废税 (坚戈)
              </label>
              <input
                type="number"
                value={config.disposal_tax_rate}
                onChange={(e) => handleChange('disposal_tax_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">首次注册费 (坚戈) - 根据车龄计算</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                当年车 (0年)
              </label>
              <input
                type="number"
                value={config.registration_fee_new}
                onChange={(e) => handleChange('registration_fee_new', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                1年车龄
              </label>
              <input
                type="number"
                value={config.registration_fee_2023}
                onChange={(e) => handleChange('registration_fee_2023', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2年车龄
              </label>
              <input
                type="number"
                value={config.registration_fee_2022}
                onChange={(e) => handleChange('registration_fee_2022', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                3年车龄
              </label>
              <input
                type="number"
                value={config.registration_fee_2021}
                onChange={(e) => handleChange('registration_fee_2021', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                4年及以上车龄
              </label>
              <input
                type="number"
                value={config.registration_fee_old}
                onChange={(e) => handleChange('registration_fee_old', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">其他费用 (坚戈)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ЭПТС费用最低
              </label>
              <input
                type="number"
                value={config.epts_fee_min}
                onChange={(e) => handleChange('epts_fee_min', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ЭПТS费用最高
              </label>
              <input
                type="number"
                value={config.epts_fee_max}
                onChange={(e) => handleChange('epts_fee_max', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                СБКТС费用最低
              </label>
              <input
                type="number"
                value={config.sbkts_fee_min}
                onChange={(e) => handleChange('sbkts_fee_min', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                СБКТС费用最高
              </label>
              <input
                type="number"
                value={config.sbkts_fee_max}
                onChange={(e) => handleChange('sbkts_fee_max', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                清关代理费
              </label>
              <input
                type="number"
                value={config.broker_fee}
                onChange={(e) => handleChange('broker_fee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                车管所审验+上牌
              </label>
              <input
                type="number"
                value={config.inspection_fee}
                onChange={(e) => handleChange('inspection_fee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                拖车费
              </label>
              <input
                type="number"
                value={config.towing_fee}
                onChange={(e) => handleChange('towing_fee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}