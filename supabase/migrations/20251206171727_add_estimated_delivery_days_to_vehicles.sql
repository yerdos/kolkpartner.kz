/*
  # Add Estimated Delivery Days to Vehicles

  1. Changes
    - Add `estimated_delivery_days` column to `vehicles` table
      - Type: integer
      - Default: 30 days (typical delivery timeframe)
      - Not null with default value
      
  2. Purpose
    - Display estimated delivery timeframe to customers
    - Help customers understand when they can expect to receive the vehicle
    - Provide transparency in the purchasing process
*/

-- Add estimated delivery days column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'estimated_delivery_days'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN estimated_delivery_days integer NOT NULL DEFAULT 30;
  END IF;
END $$;
