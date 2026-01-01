import os
import re
import json
from dataclasses import dataclass, asdict
from typing import List, Optional

import requests
from dotenv import load_dotenv

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


# ========= 环境变量 / Supabase 配置 =========

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("请先在 .env 中配置 SUPABASE_URL 和 SUPABASE_KEY")


# ========= 数据结构 =========

@dataclass
class CarData:
    品牌: str
    型号: str
    年份: Optional[int]
    价格_CNY: Optional[float]
    价格_USD: Optional[float]
    里程_KM: Optional[int]
    燃油类型: Optional[str]
    变速箱: Optional[str]
    颜色: Optional[str]
    排量: Optional[str]
    来源国家: str          # 这里会存 english: china/korea/georgia
    来源地区: str
    状态: str
    预计运输天数: int
    主图: Optional[str]
    附图: List[str]
    描述_俄语: str
    描述_哈萨克语: str
    源地址: str
    检测报告: bool          # 是否有检测报告（has_inspection_report）


# ========= 工具函数 =========

def create_driver(headless: bool = True):
    """
    创建 Selenium Chrome 实例
    """
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

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    return driver


def cny_to_usd(cny: Optional[float], rate: float = 7.0) -> Optional[float]:
    if cny is None:
        return None
    return round(cny / rate, 2)


def parse_title_brand_model(title: str):
    """
    从 <h1> 标题中拆分 品牌 / 型号
    e.g. "理想汽车 理想L7 2023款 Pro"
    """
    title = title.replace("二手车", "").strip()
    # 去掉瓜子附带的 “价格” 文案
    title = title.split("价格")[0].strip()

    parts = title.split()
    if len(parts) >= 2:
        brand = parts[0]
        model = " ".join(parts[1:])
    else:
        brand = title
        model = title
    return brand, model


def parse_year_from_text(text: str, model: str) -> Optional[int]:
    # 优先从 “2023款” 这种里找
    m1 = re.search(r"(\d{4})款", model)
    if m1:
        return int(m1.group(1))

    # 再尝试 "2023年上牌"
    m2 = re.search(r"(\d{4})年上牌", text)
    if m2:
        return int(m2.group(1))

    # 最后兜底任意四位数年份
    m3 = re.search(r"(20\d{2})", text)
    if m3:
        return int(m3.group(1))

    return None


def parse_price_cny(text: str) -> Optional[float]:
    """
    从整页文本里找 “17.75 万” 这种
    """
    m = re.search(r"(\d+(\.\d+)?)\s*万", text)
    if not m:
        return None
    return float(m.group(1)) * 10000


def parse_mileage_km(text: str) -> Optional[int]:
    """
    从整页文本里找 “7.68万公里”
    """
    m = re.search(r"(\d+(\.\d+)?)\s*万公里", text)
    if m:
        return int(float(m.group(1)) * 10000)

    m2 = re.search(r"(\d+)\s*公里", text)
    if m2:
        return int(m2.group(1))

    return None


def parse_city(driver, full_text: str) -> str:
    """
    优先从页面的城市标签中抓取，例如：
    - <span class="city">苏州</span>
    - <div class="vehicle-summary__title"><span>苏州</span>
    抓不到时再 fallback 用正则。
    """

    # 1) 直接尝试找 class 含 city 的
    try:
        city_el = driver.find_element(By.CSS_SELECTOR, "span.city")
        city = city_el.text.strip()
        if city:
            return city
    except Exception:
        pass

    # 2) 尝试新结构的 title 区域
    try:
        title_el = driver.find_element(By.CSS_SELECTOR, ".vehicle-summary__title span")
        city = title_el.text.strip()
        if city:
            return city
    except Exception:
        pass

    # 3) fallback：从文本中查 /苏州车源
    m = re.search(r"/([\u4e00-\u9fa5]+?)车源", full_text)
    if m:
        return m.group(1)

    # 4) fallback：从 “苏州二手车” 这类抓取
    m2 = re.search(r"([\u4e00-\u9fa5]+)二手车", full_text)
    if m2:
        return m2.group(1)

    return ""


