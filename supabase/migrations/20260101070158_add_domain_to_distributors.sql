/*
  # 为分销商表添加域名字段

  1. 修改表
    - `distributors` 表添加 `domain` 字段（用于绑定专属域名）
  
  2. 变更说明
    - 添加 domain 字段，用于识别分销商专属域名
    - domain 字段唯一，每个分销商只能绑定一个域名
    - 允许为 NULL，因为现有分销商可能还没有绑定域名

  3. 说明
    - 当用户通过分销商域名访问时，系统会自动识别并展示分销商专属页面
    - 分销商页面只显示总价，不显示费用明细
*/

-- 为分销商表添加域名字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'distributors' AND column_name = 'domain'
  ) THEN
    ALTER TABLE distributors ADD COLUMN domain text UNIQUE;
  END IF;
END $$;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_distributors_domain ON distributors(domain);

-- 添加示例域名数据
UPDATE distributors SET domain = 'beijing.kolk.kz' WHERE code = 'DS001';
UPDATE distributors SET domain = 'shanghai.kolk.kz' WHERE code = 'DS002';
UPDATE distributors SET domain = 'almaty.kolk.kz' WHERE code = 'DS003';
