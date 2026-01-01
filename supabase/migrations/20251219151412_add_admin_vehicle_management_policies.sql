/*
  # 添加车辆管理的管理员策略
  
  修复车辆删除问题，并完善所有相关表的管理员权限。
  
  ## 问题
  - vehicles表缺少INSERT、UPDATE、DELETE策略，导致管理员无法删除车辆
  - inspection_reports表缺少INSERT、UPDATE、DELETE策略
  - tracking_updates表缺少INSERT、UPDATE、DELETE策略
  
  ## 新增策略
  
  ### vehicles表
  - 管理员可以插入车辆
  - 管理员可以更新车辆
  - 管理员可以删除车辆
  
  ### inspection_reports表
  - 管理员可以插入检测报告
  - 管理员可以更新检测报告
  - 管理员可以删除检测报告
  
  ### tracking_updates表
  - 管理员可以插入物流更新
  - 管理员可以更新物流更新
  - 管理员可以删除物流更新
  
  ## 级联删除
  
  数据库已经正确配置了ON DELETE CASCADE：
  - 删除vehicle时，会自动删除：
    - inspection_reports（检测报告）
    - inspection_items（检测项目，通过inspection_reports级联）
    - vehicle_costs（成本明细）
    - favorites（收藏）
    - orders（订单）
    - tracking_updates（物流更新，通过orders级联）
*/

-- vehicles表：管理员权限
CREATE POLICY "Admins can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update vehicles"
  ON vehicles FOR UPDATE
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

CREATE POLICY "Admins can delete vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- inspection_reports表：管理员权限
CREATE POLICY "Admins can insert inspection reports"
  ON inspection_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update inspection reports"
  ON inspection_reports FOR UPDATE
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

CREATE POLICY "Admins can delete inspection reports"
  ON inspection_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- tracking_updates表：管理员权限
CREATE POLICY "Admins can insert tracking updates"
  ON tracking_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update tracking updates"
  ON tracking_updates FOR UPDATE
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

CREATE POLICY "Admins can delete tracking updates"
  ON tracking_updates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
