
def parse_inspection_summary(full_text: str) -> Optional[Dict[str, Any]]:
    """
    从页面文本里解析类似：
    成色95
    3.25万公里｜1年9个月
    车况S
    理赔0次｜过户0次
    以及：非泡水/非火烧/非重大事故（可选）

    返回一个 dict，用于写入 inspection_reports
    """
    # 成色95
    m_percent = re.search(r"成色\s*(\d{1,3})", full_text)
    percent = int(m_percent.group(1)) if m_percent else None

    # 3.25万公里｜1年9个月（公里数你表里没放，这里只用年龄信息做备注）
    m_age = re.search(r"([\d\.]+)\s*万公里[｜|]\s*(\d+)\s*年\s*(\d+)\s*个?月", full_text)
    age_years = int(m_age.group(2)) if m_age else None
    age_months = int(m_age.group(3)) if m_age else None
    age_total_months = (age_years * 12 + age_months) if (age_years is not None and age_months is not None) else None

    # 车况S / 车况A / 车况B...
    m_grade = re.search(r"车况\s*([SABCDE])", full_text)
    grade = m_grade.group(1) if m_grade else None

    # 理赔0次｜过户0次
    m_claims = re.search(r"理赔\s*(\d+)\s*次", full_text)
    m_transfer = re.search(r"过户\s*(\d+)\s*次", full_text)
    claims_count = int(m_claims.group(1)) if m_claims else None
    transfer_count = int(m_transfer.group(1)) if m_transfer else None

    # 事故相关（可选增强）
    # 你之前 full_text 里出现过：非泡水 / 非火烧 / 非重大事故
    non_flood = "非泡水" in full_text
    non_fire = "非火烧" in full_text
    non_major_acc = "非重大事故" in full_text

    # --- 映射到 1~10 的分数 ---
    # overall_condition / performance_score 必须 1-10
    grade_to_score = {"S": 10, "A": 9, "B": 8, "C": 7, "D": 6, "E": 5}

    def clamp_1_10(x: int) -> int:
        return max(1, min(10, x))

    overall_condition = None
    if percent is not None:
        # 95 -> 10, 81 -> 9 ...（按 10 分制）
        overall_condition = clamp_1_10(int((percent + 9) // 10))  # 向上取整到 10 分
    elif grade is not None:
        overall_condition = grade_to_score.get(grade, 7)

    performance_score = overall_condition

    # 是否有事故：理赔>0 视为有事故；否则如果出现“重大事故”但没有“非重大事故”也算
    has_accidents = False
    if claims_count is not None and claims_count > 0:
        has_accidents = True
    if ("重大事故" in full_text) and (not non_major_acc):
        has_accidents = True

    # paint_condition（必填 text）：用“成色/车况”拼一个稳定文本
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

    # accident_details（有事故才写细节）
    accident_details = ""
    if has_accidents:
        accident_details = f"claims={claims_count or 'unknown'}, transfers={transfer_count or 'unknown'}"

    # insurance_records（jsonb）：用数组存一条摘要，后续你也能扩展为多条理赔记录
    insurance_records = [{
        "claims_count": claims_count if claims_count is not None else 0,
        "transfer_count": transfer_count if transfer_count is not None else 0,
        "age_months": age_total_months,
        "grade": grade,
        "percent": percent,
    }]

    # inspection_date / inspector_name：页面一般能拿到更精确字段；拿不到就用“今天 + Guazi”
    inspection_date = datetime.date.today().isoformat()
    inspector_name = "Guazi"

    # 如果什么都没解析到，就返回 None（避免插入垃圾）
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