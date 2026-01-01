from dataclasses import dataclass
from typing import List, Optional

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
    来源国家: str
    来源地区: str
    状态: str
    预计运输天数: int
    主图: Optional[str]
    附图: List[str]
    描述_俄语: str
    描述_哈萨克语: str
    源地址: str
    检测报告: bool