def guess_fuel_type(text: str) -> Optional[str]:
    if "汽油" in text:
        return "汽油"
    if "柴油" in text:
        return "柴油"
    if "纯电" in text or "电动车" in text or "纯电动" in text:
        return "纯电动"
    if "混合动力" in text or "插电混动" in text or "油电混合" in text:
        return "混合动力"
    if "增程" in text:
        return "增程式混合动力"
    return None


def guess_gearbox(text: str) -> Optional[str]:
    if "自动" in text:
        return "自动"
    if "手动" in text:
        return "手动"
    if "双离合" in text:
        return "双离合"
    return None


def guess_color(text: str) -> Optional[str]:
    colors = ["黑色", "白色", "灰色", "银色", "红色", "蓝色", "绿色", "棕色", "黄色", "金色"]
    for c in colors:
        if c in text:
            return c
    return None


def guess_displacement(text: str) -> Optional[str]:
    # 例如 1.5T、2.0T、3.0L
    m = re.search(r"(\d\.\d)T", text)
    if m:
        return m.group(0)
    m2 = re.search(r"(\d\.\d)L", text)
    if m2:
        return m2.group(0)
    return None


def guess_source_country(text: str) -> str:
    """
    返回 english，对应 vehicles.source_country 的 check 约束：
    ['korea','china','georgia']
    """
    if "韩国" in text:
        return "korea"
    if "格鲁吉亚" in text or "乔治亚" in text:
        return "georgia"
    # 瓜子大部分是中国本地车源，兜底写 china
    return "china"

# ========= 规范化 / 映射 =========

# 品牌中文->英文（按你业务常见的先做一批，后面可以继续补）
BRAND_CN_TO_EN = {
    "比亚迪": "BYD",
    "理想汽车": "Li Auto",
    "理想": "Li Auto",
    "小米": "Xiaomi",
    "吉利": "Geely",
    "奇瑞": "Chery",
    "长安": "Changan",
    "哈弗": "Haval",
    "长城": "GWM",
    "现代": "Hyundai",
    "起亚": "Kia",
    "丰田": "Toyota",
    "本田": "Honda",
    "日产": "Nissan",
    "大众": "Volkswagen",
    "奥迪": "Audi",
    "宝马": "BMW",
    "奔驰": "Mercedes-Benz",
    "特斯拉": "Tesla",
}

# 燃油类型中文->(英文, 俄语)
FUEL_CN_TO_EN_RU = {
    "汽油": ("gasoline", "бензин"),
    "柴油": ("diesel", "дизель"),
    "纯电动": ("electric", "электро"),
    "混合动力": ("hybrid", "гибрид"),
    "增程式混合动力": ("range_extender", "гибрид (удлинитель хода)"),
}

# 变速箱中文->英文
TRANS_CN_TO_EN = {
    "自动": "automatic",
    "手动": "manual",
    "双离合": "dct",
}


def cn_brand_to_english(brand_cn: str) -> str:
    if not brand_cn:
        return ""
    return BRAND_CN_TO_EN.get(brand_cn.strip(), brand_cn.strip())  # 没命中就原样


def normalize_fuel_type(fuel_cn: Optional[str]) -> str:
    """
    返回格式：en|ru  例如 gasoline|бензин
    """
    if not fuel_cn:
        return "unknown|неизвестно"
    en_ru = FUEL_CN_TO_EN_RU.get(fuel_cn)
    if not en_ru:
        # 未收录就把中文塞到后面，避免丢信息
        return f"unknown|{fuel_cn}"
    en, ru = en_ru
    return f"{en}|{ru}"


def transmission_to_english(trans_cn: Optional[str]) -> str:
    if not trans_cn:
        return "unknown"
    return TRANS_CN_TO_EN.get(trans_cn, "unknown")


def status_to_english(status_cn: str) -> str:
    # 你目前固定写“可售”，这里统一转成 available
    if not status_cn:
        return "available"
    s = status_cn.strip()
    if s in ("可售", "在售", "available"):
        return "available"
    if s in ("预定", "已预订", "reserved"):
        return "reserved"
    if s in ("已售", "sold"):
        return "sold"
    return "available"

