# grading.py - 拍照批改模块
# 利用 paddleOCR 识别手写和声标记，利用规则引擎进行评分

import re
from apps.sposobin.dna import MAJOR_DNA, MINOR_DNA
from apps.sposobin.tonality import KEY_REGISTRY, transpose_dna, spell_midi
from apps.sposobin.engine import get_chord_candidates, calculate_best_voicing, v_to_tuple, tuple_to_v
from apps.sposobin.rules import evaluate_voicing

# 和弦别名映射表（支持用户输入的各种变体）
CHORD_ALIASES = {
    # 大调主和弦
    "T": "T", "t": "T", "T主": "T", "主": "T",
    "T6": "T₆", "T六": "T₆", "T6": "T₆",
    "T64": "T₆₄", "T四六": "T₆₄", "T64": "T₆₄",
    "T不完全": "T不完全", "T不": "T不完全",
    "T双三": "T双三",
    "T7": "T₇", "T七": "T₇",
    
    # 小调主和弦
    "t": "t", "t小": "t", "小t": "t",
    "t6": "t₆", "t六": "t₆",
    "t64": "t₆₄", "t四六": "t₆₄",
    "t不完全": "t不完全", "t不": "t不完全",
    
    # 下属功能组
    "S": "S", "s": "S", "下属": "S", "S四": "S",
    "S6": "S₆", "S六": "S₆",
    "S64": "S₆₄", "S四六": "S₆₄",
    "Sii": "Sᵢᵢ", "二级": "Sᵢᵢ", "Sii6": "Sᵢᵢ₆", "二级六": "Sᵢᵢ₆",
    "Sii7": "Sᵢᵢ₇", "二级七": "Sᵢᵢ₇",
    "Sii56": "Sᵢᵢ₅₆", "二级五六": "Sᵢᵢ₅₆",
    
    # 属功能组
    "D": "D", "属": "D", "属七": "D₇", "D七": "D₇",
    "D7": "D₇", "D7": "D₇", "D₇": "D₇",
    "D56": "D₅₆", "五六": "D₅₆",
    "D34": "D₃₄", "三四": "D₃₄",
    "D2": "D₂", "二": "D₂",
    "D6": "D₆", "六": "D₆",
    "D64": "D₆₄", "四六": "D₆₄",
    "K64": "K₆₄", "K四六": "K₆₄", "终止四六": "K₆₄",
    "DD": "DD", "重属": "DD",
    "DD7": "DD₇", "重属七": "DD₇",
    
    # 附属和弦
    "VI": "VI", "vi": "VI", "六级": "VI",
    "VII": "VII", "vii": "VII", "七级": "VII",
    "bVI": "♭VI", "降六级": "♭VI",
    "bVII": "♭VII", "降七级": "♭VII",
    
    # 小调特有的和弦
    "s": "s", "小s": "s", "小下属": "s",
    "s6": "s₆",
    "sii": "sᵢᵢ", "小二级": "sᵢᵢ",
    "sii6": "sᵢᵢ₆",
    "sii7": "sᵢᵢ₇",
    "sii56": "sᵢᵢ₅₆",
    
    # 变和弦
    "N6": "N₆", "N六": "N₆", "那不勒斯": "N₆",
    "It6": "It⁺⁶", "It六": "It⁺⁶",
    "Ger6": "Ger⁺⁶", "Ger六": "Ger⁺⁶",
    "Fr6": "Fr⁺⁶", "Fr六": "Fr⁺⁶",
    
    # 副属和弦
    "D7/II": "D₇/II", "D7/IV": "D₇/IV", "D7/VI": "D₇/VI",
    "V7/II": "D₇/II", "V7/IV": "D₇/IV", "V7/VI": "D₇/VI",
}

