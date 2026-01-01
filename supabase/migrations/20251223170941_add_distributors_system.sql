/*
  # 创建分销商系统

  1. 新增表
    - `distributors` - 分销商信息表
      - `id` (uuid, primary key) - 主键
      - `code` (text, unique) - 分销商编号
      - `name` (text) - 分销商名称
      - `type` (text) - 类型：'self_operated' (自营) 或 'third_party' (三方)
      - `country` (text) - 国家
      - `city` (text) - 城市
      - `region` (text) - 区域
      - `address` (text) - 详细地址
      - `account` (text) - 账号信息
      - `contact_person` (text) - 联系人
      - `phone` (text) - 联系电话
      - `email` (text) - 邮箱
      - `is_active` (boolean) - 是否激活
      - `created_at` (timestamptz) - 创建时间
      - `updated_at` (timestamptz) - 更新时间
  
  2. 修改表
    - `orders` 表添加 `distributor_id` 字段关联分销商
  
  3. 安全策略
    - 启用 RLS
    - 管理员可以完全管理分销商
    - 认证用户可以查看激活的分销商
*/

-- 创建分销商类型枚举
DO $$ BEGIN
  CREATE TYPE distributor_type AS ENUM ('self_operated', 'third_party');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建分销商表
CREATE TABLE IF NOT EXISTS distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type distributor_type NOT NULL DEFAULT 'third_party',
  country text NOT NULL,
  city text NOT NULL,
  region text,
  address text,
  account text,
  contact_person text,
  phone text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER update_distributors_updated_at 
    BEFORE UPDATE ON distributors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 为订单表添加分销商关联
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'distributor_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN distributor_id uuid REFERENCES distributors(id);
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_distributors_code ON distributors(code);
CREATE INDEX IF NOT EXISTS idx_distributors_type ON distributors(type);
CREATE INDEX IF NOT EXISTS idx_distributors_country ON distributors(country);
CREATE INDEX IF NOT EXISTS idx_distributors_is_active ON distributors(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_distributor_id ON orders(distributor_id);

-- 启用 RLS
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;

-- RLS 策略：管理员可以查看所有分销商
CREATE POLICY "Admins can view all distributors"
  ON distributors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS 策略：认证用户可以查看激活的分销商
CREATE POLICY "Authenticated users can view active distributors"
  ON distributors
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS 策略：管理员可以添加分销商
CREATE POLICY "Admins can insert distributors"
  ON distributors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS 策略：管理员可以更新分销商
CREATE POLICY "Admins can update distributors"
  ON distributors
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS 策略：管理员可以删除分销商
CREATE POLICY "Admins can delete distributors"
  ON distributors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 插入一些示例分销商数据
INSERT INTO distributors (code, name, type, country, city, region, address, contact_person, phone, email)
VALUES 
  ('DS001', '北京自营店', 'self_operated', '中国', '北京', '朝阳区', '朝阳路123号', '张经理', '+86-10-12345678', 'beijing@example.com'),
  ('DS002', '上海合作商', 'third_party', '中国', '上海', '浦东新区', '世纪大道456号', '李经理', '+86-21-87654321', 'shanghai@example.com'),
  ('DS003', 'Алматы филиал', 'third_party', '哈萨克斯坦', 'Алматы', 'Медеуский район', 'пр. Абая 150', 'Асан', '+7-727-1234567', 'almaty@example.com')
ON CONFLICT (code) DO NOTHING;