from utils import ceil_to_10
import requests
from typing import Dict, Optional
from config import KZT_TO_USD_RATE  

SUPABASE_API_URL = (
    "https://udaszyrwxbmjsvsteswr.supabase.co/functions/v1/calculate-cost"
)

SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYXN6eXJ3eGJtanN2c3Rlc3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDgxNjQsImV4cCI6MjA4MTYyNDE2NH0.uWKpvFQaXku0BgNXDcWUL9nnmwn8FJFpVhBLKgGBUz0"  # TODO: 生产环境放 env

def calc_cost_breakdown_via_api(
    vehicle_price_rmb: int,
    engine_displacement: int,
    include_inspection: bool = False,
    kzt_to_usd_rate: Optional[float] = None, 
) -> Dict:
    """
    调用 Supabase Edge Function 计算成本，并映射为 cost_breakdown 表结构（单位：USD）
    返回字段与 public.cost_breakdown 完全一致，可直接 insert。

    注意：API 返回单位为 KZT，本函数会换算成 USD，并使用 ceil_to_10 做报价向上取整。
    """

    # 1️⃣ 调用 API
    payload = {
        "vehiclePrice": vehicle_price_rmb,
        "engineDisplacement": engine_displacement,
        "includeInspection": include_inspection,
    }

    headers = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_API_KEY,
    }

    resp = requests.post(
        SUPABASE_API_URL,
        json=payload,
        headers=headers,
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()

    # ✅ 如果调用方没传，就用 config 里的
    if kzt_to_usd_rate is None:
        kzt_to_usd_rate = float(KZT_TO_USD_RATE)

    # 2️⃣ 取各模块（KZT）
    vehicle_kzt = (data.get("vehiclePrice") or {}).get("kzt", 0) or 0

    shipping = data.get("shipping", {}) or {}
    taxes = data.get("taxes", {}) or {}
    compliance = data.get("compliance", {}) or {}
    clearance = data.get("clearance", {}) or {}
    commission = data.get("commission", {}) or {}

    def usd_from_kzt(kzt: float) -> float:
        """KZT → USD，并向上取整（10 美元单位）"""
        return ceil_to_10((kzt or 0) / kzt_to_usd_rate)

    # =========================
    # 🚚 运输相关（shipping）
    # =========================
    transfer_fee_kzt = shipping.get("transferFeeKzt", 0) or 0                  # 过户费(KZT)
    domestic_transport_kzt = shipping.get("domesticKzt", 0) or 0               # 国内运输费用(KZT)
    permit_fee_kzt = shipping.get("permitKzt", 0) or 0                        # 许可证费用(KZT)
    international_shipping_kzt = shipping.get("crossBorderKzt", 0) or 0        # 跨境运输(KZT)
    declaration_agent_fee_kzt = shipping.get("customsDeclarationFeeKzt", 0) or 0  # 报关代理费(KZT)

    # 说明：shipping.inspectionFeeKzt 是“自检费用”，你表里没有单独字段。
    # 你目前“other_fees=佣金”，所以这里不强行塞进去，避免语义混乱。
    # 如果你希望算进 other_fees 或 inspection_and_plate_fee，我也能给你改。
    # self_inspection_kzt = shipping.get("inspectionFeeKzt", 0) or 0

    # =========================
    # 💰 税费（taxes）
    # =========================
    tariff_kzt = taxes.get("tariffAmount", 0) or 0                            # 关税(KZT)
    vat_kzt = taxes.get("vatAmount", 0) or 0                                  # 增值税(KZT)
    disposal_tax_kzt = taxes.get("recyclingTax", 0) or 0                      # 报废税/回收费(KZT)

    # =========================
    # 📄 合规（compliance）
    # =========================
    epts_fee_kzt = compliance.get("eptsMax", 0) or 0                           # 电子护照(取最大值)(KZT)
    sbkts_fee_kzt = compliance.get("sbktsMax", 0) or 0                         # 合格证/认证(取最大值)(KZT)

    # =========================
    # 🏛 清关/登记（clearance）
    # =========================
    customs_agent_fee_kzt = clearance.get("brokerFee", 0) or 0                 # 清关代理费(KZT)
    registration_fee_kzt = clearance.get("firstRegistrationFee", 0) or 0       # 首次注册费(KZT)
    inspection_and_plate_fee_kzt = clearance.get("inspectionFee", 0) or 0      # 车管所审验+上牌(KZT)
    towing_fee_kzt = clearance.get("towingFee", 0) or 0                        # 拖车费(KZT)

    # =========================
    # 🤝 佣金/其他（commission）
    # =========================
    other_fees_kzt = commission.get("totalKzt", 0) or 0                        # 佣金(KZT)

    # 3️⃣ 汇总（KZT）——用 KZT 汇总后再换 USD，避免逐项 ceil 导致总计偏离太多
    total_cost_kzt = (
        transfer_fee_kzt
        + domestic_transport_kzt
        + permit_fee_kzt
        + international_shipping_kzt
        + declaration_agent_fee_kzt
        + tariff_kzt
        + vat_kzt
        + disposal_tax_kzt
        + epts_fee_kzt
        + sbkts_fee_kzt
        + customs_agent_fee_kzt
        + registration_fee_kzt
        + inspection_and_plate_fee_kzt
        + towing_fee_kzt
        + other_fees_kzt
    )

    # 4️⃣ 换算 USD（对齐你旧的“向上取整到10美元”策略）
    total_cost_usd = ceil_to_10(total_cost_kzt / kzt_to_usd_rate)  # 总成本（不含车价）
    estimated_landing_price = ceil_to_10(
        (vehicle_kzt + total_cost_kzt) / kzt_to_usd_rate
    )  # 落地价（车价+总成本）

    # 5️⃣ 返回结构：与 public.cost_breakdown 完全一致（单位 USD）
    return {
        "transfer_fee": usd_from_kzt(transfer_fee_kzt),                         # 过户费
        "domestic_transport": usd_from_kzt(domestic_transport_kzt),             # 国内运输费用
        "permit_fee": usd_from_kzt(permit_fee_kzt),                             # 许可证
        "international_shipping": usd_from_kzt(international_shipping_kzt),     # 跨境运输
        "declaration_agent_fee": usd_from_kzt(declaration_agent_fee_kzt),       # 报关代理费

        "tariff": usd_from_kzt(tariff_kzt),                                     # 关税
        "vat": usd_from_kzt(vat_kzt),                                           # 增值税
        "disposal_tax": usd_from_kzt(disposal_tax_kzt),                         # 报废税

        "epts_fee": usd_from_kzt(epts_fee_kzt),                                 # 电子护照
        "sbkts_fee": usd_from_kzt(sbkts_fee_kzt),                               # 合格证/认证

        "customs_agent_fee": usd_from_kzt(customs_agent_fee_kzt),               # 清关代理费
        "registration_fee": usd_from_kzt(registration_fee_kzt),                 # 首次注册费
        "inspection_and_plate_fee": usd_from_kzt(inspection_and_plate_fee_kzt), # 车管所审验+上牌
        "towing_fee": usd_from_kzt(towing_fee_kzt),                             # 拖车费

        "other_fees": usd_from_kzt(other_fees_kzt),                             # 佣金（你这里用作 other_fees）

        "total_cost_usd": total_cost_usd,                                       # 总成本（USD）
        "estimated_landing_price": estimated_landing_price,                     # 落地价（USD）
    }


def calc_cost_breakdown(vehicle_price_usd: int, rate_cny_to_usd: float = 7.0) -> dict:
    customs_value = int(vehicle_price_usd)

    domestic_transport = ceil_to_10(4200 / rate_cny_to_usd)
    customs_clearance = ceil_to_10(2200 / rate_cny_to_usd)
    international_shipping = 850  # 本来就是整数
    customs_declaration = ceil_to_10(1000 / rate_cny_to_usd)
    other_fees = ceil_to_10(3000 / rate_cny_to_usd)
    service_fee = 200

    duty = ceil_to_10(customs_value * 0.15)
    vat = ceil_to_10((customs_value + duty) * 0.16)
    tax_fee = duty + vat

    local_delivery = 0
    registration_fee = 0

    total_cost_usd = (
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

    estimated_landing_price = ceil_to_10(customs_value + total_cost_usd)

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

