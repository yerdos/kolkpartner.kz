/*
  # 添加检测项目明细表的写入策略

  1. 策略更新
    - 允许任何人插入 inspection_items
    - 允许任何人更新 inspection_items
    - 允许任何人删除 inspection_items
    
  2. 说明
    - 为了简化演示，暂时允许公开访问
    - 生产环境应该限制为管理员角色
*/

-- 允许插入检测项目明细
CREATE POLICY "Anyone can insert inspection items"
  ON inspection_items FOR INSERT
  WITH CHECK (true);

-- 允许更新检测项目明细
CREATE POLICY "Anyone can update inspection items"
  ON inspection_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 允许删除检测项目明细
CREATE POLICY "Anyone can delete inspection items"
  ON inspection_items FOR DELETE
  USING (true);
