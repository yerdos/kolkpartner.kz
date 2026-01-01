/*
  # Add Accident Detection Fields to Inspection Reports

  1. Changes
    - Remove `paint_condition` column from `inspection_reports` table
    - Add `major_accident` boolean field (是否检测大事故)
    - Add `fire_damage` boolean field (是否火烧)
    - Add `water_damage` boolean field (是否水泡)
  
  2. Details
    - All new fields are boolean type with default value false
    - These fields track major damage types: major accidents, fire damage, and water damage
    - Fields have NOT NULL constraint with default values
*/

DO $$
BEGIN
  -- Remove paint_condition column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_reports' AND column_name = 'paint_condition'
  ) THEN
    ALTER TABLE inspection_reports DROP COLUMN paint_condition;
  END IF;

  -- Add major_accident column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_reports' AND column_name = 'major_accident'
  ) THEN
    ALTER TABLE inspection_reports ADD COLUMN major_accident boolean NOT NULL DEFAULT false;
  END IF;

  -- Add fire_damage column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_reports' AND column_name = 'fire_damage'
  ) THEN
    ALTER TABLE inspection_reports ADD COLUMN fire_damage boolean NOT NULL DEFAULT false;
  END IF;

  -- Add water_damage column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_reports' AND column_name = 'water_damage'
  ) THEN
    ALTER TABLE inspection_reports ADD COLUMN water_damage boolean NOT NULL DEFAULT false;
  END IF;
END $$;