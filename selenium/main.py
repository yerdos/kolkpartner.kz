import json
from dataclasses import asdict
from typing import List

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

from config import CNY_TO_USD_RATE, HEADLESS
from crawler import crawl_guazi_detail
from normalize import normalize_fuel_type, transmission_to_english, status_to_english
from supabase_api import (
    insert_vehicle,
    insert_cost_breakdown,
    insert_inspection_report,
    insert_inspection_items,
)
from cost import calc_cost_breakdown_via_api
from crawler import normalize_insp_to_report_payload
from crawler import generate_inspection_items_from_report

def create_driver(headless: bool = True):
    options = webdriver.ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--start-maximized")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(
        "User-Agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

def car_to_vehicle_payload(car) -> dict:
    def or_default(v, default):
        return v if v not in (None, "") else default

    images: List[str] = []
    if car.主图:
        images.append(car.主图)
    images.extend(car.附图 or [])

    payload = {
        "brand": or_default(car.品牌, ""),
        "model": or_default(car.型号, ""),
        "year": or_default(car.年份, 0),
        "price_usd": or_default(car.价格_USD, 0),
        "source_country": or_default(car.来源国家, "china"),
        "source_region": or_default(car.来源地区, ""),
        "mileage_km": or_default(car.里程_KM, 0),
        "fuel_type": normalize_fuel_type(car.燃油类型),          # en|ru
        "transmission": transmission_to_english(car.变速箱),      # automatic/manual/dct
        "color": or_default(car.颜色, "unknown"),
        "engine_capacity": or_default(car.排量, "unknown"),
        "images": images,
        "description_ru": or_default(car.描述_俄语, ""),
        "description_kk": or_default(car.描述_哈萨克语, ""),
        "has_inspection_report": bool(car.检测报告),
        "status": status_to_english(car.状态),
        "estimated_delivery_days": or_default(car.预计运输天数, 30),
        # 推荐你以后给 vehicles 加 source_url 字段，这里就能存 car.源地址
    }
    return payload

def main():
    driver = create_driver(headless=HEADLESS)
    try:
        while True:
            url = input("\n请输入瓜子详情页链接（直接回车退出）：").strip()
            if not url:
                print("退出。")
                break

            car = crawl_guazi_detail(driver, url, rate=CNY_TO_USD_RATE)

            print("\n========== 抓取结果 ==========")
            print(json.dumps(asdict(car), ensure_ascii=False, indent=2))
            print("========== 结束 ==========\n")

            vehicle_payload = car_to_vehicle_payload(car)
            vehicle_row = insert_vehicle(vehicle_payload)
            if not vehicle_row or not vehicle_row.get("id"):
                continue

            vehicle_id = vehicle_row["id"]
            vehicle_price_usd = float(vehicle_row.get("price_usd") or 0)
            vehicle_price_rmb = int(getattr(car, "价格_CNY", 0) or 0)
            engine_displacement_cm3 = int(getattr(car, "排量_CM3", 0) or 0)

            if engine_displacement_cm3 <= 0:
                # 兜底：如果你还没来得及给 CarData 加 排量_CM3 字段，就从 car.排量 再解析一次
                from crawler import normalize_engine_displacement_cm3
                engine_displacement_cm3 = normalize_engine_displacement_cm3(getattr(car, "排量", "")) or 0

            if vehicle_price_rmb <= 0:
                raise ValueError(f"vehicle_price_rmb 无效: {vehicle_price_rmb}")
            if engine_displacement_cm3 <= 0:
                raise ValueError(f"engine_displacement_cm3 无法解析: raw={getattr(car, '排量', None)}")

            include_inspection = bool(getattr(car, "检测报告", False))


            breakdown = calc_cost_breakdown_via_api(
                vehicle_price_rmb=vehicle_price_rmb,
                engine_displacement=engine_displacement_cm3,
                include_inspection=include_inspection,
            )
            breakdown_payload = {"vehicle_id": vehicle_id, **breakdown}
            insert_cost_breakdown(breakdown_payload)
            # === 插入 inspection_reports + inspection_items（摘要版）===
            insp = getattr(car, "检测摘要", None)
            if insp:
                report_payload = normalize_insp_to_report_payload(insp, vehicle_id=vehicle_id)
                # report_payload = {
                #     "vehicle_id": vehicle_id,
                #     "overall_condition": insp.get("overall_condition"),
                #     "paint_condition": insp.get("paint_condition") or "unknown",
                #     "performance_score": insp.get("performance_score"),
                #     "has_accidents": bool(insp.get("has_accidents")),
                #     "accident_details": insp.get("accident_details") or "",
                #     "insurance_records": insp.get("insurance_records") or [],
                #     "inspection_date": insp.get("inspection_date"),
                #     "inspector_name": insp.get("inspector_name") or "Guazi",
                # }

                report_row = insert_inspection_report(report_payload)
                if report_row and report_row.get("id"):
                    report_id = report_row["id"]

                    items = generate_inspection_items_from_report(report_id, report_payload)

                    # 生成 inspection_items 占位项（符合 category/status 约束）
                    # items = []

                    # rec0 = None
                    # if isinstance(insp.get("insurance_records"), list) and insp["insurance_records"]:
                    #     rec0 = insp["insurance_records"][0] or {}

                    # grade = (rec0 or {}).get("grade")
                    # percent = (rec0 or {}).get("percent")
                    # mileage_km2 = (rec0 or {}).get("mileage_km")
                    # age_months = (rec0 or {}).get("age_months")
                    # claims = (rec0 or {}).get("claims_count")
                    # transfers = (rec0 or {}).get("transfer_count")

                    # status_map = {"S": "good", "A": "good", "B": "fair", "C": "poor", "D": "needs_repair"}

                    # items.append({
                    #     "report_id": report_id,
                    #     "category": "exterior",
                    #     "item_name": "condition_grade",
                    #     "status": status_map.get(grade, "fair"),
                    #     "notes": f"grade={grade or 'unknown'}",
                    # })

                    # percent_status = "good" if (isinstance(percent, int) and percent >= 90) else ("fair" if (isinstance(percent, int) and percent >= 80) else "poor")
                    # items.append({
                    #     "report_id": report_id,
                    #     "category": "paint",
                    #     "item_name": "appearance_score",
                    #     "status": percent_status,
                    #     "notes": f"percent={percent if percent is not None else 'unknown'}",
                    # })

                    # items.append({
                    #     "report_id": report_id,
                    #     "category": "engine",
                    #     "item_name": "mileage_age",
                    #     "status": "fair",
                    #     "notes": f"mileage_km={mileage_km2 if mileage_km2 is not None else 'unknown'}, age_months={age_months if age_months is not None else 'unknown'}",
                    # })

                    # items.append({
                    #     "report_id": report_id,
                    #     "category": "transmission",
                    #     "item_name": "claims_transfers",
                    #     "status": "fair" if (isinstance(claims, int) and claims > 0) else "good",
                    #     "notes": f"claims={claims if claims is not None else 'unknown'}, transfers={transfers if transfers is not None else 'unknown'}",
                    # })

                    insert_inspection_items(items)


    finally:
        driver.quit()

if __name__ == "__main__":
    main()
