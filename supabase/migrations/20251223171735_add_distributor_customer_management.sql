/*
  # 添加分销商客户管理系统

  1. 修改表
    - `user_profiles` 添加 `distributor_id` 字段，用户可以属于某个分销商
  
  2. 新增表
    - `customer_leads` - 分销商录入的客户线索表
      - `id` (uuid, primary key)
      - `distributor_id` (uuid, foreign key) - 分销商ID
      - `customer_name` (text) - 客户姓名
      - `customer_phone` (text) - 客户电话
      - `customer_email` (text) - 客户邮箱
      - `interested_vehicle_id` (uuid) - 意向车辆ID（可选）
      - `interested_vehicle_description` (text) - 意向车辆描述
      - `budget_min` (numeric) - 预算最低
      - `budget_max` (numeric) - 预算最高
      - `notes` (text) - 备注
      - `status` (text) - 状态：new_lead(新线索)、contacted(已联系)、converted(已转化)、lost(已失败)
      - `created_by` (uuid) - 创建人用户ID
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  3. 安全策略
    - 启用 RLS
    - 管理员可以查看所有客户线索
    - 分销商用户只能查看和管理自己分销商的客户线索
    - 客户线索的创建者可以管理自己创建的线索
*/

-- 为 user_profiles 添加 distributor_id 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'distributor_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN distributor_id uuid REFERENCES distributors(id);
  END IF;
END $$;

-- 创建客户线索状态枚举
DO $$ BEGIN
  CREATE TYPE customer_lead_status AS ENUM ('new_lead', 'contacted', 'converted', 'lost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建客户线索表
CREATE TABLE IF NOT EXISTS customer_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  interested_vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  interested_vehicle_description text,
  budget_min numeric,
  budget_max numeric,
  notes text,
  status customer_lead_status DEFAULT 'new_lead',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 添加更新时间触发器
DO $$ BEGIN
  CREATE TRIGGER update_customer_leads_updated_at 
    BEFORE UPDATE ON customer_leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_customer_leads_distributor_id ON customer_leads(distributor_id);
CREATE INDEX IF NOT EXISTS idx_customer_leads_status ON customer_leads(status);
CREATE INDEX IF NOT EXISTS idx_customer_leads_created_by ON customer_leads(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_leads_interested_vehicle ON customer_leads(interested_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_distributor_id ON user_profiles(distributor_id);

-- 启用 RLS
ALTER TABLE customer_leads ENABLE ROW LEVEL SECURITY;

-- RLS 策略：管理员可以查看所有客户线索
CREATE POLICY "Admins can view all customer leads"
  ON customer_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS 策略：用户可以查看自己分销商的客户线索
CREATE POLICY "Users can view their distributor's customer leads"
  ON customer_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.distributor_id = customer_leads.distributor_id
    )
  );

-- RLS 策略：管理员可以添加客户线索
CREATE POLICY "Admins can insert customer leads"
  ON customer_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS 策略：用户可以为自己的分销商添加客户线索
CREATE POLICY "Users can insert customer leads for their distributor"
  ON customer_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.distributor_id = customer_leads.distributor_id
    )
  );

-- RLS 策略：管理员可以更新客户线索
CREATE POLICY "Admins can update customer leads"
  ON customer_leads
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

-- RLS 策略：用户可以更新自己分销商的客户线索
CREATE POLICY "Users can update their distributor's customer leads"
  ON customer_leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.distributor_id = customer_leads.distributor_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.distributor_id = customer_leads.distributor_id
    )
  );

-- RLS 策略：管理员可以删除客户线索
CREATE POLICY "Admins can delete customer leads"
  ON customer_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS 策略：用户可以删除自己创建的客户线索
CREATE POLICY "Users can delete their own customer leads"
  ON customer_leads
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());