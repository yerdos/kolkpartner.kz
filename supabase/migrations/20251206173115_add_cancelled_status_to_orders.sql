/*
  # 添加订单作废状态

  1. 变更说明
    - 在订单表的order_status字段中添加'cancelled'状态
    - 更新vehicles_with_status视图，确保作废订单不影响车辆售卖状态
    - 作废订单后，车辆可以继续售卖

  2. 新增状态
    - cancelled: 订单已作废（客户取消或误点）

  3. 业务逻辑
    - 只有'paid'状态的订单才会将车辆标记为已售
    - 'cancelled'状态的订单不会影响车辆的可售状态
*/

-- 先删除旧的CHECK约束
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_order_status_check;

-- 添加包含cancelled状态的新CHECK约束
ALTER TABLE orders 
  ADD CONSTRAINT orders_order_status_check 
  CHECK (order_status IN ('pending', 'paid', 'in_transit', 'customs', 'delivered', 'cancelled'));

-- 更新vehicles_with_status视图
DROP VIEW IF EXISTS vehicles_with_status;

CREATE VIEW vehicles_with_status AS
SELECT 
  id,
  brand,
  model,
  year,
  price_usd,
  source_country,
  source_region,
  mileage_km,
  fuel_type,
  transmission,
  color,
  engine_capacity,
  images,
  description_ru,
  description_kk,
  has_inspection_report,
  status,
  created_at,
  estimated_delivery_days,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM orders o
      WHERE o.vehicle_id = v.id 
        AND o.order_status = 'paid'
    ) THEN true
    ELSE false
  END AS is_sold
FROM vehicles v;

-- 添加注释
COMMENT ON COLUMN orders.order_status IS 'Order status: pending, paid, in_transit, customs, delivered, cancelled';
