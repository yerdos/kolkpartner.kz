/*
  # Tax Calculator System

  1. New Tables
    - `tax_calculator_config`
      - `id` (uuid, primary key)
      - `tariff_rate` (numeric) - 关税税率，例如 0.15 表示 15%
      - `vat_rate` (numeric) - 增值税率，例如 0.12 表示 12%
      - `disposal_tax_rate` (numeric) - 报废税率
      - `registration_fee_new` (numeric) - 新车注册费（2024年及以后）
      - `registration_fee_2023` (numeric) - 2023年车辆注册费
      - `registration_fee_2022` (numeric) - 2022年车辆注册费
      - `registration_fee_2021` (numeric) - 2021年车辆注册费
      - `registration_fee_old` (numeric) - 2020年及以前车辆注册费
      - `epts_fee_min` (numeric) - ЭПТС机动车电子护照最低费用
      - `epts_fee_max` (numeric) - ЭПТS机动车电子护照最高费用
      - `sbkts_fee_min` (numeric) - СБКТС合格证最低费用
      - `sbkts_fee_max` (numeric) - СБКТС合格证最高费用
      - `broker_fee` (numeric) - 清关代理费
      - `inspection_fee` (numeric) - 车管所审验+上牌费用
      - `towing_fee` (numeric) - 拖车费
      - `updated_at` (timestamptz)
      - `updated_by` (uuid, foreign key to auth.users)

    - `vehicle_costs`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key to vehicles)
      - `customs_price` (numeric) - 海关平均价格（美金）
      - `tariff_amount` (numeric) - 关税金额
      - `vat_amount` (numeric) - 增值税金额
      - `total_tax` (numeric) - 关税+增值税总额
      - `disposal_tax` (numeric) - 报废税
      - `registration_fee` (numeric) - 首次注册费
      - `epts_fee` (numeric) - ЭПТС费用
      - `sbkts_fee` (numeric) - СБКТС费用
      - `broker_fee` (numeric) - 清关代理费
      - `inspection_fee` (numeric) - 车管所审验+上牌
      - `towing_fee` (numeric) - 拖车费
      - `total_cost` (numeric) - 总费用
      - `calculated_at` (timestamptz)
      - `calculated_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on all tables
    - Admin-only access for tax_calculator_config
    - Admin-only access for vehicle_costs management
*/

CREATE TABLE IF NOT EXISTS tax_calculator_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_rate numeric NOT NULL DEFAULT 0.15,
  vat_rate numeric NOT NULL DEFAULT 0.12,
  disposal_tax_rate numeric NOT NULL DEFAULT 646100,
  registration_fee_new numeric NOT NULL DEFAULT 1000,
  registration_fee_2023 numeric NOT NULL DEFAULT 98300,
  registration_fee_2022 numeric NOT NULL DEFAULT 95000,
  registration_fee_2021 numeric NOT NULL DEFAULT 90000,
  registration_fee_old numeric NOT NULL DEFAULT 85000,
  epts_fee_min numeric NOT NULL DEFAULT 50000,
  epts_fee_max numeric NOT NULL DEFAULT 90000,
  sbkts_fee_min numeric NOT NULL DEFAULT 200000,
  sbkts_fee_max numeric NOT NULL DEFAULT 250000,
  broker_fee numeric NOT NULL DEFAULT 60000,
  inspection_fee numeric NOT NULL DEFAULT 15000,
  towing_fee numeric NOT NULL DEFAULT 20000,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS vehicle_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  customs_price numeric NOT NULL,
  tariff_amount numeric NOT NULL,
  vat_amount numeric NOT NULL,
  total_tax numeric NOT NULL,
  disposal_tax numeric NOT NULL,
  registration_fee numeric NOT NULL,
  epts_fee numeric NOT NULL,
  sbkts_fee numeric NOT NULL,
  broker_fee numeric NOT NULL,
  inspection_fee numeric NOT NULL,
  towing_fee numeric NOT NULL,
  total_cost numeric NOT NULL,
  calculated_at timestamptz DEFAULT now(),
  calculated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE tax_calculator_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read tax calculator config"
  ON tax_calculator_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update tax calculator config"
  ON tax_calculator_config FOR UPDATE
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

CREATE POLICY "Admins can insert tax calculator config"
  ON tax_calculator_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can read vehicle costs"
  ON vehicle_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert vehicle costs"
  ON vehicle_costs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update vehicle costs"
  ON vehicle_costs FOR UPDATE
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

CREATE POLICY "Admins can delete vehicle costs"
  ON vehicle_costs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

INSERT INTO tax_calculator_config (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;