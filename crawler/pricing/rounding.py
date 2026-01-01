import math

def ceil_to_10(x) -> int:
    if not x or x <= 0:
        return 0
    return int(math.ceil(float(x) / 10) * 10)
