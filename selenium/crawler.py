import re
import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from typing import Optional, List, Dict, Any, Tuple
from models import CarData
from utils import cny_to_usd
from normalize import cn_brand_to_english, normalize_model_to_en_or_pinyin, to_pinyin
import math


VALID_EXT = (".jpg", ".jpeg", ".png", ".webp")

def parse_title_brand_model(title: str):
    title = title.replace("二手车", "").strip()
    title = title.split("价格")[0].strip()
    parts = title.split()
    if len(parts) >= 2:
        return parts[0], " ".join(parts[1:])
    return title, title

def parse_year_from_text(text: str, model: str) -> Optional[int]:
    m1 = re.search(r"(\d{4})款", model)
    if m1: return int(m1.group(1))
    m2 = re.search(r"(\d{4})年上牌", text)
    if m2: return int(m2.group(1))
    m3 = re.search(r"(20\d{2})", text)
    return int(m3.group(1)) if m3 else None

def parse_price_cny(text: str) -> Optional[float]:
    m = re.search(r"(\d+(\.\d+)?)\s*万", text)
    return float(m.group(1)) * 10000 if m else None
    
def parse_price_cny_from_html(html: str) -> Optional[float]:
    m = re.search(r'real-price__value">(\d+(?:\.\d+)?)<', html)
    return float(m.group(1)) * 10000 if m else None


def parse_mileage_km(text: str) -> Optional[int]:
    m = re.search(r"(\d+(\.\d+)?)\s*万公里", text)
    if m: return int(float(m.group(1)) * 10000)
    m2 = re.search(r"(\d+)\s*公里", text)
    return int(m2.group(1)) if m2 else None

def parse_city(driver, full_text: str) -> str:
    try:
        el = driver.find_element(By.CSS_SELECTOR, "span.city")
        if el.text.strip(): return el.text.strip()
    except: pass
    try:
        el = driver.find_element(By.CSS_SELECTOR, ".vehicle-summary__title span")
        if el.text.strip(): return el.text.strip()
    except: pass

    m = re.search(r"/([\u4e00-\u9fa5]+?)车源", full_text)
    if m: return m.group(1)
    m2 = re.search(r"([\u4e00-\u9fa5]+)二手车", full_text)
    if m2: return m2.group(1)
    return ""

def guess_source_country(text: str) -> str:
    if "韩国" in text: return "korea"
    if "格鲁吉亚" in text or "乔治亚" in text: return "georgia"
    return "china"

def guess_fuel_type(text: str) -> Optional[str]:
    if "汽油" in text: return "汽油"
    if "柴油" in text: return "柴油"
    if "纯电" in text or "纯电动" in text or "电动车" in text: return "纯电动"
    if "混合动力" in text or "插电混动" in text or "油电混合" in text: return "混合动力"
    if "增程" in text: return "增程式混合动力"
    return None

def guess_gearbox(text: str) -> Optional[str]:
    if "自动" in text: return "自动"
    if "手动" in text: return "手动"
    if "双离合" in text: return "双离合"
    return None

def guess_color(text: str) -> Optional[str]:
    colors = ["黑色","白色","灰色","银色","红色","蓝色","绿色","棕色","黄色","金色"]
    for c in colors:
        if c in text: return c
    return None

def guess_displacement(text: str) -> Optional[str]:
    m = re.search(r"(\d\.\d)T", text)
    if m: return m.group(0)
    m2 = re.search(r"(\d\.\d)L", text)
    return m2.group(0) if m2 else None

def parse_images(driver) -> (Optional[str], List[str]):
    urls: List[str] = []
    try:
        container = driver.find_element(By.CSS_SELECTOR, "div.car-image-main-swiper")
        img_elements = container.find_elements(By.CSS_SELECTOR, "img")
    except Exception:
        img_elements = driver.find_elements(By.TAG_NAME, "img")

    for img in img_elements:
        src = img.get_attribute("src") or img.get_attribute("data-src") or ""
        if not src or "guazi" not in src:
            continue
        if src.startswith("//"):
            src = "https:" + src
        if "?" in src:
            src = src.split("?", 1)[0]
        if not src.lower().endswith(VALID_EXT):
            continue
        if src not in urls:
            urls.append(src)

    if not urls:
        return None, []
    return urls[0], urls[1:]

