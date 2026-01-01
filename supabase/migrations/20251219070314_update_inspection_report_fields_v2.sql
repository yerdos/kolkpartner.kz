/*
  # 更新检测报告字段

  ## 更改说明
  
  将检测报告中的字段更新为更实用的格式：
  
  1. **修改字段**
    - `overall_condition` - 从数字(1-10)改为车况级别(S/A/B/C)
    - `performance_score` - 从性能评分改为新旧程度(数字，如99,95等)
  
  2. **新增字段**
    - `claim_count` (integer) - 理赔次数
    - `transfer_count` (integer) - 过户次数
  
  3. **字段说明**
    - S级: 极品车况
    - A级: 优秀车况
    - B级: 良好车况
    - C级: 一般车况
    - 新旧程度: 99表示99新，95表示95新，以此类推
*/

-- 修改 overall_condition 字段
DO $$
BEGIN
  -- 添加新的临时列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_reports' AND column_name = 'condition_grade'
  ) THEN
    ALTER TABLE inspection_reports ADD COLUMN condition_grade text;
  END IF;
  
  -- 转换现有数据
  UPDATE inspection_reports 
  SET condition_grade = CASE 
    WHEN overall_condition >= 9 THEN 'S'
    WHEN overall_condition >= 7 THEN 'A'
    WHEN overall_condition >= 5 THEN 'B'
    ELSE 'C'
  END;
  
  -- 删除旧列
  ALTER TABLE inspection_reports DROP COLUMN IF EXISTS overall_condition;
  
  -- 重命名新列为旧列名
  ALTER TABLE inspection_reports RENAME COLUMN condition_grade TO overall_condition;
  
  -- 添加约束
  ALTER TABLE inspection_reports
  DROP CONSTRAINT IF EXISTS inspection_reports_overall_condition_check;
  
  ALTER TABLE inspection_reports
  ADD CONSTRAINT inspection_reports_overall_condition_check 
  CHECK (overall_condition IN ('S', 'A', 'B', 'C'));
  
  -- 设置默认值
  ALTER TABLE inspection_reports
  ALTER COLUMN overall_condition SET DEFAULT 'A';
END $$;

-- 修改 performance_score 为 newness_rating
DO $$
BEGIN
  -- 添加新列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_reports' AND column_name = 'newness_rating'
  ) THEN
    ALTER TABLE inspection_reports ADD COLUMN newness_rating integer;
  END IF;
  
  -- 转换数据：将1-10分转换为50-99的新旧程度
  UPDATE inspection_reports 
  SET newness_rating = CASE 
    WHEN performance_score >= 9 THEN 95
    WHEN performance_score >= 7 THEN 85
    WHEN performance_score >= 5 THEN 75
    ELSE 65
  END;
  
  -- 删除旧列
  ALTER TABLE inspection_reports DROP COLUMN IF EXISTS performance_score;
  
  -- 添加约束
  ALTER TABLE inspection_reports
  ADD CONSTRAINT inspection_reports_newness_rating_check 
  CHECK (newness_rating BETWEEN 50 AND 99);
  
  -- 设置默认值
  ALTER TABLE inspection_reports
  ALTER COLUMN newness_rating SET DEFAULT 85;
END $$;

-- 添加理赔次数字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_reports' AND column_name = 'claim_count'
  ) THEN
    ALTER TABLE inspection_reports 
    ADD COLUMN claim_count integer DEFAULT 0 CHECK (claim_count >= 0);
  END IF;
END $$;

-- 添加过户次数字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_reports' AND column_name = 'transfer_count'
  ) THEN
    ALTER TABLE inspection_reports 
    ADD COLUMN transfer_count integer DEFAULT 0 CHECK (transfer_count >= 0);
  END IF;
END $$;