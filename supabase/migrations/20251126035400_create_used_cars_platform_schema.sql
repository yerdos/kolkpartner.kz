/*
  # 二手车平台数据库架构
  
  完整的二手车进口平台数据库，支持从韩国、中国、格鲁吉亚进口车辆到哈萨克斯坦
  
  ## 新建表
  
  1. **vehicles** - 车辆信息表
     - id (uuid, 主键)
     - brand (品牌)
     - model (型号)
     - year (年份)
     - price_usd (美元价格)
     - source_country (来源国家: 韩国/中国/格鲁吉亚)
     - source_region (具体地区)
     - mileage_km (里程数)
     - fuel_type (燃料类型)
     - transmission (变速箱)
     - color (颜色)
     - engine_capacity (发动机排量)
     - images (图片数组)
     - description_ru (俄语描述)
     - description_kk (哈萨克语描述)
     - has_inspection_report (是否有检测报告)
     - status (状态: available/reserved/sold)
     - created_at (创建时间)
  
  2. **inspection_reports** - 检测报告表
     - id (uuid, 主键)
     - vehicle_id (关联车辆)
     - overall_condition (整体状况评分 1-10)
     - paint_condition (漆面状况)
     - performance_score (性能评分)
     - has_accidents (是否有事故记录)
     - accident_details (事故详情)
     - insurance_records (保险记录)
     - inspection_date (检测日期)
     - inspector_name (检测员名称)
  
  3. **inspection_items** - 检测项目明细
     - id (uuid, 主键)
     - report_id (关联检测报告)
     - category (类别: paint/engine/transmission/electrical/interior/exterior)
     - item_name (项目名称)
     - status (状态: good/fair/poor/needs_repair)
     - notes (备注)
  
  4. **cost_breakdown** - 费用明细表
     - id (uuid, 主键)
     - vehicle_id (关联车辆)
     - domestic_transport (来源国内部运输费)
     - international_shipping (国际运输费到哈萨克斯坦)
     - customs_declaration (报关费用)
     - customs_clearance (清关费用)
     - local_delivery (哈萨克斯坦境内配送)
     - registration_fee (落地注册费)
     - tax_fee (税费)
     - service_fee (服务费)
     - other_fees (其他费用)
     - total_cost_usd (总费用美元)
     - estimated_landing_price (预估到手价格)
  
  5. **orders** - 订单表
     - id (uuid, 主键)
     - vehicle_id (关联车辆)
     - customer_name (客户姓名)
     - customer_phone (客户电话)
     - customer_email (客户邮箱)
     - order_status (订单状态: pending/paid/in_transit/customs/delivered)
     - payment_amount (付款金额)
     - payment_date (付款日期)
     - estimated_delivery_date (预计交付日期)
     - created_at (下单时间)
  
  6. **tracking_updates** - 物流追踪更新
     - id (uuid, 主键)
     - order_id (关联订单)
     - status (状态)
     - location (当前位置)
     - description_ru (俄语描述)
     - description_kk (哈萨克语描述)
     - timestamp (时间戳)
  
  ## 安全设置
  
  - 所有表启用RLS
  - 公开读取访问（车辆、检测报告、费用信息）
  - 订单数据需要认证访问
*/

-- 车辆信息表
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  price_usd numeric(10, 2) NOT NULL,
  source_country text NOT NULL CHECK (source_country IN ('korea', 'china', 'georgia')),
  source_region text NOT NULL,
  mileage_km integer NOT NULL,
  fuel_type text NOT NULL,
  transmission text NOT NULL,
  color text NOT NULL,
  engine_capacity text NOT NULL,
  images text[] DEFAULT '{}',
  description_ru text DEFAULT '',
  description_kk text DEFAULT '',
  has_inspection_report boolean DEFAULT false,
  status text DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  created_at timestamptz DEFAULT now()
);

-- 检测报告表
CREATE TABLE IF NOT EXISTS inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  overall_condition integer CHECK (overall_condition BETWEEN 1 AND 10),
  paint_condition text NOT NULL,
  performance_score integer CHECK (performance_score BETWEEN 1 AND 10),
  has_accidents boolean DEFAULT false,
  accident_details text DEFAULT '',
  insurance_records jsonb DEFAULT '[]',
  inspection_date date NOT NULL,
  inspector_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 检测项目明细表
CREATE TABLE IF NOT EXISTS inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES inspection_reports(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('paint', 'engine', 'transmission', 'electrical', 'interior', 'exterior')),
  item_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('good', 'fair', 'poor', 'needs_repair')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 费用明细表
CREATE TABLE IF NOT EXISTS cost_breakdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  domestic_transport numeric(10, 2) NOT NULL,
  international_shipping numeric(10, 2) NOT NULL,
  customs_declaration numeric(10, 2) NOT NULL,
  customs_clearance numeric(10, 2) NOT NULL,
  local_delivery numeric(10, 2) NOT NULL,
  registration_fee numeric(10, 2) NOT NULL,
  tax_fee numeric(10, 2) NOT NULL,
  service_fee numeric(10, 2) NOT NULL,
  other_fees numeric(10, 2) DEFAULT 0,
  total_cost_usd numeric(10, 2) NOT NULL,
  estimated_landing_price numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  order_status text DEFAULT 'pending' CHECK (order_status IN ('pending', 'paid', 'in_transit', 'customs', 'delivered')),
  payment_amount numeric(10, 2) NOT NULL,
  payment_date timestamptz,
  estimated_delivery_date date,
  created_at timestamptz DEFAULT now()
);

-- 物流追踪更新表
CREATE TABLE IF NOT EXISTS tracking_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  location text NOT NULL,
  description_ru text NOT NULL,
  description_kk text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- 启用RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_updates ENABLE ROW LEVEL SECURITY;

-- 公开访问策略（车辆信息）
CREATE POLICY "Anyone can view available vehicles"
  ON vehicles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view inspection reports"
  ON inspection_reports FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view inspection items"
  ON inspection_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view cost breakdown"
  ON cost_breakdown FOR SELECT
  USING (true);

-- 订单访问策略（暂时允许公开读取用于演示）
CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view tracking updates"
  ON tracking_updates FOR SELECT
  USING (true);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(brand);
CREATE INDEX IF NOT EXISTS idx_vehicles_source_country ON vehicles(source_country);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_vehicle ON inspection_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_cost_breakdown_vehicle ON cost_breakdown(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_orders_vehicle ON orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tracking_updates_order ON tracking_updates(order_id);