def to_pinyin(text: str) -> str:
    """
    把中文转拼音（无声调，空格分隔），用于来源地区。
    """
    if not text:
        return ""
    try:
        from pypinyin import pinyin, Style
        parts = pinyin(text, style=Style.NORMAL)
        return " ".join([x[0] for x in parts]).strip()
    except Exception:
        # 没装库时兜底：原样返回
        return text.strip()

def normalize_model_to_en_or_pinyin(model_cn: str) -> str:
    """
    把中文车型名规范化为：
    - 保留英文 / 数字 / DM-i / KM / PLUS / L7 / N-Line 等
    - 中文部分转拼音
    - 去掉：xx款、配置词（领先型/旗舰型/冠军版等）
    """

    if not model_cn:
        return ""

    # 1️⃣ 去掉年份和“款”
    model = re.sub(r"\d{4}款", "", model_cn)

    # 2️⃣ 去掉常见配置后缀
    model = re.sub(
        r"(冠军版|领先型|尊贵型|旗舰型|豪华型|标准型|高配|低配)",
        "",
        model
    )

    model = model.strip()

    # 3️⃣ 如果包含中文，转拼音
    if re.search(r"[\u4e00-\u9fa5]", model):
        try:
            from pypinyin import pinyin, Style
            parts = pinyin(model, style=Style.NORMAL)
            model = " ".join([x[0] for x in parts])
        except Exception:
            pass

    # 4️⃣ 清理多余空格
    model = re.sub(r"\s+", " ", model).strip()

    return model



def build_descriptions_ru_kz(brand: str, model: str,
                             year: Optional[int],
                             mileage_km: Optional[int],
                             city: str):
    y = year or ""
    m = f"{mileage_km:,}" if mileage_km is not None else "—"

    desc_ru = (
        f"{brand} {model}, {y} года выпуска. "
        f"Пробег {m} км. Автомобиль из Китая, город {city or '—'}. "
        "Подробное техническое состояние по запросу."
    )

    desc_kz = (
        f"{brand} {model}, {y} жылғы. "
        f"Жүріс {m} км. Қытайдан келген көлік, қала – {city or '—'}. "
        "Толық техникалық ақпараты сұрау бойынша беріледі."
    )

    return desc_ru, desc_kz


VALID_EXT = (".jpg", ".jpeg", ".png", ".webp")


def parse_images(driver) -> (Optional[str], List[str]):
    """
    从 car-image-main-swiper 抓取图片：
    - 自动去掉 ?x-bce-process 等后缀
    - 去掉没有文件后缀的广告图
    - 第一张为主图，其余为附图
    """
    urls: List[str] = []

    try:
        container = driver.find_element(By.CSS_SELECTOR, "div.car-image-main-swiper")
        img_elements = container.find_elements(By.CSS_SELECTOR, "img")
    except Exception:
        img_elements = driver.find_elements(By.TAG_NAME, "img")

    for img in img_elements:
        src = img.get_attribute("src") or img.get_attribute("data-src") or ""
        if not src:
            continue

        # 只要瓜子图片域名
        if "guazi" not in src:
            continue

        # 修复 //image.xxx
        if src.startswith("//"):
            src = "https:" + src

        # 去掉 x-bce-process 参数
        if "?" in src:
            src = src.split("?", 1)[0]

        # 过滤掉无后缀的广告图
        if not src.lower().endswith(VALID_EXT):
            continue

        if src not in urls:
            urls.append(src)

    if not urls:
        return None, []

    main = urls[0]
    others = urls[1:]
    return main, others


# ========= Supabase 写入：映射到 public.vehicles =========

