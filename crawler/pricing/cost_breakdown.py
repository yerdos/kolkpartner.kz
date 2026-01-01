from pricing.rounding import ceil_to_10

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