def normalize_engine_displacement_cm3(raw: str) -> Optional[int]:
    """
    '2.0L' / '1.5T' / '2.0' / '1500cc' -> 2000 / 1500
    """
    if not raw:
        return None
    s = raw.strip().lower()

    # 1500cc / 1998 cc
    if "cc" in s:
        m = re.search(r"(\d{3,4})", s)
        return int(m.group(1)) if m else None

    # 2.0L / 1.5T / 2.0
    m = re.search(r"(\d+(\.\d+)?)", s)
    if not m:
        return None
    liters = float(m.group(1))
    return int(round(liters * 1000))

def prompt_engine_displacement_raw() -> str:
    """
    交互式输入排量（raw），返回形如 '2.0L' / '1.5T' / '1500cc'。
    """
    print("\n⚠️ 未从页面解析到排量，需要手动输入：")
    print("✅ 输入格式支持：")
    print("  - 2.0L   （自然吸气，单位 L）")
    print("  - 1.5T   （涡轮增压，单位 T）")
    print("  - 1500cc （单位 cc）")
    print("  - 也可直接输入数字：2.0 / 1.5 / 1998（会自动按 L 或 cc 推断）")
    print("❌ 不要输入中文单位，比如“2.0升”\n")

    while True:
        s = input("请输入排量 (例如 2.0L / 1.5T / 1500cc): ").strip()
        if not s:
            print("不能为空，请重新输入。")
            continue

        # 允许纯数字：2.0 / 1.5 / 1998
        if re.fullmatch(r"\d+(\.\d+)?", s):
            num = float(s)
            # 小于 10 认为是 L
            if num < 10:
                return f"{num}L"
            # 3~4位整数认为是 cc
            if 100 <= num <= 9999:
                return f"{int(num)}cc"
            print("数字不太合理：小数请用 2.0/1.5 这种（表示 L），整数请用 1500/1998 这种（表示 cc）。")
            continue

        # 标准格式：2.0L / 1.5T / 1500cc（忽略大小写）
        if re.fullmatch(r"\d+(\.\d+)?\s*[lLtT]", s):
            s = re.sub(r"\s+", "", s)
            # 统一大写后缀
            return s[:-1] + s[-1].upper()

        if re.fullmatch(r"\d{3,4}\s*cc", s, re.IGNORECASE):
            s = re.sub(r"\s+", "", s)
            return s.lower()

        print("格式不正确，请按示例输入：2.0L / 1.5T / 1500cc")


    
