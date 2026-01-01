/*
  # Add seats field to vehicles table

  1. Changes
    - Add `seats` column to vehicles table to store the number of seats
    - This is an integer field with a default value of 5
    - Common values are 2, 4, 5, 7, 8, etc.

  2. Notes
    - Using IF NOT EXISTS to prevent errors if column already exists
    - Default value of 5 is the most common for passenger vehicles
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'seats'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN seats integer DEFAULT 5;
  END IF;
END $$;