# player.py
"""
Sposobin 和声音色播放器
支持多种音色：钢琴、弦乐、人声合唱、正弦波、三角波、方波、锯齿波
使用 pygame.midi 调用系统 MIDI 合成器
"""
import math
import threading
import time
import pygame
import pygame.midi

# 全局状态
_generation_id = 0
_is_playing = False
NOTE_VOLUME = 100  # 力度 0-127
BPM = 70  # 整体速度
CHORD_DURATION = 60 / BPM  # 单个和弦时长(秒)

# 当前音色
_current_instrument = "piano"

# MIDI 乐器编号映射 (GM 标准)
INSTRUMENT_MAP = {
    "piano": 0,        # Acoustic Grand Piano
    "strings": 48,     # String Ensemble 1
    "choir": 52,       # Choir Aahs
    "sine": 89,        # Pad 2 (warm) - 接近正弦波
    "triangle": 82,    # Lead 3 (calliope) - 接近三角波
    "square": 80,      # Lead 1 (square) - 方波
    "sawtooth": 81,    # Lead 2 (sawtooth) - 锯齿波
}

# 音色中文名称
INSTRUMENT_NAMES = {
    "piano": "钢琴 (Piano)",
    "strings": "弦乐 (Strings)",
    "choir": "人声合唱 (Choir)",
    "sine": "正弦波 (Sine)",
    "triangle": "三角波 (Triangle)",
    "square": "方波 (Square)",
    "sawtooth": "锯齿波 (Sawtooth)",
}

# 初始化 MIDI
pygame.midi.init()
_midi_initialized = False
midi_out = None

def _init_midi():
    """初始化 MIDI 输出"""
    global _midi_initialized, midi_out
    if _midi_initialized:
        return midi_out is not None
    
    _midi_initialized = True
    try:
        # 获取默认 MIDI 输出设备
        out_device_id = pygame.midi.get_default_output_id()
        if out_device_id == -1:
            print("[音色系统] 未找到 MIDI 输出设备")
            return False
        
        midi_out = pygame.midi.Output(out_device_id)
        print(f"[音色系统] 已连接 MIDI 设备 ID: {out_device_id}")
        return True
    except Exception as e:
        print(f"[音色系统] MIDI 初始化失败: {e}")
        return False


def _set_instrument(instrument_name):
    """设置 MIDI 乐器"""
    global midi_out
    if midi_out is None:
        return False
    
    program = INSTRUMENT_MAP.get(instrument_name, 0)
    try:
        midi_out.set_instrument(program, 0)
        return True
    except Exception as e:
        print(f"[音色系统] 设置乐器失败: {e}")
        return False


def stop_all_notes():
    """紧急停止所有音符，防止延音卡音"""
    global midi_out
    if midi_out is None:
        return
    try:
        for note in range(128):
            midi_out.note_off(note, 0, 0)
    except:
        pass


def play_chord(midi_notes, duration):
    """播放单个和弦：传入四声部MIDI音高列表"""
    global midi_out
    if midi_out is None:
        return
    
    for note in midi_notes:
        if 0 <= note <= 127:
            try:
                midi_out.note_on(note, NOTE_VOLUME, 0)
            except:
                pass
    
    time.sleep(duration)
    stop_all_notes()


def play_history(history, on_play_start=None, instrument="piano"):
    """
    播放和声历史记录
    
    Args:
        history: 和声历史列表
        on_play_start: 开始播放时的回调
        instrument: 音色类型
            - "piano": 钢琴
            - "strings": 弦乐
            - "choir": 人声合唱
            - "sine": 正弦波
            - "triangle": 三角波
            - "square": 方波
            - "sawtooth": 锯齿波
    """
    global _generation_id, _is_playing, _current_instrument, midi_out
    
    # 确保 MIDI 已初始化
    if midi_out is None:
        if not _init_midi():
            print("[音色系统] 无法播放：MIDI 未初始化")
            return
    
    # 设置音色
    _current_instrument = instrument
    _set_instrument(instrument)
    
    # 终止上一轮播放
    _generation_id += 1
    current_id = _generation_id
    stop_all_notes()
    _is_playing = True

    def play_loop():
        nonlocal current_id
        if on_play_start:
            on_play_start()

        for idx, item in enumerate(history):
            # 中途点击停止/新播放，则直接退出
            if current_id != _generation_id:
                break

            # 提取 S A T B 四个声部MIDI音高
            voices = item["voices"]
            four_voices = [voices[k] for k in ("S", "A", "T", "B")]

            # 最后一个和弦延长一倍
            dur = CHORD_DURATION * 2 if idx == len(history) - 1 else CHORD_DURATION
            play_chord(four_voices, dur)

        _is_playing = False

    # 后台线程播放，不阻塞UI
    threading.Thread(target=play_loop, daemon=True).start()


def stop_audio():
    """外部调用：停止播放"""
    global _generation_id, _is_playing
    _generation_id += 1
    _is_playing = False
    stop_all_notes()


def set_instrument(instrument):
    """设置当前音色"""
    global _current_instrument
    if instrument in INSTRUMENT_MAP:
        _current_instrument = instrument
        _set_instrument(instrument)
        return True
    return False


def get_current_instrument():
    """获取当前音色"""
    return _current_instrument


def get_available_instruments():
    """获取可用的音色列表"""
    return INSTRUMENT_NAMES


def set_bpm(bpm):
    """设置播放速度"""
    global BPM, CHORD_DURATION
    BPM = max(30, min(200, bpm))
    CHORD_DURATION = 60 / BPM


def get_bpm():
    """获取当前速度"""
    return BPM


def set_volume(volume):
    """设置音量 (0-127)"""
    global NOTE_VOLUME
    NOTE_VOLUME = max(0, min(127, volume))


def get_volume():
    """获取当前音量"""
    return NOTE_VOLUME


# 程序退出释放资源
def cleanup():
    stop_all_notes()
    if midi_out:
        try:
            midi_out.close()
        except:
            pass
    try:
        pygame.midi.quit()
    except:
        pass


import atexit
atexit.register(cleanup)


# 启动时自动初始化
_init_midi()
