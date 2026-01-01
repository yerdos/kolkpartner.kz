import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("请先在 .env 中配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY")

CNY_TO_USD_RATE = float(os.getenv("CNY_TO_USD_RATE", "7.1"))
KZT_TO_USD_RATE = float(os.getenv("KZT_TO_USD_RATE", "514"))
HEADLESS = os.getenv("HEADLESS", "true").lower() in ("1", "true", "yes")