# 大调合法和弦序列（简化形式）
MAJOR_VALID_CHORDS = {
    "T", "T₆", "T₆₄", "T不完全", "T双三", "T₇",
    "S", "S₆", "S₆₄", "Sᵢᵢ", "Sᵢᵢ₆", "Sᵢᵢ₇", "Sᵢᵢ₅₆",
    "D", "D₆", "D₆₄", "D₇", "D₅₆", "D₃₄", "D₂",
    "DD", "DD₆", "DD₇", "DD₅₆",
    "VI", "♭VI", "VII", "♭VII",
    "N₆", "It⁺⁶", "Ger⁺⁶", "Fr⁺⁶",
    "K₆₄",
    "s", "s₆", "sᵢᵢ", "sᵢᵢ₆", "sᵢᵢ₇", "sᵢᵢ₅₆",
    "DTᵢᵢᵢ",
}

# 小调合法和弦序列（简化形式）
MINOR_VALID_CHORDS = {
    "t", "t₆", "t₆₄", "t不完全",
    "s", "s₆", "s₆₄", "sᵢᵢ", "sᵢᵢ₆", "sᵢᵢ₇", "sᵢᵢ₅₆",
    "S", "S₆", "S₆₄", "Sᵢᵢ", "Sᵢᵢ₆", "Sᵢᵢ₇", "Sᵢᵢ₅₆",
    "D", "D₆", "D₆₄", "D₇", "D₅₆", "D₃₄", "D₂",
    "DD", "DD₆", "DD₇", "DD₅₆",
    "VI", "♭VI", "VII", "♭VII",
    "N₆", "It⁺⁶", "Ger⁺⁶", "Fr⁺⁶",
    "K₆₄",
    "DTᵢᵢᵢ",
}

