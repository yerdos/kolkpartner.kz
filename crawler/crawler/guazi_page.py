from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from normalizers.models import CarData
from parsers.car_basic import *
from parsers.images import parse_images
from parsers.inspection import parse_inspection_summary
from normalizers import *

def crawl_guazi_detail(driver, url: str):
    driver.get(url)

    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.TAG_NAME, "h1"))
    )

    body_text = driver.find_element(By.TAG_NAME, "body").text

    # 解析基础信息
    brand_cn, model_cn = parse_title_brand_model(...)
    city_cn = parse_city(driver, body_text)

    # 规范化
    brand = cn_brand_to_english(brand_cn)
    model = normalize_model_to_en_or_pinyin(model_cn)
    city_py = to_pinyin(city_cn)

    # 车况
    inspection = parse_inspection_summary(body_text)

    car = CarData(...)
    return car, inspection