def parse_inspection_summary(full_text: str) -> Optional[Dict[str, Any]]:
    """
    兼容两种来源：
    1) Selenium body.text（分隔符可能消失）
    2) HTML（带 <strong>）
    目标解析：
      成色95
      2.35万公里｜2年11个月   或 3.55万公里/6年2个月
      车况B
      理赔1次｜过户0次         或 基础车况达标/理赔2次/过户2次
    """

    # 统一清洗：把 HTML 标签去掉（如果传进来是 page_source）
    text = re.sub(r"<[^>]+>", " ", full_text)
    # 统一分隔符：把 ｜ 丨 / | 都当成空格
    text = text.replace("｜", " ").replace("丨", " ").replace("/", " ").replace("|", " ")
    # 压缩空白
    text = re.sub(r"\s+", " ", text).strip()

    # 1) 成色
    m_percent = re.search(r"成色\s*(\d{1,3})", text)
    percent = int(m_percent.group(1)) if m_percent else None

    # 2) 车况等级（S/A/B/C/D）
    m_grade = re.search(r"车况\s*([SABCD])", text)
    grade = m_grade.group(1) if m_grade else None

    # 3) 里程（支持 万公里 / 公里）
    #   2.35万公里  /  63800公里
    mileage_km = None
    m_mileage = re.search(r"(\d+(?:\.\d+)?)\s*(万)?\s*公里", text)
    if m_mileage:
        val = float(m_mileage.group(1))
        is_wan = (m_mileage.group(2) == "万")
        mileage_km = int(val * 10000) if is_wan else int(val)

    # 4) 车龄（支持：2年11个月 / 6年2个月 / 2年 / 1年内）
    age_total_months = None
    m_age_ym = re.search(r"(\d+)\s*年\s*(\d+)\s*个?月", text)
    if m_age_ym:
        age_total_months = int(m_age_ym.group(1)) * 12 + int(m_age_ym.group(2))
    else:
        m_age_y = re.search(r"(\d+)\s*年(?!内)", text)
        if m_age_y:
            age_total_months = int(m_age_y.group(1)) * 12
        else:
            m_age_in = re.search(r"(\d+)\s*年内", text)
            if m_age_in:
                # “1年内”先按 12 个月粗略
                age_total_months = int(m_age_in.group(1)) * 12

    # 5) 理赔/过户（两种格式都要支持）
    #   理赔1次 过户0次
    #   基础车况达标 理赔2次 过户2次
    m_claims = re.search(r"理赔\s*(\d+)\s*次", text)
    m_transfer = re.search(r"过户\s*(\d+)\s*次", text)
    claims_count = int(m_claims.group(1)) if m_claims else None
    transfer_count = int(m_transfer.group(1)) if m_transfer else None

    # 事故相关（可选增强）
    non_flood = "非泡水" in text
    non_fire = "非火烧" in text
    non_major_acc = "非重大事故" in text

    # --- 映射到 1~10 的分数 ---
    grade_to_score = {"S": 10, "A": 9, "B": 8, "C": 7, "D": 6}

    def clamp_1_10(x: int) -> int:
        return max(1, min(10, x))

    overall_condition = None
    if percent is not None:
        overall_condition = clamp_1_10(int((percent + 9) // 10))
    elif grade is not None:
        overall_condition = grade_to_score.get(grade, 7)

    performance_score = overall_condition

    # 是否有事故：这里只做“弱推断”
    has_accidents = False
    if claims_count is not None and claims_count > 0:
        has_accidents = True
    if ("重大事故" in text) and (not non_major_acc):
        has_accidents = True

    # paint_condition（必填）
    paint_condition_parts = []
    if percent is not None:
        paint_condition_parts.append(f"condition_{percent}%")
    if grade is not None:
        paint_condition_parts.append(f"grade_{grade}")
    if non_flood:
        paint_condition_parts.append("non_flood")
    if non_fire:
        paint_condition_parts.append("non_fire")
    if non_major_acc:
        paint_condition_parts.append("non_major_accident")
    paint_condition = " | ".join(paint_condition_parts) if paint_condition_parts else "unknown"

    accident_details = ""
    if has_accidents:
        accident_details = f"claims={claims_count if claims_count is not None else 'unknown'}, transfers={transfer_count if transfer_count is not None else 'unknown'}"

    # insurance_records（jsonb）
    insurance_records = [{
        "claims_count": claims_count if claims_count is not None else 0,
        "transfer_count": transfer_count if transfer_count is not None else 0,
        "age_months": age_total_months,
        "grade": grade,
        "percent": percent,
        "mileage_km": mileage_km,
    }]

    inspection_date = datetime.date.today().isoformat()
    inspector_name = "Guazi"

    # 如果关键字段都没解析到，返回 None
    if percent is None and grade is None and claims_count is None and transfer_count is None:
        return None

    return {
        "overall_condition": overall_condition,
        "paint_condition": paint_condition,
        "performance_score": performance_score,
        "has_accidents": has_accidents,
        "accident_details": accident_details,
        "insurance_records": insurance_records,
        "inspection_date": inspection_date,
        "inspector_name": inspector_name,
    }


def build_descriptions_ru_kz(brand_en: str, model_norm: str, year: Optional[int], mileage_km: Optional[int], city_py: str):
    y = year or ""
    m = f"{mileage_km:,}" if mileage_km is not None else "—"
    # 注意：现在 city_py 是拼音，不会再出现中文“苏州”
    desc_ru = f"{brand_en} {model_norm}, {y} года выпуска. Пробег {m} км. Город {city_py or '—'}. Подробности по запросу."
    desc_kz = f"{brand_en} {model_norm}, {y} жылғы. Жүріс {m} км. Қала – {city_py or '—'}. Толық ақпарат сұрау бойынша."
    return desc_ru, desc_kz

def generate_inspection_items_from_report(
    report_id: str,
    report_payload: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    inspection_items генерациясы (қазақ тілінде, қайталанбайтын пайдалы мәтіндермен)
    Әр көлік үшін 6 пункт:
    paint / engine / transmission / electrical / interior / exterior
    """

    grade = (report_payload.get("overall_condition") or "A").upper()   # S/A/B/C
    newness = int(report_payload.get("newness_rating") or 85)          # 50-99
    claim_count = int(report_payload.get("claim_count") or 0)
    transfer_count = int(report_payload.get("transfer_count") or 0)

    major_accident = bool(report_payload.get("major_accident"))
    fire_damage = bool(report_payload.get("fire_damage"))
    water_damage = bool(report_payload.get("water_damage"))

    # ---------- status helpers ----------
    base_map = {"S": "good", "A": "good", "B": "fair", "C": "poor"}
    def downgrade(status: str) -> str:
        return {"good": "fair", "fair": "poor", "poor": "needs_repair", "needs_repair": "needs_repair"}[status]

    # ---------- paint/exterior status ----------
    paint_status = base_map.get(grade, "good")
    exterior_status = base_map.get(grade, "good")

    # 理赔记录：外观/漆面下调一级 + 明示给用户
    has_claim_note = ""
    if claim_count > 0:
        paint_status = downgrade(paint_status)
        exterior_status = downgrade(exterior_status)
        has_claim_note = " Сақтандыру талабы бар, сондықтан сыртқы көрініс пен бояу бағасы бір деңгейге төмендетілді."

    # 重大损伤：更保守
    damage_flags = []
    if major_accident:
        damage_flags.append("апат белгісі")
    if fire_damage:
        damage_flags.append("өрт белгісі")
    if water_damage:
        damage_flags.append("су басу белгісі")
    damage_note = f" Назар аударыңыз: {', '.join(damage_flags)} анықталған." if damage_flags else ""

    if damage_flags:
        paint_status = "poor" if paint_status in ("good", "fair") else paint_status
        exterior_status = "poor" if exterior_status in ("good", "fair") else exterior_status

    # ---------- notes builders (Kazakh, no repetition) ----------
    # 1) Engine (always good unless heavy damage)
    engine_status = "good" if not damage_flags else "fair"
    engine_note = (
        "Қозғалтқыш тексерілді: іске қосу жеңіл, бос жүріс тұрақты, артық дыбыс/діріл байқалмады."
        + (f" Жағдай пайызы: {newness}." if newness else "")
        + (damage_note if damage_note else "")
    )

    # 2) Transmission
    transmission_status = "good" if not damage_flags else "fair"
    transmission_note = (
        "Беріліс қорабы: ауысу бірқалыпты, соққы/кідіріс байқалмады, жүріс кезінде жұмыс істеуі қалыпты."
        + (f" Қайта тіркеу саны: {transfer_count}." if transfer_count is not None else "")
        + (damage_note if damage_note else "")
    )

    # 3) Electrical
    electrical_status = "good" if not damage_flags else "fair"
    electrical_note = (
        "Электр жүйесі: негізгі функциялар тексерілді (жарықтар, әйнек көтергіш, мультимедиа/климат), ақау анықталған жоқ."
        + (damage_note if damage_note else "")
    )

    # 4) Interior (mostly good; slight differences by grade)
    interior_status = "good" if not damage_flags else "fair"
    if grade == "S":
        interior_note = "Ішкі салон өте ұқыпты: орындықтар мен панельдерде айқын тозу жоқ, жалпы әсері өте жақсы."
    elif grade == "A":
        interior_note = "Ішкі салон жақсы: ұсақ пайдалану іздері болуы мүмкін, бірақ жалпы күйі таза және ұқыпты."
    elif grade == "B":
        interior_note = "Ішкі салон қанағаттанарлық: кейбір тозу/ұсақ дақтар болуы мүмкін, бірақ пайдалануға толық жарамды."
    else:  # C
        interior_status = "fair" if not damage_flags else "poor"
        interior_note = "Ішкі салон: тозу белгілері көбірек болуы мүмкін, сатып алмас бұрын салонды мұқият қарап шығуды ұсынамыз."
    interior_note += f" Жағдай пайызы: {newness}."

    # 5) Exterior (grade-driven + claim note)
    if grade == "S":
        exterior_note = "Сыртқы көрініс өте жақсы: кузовта айқын ақаулар байқалмайды, жалпы күйі жоғары деңгейде."
    elif grade == "A":
        exterior_note = "Сыртқы көрініс жақсы: ұсақ сызат/чип болуы мүмкін, бірақ жалпы әсері таза және жинақы."
    elif grade == "B":
        exterior_note = "Сыртқы көрініс қанағаттанарлық: ұсақ косметикалық кемшіліктер болуы ықтимал (сызат/майда бояу ізі)."
    else:  # C
        exterior_note = "Сыртқы көрініс: кемшіліктер көбірек болуы мүмкін, сатып алмас бұрын толық қарауды ұсынамыз."

    exterior_note += (
        f" Жалпы жағдайы: {grade}. Сақтандыру талаптары: {claim_count}."
        + has_claim_note
        + (damage_note if damage_note else "")
    )

    # 6) Paint (grade-driven + claim note)
    if grade == "S":
        paint_note = "Бояу қабаты өте жақсы: түсі біркелкі, айқын қайта бояу/қалың ақау белгілері байқалмады."
    elif grade == "A":
        paint_note = "Бояу қабаты жақсы: ұсақ косметикалық іздер болуы мүмкін, бірақ жалпы көрінісі жақсы сақталған."
    elif grade == "B":
        paint_note = "Бояу қабаты орташа: кейбір жерлерде ұсақ сызат/чип болуы мүмкін, косметикалық түзету қажет болуы ықтимал."
    else:  # C
        paint_note = "Бояу қабаты: кемшіліктер көбірек болуы мүмкін, бояуды/лак қабатын мұқият тексеруді ұсынамыз."

    paint_note += (
        f" Жағдай пайызы: {newness}. Жалпы жағдайы: {grade}."
        + has_claim_note
        + (damage_note if damage_note else "")
    )

    return [
        {
            "report_id": report_id,
            "category": "engine",
            "item_name": "engine",
            "status": engine_status,
            "notes": engine_note,
        },
        {
            "report_id": report_id,
            "category": "transmission",
            "item_name": "transmission",
            "status": transmission_status,
            "notes": transmission_note,
        },
        {
            "report_id": report_id,
            "category": "electrical",
            "item_name": "electrical",
            "status": electrical_status,
            "notes": electrical_note,
        },
        {
            "report_id": report_id,
            "category": "interior",
            "item_name": "interior",
            "status": interior_status,
            "notes": interior_note,
        },
        {
            "report_id": report_id,
            "category": "exterior",
            "item_name": "exterior",
            "status": exterior_status,
            "notes": exterior_note,
        },
        {
            "report_id": report_id,
            "category": "paint",
            "item_name": "paint",
            "status": paint_status,
            "notes": paint_note,
        },
    ]

def normalize_insp_to_report_payload(insp: Dict[str, Any], vehicle_id: str) -> Dict[str, Any]:
    """
    将 parse_inspection_summary() 的结果 insp 归一化为 inspection_reports 表字段。
    newness_rating：按“成色百分比”理解（95新 => 95）
    """

    def clamp_int(v: int, lo: int, hi: int) -> int:
        return max(lo, min(hi, int(v)))

    def pick_rec0(records) -> Dict[str, Any]:
        if isinstance(records, list) and records:
            return records[0] or {}
        return {}

    insurance_records = insp.get("insurance_records") or []
    rec0 = pick_rec0(insurance_records)

    # ---------- overall_condition（S/A/B/C）----------
    grade = (rec0.get("grade") or "").strip().upper()

    paint_condition = (insp.get("paint_condition") or "").strip()
    if not grade and paint_condition:
        m = re.search(r"\bgrade_([SABC])\b", paint_condition, re.IGNORECASE)
        if m:
            grade = m.group(1).upper()

    if grade not in ("S", "A", "B", "C"):
        grade = "A"  # 默认给 A，满足约束

    # ---------- newness_rating（50-99）----------
    # percent 可能是：95（95新），也可能是：9（9成新=90）
    percent = rec0.get("percent")

    # 有些情况下 percent 可能是字符串，顺手兼容一下
    if isinstance(percent, str):
        try:
            percent = float(percent.strip())
        except Exception:
            percent = None

    # fallback：从 paint_condition 抓 condition_95%
    if not isinstance(percent, (int, float)) and paint_condition:
        m = re.search(r"\bcondition_(\d{1,3})%\b", paint_condition, re.IGNORECASE)
        if m:
            try:
                percent = float(m.group(1))
            except Exception:
                percent = None

    newness_rating = 85  # 默认

    if isinstance(percent, (int, float)):
        p = float(percent)

        # ✅ 关键修复：<=10 当作“成数”，9 => 90，9.5 => 95
        if 0 < p <= 10:
            p = p * 10

        # 100 的话压到 99（满足表约束）
        newness_rating = clamp_int(round(p), 50, 99)

    # ---------- 理赔/过户 ----------
    claim_count = rec0.get("claims_count")
    claim_count = int(claim_count) if isinstance(claim_count, int) and claim_count >= 0 else 0

    transfer_count = rec0.get("transfer_count")
    transfer_count = int(transfer_count) if isinstance(transfer_count, int) and transfer_count >= 0 else 0

    # has_accidents：按你表注释定义（理赔次数>0）
    has_accidents = claim_count > 0

    # ---------- 三类重大损伤：事故/火烧/水泡 ----------
    major_accident = False
    fire_damage = False
    water_damage = False

    pc = paint_condition.lower()
    if pc:
        if "non_major_accident" in pc:
            major_accident = False
        elif "major_accident" in pc:
            major_accident = True

        if "non_fire" in pc:
            fire_damage = False
        elif "fire" in pc:
            fire_damage = True

        if "non_flood" in pc or "non_water" in pc:
            water_damage = False
        elif "flood" in pc or "water" in pc:
            water_damage = True

    # ---------- inspection_date / inspector_name ----------
    inspection_date = insp.get("inspection_date") or date.today().isoformat()
    inspector_name = (insp.get("inspector_name") or "Guazi").strip() or "Guazi"
    accident_details = insp.get("accident_details") or ""

    return {
        "vehicle_id": vehicle_id,

        "has_accidents": has_accidents,                 # 是否有磕碰（理赔>0）
        "accident_details": accident_details,           # 事故描述
        "insurance_records": insurance_records,         # 原始记录 JSONB

        "inspection_date": inspection_date,             # 检测日期（date）
        "inspector_name": inspector_name,               # 检测方

        "overall_condition": grade,                     # 成色等级:S/A/B/C
        "newness_rating": newness_rating,               # 成色（95新=>95）

        "claim_count": claim_count,                     # 理赔次数
        "transfer_count": transfer_count,               # 过户次数

        "major_accident": major_accident,               # 是否事故车
        "fire_damage": fire_damage,                     # 是否火烧
        "water_damage": water_damage,                   # 是否水泡
    }

def crawl_guazi_detail(driver, url: str, rate: float) -> CarData:
    driver.get(url)
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

    try:
        title_text = driver.find_element(By.CSS_SELECTOR, "h1.car-base-info__title").text.strip()
    except Exception:
        title_text = driver.find_element(By.TAG_NAME, "h1").text.strip() if driver.find_elements(By.TAG_NAME, "h1") else (driver.title or "").strip()


    brand_cn, model_cn = parse_title_brand_model(title_text)
    body_text = driver.find_element(By.TAG_NAME, "body").text

    html = driver.page_source
    city = parse_city(driver, body_text)
    city_py = to_pinyin(city)

    brand_en = cn_brand_to_english(brand_cn)
    model_norm = normalize_model_to_en_or_pinyin(model_cn)
    
    price_cny = parse_price_cny_from_html(html) or parse_price_cny(body_text)
    #price_cny = parse_price_cny(body_text)
    price_usd = int(math.ceil(cny_to_usd(price_cny, rate=rate) / 100) * 100)

    year = parse_year_from_text(body_text, model_cn)
    mileage_km = parse_mileage_km(body_text)
    
    insp = parse_inspection_summary(html) or parse_inspection_summary(body_text)
    if insp:
        print("【检测摘要】", insp)
    else:
        print("【检测摘要】未解析到")

    fuel = guess_fuel_type(body_text)
    gearbox = guess_gearbox(body_text)
    color = guess_color(body_text)
    disp_raw = guess_displacement(body_text)  # "2.0L" / "1.5T" / None
    if not disp_raw:
        disp_raw = prompt_engine_displacement_raw()

    disp_cm3 = normalize_engine_displacement_cm3(disp_raw) or 0

    source_country = guess_source_country(body_text)
    has_report = ("检测报告" in body_text) or ("查看完整报告" in body_text)

    main_img, others = parse_images(driver)
    desc_ru, desc_kz = build_descriptions_ru_kz(brand_en, model_norm, year, mileage_km, city_py)

    return CarData(
        品牌=brand_en,
        型号=model_norm,
        年份=year,
        价格_CNY=price_cny,
        价格_USD=price_usd,
        里程_KM=mileage_km,
        燃油类型=fuel,
        变速箱=gearbox,
        颜色=color,
        排量=disp_raw,
        排量_CM3=disp_cm3,
        来源国家=source_country,
        来源地区=city_py,
        状态="可售",
        预计运输天数=30,
        主图=main_img,
        附图=others,
        描述_俄语=desc_ru,
        描述_哈萨克语=desc_kz,
        源地址=url,
        检测报告=has_report,
        检测摘要=insp,
    )
