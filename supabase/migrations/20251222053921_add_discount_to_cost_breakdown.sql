/*
  # Add discount field to cost_breakdown table

  1. Changes
    - Add `discount_amount` column to store discount amount in USD
    - Add `discount_percentage` column to store discount percentage (0-100)
    - These fields are optional and default to 0

  2. Notes
    - discount_amount is the actual discount in USD
    - discount_percentage is for display purposes (e.g., 10 for 10% off)
    - Using IF NOT EXISTS to prevent errors if column already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_breakdown' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE cost_breakdown ADD COLUMN discount_amount numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_breakdown' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE cost_breakdown ADD COLUMN discount_percentage numeric(5, 2) DEFAULT 0;
  END IF;
END $$;