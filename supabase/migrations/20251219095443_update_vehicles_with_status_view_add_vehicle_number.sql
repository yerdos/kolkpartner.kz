/*
  # Update vehicles_with_status View to Include Vehicle Number

  1. Changes
    - Drop and recreate `vehicles_with_status` view
    - Add `vehicle_number` column to the view
    
  2. Purpose
    - Ensure the view includes the new vehicle_number field
    - Allow frontend components to display vehicle numbers
*/

DROP VIEW IF EXISTS vehicles_with_status;

CREATE VIEW vehicles_with_status AS
SELECT 
  id,
  vehicle_number,
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
