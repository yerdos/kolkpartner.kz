import math
from typing import Optional

def cny_to_usd(cny: Optional[float], rate: float) -> Optional[float]:
    if cny is None:
        return None
    return cny / rate

def ceil_to_10(x: float) -> int:
    if x is None:
        return 0
    return int(math.ceil(float(x) / 10.0) * 10)
