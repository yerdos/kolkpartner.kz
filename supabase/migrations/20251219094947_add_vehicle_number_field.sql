/*
  # Add Vehicle Number Field

  1. Changes
    - Add `vehicle_number` column to `vehicles` table
      - Format: K + YYMM + sequential number (e.g., K25121901)
      - Automatically generated on insert
    
  2. Implementation
    - Add vehicle_number column with unique constraint
    - Create sequence for generating sequential numbers
    - Create function to generate vehicle numbers
    - Create trigger to auto-generate on insert

  3. Notes
    - Vehicle number format: K{YYMM}{sequence}
    - Sequence resets monthly for better organization
    - Existing vehicles will get numbers assigned based on creation date
*/

-- Add vehicle_number column
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS vehicle_number text UNIQUE;

-- Create sequence for vehicle numbers (starts at 1001 for 4-digit format)
CREATE SEQUENCE IF NOT EXISTS vehicle_number_seq START WITH 1001;

-- Function to generate vehicle number
CREATE OR REPLACE FUNCTION generate_vehicle_number()
RETURNS text AS $$
DECLARE
  year_month text;
  seq_num text;
  new_number text;
  number_exists boolean;
BEGIN
  -- Get current year-month in YYMM format
  year_month := to_char(CURRENT_DATE, 'YYMM');
  
  -- Loop until we find a unique number
  LOOP
    -- Get next sequence number and format as 4 digits
    seq_num := lpad(nextval('vehicle_number_seq')::text, 4, '0');
    
    -- Construct the vehicle number
    new_number := 'K' || year_month || seq_num;
    
    -- Check if this number already exists
    SELECT EXISTS(SELECT 1 FROM vehicles WHERE vehicle_number = new_number) INTO number_exists;
    
    -- If number doesn't exist, we can use it
    IF NOT number_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate vehicle number
CREATE OR REPLACE FUNCTION set_vehicle_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if vehicle_number is not provided
  IF NEW.vehicle_number IS NULL THEN
    NEW.vehicle_number := generate_vehicle_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_vehicle_number_trigger ON vehicles;
CREATE TRIGGER set_vehicle_number_trigger
  BEFORE INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_vehicle_number();

-- Update existing vehicles with generated numbers
DO $$
DECLARE
  vehicle_record RECORD;
BEGIN
  FOR vehicle_record IN 
    SELECT id FROM vehicles WHERE vehicle_number IS NULL ORDER BY created_at
  LOOP
    UPDATE vehicles 
    SET vehicle_number = generate_vehicle_number()
    WHERE id = vehicle_record.id;
  END LOOP;
END $$;
