from typing import Optional, List, Dict, Any
import requests

from config import SUPABASE_URL, SUPABASE_KEY

def _headers():
    return {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "return=representation"
    }

def insert_vehicle(payload: dict) -> Optional[dict]:
    url = f"{SUPABASE_URL}/rest/v1/vehicles"
    resp = requests.post(url, json=payload, headers=_headers(), timeout=20)
    if not resp.ok:
        print("[ERROR] vehicles 插入失败:", resp.status_code, resp.text)
        return None
    data = resp.json()
    return data[0] if isinstance(data, list) and data else data

def insert_cost_breakdown(payload: dict) -> Optional[dict]:
    url = f"{SUPABASE_URL}/rest/v1/cost_breakdown"
    resp = requests.post(url, json=payload, headers=_headers(), timeout=20)
    if not resp.ok:
        print("[ERROR] cost_breakdown 插入失败:", resp.status_code, resp.text)
        return None
    data = resp.json()
    return data[0] if isinstance(data, list) and data else data
    

def insert_inspection_report(payload: dict) -> Optional[dict]:
    url = f"{SUPABASE_URL}/rest/v1/inspection_reports"
    resp = requests.post(url, json=payload, headers=_headers(), timeout=20)
    if not resp.ok:
        print("[ERROR] inspection_reports 插入失败:", resp.status_code, resp.text)
        return None
    data = resp.json()
    return data[0] if isinstance(data, list) and data else data

def insert_inspection_items(payloads: List[dict]) -> bool:
    if not payloads:
        return True
    url = f"{SUPABASE_URL}/rest/v1/inspection_items"
    resp = requests.post(url, json=payloads, headers=_headers(), timeout=20)
    if not resp.ok:
        print("[ERROR] inspection_items 插入失败:", resp.status_code, resp.text)
        return False
    return True

