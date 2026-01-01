import requests
from typing import Optional, Dict

from config import SUPABASE_URL, SUPABASE_KEY


def insert_inspection_report(
    vehicle_id: str,
    report: Dict
) -> Optional[Dict]:
    """
    向 inspection_reports 表插入一条检测报告

    参数：
    - vehicle_id: vehicles.id
    - report: parse_inspection_summary() 返回的 dict
    """

    url = f"{SUPABASE_URL}/rest/v1/inspection_reports"

    headers = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "return=representation"
    }

    payload = {
        "vehicle_id": vehicle_id,

        # === inspection_reports 字段 ===
        "overall_condition": report.get("overall_condition"),
        "paint_condition": report.get("paint_condition"),
        "performance_score": report.get("performance_score"),
        "has_accidents": report.get("has_accidents", False),
        "accident_details": report.get("accident_details", ""),
        "insurance_records": report.get("insurance_records", []),
        "inspection_date": report.get("inspection_date"),
        "inspector_name": report.get("inspector_name", "Guazi"),
    }

    resp = requests.post(
        url,
        json=payload,
        headers=headers,
        timeout=20
    )

    if not resp.ok:
        print(
            "[ERROR] inspection_reports 插入失败:",
            resp.status_code,
            resp.text
        )
        return None

    data = resp.json()

    # Supabase REST 返回通常是 list
    row = data[0] if isinstance(data, list) and data else data

    print(
        "[INFO] inspection_reports 插入成功, id =",
        row.get("id")
    )

    return row