def car_to_vehicles_payload(car: CarData) -> dict:
    def or_default(v, default):
        return v if v not in (None, "") else default

    images_list: List[str] = []
    if car.主图:
        images_list.append(car.主图)
    images_list.extend(car.附图 or [])

    # ✅ 按你要求做规范化
    brand_en = cn_brand_to_english(car.品牌)
    model_norm = car.型号  # 这里先保留原样（后面如果你要“英文或拼音”，我再给你做模型名规则）
    fuel_norm = normalize_fuel_type(car.燃油类型)          # en|ru
    trans_en = transmission_to_english(car.变速箱)        # automatic/manual/dct
    region_py = to_pinyin(car.来源地区)                   # 拼音
    status_en = status_to_english(car.状态)               # available/reserved/sold

    payload = {
        "brand": or_default(brand_en, ""),
        "model": or_default(model_norm, ""),
        "year": or_default(car.年份, 0),
        "price_usd": or_default(car.价格_USD, 0.0),
        "source_country": or_default(car.来源国家, "china"),
        "source_region": or_default(region_py, ""),
        "mileage_km": or_default(car.里程_KM, 0),
        "fuel_type": or_default(fuel_norm, "unknown|неизвестно"),
        "transmission": or_default(trans_en, "unknown"),
        "color": or_default(car.颜色, "unknown"),
        "engine_capacity": or_default(car.排量, "unknown"),
        "images": images_list,
        "description_ru": or_default(car.描述_俄语, ""),
        "description_kk": or_default(car.描述_哈萨克语, ""),
        "has_inspection_report": car.检测报告,
        "status": status_en,
        "estimated_delivery_days": or_default(car.预计运输天数, 30),
    }
    return payload

def round2(x: float) -> float:
    return float(f"{x:.2f}")

def calc_cost_breakdown(vehicle_price_usd: float, rate_cny_to_usd: float = 7.0) -> dict:
    """
    根据你的规则计算 cost_breakdown（单位：USD）
    - 海关价值 = vehicle_price_usd（如需 CIF，见下方注释）
    """
    customs_value = vehicle_price_usd
    # 如果你要 CIF（车价 + 国际运输）作为海关价值，用这一行替换上面：
    # customs_value = vehicle_price_usd + 850.0

    domestic_transport = round2(4000.0 / rate_cny_to_usd)
    customs_clearance = round2(2200.0 / rate_cny_to_usd)         # 办理许可证
    international_shipping = 850.0
    customs_declaration = round2(1000.0 / rate_cny_to_usd)
    other_fees = round2(3000.0 / rate_cny_to_usd)
    service_fee = 200.0

    duty = round2(customs_value * 0.15)
    vat = round2((customs_value + duty) * 0.16)
    tax_fee = round2(duty + vat)

    local_delivery = 0.0
    registration_fee = 0.0

    total_cost_usd = round2(
        domestic_transport
        + international_shipping
        + customs_declaration
        + customs_clearance
        + local_delivery
        + registration_fee
        + tax_fee
        + service_fee
        + other_fees
    )

    estimated_landing_price = round2(vehicle_price_usd + total_cost_usd)

    return {
        "domestic_transport": domestic_transport,
        "international_shipping": international_shipping,
        "customs_declaration": customs_declaration,
        "customs_clearance": customs_clearance,
        "local_delivery": local_delivery,
        "registration_fee": registration_fee,
        "tax_fee": tax_fee,
        "service_fee": service_fee,
        "other_fees": other_fees,
        "total_cost_usd": total_cost_usd,
        "estimated_landing_price": estimated_landing_price,
    }


def insert_vehicle_to_supabase(car: CarData) -> Optional[dict]:
    url = f"{SUPABASE_URL}/rest/v1/vehicles"
    headers = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "return=representation"
    }

    payload = car_to_vehicles_payload(car)
    resp = requests.post(url, json=payload, headers=headers, timeout=20)

    if not resp.ok:
        print("[ERROR] Supabase vehicles 插入失败:", resp.status_code, resp.text)
        return None

    data = resp.json()
    # Supabase REST 默认返回 list
    vehicle_row = data[0] if isinstance(data, list) and data else data
    print("[INFO] vehicles 插入成功, id =", vehicle_row.get("id"))
    return vehicle_row