def normalize_chord_name(chord: str) -> str:
    """规范化和弦名称"""
    chord = chord.strip()
    
    # 直接查找
    if chord in CHORD_ALIASES:
        return CHORD_ALIASES[chord]
    
    # 尝试添加/移除空格
    for alias, standard in CHORD_ALIASES.items():
        if alias.replace(" ", "") == chord.replace(" ", ""):
            return standard
    
    # 尝试下标转换 (D7 -> D₇)
    import re
    # D7 -> D₇
    match = re.match(r'^([A-Za-zᵢᵢ]+)(\d+)$', chord)
    if match:
        base, num = match.groups()
        subscript_map = {'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', 
                        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'}
        converted = base + ''.join(subscript_map.get(d, d) for d in num)
        if converted in CHORD_ALIASES:
            return CHORD_ALIASES[converted]
        if converted in MAJOR_VALID_CHORDS or converted in MINOR_VALID_CHORDS:
            return converted
    
    return chord

def parse_chord_sequence(input_str: str) -> list:
    """解析和弦序列字符串"""
    # 按空格、逗号、分号分割
    parts = re.split(r'[,，\s;]+', input_str)
    chords = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        normalized = normalize_chord_name(part)
        chords.append(normalized)
    return chords

def validate_chord_sequence(chords: list, key_info: dict) -> tuple:
    """验证和弦序列的合法性"""
    key_type = key_info["type"]
    valid_chords = MAJOR_VALID_CHORDS if key_type == "MAJOR" else MINOR_VALID_CHORDS
    
    invalid = []
    for chord in chords:
        if chord not in valid_chords:
            invalid.append(chord)
    
    return invalid

def grade_chord_sequence(chord_sequence: list, key_name: str) -> dict:
    """
    对和弦序列进行评分
    返回详细的评分结果
    """
    key_info = KEY_REGISTRY.get(key_name)
    if not key_info:
        return {"error": f"未知的调性: {key_name}"}
    
    key_info = dict(key_info)  # 复制以避免修改
    key_info["app_mode"] = "GRADING"
    
    base_db = MAJOR_DNA if key_info["type"] == "MAJOR" else MINOR_DNA
    active_dna_db = transpose_dna(base_db, key_info["shift"])
    
    # 验证和弦序列
    invalid_chords = validate_chord_sequence(chord_sequence, key_info)
    if invalid_chords:
        return {
            "error": f"发现未知和弦: {', '.join(invalid_chords)}",
            "invalid_chords": invalid_chords
        }
    
    # 检查和弦连接的合法性
    issues = []
    total_penalty = 0
    violation_count = 0
    
    for i in range(len(chord_sequence) - 1):
        current_chord = chord_sequence[i]
        next_chord = chord_sequence[i + 1]
        
        # 检查是否在允许的 next 列表中
        allowed_nexts = active_dna_db.get(current_chord, {}).get("next", [])
        if next_chord not in allowed_nexts:
            # 可能是同和弦转换，检查 siblings
            from apps.sposobin.engine import get_chord_siblings
            siblings = get_chord_siblings(current_chord, active_dna_db)
            if next_chord not in siblings:
                issues.append({
                    "position": i + 1,
                    "from_chord": current_chord,
                    "to_chord": next_chord,
                    "issue_type": "invalid_progression",
                    "message": f"从 {current_chord} 进行到 {next_chord} 违反了和声进行规则"
                })
                total_penalty += 100
                violation_count += 1
    
    # 尝试为每个和弦生成标准排列
    voicing_results = []
    for chord in chord_sequence:
        if chord not in active_dna_db:
            voicing_results.append({"chord": chord, "error": "和弦定义不存在"})
            continue
            
        cands = get_chord_candidates(chord, active_dna_db, target_s=None, target_b=None)
        if not cands:
            voicing_results.append({"chord": chord, "error": "无法生成合法排列"})
            continue
        
        # 选择最佳排列（最接近理想位置的）
        shift = key_info["shift"]
        v_shift = shift if shift <= 3 else shift - 12
        ideal_S, ideal_A, ideal_T, ideal_B = 72 + v_shift, 65 + v_shift, 60 + v_shift, 48 + v_shift
        score_initial = lambda v: abs(v['S']-ideal_S)*1.5 + abs(v['A']-ideal_A) + abs(v['T']-ideal_T) + abs(v['B']-ideal_B)
        
        best_voicing = min(cands, key=score_initial)
        voicing_results.append({
            "chord": chord,
            "voicing": best_voicing,
            "s": best_voicing['S'],
            "a": best_voicing['A'],
            "t": best_voicing['T'],
            "b": best_voicing['B']
        })
    
    # 计算最终分数
    base_score = 100
    final_score = max(0, base_score - total_penalty)
    
    # 生成评语
    comments = []
    if final_score >= 90:
        comments.append("和声连接规范，整体结构良好")
    elif final_score >= 70:
        comments.append("和声进行基本正确，有少量需要改进的地方")
    elif final_score >= 50:
        comments.append("存在若干和声进行问题，建议复习相关规则")
    else:
        comments.append("和声进行存在较多问题，需要重新练习")
    
    if violation_count > 0:
        comments.append(f"发现 {violation_count} 处和弦连接错误")
    
    return {
        "score": final_score,
        "max_score": 100,
        "key_name": key_name,
        "chord_sequence": chord_sequence,
        "voicing_results": voicing_results,
        "issues": issues,
        "comments": comments,
        "total_penalty": total_penalty,
        "violation_count": violation_count
    }

def parse_ocr_result(raw_texts: list) -> list:
    """
    从 OCR 识别的原始文本中解析和弦序列
    """
    import re
    
    all_chords = []
    for text in raw_texts:
        text = text.strip()
        if not text:
            continue
        
        # 匹配可能和弦模式
        # 常见模式: T, S, D, D7, T6, S64, K64 等
        pattern = r'[TtSsDdK][⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉/IVVIi]+|[a-gA-G][#b♯♭]?(?:m|min|maj)?[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]*(?:/[IViiv]+)?'
        matches = re.findall(pattern, text)
        
        for match in matches:
            normalized = normalize_chord_name(match)
            all_chords.append(normalized)
    
    return all_chords

def recognize_harmony_marks(image_base64: str) -> dict:
    """
    使用 paddleOCR 识别图片中的和声标记
    返回识别结果和原始文本
    """
    try:
        import cv2
        import numpy as np
        from paddleocr import PaddleOCR
        import base64
        import io
        from PIL import Image
        
        # 解码 base64 图片
        img_data = base64.b64decode(image_base64.split(',')[1] if ',' in image_base64 else image_base64)
        img = Image.open(io.BytesIO(img_data))
        img_array = np.array(img)
        
        # 转换为 RGB（如果是灰度或 RGBA）
        if len(img_array.shape) == 2:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
        elif img_array.shape[2] == 4:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
        else:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
        
        # 初始化 PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang='ch', use_gpu=False)
        
        # 进行 OCR 识别
        result = ocr.ocr(img_array, cls=True)
        
        raw_texts = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2:
                    text = line[1][0] if isinstance(line[1], (list, tuple)) else line[1]
                    confidence = line[1][1] if isinstance(line[1], (list, tuple)) else 1.0
                    raw_texts.append((text, confidence))
        
        # 解析和弦
        chords = parse_ocr_result([t[0] for t in raw_texts])
        
        return {
            "success": True,
            "raw_texts": [t[0] for t in raw_texts],
            "confidences": [t[1] for t in raw_texts],
            "chord_sequence": chords,
            "note": f"识别到 {len(chords)} 个和弦" if chords else "未识别到明确和弦"
        }
        
    except ImportError as e:
        return {
            "success": False,
            "error": f"缺少依赖库: {str(e)}",
            "raw_texts": [],
            "chord_sequence": [],
            "note": "请安装 paddleocr 和 opencv-python"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "raw_texts": [],
            "chord_sequence": [],
            "note": f"识别失败: {str(e)}"
        }

def recognize_staff_notes(image_base64: str) -> dict:
    """
    使用 OpenCV 识别五线谱音符
    这是一个简化版本，完整的实现需要结合 SheetVision/Mozart 等库
    """
    try:
        import cv2
        import numpy as np
        from PIL import Image
        import base64
        import io
        
        # 解码 base64 图片
        img_data = base64.b64decode(image_base64.split(',')[1] if ',' in image_base64 else image_base64)
        img = Image.open(io.BytesIO(img_data))
        img_array = np.array(img)
        
        # 转换为灰度图
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY) if img_array.shape[2] == 3 else cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # 二值化
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # 形态学操作去噪
        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        # 查找五线谱线条（水平线）
        horizontal_lines = []
        height, width = binary.shape
        for y in range(0, height, 5):
            row = binary[y, :]
            if np.sum(row > 0) > width * 0.5:  # 超过50%的像素是白色（音符）
                horizontal_lines.append(y)
        
        # 简化处理：返回五线谱检测结果
        staff_regions = []
        if horizontal_lines:
            # 聚类五线谱线
            clusters = []
            current_cluster = [horizontal_lines[0]]
            for line in horizontal_lines[1:]:
                if line - current_cluster[-1] < 15:  # 距离小于15像素认为是同一五线谱
                    current_cluster.append(line)
                else:
                    if len(current_cluster) >= 3:  # 至少3条线才算五线谱
                        clusters.append(current_cluster)
                    current_cluster = [line]
            if len(current_cluster) >= 3:
                clusters.append(current_cluster)
            
            for cluster in clusters:
                staff_regions.append({
                    "top": min(cluster),
                    "bottom": max(cluster),
                    "line_count": len(cluster),
                    "line_positions": cluster
                })
        
        return {
            "success": True,
            "staff_count": len(staff_regions),
            "staff_regions": staff_regions,
            "note": f"检测到 {len(staff_regions)} 处五线谱区域"
        }
        
    except ImportError as e:
        return {
            "success": False,
            "error": f"缺少依赖库: {str(e)}",
            "note": "请安装 opencv-python"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "note": f"识别失败: {str(e)}"
        }