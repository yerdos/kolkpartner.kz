import { useState } from 'react';
import { Settings } from 'lucide-react';
import { VehicleManagement } from './admin/VehicleManagement';
import { OrderManagement } from './admin/OrderManagement';
import { TrackingManagement } from './admin/TrackingManagement';
import { CostManagement } from './admin/CostManagement';
import { InspectionManagement } from './admin/InspectionManagement';
import { UserManagement } from './admin/UserManagement';
import TaxCalculatorConfig from './admin/TaxCalculatorConfig';
import VehicleCostCalculation from './admin/VehicleCostCalculation';
import DistributorManagement from './admin/DistributorManagement';
import CustomerLeadsManagement from './admin/CustomerLeadsManagement';

type Tab = 'vehicles' | 'orders' | 'tracking' | 'costs' | 'inspections' | 'users' | 'tax-config' | 'vehicle-costs' | 'distributors' | 'customer-leads';

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('vehicles');

  const tabs = [
    { id: 'vehicles' as const, label: '车辆管理', icon: '🚗' },
    { id: 'orders' as const, label: '订单管理', icon: '📦' },
    { id: 'distributors' as const, label: '分销商管理', icon: '🏢' },
    { id: 'customer-leads' as const, label: '客户线索', icon: '👤' },
    { id: 'tracking' as const, label: '物流追踪', icon: '📍' },
    { id: 'costs' as const, label: '价格管理', icon: '💰' },
    { id: 'inspections' as const, label: '检测报告', icon: '📋' },
    { id: 'users' as const, label: '用户管理', icon: '👥' },
    { id: 'tax-config' as const, label: '税费配置', icon: '⚙️' },
    { id: 'vehicle-costs' as const, label: '费用计算', icon: '🧮' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">管理后台</h1>
            </div>
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回前台
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {activeTab === 'vehicles' && <VehicleManagement />}
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'distributors' && <DistributorManagement />}
        {activeTab === 'customer-leads' && <CustomerLeadsManagement />}
        {activeTab === 'tracking' && <TrackingManagement />}
        {activeTab === 'costs' && <CostManagement />}
        {activeTab === 'inspections' && <InspectionManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'tax-config' && <TaxCalculatorConfig />}
        {activeTab === 'vehicle-costs' && <VehicleCostCalculation />}
      </div>
    </div>
  );
}
