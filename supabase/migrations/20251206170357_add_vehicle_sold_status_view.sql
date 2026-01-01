/*
  # Add vehicle sold status tracking

  1. Changes
    - Create a view that includes vehicle sold status based on paid orders
    - Vehicles with paid orders are marked as sold
    
  2. Security
    - View inherits RLS from base tables
*/

-- Create a view that includes sold status
CREATE OR REPLACE VIEW vehicles_with_status AS
SELECT 
  v.*,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM orders o 
      WHERE o.vehicle_id = v.id 
      AND o.order_status = 'paid'
    ) THEN true
    ELSE false
  END as is_sold
FROM vehicles v;