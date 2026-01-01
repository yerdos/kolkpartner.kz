/*
  # Add role column to user_profiles

  1. Changes
    - Add `role` column to user_profiles (default: 'user', options: 'user', 'admin')
    - Add index on role for better query performance

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text NOT NULL DEFAULT 'user';
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('user', 'admin'));
    CREATE INDEX idx_user_profiles_role ON user_profiles(role);
  END IF;
END $$;