/*
  # Add USD to KZT Exchange Rate
  
  1. Changes
    - Add usd_to_kzt_rate column to tax_calculator_config table
    - Set default rate to 485 (approximate current rate)
  
  2. Notes
    - Exchange rate can be updated by admin users
    - Rate is used to display prices in both USD and KZT
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tax_calculator_config' AND column_name = 'usd_to_kzt_rate'
  ) THEN
    ALTER TABLE tax_calculator_config 
    ADD COLUMN usd_to_kzt_rate numeric DEFAULT 485;
    
    COMMENT ON COLUMN tax_calculator_config.usd_to_kzt_rate IS 'USD to KZT exchange rate';
  END IF;
END $$;