/*
  # Add Phone Number Unique Constraint

  1. Changes
    - Add unique constraint on phone field in user_profiles table
    - Add index for faster phone number lookups
  
  2. Security
    - Ensures each phone number can only be registered once
    - Optimizes phone-based authentication queries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_phone_key'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_phone_key UNIQUE (phone);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
