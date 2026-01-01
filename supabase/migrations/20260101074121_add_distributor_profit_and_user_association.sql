/*
  # 添加分销商利润率和用户关联
  
  1. 修改表
    - `distributors` 表添加 `profit_margin` 字段（利润率百分比）
    - `user_profiles` 表添加 `distributor_id` 字段（关联分销商）
  
  2. 变更说明
    - profit_margin: 分销商的利润率，默认为 10%
    - 分销商显示价格 = 成本价 * (1 + profit_margin / 100)
    - 用户可以关联到某个分销商，成为分销商用户
  
  3. 安全策略
    - 分销商用户可以查看和修改自己关联的分销商信息
    - 分销商用户可以查看车辆成本明细
*/

-- 为分销商表添加利润率字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'distributors' AND column_name = 'profit_margin'
  ) THEN
    ALTER TABLE distributors ADD COLUMN profit_margin decimal(5,2) DEFAULT 10.00;
  END IF;
END $$;

-- 为用户配置表添加分销商关联字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'distributor_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN distributor_id uuid REFERENCES distributors(id);
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_distributor_id ON user_profiles(distributor_id);

-- RLS 策略：分销商用户可以查看自己关联的分销商
CREATE POLICY "Distributor users can view their distributor"
  ON distributors
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT distributor_id FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND distributor_id IS NOT NULL
    )
  );

-- RLS 策略：分销商用户可以更新自己关联的分销商信息
CREATE POLICY "Distributor users can update their distributor"
  ON distributors
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT distributor_id FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND distributor_id IS NOT NULL
    )
  )
  WITH CHECK (
    id IN (
      SELECT distributor_id FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND distributor_id IS NOT NULL
    )
  );