def insert_cost_breakdown(vehicle_id: str, vehicle_price_usd: float, rate: float = 7.0) -> Optional[dict]:
    url = f"{SUPABASE_URL}/rest/v1/cost_breakdown"
    headers = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "return=representation"
    }

    breakdown = calc_cost_breakdown(vehicle_price_usd, rate_cny_to_usd=rate)
    payload = {"vehicle_id": vehicle_id, **breakdown}

    resp = requests.post(url, json=payload, headers=headers, timeout=20)
    if not resp.ok:
        print("[ERROR] Supabase cost_breakdown 插入失败:", resp.status_code, resp.text)
        return None

    data = resp.json()
    row = data[0] if isinstance(data, list) and data else data
    print("[INFO] cost_breakdown 插入成功, id =", row.get("id"))
    return row


# ========= 核心逻辑：抓取单个详情页 =========

def crawl_guazi_detail(driver, url: str) -> CarData:
    print(f"[INFO] 打开页面: {url}")
    driver.get(url)

    # 等待页面主内容加载完成，简单等 <h1> 出来
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "h1"))
        )
    except Exception:
        print("[WARN] 15秒内未找到 <h1>，可能页面结构不一致")

    # 获取标题
    try:
        h1 = driver.find_element(By.TAG_NAME, "h1")
        title_text = h1.text.strip()
    except Exception:
        title_text = driver.title or ""
        title_text = title_text.strip()

    brand, model = parse_title_brand_model(title_text)

    brand_en = cn_brand_to_english(brand)
    model_norm = normalize_model_to_en_or_pinyin(model)

    # 整页文本
    body_el = driver.find_element(By.TAG_NAME, "body")
    full_text = body_el.text

    price_cny = parse_price_cny(full_text)
    price_usd = cny_to_usd(price_cny, rate=7.0)

    mileage_km = parse_mileage_km(full_text)
    year = parse_year_from_text(full_text, model)

    # ✅ 先解析 city
    city = parse_city(driver, full_text)

    # ✅ 再转拼音
    city_py = to_pinyin(city)

    fuel_type = guess_fuel_type(full_text)
    gearbox = guess_gearbox(full_text)
    color = guess_color(full_text)
    displacement = guess_displacement(full_text)
    source_country = guess_source_country(full_text)


    # 是否有检测报告
    has_report = ("检测报告" in full_text) or ("查看完整报告" in full_text)

    main_img, other_imgs = parse_images(driver)
    desc_ru, desc_kz = build_descriptions_ru_kz(
        brand_en,
        model_norm,
        year,
        mileage_km,
        city_py
    )


    car = CarData(
        品牌=brand_en,
        型号=model_norm,
        年份=year,
        价格_CNY=price_cny,
        价格_USD=price_usd,
        里程_KM=mileage_km,
        燃油类型=fuel_type,
        变速箱=gearbox,
        颜色=color,
        排量=displacement,
        来源国家=source_country,
        来源地区=city_py,
        状态="可售",
        预计运输天数=30,
        主图=main_img,
        附图=other_imgs,
        描述_俄语=desc_ru,
        描述_哈萨克语=desc_kz,
        源地址=url,
        检测报告=has_report,
    )

    return car


# ========= 主流程：循环输入 URL =========

def main():
    driver = create_driver(headless=True)

    try:
        while True:
            url = input("\n请输入瓜子详情页链接（直接回车退出）：").strip()
            if not url:
                print("退出。")
                break

            try:
                car = crawl_guazi_detail(driver, url)
                # 打印为 JSON，方便你查看
                print("\n========== 抓取结果 ==========")
                print(json.dumps(asdict(car), ensure_ascii=False, indent=2))
                print("========== 结束 ==========\n")

                # 写入 Supabase
                vehicle_row = insert_vehicle_to_supabase(car)
                if vehicle_row and vehicle_row.get("id"):
                    vehicle_id = vehicle_row["id"]
                    vehicle_price_usd = float(vehicle_row.get("price_usd") or 0)
                    insert_cost_breakdown(vehicle_id, vehicle_price_usd, rate=7.0)

            except Exception as e:
                print(f"[ERROR] 抓取失败: {e}")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
