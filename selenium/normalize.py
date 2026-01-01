import re

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

FUEL_CN_TO_EN_RU = {
    "汽油": ("gasoline", "бензин"),
    "柴油": ("diesel", "дизель"),
    "纯电动": ("electric", "электро"),
    "混合动力": ("hybrid", "гибрид"),
    "增程式混合动力": ("range_extender", "гибрид (удлинитель хода)"),
}

TRANS_CN_TO_EN = {
    "自动": "automatic",
    "手动": "manual",
    "双离合": "dct",
}

def cn_brand_to_english(brand_cn: str) -> str:
    if not brand_cn:
        return ""
    return BRAND_CN_TO_EN.get(brand_cn.strip(), brand_cn.strip())

def normalize_fuel_type(fuel_cn: str) -> str:
    if not fuel_cn:
        return "unknown|неизвестно"
    en_ru = FUEL_CN_TO_EN_RU.get(fuel_cn)
    if not en_ru:
        return f"unknown|{fuel_cn}"
    en, ru = en_ru
    return f"{en}|{ru}"

def transmission_to_english(trans_cn: str) -> str:
    if not trans_cn:
        return "unknown"
    return TRANS_CN_TO_EN.get(trans_cn, "unknown")

def status_to_english(status_cn: str) -> str:
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
    if not text:
        return ""
    try:
        from pypinyin import pinyin, Style
        parts = pinyin(text, style=Style.NORMAL)
        return " ".join([x[0] for x in parts]).strip()
    except Exception:
        return text.strip()

def normalize_model_to_en_or_pinyin(model_cn: str) -> str:
    if not model_cn:
        return ""

    model = re.sub(r"\d{4}款", "", model_cn)
    model = re.sub(r"(冠军版|领先型|尊贵型|旗舰型|豪华型|标准型|高配|低配)", "", model).strip()

    if re.search(r"[\u4e00-\u9fa5]", model):
        model = to_pinyin(model)

    model = re.sub(r"\s+", " ", model).strip()
    return model
