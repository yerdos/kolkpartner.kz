/*
  # 为车辆表添加原始链接字段

  ## 更改说明
  
  为 vehicles 表添加 original_url 字段，用于存储车辆在原始网站上的链接地址。
  
  1. **新增字段**
    - `original_url` (text, 可选) - 车辆在原始网站上的链接
  
  2. **用途**
    - 管理员可以在后台点击链接跳转到原始车辆页面
    - 方便核对车辆信息和更新数据
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'original_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN original_url text DEFAULT '';
  END IF;
END $$;