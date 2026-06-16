# -*- coding: utf-8 -*-
"""
GNU Solfege Web API Backend
视唱练耳训练系统 Web API - 基于 GNU Solfege 核心模块

这个后端实现了 GNU Solfege 的核心功能，提供视唱练耳训练的 Web API 接口。
基于 solfege 目录下的所有核心模块实现。

版本: 4.1.0
"""

import os
import sys
import random
import time
import math
import hashlib
import sqlite3
import json
import uuid
import re
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple, Union
from enum import Enum
from dataclasses import dataclass, field

# 添加 solfege 模块路径
# api.py 现在位于 api/solfege/ 目录，solfege 模块在 apps/solfege/solfege/
solfege_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'apps', 'solfege')
if solfege_path not in sys.path:
    sys.path.insert(0, solfege_path)

# 定义 gettext 兼容的 _ 和 _i 函数（GNU Solfege 使用）
# 这必须在导入 solfege 模块之前定义
import builtins
builtins.__dict__['_'] = lambda s: s
builtins.__dict__['_i'] = lambda s: s.split('|')[1] if '|' in s else s

# 尝试导入 solfege 核心模块
HAS_SOLFEGE_CORE = False
SOLFEGE_IMPORT_ERROR = None

try:
    from solfege import cfg
    from solfege import mpd
    from solfege import utils
    from solfege import const
    from solfege import statistics
    from solfege import lessonfile
    from solfege.mpd.musicalpitch import MusicalPitch
    from solfege.mpd.interval import Interval
    from solfege.mpd.duration import Duration
    from solfege.mpd.rat import Rat
    from solfege.mpd import elems
    from solfege.mpd.track import Track, PercussionTrack
    from solfege.mpd.performer import MidiPerformer
    HAS_SOLFEGE_CORE = True
except ImportError as e:
    SOLFEGE_IMPORT_ERROR = str(e)
    MusicalPitch = None
    Interval = None
    Duration = None
    Rat = None
    elems = None
    Track = None
    PercussionTrack = None
    MidiPerformer = None

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
import uvicorn

# ==================== FastAPI 应用初始化 ====================

app = FastAPI(
    title="Solfege API",
    description="视唱练耳训练系统 Web API - 基于 GNU Solfege 核心模块",
    version="4.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 内部实现（当 solfege 核心不可用时） ====================

if not HAS_SOLFEGE_CORE:
    # ========== Rat (有理数时间) 实现 (来自 solfege/mpd/rat.py) ==========
    class Rat:
        """有理数时间类，用于精确的分数时间表示"""
        __slots__ = ('m_num', 'm_den')
        
        def __init__(self, num, den=1):
            assert isinstance(num, int)
            assert isinstance(den, int)
            self.m_num = num
            self.m_den = den
        
        @staticmethod
        def gcd(a, b):
            while b:
                a, b = b, a % b
            return a
        
        def clone(self):
            return Rat(self.m_num, self.m_den)
        
        def __repr__(self):
            return f"(Rat {self.m_num}/{self.m_den})"
        
        def __str__(self):
            return f"(Rat {self.m_num}/{self.m_den})"
        
        def __add__(self, B):
            if isinstance(B, int):
                B = Rat(B, 1)
            a = self.m_num * B.m_den + B.m_num * self.m_den
            b = self.m_den * B.m_den
            g = self.gcd(a, b)
            return Rat(a // g, b // g)
        
        def __sub__(self, B):
            if isinstance(B, int):
                B = Rat(B, 1)
            a = self.m_num * B.m_den - B.m_num * self.m_den
            b = self.m_den * B.m_den
            g = self.gcd(a, b)
            return Rat(a // g, b // g)
        
        def __mul__(self, B):
            if isinstance(B, int):
                g = self.gcd(self.m_num * B, self.m_den)
                return Rat(self.m_num * B // g, self.m_den // g)
            if isinstance(B, Rat):
                g = self.gcd(self.m_num * B.m_num, self.m_den * B.m_den)
                return Rat(self.m_num * B.m_num // g, self.m_den * B.m_den // g)
        
        def __truediv__(self, i):
            if isinstance(i, int):
                i = Rat(i, 1)
            r = Rat(self.m_num * i.m_den, self.m_den * i.m_num)
            g = self.gcd(r.m_num, r.m_den)
            return Rat(r.m_num // g, r.m_den // g)
        
        def __rmul__(self, B):
            return self.__mul__(B)
        
        def __int__(self):
            return self.m_num // self.m_den
        
        def __float__(self):
            return self.m_num / self.m_den
        
        def __eq__(self, B):
            if B is None:
                return False
            if isinstance(B, int):
                return self.m_num == B * self.m_den
            return self.m_num / self.m_den == B.m_num / B.m_den
        
        def __lt__(self, B):
            if isinstance(B, int):
                return self.m_num / self.m_den < B
            return self.m_num / self.m_den < B.m_num / B.m_den
        
        def __le__(self, B):
            return self == B or self < B
    
    # ========== Duration 实现 (来自 solfege/mpd/duration.py) ==========
    class Duration:
        """时值类，表示音符的持续时间"""
        
        def __init__(self, nh, dots=0, tuplet=Rat(1, 1)):
            """
            nh - notehead type: 1 2 4 8 16 32 etc
            dots - number of dots after the notehead
            tuplet - for example Rat(2, 3) for triplets
            """
            self.m_nh = nh
            self.m_dots = dots
            self.m_tuplet = tuplet
        
        def get_rat_value(self):
            """获取有理数值"""
            d = Rat(1, self.m_nh)
            if self.m_dots > 0:
                d = d + Rat(1, self.m_nh * 2)
            if self.m_dots > 1:
                d = d + Rat(1, self.m_nh * 4)
            return d * self.m_tuplet
        
        def clone(self):
            return Duration(self.m_nh, self.m_dots, self.m_tuplet.clone())
        
        def __str__(self):
            return f"(Duration:{self.m_nh}:{self.m_dots}dot:{self.m_tuplet})"
        
        def as_mpd_string(self):
            return f"{self.m_nh}{'.' * self.m_dots}"
    
    # ========== MusicalPitch 实现 (来自 solfege/mpd/musicalpitch.py) ==========
    class MusicalPitch:
        """音符音高类，处理 MIDI 音符和音名之间的转换"""
        LOWEST_STEPS = -28
        HIGHEST_STEPS = 47
        notenames = ('c', 'cis', 'd', 'dis', 'e', 'f', 'fis',
                     'g', 'gis', 'a', 'ais', 'b')
        natural_notenames = ('c', 'd', 'e', 'f', 'g', 'a', 'b')
        sharp_notenames = ('cis', 'dis', 'fis', 'gis', 'ais')
        
        def __init__(self, pitch=None):
            self.m_octave_i = 0
            self.m_notename_i = 0
            self.m_accidental_i = 0
            if pitch is not None:
                if isinstance(pitch, int):
                    self.set_from_int(pitch)
                elif isinstance(pitch, str):
                    self.set_from_notename(pitch)
        
        def clone(self):
            r = MusicalPitch()
            r.m_octave_i = self.m_octave_i
            r.m_notename_i = self.m_notename_i
            r.m_accidental_i = self.m_accidental_i
            return r
        
        @staticmethod
        def new_from_notename(n):
            assert isinstance(n, str)
            r = MusicalPitch()
            r.set_from_notename(n)
            return r
        
        @staticmethod
        def new_from_int(i):
            assert isinstance(i, int)
            r = MusicalPitch()
            r.set_from_int(i)
            return r
        
        def set_from_int(self, midiint):
            """从 MIDI 整数设置音高"""
            self.m_octave_i = (midiint - 48) // 12
            self.m_notename_i = {0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 4,
                                 8: 4, 9: 5, 10: 5, 11: 6}[midiint % 12]
            self.m_accidental_i = midiint - (self.m_octave_i + 4) * 12 - [0, 2, 4, 5, 7, 9, 11][self.m_notename_i]
        
        def set_from_notename(self, notename):
            """从音名设置音高"""
            if not notename:
                raise ValueError("Invalid notename")
            self.m_accidental_i = self.m_octave_i = 0
            while notename[-1] in "','":
                if notename[-1] == "'":
                    self.m_octave_i += 1
                else:
                    self.m_octave_i -= 1
                notename = notename[:-1]
            if notename.startswith('es'):
                notename = 'ees' + notename[2:]
            if notename.startswith('as'):
                notename = 'aes' + notename[2:]
            while notename.endswith('es'):
                self.m_accidental_i -= 1
                notename = notename[:-2]
            while notename.endswith('is'):
                self.m_accidental_i += 1
                notename = notename[:-2]
            try:
                self.m_notename_i = ['c', 'd', 'e', 'f', 'g', 'a', 'b'].index(notename)
            except ValueError:
                self.m_notename_i = 0
        
        def semitone_pitch(self):
            """返回 MIDI 音符号"""
            return [0, 2, 4, 5, 7, 9, 11][self.m_notename_i] \
                + self.m_accidental_i + self.m_octave_i * 12 + 48
        
        def pitch_class(self):
            """返回音高级别 (0-11)"""
            return ([0, 2, 4, 5, 7, 9, 11][self.m_notename_i] + self.m_accidental_i) % 12
        
        def steps(self):
            """返回七声音阶中的位置"""
            return self.m_notename_i + self.m_octave_i * 7
        
        def transpose_by_musicalpitch(self, P):
            """转调"""
            tra = P.semitone_pitch() - 60
            old_p = self.semitone_pitch()
            self.m_notename_i = self.m_notename_i + P.m_notename_i
            self.m_accidental_i = self.m_accidental_i + P.m_accidental_i
            if self.m_notename_i > 6:
                self.m_notename_i = self.m_notename_i - 7
                self.m_octave_i = self.m_octave_i + 1
            self.m_octave_i = self.m_octave_i + P.m_octave_i - 1
            if self.semitone_pitch() - old_p < tra:
                self.m_accidental_i += 1
            elif self.semitone_pitch() - old_p > tra:
                self.m_accidental_i -= 1
            self.sanitate_accidental()
            return self
        
        def sanitate_accidental(self):
            """规范化升降号"""
            if not -3 < self.m_accidental_i < 3:
                p = self.semitone_pitch()
                self.set_from_int(p)
        
        def enharmonic_flip(self):
            """等音转换"""
            if self.m_accidental_i == 1 and self.m_notename_i < 6:
                self.m_accidental_i = -1
                self.m_notename_i += 1
        
        def randomize(self, lowest, highest):
            """在范围内随机生成音高"""
            if isinstance(lowest, str):
                lowest = MusicalPitch.new_from_notename(lowest).semitone_pitch()
            if isinstance(highest, str):
                highest = MusicalPitch.new_from_notename(highest).semitone_pitch()
            self.set_from_int(random.randint(int(lowest), int(highest)))
            return self
        
        def get_octave_notename(self):
            """返回带八度的音名"""
            accidentals = ['eses', 'es', '', 'is', 'isis'][self.m_accidental_i + 2]
            name = ['c', 'd', 'e', 'f', 'g', 'a', 'b'][self.m_notename_i]
            if self.m_octave_i > 0:
                octave = "'" * self.m_octave_i
            elif self.m_octave_i < 0:
                octave = "," * (-self.m_octave_i)
            else:
                octave = ""
            return name + accidentals + octave
        
        def get_notename(self):
            """返回不带八度的音名"""
            accidentals = ['eses', 'es', '', 'is', 'isis'][self.m_accidental_i + 2]
            return ['c', 'd', 'e', 'f', 'g', 'a', 'b'][self.m_notename_i] + accidentals
        
        def __add__(self, i):
            if isinstance(i, int):
                v = self.semitone_pitch()
                if not 0 <= v + i < 128:
                    raise ValueError
                return MusicalPitch.new_from_int(v + i)
            return self
        
        def __sub__(self, i):
            if isinstance(i, MusicalPitch):
                return self.semitone_pitch() - i.semitone_pitch()
            assert isinstance(i, int)
            v = self.semitone_pitch()
            return MusicalPitch.new_from_int(v - i)
        
        def __eq__(self, other):
            return self.semitone_pitch() == other.semitone_pitch()
        
        def __lt__(self, other):
            return self.semitone_pitch() < other.semitone_pitch()
        
        def __repr__(self):
            return f"MusicalPitch({self.get_octave_notename()})"
    
    # ========== Interval 实现 (来自 solfege/mpd/interval.py) ==========
    class Interval:
        """音程类，处理音程计算和命名"""
        short_name = (
            "P1", "m2", "M2", "m3", "M3", "4", "TT", "P5", "m6", "M6", "m7", "M7", "P8",
            "m9", "M9", "m10", "M10", "P11", "d12", "P12", "m13", "M13", "m14", "M14", "P15"
        )
        
        def __init__(self, iname=None):
            self.m_dir = 1
            self.m_octave = 0
            self.m_interval = 0
            self.m_mod = 0
            if iname:
                self.set_from_string(iname)
        
        @staticmethod
        def new_from_int(i):
            assert isinstance(i, int)
            new_int = Interval()
            new_int.set_from_int(i)
            return new_int
        
        def set_from_int(self, i):
            """从整数半音设置音程"""
            if i < 0:
                self.m_dir = -1
            else:
                self.m_dir = 1
            self.m_octave = abs(i) // 12
            self.m_mod, self.m_interval = (
                   (0, 0), (0, 0),    # unison
                   (-1, 1), (0, 1),   # second
                   (-1, 2), (0, 2),   # third
                   (0, 3),            # fourth
                   (-1, 4), (0, 4),   # fifth
                   (-1, 5), (0, 5),   # sixth
                   (-1, 6), (0, 6))[abs(i) % 12]  # seventh
            return self
        
        def set_from_string(self, s):
            """从字符串设置音程"""
            s = s.strip()
            if s[0] == "-":
                self.m_dir = -1
                s = s[1:]
            else:
                self.m_dir = 1
            m = re.match(r"(m|M|d|a|p)(\d+)", s)
            if not m:
                raise ValueError(f"Invalid interval name: {s}")
            modifier, i = m.groups()
            i = int(i)
            if i <= 7:
                self.m_octave = 0
            else:
                self.m_octave = (i - 1) // 7
            self.m_interval = i - 1 - self.m_octave * 7
            if self.m_interval in (1, 2, 5, 6):
                try:
                    self.m_mod = {'d': -2, 'm': -1, 'M': 0, 'a': 1}[modifier]
                except:
                    raise ValueError("Invalid interval name")
            elif self.m_interval in (0, 3, 4):
                try:
                    self.m_mod = {'d': -1, 'p': 0, '': 0, 'a': 1}[modifier]
                except:
                    raise ValueError("Invalid interval name")
        
        def get_intvalue(self):
            """获取半音数值"""
            return ([0, 2, 4, 5, 7, 9, 11][self.m_interval] + self.m_octave * 12 + self.m_mod) * self.m_dir
        
        def get_quality_short(self):
            """返回音程品质短名称"""
            if self.m_interval in (0, 3, 4):
                return {-2: "dd", -1: "d", 0: "p", 1: "a", 2: "aa"}[self.m_mod]
            else:
                return {-2: "d", -1: "m", 0: "M", 1: "a"}[self.m_mod]
        
        def get_cname_short(self):
            """返回短音程名称"""
            return "%s%i" % (self.get_quality_short(), self.steps())
        
        def steps(self):
            """返回音程级数"""
            return self.m_octave * 7 + self.m_interval + 1
        
        def get_name(self):
            """返回完整音程名称"""
            names = {
                1: "Unison", 2: "Second", 3: "Third", 4: "Fourth", 5: "Fifth",
                6: "Sixth", 7: "Seventh", 8: "Octave", 9: "Ninth", 10: "Tenth",
                11: "Eleventh", 12: "Twelfth", 13: "Thirteenth", 14: "Fourteenth", 15: "Double Octave"
            }
            step = self.steps()
            quality = self.get_quality_short()
            if quality == "p":
                return f"Perfect {names.get(step, f'{step}th')}"
            elif quality in ("m", "M"):
                prefix = "Major" if quality == "M" else "Minor"
                return f"{prefix} {names.get(step, f'{step}th')}"
            else:
                return f"{quality} {names.get(step, f'{step}th')}"
    
    # ========== Track 实现 (来自 solfege/mpd/track.py) ==========
    class NoteEvent:
        """MIDI 音符事件"""
        def __init__(self, pitch, velocity, start=True):
            self.m_pitch = pitch
            self.m_velocity = velocity
            self.m_start = start
            self.m_time = None
    
    class Track:
        """MIDI 轨道类"""
        def __init__(self, default_velocity=80):
            self.m_default_velocity = default_velocity
            self.m_events = []
        
        def start_note(self, pitch, vel=None):
            if vel is None:
                vel = self.m_default_velocity
            self.m_events.append(NoteEvent(int(pitch), int(vel), start=True))
        
        def stop_note(self, pitch, vel=None):
            if vel is None:
                vel = self.m_default_velocity
            self.m_events.append(NoteEvent(int(pitch), int(vel), start=False))
        
        def note(self, notelen, pitch, vel=None):
            """添加一个音符"""
            if vel is None:
                vel = self.m_default_velocity
            self.start_note(pitch, vel)
            self.stop_note(pitch, vel)
        
        def set_patch(self, patch):
            """设置音色"""
            pass
        
        def set_volume(self, volume):
            """设置音量"""
            pass
        
        def set_bpm(self, bpm, notelen=4):
            """设置 BPM"""
            pass
        
        def calculate_event_times(self):
            """计算事件时间"""
            pos = Rat(0, 1)
            for e in self.m_events:
                if hasattr(e, 'm_duration'):
                    pos = pos + e.m_duration
                else:
                    e.m_time = pos
    
    # ========== MIDI 音符/休止符/和弦元素实现 (来自 solfege/mpd/elems.py) ==========
    class Note:
        """音符元素"""
        def __init__(self, musicalpitch, duration):
            assert isinstance(musicalpitch, MusicalPitch)
            assert isinstance(duration, Duration)
            self.m_musicalpitch = musicalpitch
            self.m_duration = duration
    
    class Rest:
        """休止符元素"""
        def __init__(self, duration):
            assert isinstance(duration, Duration)
            self.m_duration = duration
    
    class Score:
        """乐谱类"""
        def __init__(self):
            self.m_staffs = []
            self.m_bars = []
        
        def add_staff(self, staff_class=None):
            staff = Staff()
            self.m_staffs.append(staff)
            return staff
    
    class Staff:
        """五线谱"""
        def __init__(self):
            self.m_voices = []
            self.add_voice()
        
        def add_voice(self):
            voice = Voice(self)
            self.m_voices.append(voice)
            return voice
    
    class Voice:
        """声部"""
        def __init__(self, parent):
            self.w_parent = parent
            self.m_length = Rat(0, 1)
            self.m_tdict = {}
        
        def append(self, elem, stemdir=None):
            """添加元素"""
            pass
    
    # ========== Lexer 实现 (来自 solfege/mpd/lexer.py) ==========
    class Lexer:
        """音乐记谱法词法分析器"""
        STAFF = 1
        NOTE = 10
        
        re_melodic = re.compile(r"""(?x)
                             ((?P<notename>[a-zA-Z]+)
                             (?P<octave>[',]*))
                             (?P<len>[\d]*)
                             (?P<dots>\.*)""", re.UNICODE)
        
        def __init__(self, s):
            if not isinstance(s, str):
                s = s.decode("utf-8")
            self.m_string = s
            self.m_idx = 0
        
        def __iter__(self):
            return self
        
        def __next__(self):
            while self.m_idx < len(self.m_string) and self.m_string[self.m_idx] in ' \n\t':
                self.m_idx += 1
            if self.m_idx >= len(self.m_string):
                raise StopIteration
            m = self.re_melodic.match(self.m_string, self.m_idx)
            if m:
                self.m_idx = m.end()
                return self.NOTE, m.group('notename')
            self.m_idx += 1
            return self.m_string[self.m_idx - 1], None
    
    # ========== Performer 实现 (来自 solfege/mpd/performer.py) ==========
    class MidiPerformer:
        """MIDI 演奏器"""
        def __init__(self, score):
            self.m_score = score
        
        def get_tracks(self):
            """获取演奏轨道"""
            return [Track()]


# ==================== 常量定义 (与 GNU Solfege const.py 保持一致) ====================

# 音程定义
INTERVALS = [
    {"semitones": 0, "abbr": "P1", "name": "Perfect Unison", "short": "P1", "quality": "perfect"},
    {"semitones": 1, "abbr": "m2", "name": "Minor Second", "short": "m2", "quality": "minor"},
    {"semitones": 2, "abbr": "M2", "name": "Major Second", "short": "M2", "quality": "major"},
    {"semitones": 3, "abbr": "m3", "name": "Minor Third", "short": "m3", "quality": "minor"},
    {"semitones": 4, "abbr": "M3", "name": "Major Third", "short": "M3", "quality": "major"},
    {"semitones": 5, "abbr": "P4", "name": "Perfect Fourth", "short": "P4", "quality": "perfect"},
    {"semitones": 6, "abbr": "TT", "name": "Tritone", "short": "TT", "quality": "augmented"},
    {"semitones": 7, "abbr": "P5", "name": "Perfect Fifth", "short": "P5", "quality": "perfect"},
    {"semitones": 8, "abbr": "m6", "name": "Minor Sixth", "short": "m6", "quality": "minor"},
    {"semitones": 9, "abbr": "M6", "name": "Major Sixth", "short": "M6", "quality": "major"},
    {"semitones": 10, "abbr": "m7", "name": "Minor Seventh", "short": "m7", "quality": "minor"},
    {"semitones": 11, "abbr": "M7", "name": "Major Seventh", "short": "M7", "quality": "major"},
    {"semitones": 12, "abbr": "P8", "name": "Perfect Octave", "short": "P8", "quality": "perfect"},
]

# 和弦类型定义
CHORD_TYPES = [
    {"id": "major", "name": "Major", "name_cn": "大三和弦", "intervals": [0, 4, 7], "symbol": "", "quality": "major"},
    {"id": "minor", "name": "Minor", "name_cn": "小三和弦", "intervals": [0, 3, 7], "symbol": "m", "quality": "minor"},
    {"id": "diminished", "name": "Diminished", "name_cn": "减三和弦", "intervals": [0, 3, 6], "symbol": "dim", "quality": "diminished"},
    {"id": "augmented", "name": "Augmented", "name_cn": "增三和弦", "intervals": [0, 4, 8], "symbol": "aug", "quality": "augmented"},
    {"id": "major7", "name": "Major 7th", "name_cn": "大七和弦", "intervals": [0, 4, 7, 11], "symbol": "maj7", "quality": "major"},
    {"id": "minor7", "name": "Minor 7th", "name_cn": "小七和弦", "intervals": [0, 3, 7, 10], "symbol": "m7", "quality": "minor"},
    {"id": "dominant7", "name": "Dominant 7th", "name_cn": "属七和弦", "intervals": [0, 4, 7, 10], "symbol": "7", "quality": "dominant"},
    {"id": "diminished7", "name": "Diminished 7th", "name_cn": "减七和弦", "intervals": [0, 3, 6, 9], "symbol": "dim7", "quality": "diminished"},
    {"id": "half_diminished7", "name": "Half-Diminished 7th", "name_cn": "半减七和弦", "intervals": [0, 3, 6, 10], "symbol": "m7b5", "quality": "diminished"},
    {"id": "augmented7", "name": "Augmented 7th", "name_cn": "增七和弦", "intervals": [0, 4, 8, 10], "symbol": "aug7", "quality": "augmented"},
    {"id": "major9", "name": "Major 9th", "name_cn": "大九和弦", "intervals": [0, 4, 7, 11, 14], "symbol": "maj9", "quality": "major"},
    {"id": "minor9", "name": "Minor 9th", "name_cn": "小九和弦", "intervals": [0, 3, 7, 10, 14], "symbol": "m9", "quality": "minor"},
    {"id": "dominant9", "name": "Dominant 9th", "name_cn": "属九和弦", "intervals": [0, 4, 7, 10, 14], "symbol": "9", "quality": "dominant"},
    {"id": "sus2", "name": "Suspended 2nd", "name_cn": "挂二和弦", "intervals": [0, 2, 7], "symbol": "sus2", "quality": "neutral"},
    {"id": "sus4", "name": "Suspended 4th", "name_cn": "挂四和弦", "intervals": [0, 5, 7], "symbol": "sus4", "quality": "neutral"},
]

# 节奏型定义
RHYTHMS = [
    "c4", "c8 c8", "c16 c16 c16 c16", "c8 c16 c16", "c16 c16 c8", "c16 c8 c16",
    "c8. c16", "c16 c8.", "r4", "r8 c8", "r8 c16 c16", "r16 c16 c8", "r16 c8 c16",
    "r16 c16 c16 c16", "r8 r16 c16", "r16 c8.", "c12 c12 c12", "r12 c12 c12",
    "c12 r12 c12", "c12 c12 r12", "r12 r12 c12", "r12 c12 r12", "c4.", "c4 c8",
    "c8 c4", "c8 c8 c8", "c4 c16 c16", "c16 c16 c4", "c8 c8 c16 c16", "c8 c16 c16 c8",
    "c16 c16 c8 c8", "c8 c16 c16 c16 c16", "c16 c16 c8 c16 c16", "c16 c16 c16 c16 c8",
    "c16 c16 c16 c16 c16 c16",
]

# 唱名定义
SOLMISATION_SYLLABLES = [
    "DO,", "SI,", "LU,", "LA,", "LI,", "TU,", "TI,", "DO", "DI", "RU", "RE", "RI",
    "MU", "MI", "FA", "FI", "SU", "SO", "SI", "LU", "LA", "LI", "TU", "TI",
    "DO'", "DI'", "RU'", "RE'", "RI'", "MU'", "MI'", "FA'", "FI'", "SU'", "SO'"
]

# 调性数据
KEY_DATA = {
    'major': {'name': 'Major', 'name_cn': '大调', 'pitches': (0, 2, 4, 5, 7, 9, 11)},
    'natural-minor': {'name': 'Natural Minor', 'name_cn': '自然小调', 'pitches': (0, 2, 3, 5, 7, 8, 10)},
    'harmonic-minor': {'name': 'Harmonic Minor', 'name_cn': '和声小调', 'pitches': (0, 2, 3, 5, 7, 8, 10)},
    'melodic-minor': {'name': 'Melodic Minor', 'name_cn': '旋律小调', 'pitches': (0, 2, 3, 5, 7, 9, 11)},
    'whole-tone': {'name': 'Whole Tone', 'name_cn': '全音阶', 'pitches': (0, 2, 4, 6, 8, 10)},
    'chromatic': {'name': 'Chromatic', 'name_cn': '半音阶', 'pitches': tuple(range(12))},
}

# BPM 选项
BPM_VALUES = [
    40, 44, 48, 52, 56, 60, 63, 66, 69, 72, 76, 80, 84, 88, 92, 96, 100, 104,
    108, 112, 116, 120, 126, 132, 138, 144, 152, 160, 168, 176, 184, 192, 200, 208
]

# 音符名称
NOTE_NAMES = ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'ais', 'b']
NOTE_NAMES_WITH_FLAT = ['c', 'des', 'd', 'ees', 'e', 'f', 'ges', 'g', 'aes', 'a', 'bes', 'b']

# 乐器名称
INSTRUMENT_NAMES = [
    "acoustic grand", "bright acoustic", "electric grand", "honky-tonk",
    "electric piano 1", "electric piano 2", "harpsichord", "clav",
    "glockenspiel", "music box", "vibraphone", "marimba", "xylophone",
    "tubular bells", "dulcimer", "drawbar organ", "percussive organ",
    "rock organ", "church organ", "reed organ", "accordion", "harmonica",
    "concertina", "acoustic guitar (nylon)", "acoustic guitar (steel)",
    "electric guitar (jazz)", "electric guitar (clean)", "electric guitar (muted)",
    "overdriven guitar", "distorted guitar", "guitar harmonics",
    "acoustic bass", "electric bass (finger)", "electric bass (pick)",
    "fretless bass", "slap bass 1", "slap bass 2", "synth bass 1",
    "synth bass 2", "violin", "viola", "cello", "contrabass",
    "tremolo strings", "pizzicato strings", "orchestral strings", "timpani",
    "string ensemble 1", "string ensemble 2", "synthstrings 1", "synthstrings 2",
    "choir aahs", "voice oohs", "synth voice", "orchestral hit",
    "trumpet", "trombone", "tuba", "muted trumpet", "french horn",
    "brass section", "synthbrass 1", "synthbrass 2", "soprano sax",
    "alto sax", "tenor sax", "baritone sax", "oboe", "english horn",
    "bassoon", "clarinet", "piccolo", "flute", "recorder", "pan flute"
]


# ==================== Pydantic 模型 ====================

class ExerciseType(str, Enum):
    HARMONIC_INTERVAL = "harmonic_interval"
    MELODIC_INTERVAL = "melodic_interval"
    ID_TONE = "idtone"
    ID_PROPERTY = "idproperty"
    ID_BY_NAME = "idbyname"
    NAME_INTERVAL = "nameinterval"
    SING_ANSWER = "singanswer"
    CHORD = "chord"
    CHORD_VOICING = "chordvoicing"
    RHYTHM = "rhythm"
    BPM = "bpm"
    SING_INTERVAL = "sing_interval"
    SING_CHORD = "sing_chord"
    DICTATION = "dictation"
    RHYTHM_TAPPING = "rhythm_tapping"
    RHYTHM_DICTATION = "rhythm_dictation"
    TONE_IN_CONTEXT = "toneincontext"
    TWELVE_TONE = "twelvetone"
    SOLMISATION = "solmisation"
    COMPARE_INTERVALS = "compareintervals"
    ELEM_BUILDER = "elembuilder"

class SessionCreateRequest(BaseModel):
    exercise_type: ExerciseType
    user_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    lesson_file: Optional[str] = None

class IntervalConfig(BaseModel):
    interval_type: str = "harmonic"
    selected_intervals: Optional[List[int]] = None
    range_low: int = 52
    range_high: int = 76
    lock_to_key: bool = False
    key_note: int = 60
    scale_type: str = "major"
    allow_direction: bool = True

class ChordConfig(BaseModel):
    chord_types: Optional[List[str]] = None
    root_position_only: bool = False
    range_low: int = 48
    range_high: int = 72
    play_as_arpeggio: bool = False
    include_inversions: bool = False

class ToneConfig(BaseModel):
    include_sharps: bool = True
    include_flats: bool = True
    octaves: List[int] = [0, 1, 2]
    use_weighted_selection: bool = True
    tone_weights: Optional[Dict[str, int]] = None

class RhythmConfig(BaseModel):
    num_beats: int = 4
    count_in: int = 2
    bpm: int = 60
    rhythm_elements: Optional[List[int]] = None
    not_start_with_rest: bool = False

class BPMConfig(BaseModel):
    bpm_range: Tuple[int, int] = (40, 208)
    active_bpms: Optional[List[int]] = None

class QuestionResponse(BaseModel):
    question_id: str
    type: str
    data: Dict[str, Any]
    correct_answer: Any
    correct_answer_name: Optional[str] = None
    options: Optional[List[Any]] = None
    play_mode: Optional[str] = None

class AnswerSubmitRequest(BaseModel):
    session_id: str
    question_id: str
    answer: Any

class AnswerResponse(BaseModel):
    correct: bool
    correct_answer: Any
    correct_answer_name: Optional[str] = None
    is_new_record: bool = False
    feedback: Optional[str] = None

class StatisticsResponse(BaseModel):
    total_questions: int
    correct_count: int
    wrong_count: int
    accuracy: float
    recent_history: List[Dict[str, Any]]

class SessionInfo(BaseModel):
    session_id: str
    exercise_type: str
    created_at: str
    questions_count: int
    correct_count: int
    status: str


# ==================== 数据库管理 (来自 solfege/statistics.py) ====================

class StatisticsDB:
    """统计数据持久化存储"""
    
    type_int_dict = {int: 0, str: 1, float: 2}
    int_type_dict = {0: int, 1: str, 2: float}
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), "solfege_statistics.db")
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.create_tables()
    
    def create_tables(self):
        """创建必要的数据库表"""
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                exercise_type TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                user_config TEXT,
                status TEXT DEFAULT 'active'
            );
            
            CREATE TABLE IF NOT EXISTS questions (
                question_id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                question_type TEXT NOT NULL,
                question_data TEXT NOT NULL,
                correct_answer TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                answered_at INTEGER,
                user_answer TEXT,
                is_correct INTEGER,
                time_taken INTEGER,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id)
            );
            
            CREATE TABLE IF NOT EXISTS user_statistics (
                user_id TEXT PRIMARY KEY,
                total_questions INTEGER DEFAULT 0,
                correct_answers INTEGER DEFAULT 0,
                wrong_answers INTEGER DEFAULT 0,
                total_time INTEGER DEFAULT 0,
                last_updated INTEGER,
                best_streak INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS lessonfiles (
                fileid INTEGER PRIMARY KEY AUTOINCREMENT,
                hash TEXT NOT NULL,
                test_result REAL DEFAULT NULL,
                test_passed INTEGER DEFAULT NULL,
                filename TEXT UNIQUE NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS session_stats (
                session_id TEXT PRIMARY KEY,
                total_questions INTEGER DEFAULT 0,
                correct INTEGER DEFAULT 0,
                wrong INTEGER DEFAULT 0,
                total_time INTEGER DEFAULT 0,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id)
            );
            
            CREATE TABLE IF NOT EXISTS toneincontext (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fileid INTEGER,
                timestamp INTEGER,
                answerkey TEXT,
                guessedkey TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_questions_session ON questions(session_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
            CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
        """)
        self.conn.commit()
    
    def create_session(self, session_id: str, exercise_type: str, user_config: dict) -> dict:
        """创建新会话"""
        created_at = int(time.time())
        self.conn.execute(
            "INSERT INTO sessions (session_id, exercise_type, created_at, user_config) VALUES (?, ?, ?, ?)",
            (session_id, exercise_type, created_at, json.dumps(user_config))
        )
        self.conn.execute(
            "INSERT INTO session_stats (session_id) VALUES (?)",
            (session_id,)
        )
        self.conn.commit()
        return {
            "session_id": session_id,
            "exercise_type": exercise_type,
            "created_at": created_at,
            "status": "active"
        }
    
    def save_question(self, question_id: str, session_id: str, question_type: str,
                     question_data: dict, correct_answer: Any) -> None:
        """保存问题"""
        self.conn.execute(
            "INSERT INTO questions (question_id, session_id, question_type, question_data, correct_answer, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (question_id, session_id, question_type, json.dumps(question_data), json.dumps(correct_answer), int(time.time()))
        )
        self.conn.commit()
    
    def save_answer(self, question_id: str, user_answer: Any, is_correct: bool, time_taken: int = None) -> bool:
        """保存答案并返回是否是新记录"""
        answered_at = int(time.time())
        cursor = self.conn.execute(
            "SELECT is_correct FROM questions WHERE question_id = ? AND answered_at IS NOT NULL",
            (question_id,)
        )
        row = cursor.fetchone()
        is_new_record = row is None
        
        self.conn.execute(
            "UPDATE questions SET answered_at = ?, user_answer = ?, is_correct = ? WHERE question_id = ?",
            (answered_at, json.dumps(user_answer), 1 if is_correct else 0, question_id)
        )
        
        # 更新会话统计
        cursor = self.conn.execute("SELECT session_id FROM questions WHERE question_id = ?", (question_id,))
        row = cursor.fetchone()
        if row:
            self.conn.execute(
                "UPDATE session_stats SET total_questions = total_questions + 1, correct = correct + ?, wrong = wrong + ? WHERE session_id = ?",
                (1 if is_correct else 0, 1 if not is_correct else 0, row[0])
            )
        self.conn.commit()
        return is_new_record
    
    def get_session_statistics(self, session_id: str) -> StatisticsResponse:
        """获取会话统计信息"""
        cursor = self.conn.execute(
            "SELECT total_questions, correct, wrong FROM session_stats WHERE session_id = ?",
            (session_id,)
        )
        row = cursor.fetchone()
        if row:
            total, correct, wrong = row[0], row[1], row[2]
        else:
            total, correct, wrong = 0, 0, 0
        
        cursor = self.conn.execute(
            """SELECT question_type, correct_answer, user_answer, is_correct, time_taken 
               FROM questions WHERE session_id = ? 
               ORDER BY created_at DESC LIMIT 50""",
            (session_id,)
        )
        recent_history = []
        for row in cursor.fetchall():
            time_taken = row[4] if row[4] else 0
            recent_history.append({
                "type": row[0],
                "correct_answer": json.loads(row[1]) if isinstance(row[1], str) else row[1],
                "user_answer": json.loads(row[2]) if isinstance(row[2], str) else row[2],
                "is_correct": bool(row[3]),
                "time_taken": time_taken
            })
        
        accuracy = (correct / total * 100) if total > 0 else 0.0
        
        return StatisticsResponse(
            total_questions=total,
            correct_count=correct,
            wrong_count=wrong,
            accuracy=round(accuracy, 2),
            recent_history=recent_history
        )
    
    def get_user_statistics(self, user_id: str = "default") -> dict:
        """获取用户总体统计"""
        cursor = self.conn.execute(
            """SELECT total_questions, correct_answers, wrong_answers, total_time, 
               best_streak, current_streak FROM user_statistics WHERE user_id = ?""",
            (user_id,)
        )
        row = cursor.fetchone()
        if row:
            total = row[0]
            correct = row[1]
            total_time = row[3] or 0
            best_streak = row[4] or 0
            current_streak = row[5] or 0
        else:
            total = correct = total_time = best_streak = current_streak = 0
        
        accuracy = (correct / total * 100) if total > 0 else 0.0
        avg_time = (total_time / total / 1000) if total > 0 else 0
        
        return {
            "total_questions": total,
            "correct_answers": correct,
            "wrong_answers": total - correct,
            "accuracy": round(accuracy, 2),
            "average_time": round(avg_time, 2),
            "best_streak": best_streak,
            "current_streak": current_streak
        }
    
    def update_user_statistics(self, user_id: str = "default", is_correct: bool = True, time_taken: int = 0):
        """更新用户统计"""
        self.conn.execute(
            """INSERT INTO user_statistics (user_id, total_questions, correct_answers, wrong_answers, total_time, last_updated)
               VALUES (?, 1, ?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET 
               total_questions = total_questions + 1,
               correct_answers = correct_answers + ?,
               wrong_answers = wrong_answers + ?,
               total_time = total_time + ?,
               last_updated = ?,
               current_streak = CASE WHEN ? = 1 THEN current_streak + 1 ELSE 0 END,
               best_streak = CASE WHEN ? = 1 AND current_streak + 1 > best_streak THEN current_streak + 1 ELSE best_streak END""",
            (user_id, 
             1 if is_correct else 0, 1 if not is_correct else 0, time_taken, int(time.time()),
             1 if is_correct else 0, 1 if not is_correct else 0, time_taken, int(time.time()),
             1 if is_correct else 0, 1 if is_correct else 0)
        )
        self.conn.commit()
    
    def get_all_sessions(self) -> List[SessionInfo]:
        """获取所有会话"""
        cursor = self.conn.execute(
            """SELECT s.session_id, s.exercise_type, s.created_at, s.status,
                      COALESCE(ss.total_questions, 0) as questions_count,
                      COALESCE(ss.correct, 0) as correct_count
               FROM sessions s
               LEFT JOIN session_stats ss ON s.session_id = ss.session_id
               ORDER BY s.created_at DESC"""
        )
        sessions = []
        for row in cursor.fetchall():
            sessions.append(SessionInfo(
                session_id=row[0],
                exercise_type=row[1],
                created_at=datetime.fromtimestamp(row[2]).isoformat(),
                questions_count=row[4],
                correct_count=row[5],
                status=row[3]
            ))
        return sessions
    
    def close_session(self, session_id: str):
        """关闭会话"""
        self.conn.execute(
            "UPDATE sessions SET status = 'closed' WHERE session_id = ?",
            (session_id,)
        )
        self.conn.commit()
    
    def get_exercise_stats_by_type(self, exercise_type: str) -> dict:
        """按练习类型获取统计"""
        cursor = self.conn.execute(
            """SELECT question_type, COUNT(*) as total,
                      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
               FROM questions q
               JOIN sessions s ON q.session_id = s.session_id
               WHERE s.exercise_type = ?
               GROUP BY question_type""",
            (exercise_type,)
        )
        stats = {}
        for row in cursor.fetchall():
            total = row[1]
            correct = row[2] or 0
            stats[row[0]] = {
                'total': total,
                'correct': correct,
                'accuracy': round(correct / total * 100, 2) if total > 0 else 0
            }
        return stats


# ==================== 会话管理 ====================

class SessionManager:
    """会话管理器"""
    
    def __init__(self):
        self.sessions: Dict[str, Dict] = {}
        self.stats_db = StatisticsDB()
    
    def create_session(self, exercise_type: str, user_config: dict = None) -> str:
        """创建新会话"""
        session_id = str(uuid.uuid4())
        user_config = user_config or {}
        
        session = {
            "session_id": session_id,
            "exercise_type": exercise_type,
            "user_config": user_config,
            "created_at": time.time(),
            "teacher": None,
            "current_question": None,
            "current_question_data": None,
            "question_count": 0,
            "correct_count": 0,
            "start_time": None,
            "question_start_time": None
        }
        self.sessions[session_id] = session
        
        self.stats_db.create_session(session_id, exercise_type, user_config)
        
        # 根据练习类型初始化 teacher
        teacher_map = {
            "harmonic_interval": HarmonicIntervalTeacher,
            "melodic_interval": MelodicIntervalTeacher,
            "idtone": IdToneTeacher,
            "chord": ChordTeacher,
            "chordvoicing": ChordVoicingTeacher,
            "rhythm": RhythmTeacher,
            "bpm": BPMTeacher,
            "twelvetone": TwelveToneTeacher,
            "toneincontext": ToneInContextTeacher,
            "solmisation": SolmisationTeacher,
            "sing_interval": SingIntervalTeacher,
            "sing_chord": SingChordTeacher,
            "compareintervals": CompareIntervalsTeacher,
            "rhythm_tapping": RhythmTappingTeacher,
            "rhythm_dictation": RhythmDictationTeacher,
            "dictation": DictationTeacher,
            "elembuilder": ElemBuilderTeacher,
        }
        
        teacher_class = teacher_map.get(exercise_type)
        if teacher_class:
            session["teacher"] = teacher_class(user_config)
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """获取会话"""
        return self.sessions.get(session_id)
    
    def delete_session(self, session_id: str) -> bool:
        """删除会话"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False


# ==================== Teacher 基类 (来自 solfege/abstract.py) ====================

class QstatusDefs:
    """问题状态定义"""
    QSTATUS_NO = 0
    QSTATUS_NEW = 1
    QSTATUS_WRONG = 2
    QSTATUS_SOLVED = 3
    QSTATUS_GIVE_UP = 4
    QSTATUS_TYPE_SOLVED = 5
    QSTATUS_TYPE_WRONG = 6
    QSTATUS_VOICING_SOLVED = 7
    QSTATUS_VOICING_WRONG = 8


class Teacher(QstatusDefs):
    """Teacher 基类 - 所有练习 Teacher 类的基类"""
    
    def __init__(self, exname: str):
        self.m_exname = exname
        self.q_status = self.QSTATUS_NO
        self.m_question = None
        self.m_statistics = None
        self.m_timeout_handle = None
        self.m_P = None
        self.m_lessonfile = None
        self.m_custom_mode = False
    
    def new_question(self, L=None, H=None):
        """生成新问题 - 子类必须实现"""
        raise NotImplementedError
    
    def guess_answer(self, answer):
        """判断答案 - 子类必须实现"""
        raise NotImplementedError
    
    def play_question(self):
        """播放问题 - 子类实现"""
        return None
    
    def give_up(self):
        """放弃当前问题"""
        self.q_status = self.QSTATUS_GIVE_UP
    
    def end_practise(self):
        """结束练习"""
        self.q_status = self.QSTATUS_NO
    
    def get_question_status(self):
        """获取当前问题状态"""
        return self.q_status


# ==================== Teacher 实现 - 音程和音高识别 ====================

class MelodicIntervalTeacher(Teacher):
    """旋律音程识别 Teacher"""
    
    def __init__(self, config: dict = None):
        super().__init__("melodic_interval")
        self.config = config or {}
        
        self.selected_intervals = self.config.get("selected_intervals", list(range(1, 13)))
        self.range_low = self.config.get("range_low", 48)
        self.range_high = self.config.get("range_high", 84)
        self.lock_to_key = self.config.get("lock_to_key", False)
        self.key_note = self.config.get("key_note", 60)
        self.scale_type = self.config.get("scale_type", "major")
        self.allow_direction = self.config.get("allow_direction", True)
        self.number_of_intervals = self.config.get("number_of_intervals", 1)
        
        self.m_tonika = None
        self.m_interval = None
        self.m_question = []
        self.m_answer = []
        self.key_data = KEY_DATA.copy()
    
    def _get_pitches_in_key(self, tonic: int, keytype: str, low: int, high: int) -> set:
        """获取指定调性中的音符"""
        if keytype not in self.key_data:
            keytype = 'major'
        
        tones = set()
        pitch_class = MusicalPitch.new_from_int(tonic).pitch_class()
        for octave in range(-1, 12):
            for t in self.key_data[keytype]['pitches']:
                midi_pitch = pitch_class + octave * 12 + t + 48
                if low <= midi_pitch <= high:
                    tones.add(midi_pitch)
        return tones
    
    def _get_possible_intervals_in_key(self, first: int, tones: set, irange: list) -> list:
        """获取在调性中可能的音程"""
        intervals = []
        for i in irange:
            if (first + i) in tones:
                intervals.append(i)
        return intervals
    
    def new_question(self, L=None, H=None) -> Dict[str, Any]:
        """生成新的旋律音程问题"""
        self.q_status = self.QSTATUS_NEW
        self.m_question = []
        self.m_answer = []
        
        low = L if L is not None else self.range_low
        high = H if H is not None else self.range_high
        
        if self.selected_intervals:
            valid_intervals = [i for i in self.selected_intervals if 1 <= i <= 12]
        else:
            valid_intervals = list(range(1, 13))
        
        if not valid_intervals:
            valid_intervals = list(range(1, 13))
        
        if self.lock_to_key:
            tones = self._get_pitches_in_key(self.key_note, self.scale_type, low, high)
            first = random.choice(list(tones))
            possible_intervals = self._get_possible_intervals_in_key(first, tones, valid_intervals)
            if possible_intervals:
                semitones = random.choice(possible_intervals)
            else:
                semitones = random.choice(valid_intervals)
                first = random.randint(low, high - semitones)
        else:
            semitones = random.choice(valid_intervals)
            first = random.randint(low, high - semitones)
        
        if self.allow_direction:
            direction = 1 if random.random() > 0.5 else -1
        else:
            direction = 1
        
        note1 = first
        note2 = first + (semitones * direction)
        
        interval_info = next((iv for iv in INTERVALS if iv['semitones'] == abs(semitones)), None)
        
        self.m_tonika = MusicalPitch.new_from_int(note1)
        self.m_interval = abs(semitones) * direction
        self.m_direction = direction
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'melodic_interval',
            'base_note': note1,
            'base_note_name': self.m_tonika.get_octave_notename(),
            'notes': [note1, note2],
            'note_names': [MusicalPitch.new_from_int(n).get_octave_notename() for n in [note1, note2]],
            'correct_answer': abs(semitones),
            'correct_answer_abbr': interval_info['abbr'] if interval_info else f"m{abs(semitones)}",
            'correct_answer_name': interval_info['name'] if interval_info else f"{abs(semitones)} semitones",
            'direction': 'ascending' if direction > 0 else 'descending',
            'direction_symbol': '↑' if direction > 0 else '↓',
            'interval_info': interval_info,
            'melodic': True,
            'play_mode': 'melodic'
        }
    
    def guess_answer(self, answer: Union[int, list]) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        if isinstance(answer, list):
            is_correct = (answer == self.m_question)
        else:
            is_correct = (answer == abs(self.m_interval))
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or self.m_tonika is None:
            return None
        
        note1 = self.m_tonika.semitone_pitch()
        note2 = note1 + self.m_interval
        
        return {
            'notes': [note1, note2],
            'mode': 'melodic',
            'direction': self.m_direction,
            'duration': 4
        }


class HarmonicIntervalTeacher(MelodicIntervalTeacher):
    """和声音程识别 Teacher"""
    
    def __init__(self, interval_type: str = "harmonic", config: dict = None):
        super().__init__(config)
        self.m_exname = "harmonic_interval"
        self.interval_type = interval_type
        self.m_tonika = None
        self.m_interval = None
    
    def new_question(self, L=None, H=None) -> Dict[str, Any]:
        """生成新的和声音程问题"""
        self.q_status = self.QSTATUS_NEW
        
        low = L if L is not None else self.range_low
        high = H if H is not None else self.range_high
        
        if self.selected_intervals:
            valid_intervals = [i for i in self.selected_intervals if 1 <= i <= 12]
        else:
            valid_intervals = list(range(1, 13))
        
        if not valid_intervals:
            valid_intervals = list(range(1, 13))
        
        semitones = random.choice(valid_intervals)
        
        if self.lock_to_key:
            tones = self._get_pitches_in_key(self.key_note, self.scale_type, low, high)
            possible_first = [t for t in tones if t + semitones in tones]
            if possible_first:
                first = random.choice(possible_first)
            else:
                first = random.randint(low, high - semitones)
        else:
            first = random.randint(low, high - semitones)
        
        note1 = first
        note2 = first + semitones
        
        interval_info = next((iv for iv in INTERVALS if iv['semitones'] == semitones), None)
        
        self.m_tonika = MusicalPitch.new_from_int(note1)
        self.m_interval = semitones
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'harmonic_interval',
            'base_note': note1,
            'base_note_name': self.m_tonika.get_octave_notename(),
            'notes': [note1, note2],
            'note_names': [MusicalPitch.new_from_int(n).get_octave_notename() for n in [note1, note2]],
            'correct_answer': semitones,
            'correct_answer_abbr': interval_info['abbr'] if interval_info else f"P{semitones}",
            'correct_answer_name': interval_info['name'] if interval_info else f"{semitones} semitones",
            'interval_info': interval_info,
            'melodic': False,
            'play_mode': 'harmonic'
        }
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or self.m_tonika is None:
            return None
        
        note1 = self.m_tonika.semitone_pitch()
        note2 = note1 + self.m_interval
        
        return {
            'notes': [note1, note2],
            'mode': 'harmonic',
            'duration': 4
        }


class IdToneTeacher(Teacher):
    """单音识别 Teacher"""
    
    OCTAVES = [-2, -1, 0, 1, 2, 3]
    
    def __init__(self, config: dict = None):
        super().__init__("idtone")
        self.config = config or {}
        
        self.notenames = list(MusicalPitch.notenames) if MusicalPitch else ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'ais', 'b']
        
        self.use_weighted = self.config.get("use_weighted_selection", True)
        if self.use_weighted and self.config.get("tone_weights"):
            self.weights = self.config["tone_weights"]
        else:
            self.weights = {n: self.config.get(f"{n}_weight", 1) for n in self.notenames}
        
        self.active_octaves = self.config.get("octaves", [0, 1, 2])
        
        self.m_question = None
        self.m_octave = 0
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的单音识别问题"""
        self.q_status = self.QSTATUS_NEW
        
        if self.use_weighted:
            notes_with_weight = [(n, self.weights.get(n, 1)) for n in self.notenames]
            weighted_notes = []
            for n, w in notes_with_weight:
                weighted_notes.extend([n] * max(1, w))
            self.m_question = random.choice(weighted_notes) if weighted_notes else 'c'
        else:
            self.m_question = random.choice(self.notenames)
        
        self.m_octave = random.choice(self.active_octaves)
        
        base_pitch = MusicalPitch.new_from_notename(self.m_question)
        midi_note = base_pitch.semitone_pitch() + self.m_octave * 12
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'idtone',
            'note_name': self.m_question,
            'note_name_with_octave': base_pitch.get_octave_notename(),
            'midi_note': midi_note,
            'octave': self.m_octave,
            'correct_answer': self.m_question,
            'options': self.notenames,
            'play_note': midi_note
        }
    
    def guess_answer(self, answer: str) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        answer_normalized = answer.lower().replace(' ', '')
        question_normalized = self.m_question.lower().replace(' ', '')
        
        answer_std = answer_normalized.replace('es', '').replace('is', '')
        question_std = question_normalized.replace('es', '').replace('is', '')
        
        is_correct = (answer_std == question_std)
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO:
            return None
        
        base_pitch = MusicalPitch.new_from_notename(self.m_question)
        midi_note = base_pitch.semitone_pitch() + self.m_octave * 12
        
        return {
            'note': midi_note,
            'duration': 4
        }


# ==================== Teacher 实现 - 和弦识别 ====================

class ChordTeacher(Teacher):
    """和弦识别 Teacher"""
    
    def __init__(self, config: dict = None):
        super().__init__("chord")
        self.config = config or {}
        
        available_types = self.config.get("chord_types", 
            ["major", "minor", "diminished", "augmented", "major7", "minor7", "dominant7"])
        self.chord_types = [ct for ct in CHORD_TYPES if ct["id"] in available_types]
        if not self.chord_types:
            self.chord_types = [ct for ct in CHORD_TYPES if ct["id"] in 
                ["major", "minor", "diminished", "augmented"]]
        
        self.range_low = self.config.get("range_low", 48)
        self.range_high = self.config.get("range_high", 72)
        self.play_as_arpeggio = self.config.get("play_as_arpeggio", False)
        self.include_inversions = self.config.get("include_inversions", False)
        
        self.m_chord_type = None
        self.m_root_note = None
        self.m_notes = []
        self.m_inversion = 0
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的和弦识别问题"""
        self.q_status = self.QSTATUS_NEW
        
        self.m_chord_type = random.choice(self.chord_types)
        
        root_midi = random.randint(self.range_low, self.range_high - 12)
        self.m_root_note = MusicalPitch.new_from_int(root_midi)
        
        self.m_notes = [root_midi + interval for interval in self.m_chord_type["intervals"]]
        
        if self.include_inversions and len(self.m_chord_type["intervals"]) >= 3:
            self.m_inversion = random.randint(0, len(self.m_notes) - 1)
            if self.m_inversion > 0:
                self.m_notes = self.m_notes[self.m_inversion:] + self.m_notes[:self.m_inversion]
        else:
            self.m_inversion = 0
        
        note_names = [MusicalPitch.new_from_int(n).get_octave_notename() for n in self.m_notes]
        
        options = [ct["id"] for ct in self.chord_types]
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'chord',
            'root_note': root_midi,
            'root_note_name': self.m_root_note.get_octave_notename(),
            'notes': self.m_notes,
            'note_names': note_names,
            'correct_answer': self.m_chord_type["id"],
            'correct_answer_name': self.m_chord_type["name"],
            'correct_answer_name_cn': self.m_chord_type.get("name_cn", ""),
            'chord_info': self.m_chord_type,
            'options': options,
            'inversion': self.m_inversion,
            'play_as_arpeggio': self.play_as_arpeggio
        }
    
    def guess_answer(self, answer: str) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        is_correct = (answer.lower() == self.m_chord_type["id"].lower())
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or not self.m_notes:
            return None
        
        return {
            'notes': self.m_notes,
            'mode': 'chord',
            'arpeggio': self.play_as_arpeggio,
            'duration': 4
        }


# ==================== Teacher 实现 - 节奏和 BPM ====================

class RhythmTeacher(Teacher):
    """节奏识别 Teacher"""
    
    def __init__(self, config: dict = None):
        super().__init__("rhythm")
        self.config = config or {}
        
        self.num_beats = self.config.get("num_beats", 4)
        self.count_in = self.config.get("count_in", 2)
        self.bpm = self.config.get("bpm", 60)
        self.not_start_with_rest = self.config.get("not_start_with_rest", False)
        
        if self.config.get("rhythm_elements"):
            self.rhythm_indices = self.config["rhythm_elements"]
        else:
            self.rhythm_indices = list(range(len(RHYTHMS)))
        
        self.m_question = []
        self.m_rhythm_string = ""
    
    def _generate_random_rhythm(self) -> List[int]:
        """生成随机节奏"""
        rhythm = []
        for _ in range(self.num_beats):
            if self.not_start_with_rest and len(rhythm) == 0:
                possible = [i for i in self.rhythm_indices if i >= 8]
                if possible:
                    rhythm.append(random.choice(possible))
                else:
                    rhythm.append(random.choice(self.rhythm_indices))
            else:
                rhythm.append(random.choice(self.rhythm_indices))
        return rhythm
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的节奏识别问题"""
        self.q_status = self.QSTATUS_NEW
        
        self.m_question = self._generate_random_rhythm()
        self.m_rhythm_string = " ".join([RHYTHMS[i] for i in self.m_question])
        
        count_in_str = "d4 " * self.count_in + " "
        full_rhythm = count_in_str + self.m_rhythm_string
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'rhythm',
            'rhythm_indices': self.m_question,
            'rhythm_string': self.m_rhythm_string,
            'full_rhythm_string': full_rhythm,
            'correct_answer': self.m_question,
            'correct_answer_names': [RHYTHMS[i] for i in self.m_question],
            'num_beats': self.num_beats,
            'bpm': self.bpm,
            'count_in': self.count_in,
            'options': list(range(len(RHYTHMS))),
            'rhythm_names': RHYTHMS
        }
    
    def guess_answer(self, answer: List[int]) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        if len(answer) != len(self.m_question):
            is_correct = False
        else:
            is_correct = (answer == self.m_question)
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO:
            return None
        
        return {
            'rhythm_string': self.m_rhythm_string,
            'full_rhythm_string': "d4 " * self.count_in + self.m_rhythm_string,
            'bpm': self.bpm,
            'count_in': self.count_in
        }


class BPMTeacher(Teacher):
    """BPM 识别 Teacher"""
    
    def __init__(self, config: dict = None):
        super().__init__("bpm")
        self.config = config or {}
        
        self.bpm_range = self.config.get("bpm_range", (40, 208))
        self.active_bpms = self.config.get("active_bpms", BPM_VALUES)
        
        self.possible_bpms = [b for b in BPM_VALUES 
                             if self.bpm_range[0] <= b <= self.bpm_range[1]
                             and b in self.active_bpms]
        if not self.possible_bpms:
            self.possible_bpms = [b for b in BPM_VALUES 
                                  if self.bpm_range[0] <= b <= self.bpm_range[1]]
        
        self.m_question = None
        self.m_bpm = None
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的 BPM 识别问题"""
        self.q_status = self.QSTATUS_NEW
        
        self.m_bpm = random.choice(self.possible_bpms)
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'bpm',
            'correct_answer': self.m_bpm,
            'options': self.possible_bpms,
            'bpm_range': self.bpm_range
        }
    
    def guess_answer(self, answer: int) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        is_correct = (answer == self.m_bpm)
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or self.m_bpm is None:
            return None
        
        beats_to_play = int(self.m_bpm / (random.random() * 1.5 + 1.5))
        
        return {
            'bpm': self.m_bpm,
            'beats_to_play': max(4, beats_to_play),
            'duration': beats_to_play * 60 / self.m_bpm
        }


# ==================== Teacher 实现 - 十二音和调内音 ====================

class TwelveToneTeacher(Teacher):
    """十二音序列 Teacher - 来自 solfege/exercises/twelvetone.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("twelvetone")
        self.config = config or {}
        
        self.m_question = None
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的十二音问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 生成随机十二音序列
        tones = ["c'", "cis'", "d'", "dis'", "e'", "f'", "fis'", "g'", "gis'", "a'", "ais'", "b'"]
        for _ in range(100):
            a = random.randint(0, 11)
            b = random.randint(0, 11)
            tones[a], tones[b] = tones[b], tones[a]
        
        self.m_question = tones
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'twelvetone',
            'tone_sequence': tones,
            'first_note': tones[0],
            'last_note': tones[-1],
            'correct_answer': tones,
            'play_mode': 'sequence'
        }
    
    def guess_answer(self, answer: List[str]) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        is_correct = (answer == self.m_question)
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or not self.m_question:
            return None
        
        return {
            'tone_sequence': self.m_question,
            'mode': 'twelvetone'
        }


class ToneInContextTeacher(Teacher):
    """调内音识别 Teacher - 来自 solfege/exercises/toneincontext.py"""
    
    RESOLVE_MAJOR = {
        0: "c2", 1: "cis c2", 2: "d c2", 3: "dis4 d8 c2",
        4: "e4 d8 c2", 5: "f4 e8 d c2", 6: "fis4 g8 a b c'2",
        7: "g4 a8 b c'2", 8: "gis4 a8 b c'2", 9: "a4 b8 c'2",
        10: "ais4 b8 c'2", 11: "b4 c'2", 12: "c'2"
    }
    RESOLVE_MINOR = {
        0: "c2", 1: "des c2", 2: "d c2", 3: "es4 d8 c2",
        4: "e4 es8 d c2", 5: "f4 es8 d c2", 6: "fis4 g8 as bes c'2",
        7: "g4 as8 bes c'2", 8: "as4 bes8 c'2", 9: "a4 bes8 c'2",
        10: "bes4 c'2", 11: "b4 c'2", 12: "c'2"
    }
    
    CADENCE_MAJOR = {'music': r"\staff\relative g'{ \time 3/4 <g e c> <a f c> <g f d b> <g2 e c> }", 'name': 'Major', 'key': 'major'}
    CADENCE_MINOR = {'music': r"\staff\relative g'{ \time 3/4 <g es c> <as f c> <g f d b> <g2 es c> }", 'name': 'Minor', 'key': 'minor'}
    
    def __init__(self, config: dict = None):
        super().__init__("toneincontext")
        self.config = config or {}
        
        self.tones = self.config.get("tones", list(range(13)))
        self.many_octaves = self.config.get("many_octaves", False)
        self.bpm = self.config.get("bpm", 90)
        
        self.m_tone = None
        self.m_octave = 0
        self.m_transpose = MusicalPitch()
        self.m_cadence = None
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的调内音识别问题"""
        self.q_status = self.QSTATUS_NEW
        
        v = self.tones[:]
        if 0 in v and 12 in v:
            del v[v.index(12)]
        
        self.m_tone = random.choice(v)
        
        if self.many_octaves:
            self.m_octave = random.choice((-1, 0, 1, 2))
        else:
            self.m_octave = 0
        
        # 随机选择大调或小调
        self.m_cadence = random.choice([self.CADENCE_MAJOR, self.CADENCE_MINOR])
        
        # 随机转调
        if random.random() > 0.5:
            self.m_transpose.randomize("cis'", "b'")
        else:
            self.m_transpose.set_from_notename("c'")
        
        tone_in_cadence = self.m_tone if self.m_tone < 12 else 0
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'toneincontext',
            'tone': self.m_tone,
            'tone_name': self._get_tone_name(tone_in_cadence),
            'octave': self.m_octave,
            'cadence_type': self.m_cadence['key'],
            'transpose': self.m_transpose.get_octave_notename(),
            'correct_answer': tone_in_cadence,
            'options': list(range(13)),
            'option_labels': ['1', '♯1/♭2', '2', '♯2/♭3', '3', '4', '♯4/♭5',
                            '5', '♯5/6♭', '6', '♯6/♭7', '7', '1']
        }
    
    def _get_tone_name(self, tone: int) -> str:
        """获取音名"""
        names = ['1', '♯1/♭2', '2', '♯2/♭3', '3', '4', '♯4/♭5',
                '5', '♯5/6♭', '6', '♯6/♭7', '7', '1']
        return names[tone] if 0 <= tone < len(names) else str(tone)
    
    def guess_answer(self, answer: int) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        correct = self.m_tone if self.m_tone < 12 else 0
        is_correct = (answer == correct or (answer == 12 and correct == 0))
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO:
            return None
        
        return {
            'tone': self.m_tone,
            'octave': self.m_octave,
            'cadence': self.m_cadence,
            'transpose': self.m_transpose.get_octave_notename(),
            'bpm': self.bpm
        }


# ==================== Teacher 实现 - 视唱练耳和比较音程 ====================

class SolmisationTeacher(Teacher):
    """视唱练耳 Teacher - 来自 solfege/exercises/solmisation.py"""
    
    SOLMISATION_ELEMENTS = [
        (1, 4, -1, 8, 11, -1, 15, 18, 21, -1, 25, 28, -1, 32),
        (0, 3, 6, 7, 10, 13, 14, 17, 20, 23, 24, 27, 30, 31, 34),
        (2, 5, -1, 9, 12, -1, 16, 19, 22, -1, 26, 29, -1, 33)
    ]
    
    def __init__(self, config: dict = None):
        super().__init__("solmisation")
        self.config = config or {}
        
        self.num_notes = self.config.get("num_notes", 4)
        self.show_first_note = self.config.get("show_first_note", False)
        self.play_cadence = self.config.get("play_cadence", True)
        self.bpm = self.config.get("bpm", 90)
        
        self.m_question = []
        self.m_transpose = MusicalPitch()
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的视唱练耳问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 生成随机旋律
        self.m_question = [random.choice([0, 1, 2, 3, 4, 5, 7, 8, 10, 11]) for _ in range(self.num_notes)]
        
        # 随机转调
        self.m_transpose.randomize("c'", "b'")
        
        melody_string = " ".join([SOLMISATION_SYLLABLES[i] if i >= 0 else "" for i in self.m_question])
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'solmisation',
            'melody_indices': self.m_question,
            'melody_string': melody_string,
            'first_note': self.m_question[0] if self.show_first_note else None,
            'transpose': self.m_transpose.get_octave_notename(),
            'correct_answer': self.m_question,
            'num_notes': self.num_notes,
            'bpm': self.bpm,
            'play_mode': 'melody'
        }
    
    def guess_answer(self, answer: List[int]) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        is_correct = (answer == self.m_question)
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO:
            return None
        
        return {
            'melody': self.m_question,
            'transpose': self.m_transpose.get_octave_notename(),
            'bpm': self.bpm,
            'mode': 'solmisation'
        }


class CompareIntervalsTeacher(Teacher):
    """比较音程 Teacher - 来自 solfege/exercises/compareintervals.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("compareintervals")
        self.config = config or {}
        
        self.first_interval_up = self.config.get("first_interval_up", list(range(1, 13)))
        self.first_interval_down = self.config.get("first_interval_down", [])
        self.last_interval_up = self.config.get("last_interval_up", list(range(1, 13)))
        self.last_interval_down = self.config.get("last_interval_down", [])
        self.first_interval_type = self.config.get("first_interval_type", "harmonic")
        self.last_interval_type = self.config.get("last_interval_type", "harmonic")
        
        self.m_intervals = []
        self.m_tonikas = []
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的比较音程问题"""
        self.q_status = self.QSTATUS_NEW
        
        first = self.first_interval_up + [-a for a in self.first_interval_down]
        last = self.last_interval_up + [-a for a in self.last_interval_down]
        
        if not (first and last):
            first = list(range(1, 13))
            last = list(range(1, 13))
        
        self.m_intervals = [random.choice(first), random.choice(last)]
        self.m_tonikas = [
            MusicalPitch().randomize("f", "f'"),
            MusicalPitch().randomize("f", "f'")
        ]
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'compareintervals',
            'intervals': self.m_intervals,
            'tonikas': [t.get_octave_notename() for t in self.m_tonikas],
            'interval_types': [self.first_interval_type, self.last_interval_type],
            'correct_answer': self._get_comparison_result(),
            'options': [-1, 0, 1],  # -1: first is largest, 0: equal, 1: last is largest
            'option_labels': ['First interval is largest', 'The intervals are equal', 'Last interval is largest']
        }
    
    def _get_comparison_result(self) -> int:
        """获取比较结果"""
        if abs(self.m_intervals[1]) > abs(self.m_intervals[0]):
            return 1
        elif abs(self.m_intervals[1]) < abs(self.m_intervals[0]):
            return -1
        else:
            return 0
    
    def guess_answer(self, answer: int) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        is_correct = (answer == self._get_comparison_result())
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO:
            return None
        
        return {
            'intervals': self.m_intervals,
            'tonikas': self.m_tonikas,
            'interval_types': [self.first_interval_type, self.last_interval_type]
        }


# ==================== Teacher 实现 - 唱音程和唱和弦 ====================

class SingIntervalTeacher(Teacher):
    """唱音程 Teacher - 来自 solfege/exercises/singinterval.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("sing_interval")
        self.config = config or {}
        
        self.intervals = self.config.get("intervals", list(range(1, 13)))
        self.number_of_intervals = self.config.get("number_of_intervals", 1)
        self.range_low = self.config.get("range_low", 48)
        self.range_high = self.config.get("range_high", 84)
        
        self.m_tonika = None
        self.m_question = []
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的唱音程问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 随机选择音程
        if self.number_of_intervals == 1:
            self.m_question = [random.choice(self.intervals)]
        else:
            self.m_question = [random.choice(self.intervals) for _ in range(self.number_of_intervals)]
        
        # 随机选择起始音
        self.m_tonika = MusicalPitch()
        self.m_tonika.randomize(self.range_low, self.range_high)
        
        # 计算目标音符
        current = self.m_tonika.clone()
        notes = [current.semitone_pitch()]
        for interval in self.m_question:
            current = current + interval
            notes.append(current.semitone_pitch())
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'sing_interval',
            'first_note': self.m_tonika.get_octave_notename(),
            'first_note_midi': self.m_tonika.semitone_pitch(),
            'intervals': self.m_question,
            'target_notes': notes,
            'target_note_names': [MusicalPitch.new_from_int(n).get_octave_notename() for n in notes],
            'correct_answer': self.m_question,
            'number_of_intervals': self.number_of_intervals
        }
    
    def guess_answer(self, answer: Any) -> bool:
        """唱音程没有自动判断，用户自行确认"""
        self.q_status = self.QSTATUS_SOLVED
        return True
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or not self.m_tonika:
            return None
        
        current = self.m_tonika.clone()
        notes = [current.semitone_pitch()]
        for interval in self.m_question:
            current = current + interval
            notes.append(current.semitone_pitch())
        
        return {
            'first_note': self.m_tonika.semitone_pitch(),
            'intervals': self.m_question,
            'mode': 'sing_interval'
        }


class SingChordTeacher(Teacher):
    """唱和弦 Teacher - 来自 solfege/exercises/singchord.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("sing_chord")
        self.config = config or {}
        
        self.chord_types = self.config.get("chord_types", ["major", "minor", "diminished", "augmented"])
        self.range_low = self.config.get("range_low", 48)
        self.range_high = self.config.get("range_high", 72)
        
        self.m_chord_type = None
        self.m_root = None
        self.m_notes = []
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的唱和弦问题"""
        self.q_status = self.QSTATUS_NEW
        
        chord_id = random.choice(self.chord_types)
        self.m_chord_type = next((ct for ct in CHORD_TYPES if ct["id"] == chord_id), CHORD_TYPES[0])
        
        root_midi = random.randint(self.range_low, self.range_high - 12)
        self.m_root = MusicalPitch.new_from_int(root_midi)
        
        self.m_notes = [root_midi + interval for interval in self.m_chord_type["intervals"]]
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'sing_chord',
            'root_note': self.m_root.get_octave_notename(),
            'root_note_midi': root_midi,
            'chord_type': self.m_chord_type["id"],
            'chord_type_name': self.m_chord_type["name"],
            'notes': self.m_notes,
            'note_names': [MusicalPitch.new_from_int(n).get_octave_notename() for n in self.m_notes],
            'correct_answer': chord_id
        }
    
    def guess_answer(self, answer: Any) -> bool:
        """唱和弦没有自动判断"""
        self.q_status = self.QSTATUS_SOLVED
        return True
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or not self.m_notes:
            return None
        
        return {
            'notes': self.m_notes,
            'mode': 'sing_chord'
        }


# ==================== Teacher 实现 - 节奏打拍和节奏听写 ====================

class RhythmTappingTeacher(Teacher):
    """节奏打拍 Teacher - 来自 solfege/exercises/rhythmtapping.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("rhythm_tapping")
        self.config = config or {}
        
        self.num_beats = self.config.get("num_beats", 4)
        self.bpm = self.config.get("bpm", 60)
        self.count_in = self.config.get("count_in", 2)
        
        self.m_rhythm = None
        self.m_tap_times = []
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的节奏打拍问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 生成随机节奏
        self.m_rhythm = [random.choice([0, 1, 2, 3]) for _ in range(self.num_beats)]
        
        # 0: quarter, 1: eighth, 2: sixteenth, 3: rest
        rhythm_names = ['quarter', 'eighth', 'sixteenth', 'rest']
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'rhythm_tapping',
            'rhythm': self.m_rhythm,
            'rhythm_names': [rhythm_names[r] for r in self.m_rhythm],
            'num_beats': self.num_beats,
            'bpm': self.bpm,
            'count_in': self.count_in,
            'correct_answer': self.m_rhythm
        }
    
    def guess_answer(self, answer: List[int]) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        is_correct = (answer == self.m_rhythm)
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO:
            return None
        
        return {
            'rhythm': self.m_rhythm,
            'bpm': self.bpm,
            'count_in': self.count_in,
            'mode': 'rhythm_tapping'
        }


class RhythmDictationTeacher(Teacher):
    """节奏听写 Teacher - 来自 solfege/exercises/rhythmdictation.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("rhythm_dictation")
        self.config = config or {}
        
        self.num_beats = self.config.get("num_beats", 4)
        self.bpm = self.config.get("bpm", 60)
        self.count_in = self.config.get("count_in", 2)
        
        self.m_rhythm = None
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的节奏听写问题"""
        self.q_status = self.QSTATUS_NEW
        
        self.m_rhythm = [random.choice(self.config.get("elements", list(range(len(RHYTHMS))))) 
                        for _ in range(self.num_beats)]
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'rhythm_dictation',
            'rhythm_indices': self.m_rhythm,
            'rhythm_string': " ".join([RHYTHMS[i] for i in self.m_rhythm]),
            'num_beats': self.num_beats,
            'bpm': self.bpm,
            'count_in': self.count_in,
            'correct_answer': self.m_rhythm,
            'options': list(range(len(RHYTHMS))),
            'rhythm_names': RHYTHMS
        }
    
    def guess_answer(self, answer: List[int]) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        is_correct = (answer == self.m_rhythm)
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO:
            return None
        
        return {
            'rhythm_string': " ".join([RHYTHMS[i] for i in self.m_rhythm]),
            'bpm': self.bpm,
            'count_in': self.count_in,
            'mode': 'rhythm_dictation'
        }


# ==================== Teacher 实现 - 旋律听写 ====================

class DictationTeacher(Teacher):
    """旋律听写 Teacher - 来自 solfege/exercises/dictation.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("dictation")
        self.config = config or {}
        
        self.num_notes = self.config.get("num_notes", 4)
        self.scale_type = self.config.get("scale_type", "major")
        self.key_note = self.config.get("key_note", 60)
        self.bpm = self.config.get("bpm", 60)
        
        self.m_melody = None
        self.m_music_string = None
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的旋律听写问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 生成随机旋律
        key_pitches = KEY_DATA.get(self.scale_type, KEY_DATA['major'])['pitches']
        base_pitch_class = MusicalPitch.new_from_int(self.key_note).pitch_class()
        
        self.m_melody = []
        for _ in range(self.num_notes):
            octave_shift = random.randint(-1, 1)
            pitch_class = random.choice(key_pitches)
            midi = base_pitch_class + pitch_class + 48 + octave_shift * 12
            self.m_melody.append(midi)
        
        # 生成音乐字符串
        note_names = [MusicalPitch.new_from_int(n).get_octave_notename() for n in self.m_melody]
        self.m_music_string = " ".join(note_names)
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'dictation',
            'melody': self.m_melody,
            'melody_string': self.m_music_string,
            'note_names': note_names,
            'key_note': self.key_note,
            'scale_type': self.scale_type,
            'num_notes': self.num_notes,
            'bpm': self.bpm,
            'correct_answer': self.m_melody,
            'play_mode': 'melody'
        }
    
    def guess_answer(self, answer: List[int]) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        is_correct = (answer == self.m_melody)
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO:
            return None
        
        return {
            'melody': self.m_melody,
            'bpm': self.bpm,
            'mode': 'dictation'
        }


# ==================== Teacher 实现 - 元素构建 ====================

class ElemBuilderTeacher(Teacher):
    """元素构建 Teacher - 来自 solfege/exercises/elembuilder.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("elembuilder")
        self.config = config or {}
        
        self.elements = self.config.get("elements", [
            {"name": "c", "label": "Whole Note"},
            {"name": "c2", "label": "Half Note"},
            {"name": "c4", "label": "Quarter Note"},
            {"name": "c8", "label": "Eighth Note"},
            {"name": "r4", "label": "Quarter Rest"},
            {"name": "c4.", "label": "Dotted Quarter"}
        ])
        
        self.m_question = None
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的元素构建问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 随机选择元素序列
        num_elements = random.randint(2, 4)
        self.m_question = [random.choice(self.elements) for _ in range(num_elements)]
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'elembuilder',
            'elements': self.m_question,
            'element_names': [e["name"] for e in self.m_question],
            'element_labels': [e["label"] for e in self.m_question],
            'correct_answer': [e["name"] for e in self.m_question],
            'available_elements': self.elements,
            'play_mode': 'sequence'
        }
    
    def guess_answer(self, answer: List[str]) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        correct_answer = [e["name"] for e in self.m_question]
        is_correct = (answer == correct_answer)
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or not self.m_question:
            return None
        
        return {
            'elements': self.m_question,
            'mode': 'elembuilder'
        }


# ==================== Teacher 实现 - 音程命名识别 ====================

class NameIntervalTeacher(Teacher):
    """音程命名识别 Teacher - 来自 solfege/exercises/nameinterval.py"""
    
    INTERVAL_QUALITIES = ['d1', 'p1', 'a1', 'd2', 'm2', 'M2', 'a2',
                         'd3', 'm3', 'M3', 'a3', 'd4', 'p4', 'a4',
                         'd5', 'p5', 'a5', 'd6', 'm6', 'M6', 'a6',
                         'd7', 'm7', 'M7', 'a7', 'd8', 'p8', 'a8',
                         'd9', 'm9', 'M9', 'a9', 'd10', 'm10', 'M10', 'a10']
    
    CLEFS = ['violin', 'treble', 'subbass', 'bass', 'baritone',
             'varbaritone', 'tenor', 'alto', 'mezzosoprano', 'french']
    
    def __init__(self, config: dict = None):
        super().__init__("nameinterval")
        self.config = config or {}
        
        # 配置音程选项
        self.intervals = self.config.get("intervals", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
        self.accidentals = self.config.get("accidentals", 1)
        self.clef = self.config.get("clef", "violin")
        self.tones_range = self.config.get("tones_range", (36, 96))
        
        self.m_interval = None
        self.m_low_pitch = None
        self.m_answered_quality = None
        self.m_answered_number = None
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的音程命名问题"""
        self.q_status = self.QSTATUS_NEW
        self.m_answered_quality = None
        self.m_answered_number = None
        
        # 随机选择音程
        semitones = random.choice(self.intervals) if isinstance(self.intervals, list) else random.randint(1, 12)
        
        # 随机选择根音
        low = self.tones_range[0]
        high = self.tones_range[1] - semitones
        self.m_low_pitch = MusicalPitch.new_from_int(random.randint(low, high))
        
        # 创建音程
        self.m_interval = Interval.new_from_int(semitones)
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'nameinterval',
            'low_note': self.m_low_pitch.get_octave_notename(),
            'high_note': (self.m_low_pitch + self.m_interval).get_octave_notename(),
            'semitones': semitones,
            'correct_answer': self.m_interval.get_cname_short(),
            'correct_answer_quality': self.m_interval.get_quality_short(),
            'correct_answer_number': self.m_interval.steps(),
            'interval_info': {
                'name': self.m_interval.get_name(),
                'short': self.m_interval.get_cname_short(),
                'semitones': semitones,
                'steps': self.m_interval.steps(),
                'quality': self.m_interval.get_quality_short()
            },
            'options': self._get_all_interval_options(),
            'quality_options': ['d', 'm', 'M', 'p', 'a'],
            'number_options': list(range(1, 9)),
            'clef': self.clef
        }
    
    def _get_all_interval_options(self) -> List[str]:
        """获取所有可能的音程选项"""
        options = []
        for q in ['d', 'm', 'M', 'p', 'a']:
            for n in range(1, 9):
                try:
                    interval = Interval(f"{q}{n}")
                    if interval.get_intvalue() in self.intervals or interval.steps() in self.intervals:
                        options.append(interval.get_cname_short())
                except:
                    pass
        return options
    
    def answer_quality(self, quality: str) -> bool:
        """回答音程性质"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        self.m_answered_quality = quality
        return self._check_answer()
    
    def answer_number(self, number: int) -> bool:
        """回答音程数"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        self.m_answered_number = number
        return self._check_answer()
    
    def _check_answer(self) -> bool:
        """检查答案是否完整且正确"""
        if not self.answer_complete():
            return False
        
        is_correct = self.answered_correctly()
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def answer_complete(self) -> bool:
        """检查答案是否完整"""
        return self.m_answered_quality is not None or self.m_interval.get_quality_short() in ['p', 'M', 'm']
    
    def answered_correctly(self) -> bool:
        """检查是否回答正确"""
        quality = self.m_answered_quality or self.m_interval.get_quality_short()
        number = self.m_answered_number or self.m_interval.steps()
        
        try:
            user_interval = Interval(f"{quality}{number}")
        except:
            return False
        
        return user_interval == self.m_interval
    
    def guess_answer(self, answer: Union[str, Dict]) -> bool:
        """判断答案是否正确 - 支持单次回答或分步回答"""
        if isinstance(answer, dict):
            # 分步回答
            if 'quality' in answer:
                return self.answer_quality(answer['quality'])
            elif 'number' in answer:
                return self.answer_number(answer['number'])
            return False
        elif isinstance(answer, str):
            # 单次完整回答
            if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
                return False
            
            try:
                user_interval = Interval(answer)
            except:
                return False
            
            is_correct = (user_interval == self.m_interval)
            
            if is_correct:
                self.q_status = self.QSTATUS_SOLVED
            else:
                self.q_status = self.QSTATUS_WRONG
            
            return is_correct
        
        return False
    
    def get_music_string(self) -> str:
        """获取乐谱字符串"""
        if self.m_low_pitch is None:
            return ""
        
        return rf"\staff{{ \clef {self.clef} \stemUp {self.m_low_pitch.get_octave_notename()} {(self.m_low_pitch + self.m_interval).get_octave_notename()} }}"
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or self.m_low_pitch is None:
            return None
        
        note1 = self.m_low_pitch.semitone_pitch()
        note2 = (self.m_low_pitch + self.m_interval).semitone_pitch()
        
        return {
            'notes': [note1, note2],
            'mode': 'harmonic',
            'music_string': self.get_music_string()
        }


# ==================== Teacher 实现 - 属性识别 ====================

class IdPropertyTeacher(Teacher):
    """属性识别 Teacher - 来自 solfege/exercises/idproperty.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("idproperty")
        self.config = config or {}
        
        # 配置属性
        self.properties = self.config.get("properties", ['name', 'inversion', 'toptone'])
        self.property_labels = self.config.get("property_labels", ['Name', 'Inversion', 'Toptone'])
        
        # 预设的和弦/音程数据
        self.m_chords = [
            {"name": "Major", "inversion": 0, "toptone": 5},
            {"name": "Minor", "inversion": 0, "toptone": 5},
            {"name": "Diminished", "inversion": 0, "toptone": 5},
            {"name": "Augmented", "inversion": 0, "toptone": 5},
            {"name": "Major 7th", "inversion": 0, "toptone": 5},
            {"name": "Minor 7th", "inversion": 0, "toptone": 5},
            {"name": "Dominant 7th", "inversion": 0, "toptone": 5},
        ]
        
        self.m_question = None
        self.m_solved = {}
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的属性识别问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 随机选择和弦/音程
        self.m_question = random.choice(self.m_chords)
        self.m_solved = {prop: False for prop in self.properties}
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'idproperty',
            'question': self.m_question,
            'properties': self.properties,
            'property_labels': self.property_labels,
            'correct_answers': {prop: self.m_question.get(prop) for prop in self.properties},
            'solved': self.m_solved.copy(),
            'options': self._get_property_options()
        }
    
    def _get_property_options(self) -> Dict[str, List]:
        """获取各属性的选项"""
        options = {}
        for prop in self.properties:
            if prop == 'name':
                options[prop] = [chord["name"] for chord in self.m_chords]
            elif prop == 'inversion':
                options[prop] = [0, 1, 2]
            elif prop == 'toptone':
                options[prop] = [3, 4, 5, 6, 7, 8]
        return options
    
    def guess_property(self, property_name: str, value: Any) -> int:
        """
        猜测单个属性
        返回 0 表示错误，1 表示正确，2 表示全部正确
        """
        if self.q_status != self.QSTATUS_NEW:
            return 0
        
        correct_value = self.m_question.get(property_name)
        
        if value == correct_value:
            self.m_solved[property_name] = True
            if all(self.m_solved.values()):
                self.q_status = self.QSTATUS_SOLVED
                return 2  # ALL_CORRECT
            return 1  # CORRECT
        else:
            self.q_status = self.QSTATUS_WRONG
            return 0
    
    def guess_answer(self, answer: Dict[str, Any]) -> bool:
        """判断答案是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_WRONG):
            return False
        
        is_correct = True
        for prop in self.properties:
            if answer.get(prop) != self.m_question.get(prop):
                is_correct = False
                break
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
            for prop in self.properties:
                self.m_solved[prop] = True
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or self.m_question is None:
            return None
        
        return {
            'question': self.m_question,
            'type': 'idproperty'
        }


# ==================== Teacher 实现 - 按名称识别 ====================

class IdByNameTeacher(Teacher):
    """按名称识别 Teacher - 来自 solfege/exercises/idbyname.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("idbyname")
        self.config = config or {}
        
        # 配置选项
        self.questions = self.config.get("questions", [
            {"name": "C Major", "music": "c e g"},
            {"name": "D Major", "music": "d fis a"},
            {"name": "E Major", "music": "e gis b"},
            {"name": "F Major", "music": "f a c"},
            {"name": "G Major", "music": "g b d"},
            {"name": "A Major", "music": "a cis e"},
            {"name": "B Major", "music": "b dis fis"},
        ])
        
        self.m_current_question = None
        self.m_custom_mode = False
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的按名称识别问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 随机选择问题
        self.m_current_question = random.choice(self.questions)
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'idbyname',
            'music': self.m_current_question.get("music", ""),
            'correct_answer': self.m_current_question["name"],
            'options': [q["name"] for q in self.questions],
            'question_names': [q["name"] for q in self.questions]
        }
    
    def guess_answer(self, answer: str) -> bool:
        """判断答案是否正确"""
        if self.q_status != self.QSTATUS_NEW:
            return False
        
        is_correct = (answer == self.m_current_question["name"])
        
        if is_correct:
            self.q_status = self.QSTATUS_SOLVED
        else:
            self.q_status = self.QSTATUS_WRONG
        
        return is_correct
    
    def give_up(self):
        """放弃当前问题"""
        self.q_status = self.QSTATUS_GIVE_UP
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or self.m_current_question is None:
            return None
        
        return {
            'music': self.m_current_question.get("music", ""),
            'name': self.m_current_question["name"],
            'type': 'idbyname'
        }


# ==================== Teacher 实现 - 唱歌答题 ====================

class SingAnswerTeacher(Teacher):
    """唱歌答题 Teacher - 来自 solfege/exercises/singanswer.py"""
    
    def __init__(self, config: dict = None):
        super().__init__("singanswer")
        self.config = config or {}
        
        # 配置问题
        self.questions = self.config.get("questions", [
            {"question_text": "请唱出 C 音", "answer": "c'"},
            {"question_text": "请唱出 D 音", "answer": "d'"},
            {"question_text": "请唱出 E 音", "answer": "e'"},
            {"question_text": "请唱出 F 音", "answer": "f'"},
            {"question_text": "请唱出 G 音", "answer": "g'"},
            {"question_text": "请唱出 A 音", "answer": "a'"},
            {"question_text": "请唱出 B 音", "answer": "b'"},
        ])
        
        self.m_current_question = None
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的唱歌答题问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 随机选择问题
        self.m_current_question = random.choice(self.questions)
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'singanswer',
            'question_text': self.m_current_question["question_text"],
            'correct_answer': self.m_current_question["answer"],
            'answer_note': self.m_current_question["answer"],
            'has_music_display': False
        }
    
    def guess_answer(self, answer: Any) -> bool:
        """
        唱歌答题由用户自行判断对错
        这里假设用户点击"正确"时传入 True，"错误"时传入 False
        """
        self.q_status = self.QSTATUS_SOLVED
        return True
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or self.m_current_question is None:
            return None
        
        return {
            'question_text': self.m_current_question["question_text"],
            'answer_note': self.m_current_question["answer"],
            'type': 'singanswer'
        }
    
    def play_answer(self) -> Dict[str, Any]:
        """播放答案"""
        if self.m_current_question is None:
            return None
        
        return {
            'answer_note': self.m_current_question["answer"],
            'type': 'singanswer'
        }


# ==================== Teacher 实现 - 和弦转位识别 ====================

class ChordVoicingTeacher(Teacher):
    """和弦转位识别 Teacher - 来自 solfege/exercises/chordvoicing.py"""
    
    OK = 0
    ERR_PICKY = 1
    
    def __init__(self, config: dict = None):
        super().__init__("chordvoicing")
        self.config = config or {}
        
        # 配置选项
        self.accidentals = self.config.get("accidentals", 1)
        self.key = self.config.get("key", "c")
        self.semitones = self.config.get("semitones", [0, 3, 4, 5, 7, 8, 9])
        self.atonal = self.config.get("atonal", True)
        
        # 和弦类型数据
        self.chord_types = self.config.get("chord_types", [
            {"name": "Major", "intervals": [0, 4, 7]},
            {"name": "Minor", "intervals": [0, 3, 7]},
            {"name": "Diminished", "intervals": [0, 3, 6]},
            {"name": "Augmented", "intervals": [0, 4, 8]},
            {"name": "Major 7th", "intervals": [0, 4, 7, 11]},
            {"name": "Minor 7th", "intervals": [0, 3, 7, 10]},
            {"name": "Dominant 7th", "intervals": [0, 4, 7, 10]},
        ])
        
        self.m_chord_type = None
        self.m_notes = []
        self.m_sorted_notes = []
        self.m_user_voicing = []
    
    def new_question(self) -> Dict[str, Any]:
        """生成新的和弦转位识别问题"""
        self.q_status = self.QSTATUS_NEW
        
        # 随机选择和弦类型
        self.m_chord_type = random.choice(self.chord_types)
        
        # 生成和弦音符
        root = random.randint(48, 60)
        self.m_notes = [root + interval for interval in self.m_chord_type["intervals"]]
        
        # 排序后的音符（用于比较转位）
        self.m_sorted_notes = sorted([n % 12 for n in self.m_notes])
        
        # 随机选择转位
        if len(self.m_notes) >= 3 and random.random() > 0.5:
            # 执行转位
            inversion = random.randint(1, len(self.m_notes) - 1)
            self.m_notes = self.m_notes[inversion:] + [n + 12 for n in self.m_notes[:inversion]]
        else:
            inversion = 0
        
        self.m_user_voicing = []
        
        note_names = [MusicalPitch.new_from_int(n).get_octave_notename() for n in self.m_notes]
        
        return {
            'question_id': str(uuid.uuid4()),
            'type': 'chordvoicing',
            'chord_type': self.m_chord_type["name"],
            'chord_intervals': self.m_chord_type["intervals"],
            'notes': self.m_notes,
            'note_names': note_names,
            'inversion': inversion,
            'correct_answer': self.m_chord_type["name"],
            'correct_answer_inversion': inversion,
            'all_chord_types': [ct["name"] for ct in self.chord_types],
            'play_mode': 'chord'
        }
    
    def guess_chordtype(self, chord_type_name: str) -> bool:
        """判断和弦类型是否正确"""
        if self.q_status not in (self.QSTATUS_NEW, self.QSTATUS_TYPE_WRONG):
            return False
        
        if chord_type_name == self.m_chord_type["name"]:
            self.q_status = self.QSTATUS_TYPE_SOLVED
            return True
        else:
            self.q_status = self.QSTATUS_TYPE_WRONG
            return False
    
    def guess_voicing(self, notes: List[int]) -> bool:
        """判断和弦音位排列是否正确"""
        if self.q_status != self.QSTATUS_TYPE_SOLVED:
            return False
        
        # 将用户答案转换为 pitch class 并排序
        user_sorted = sorted([n % 12 for n in notes])
        
        # 检查答案
        if user_sorted == self.m_sorted_notes:
            self.q_status = self.QSTATUS_VOICING_SOLVED
            return True
        else:
            self.q_status = self.QSTATUS_VOICING_WRONG
            return False
    
    def guess_answer(self, answer: Union[str, Dict]) -> bool:
        """判断答案是否正确"""
        if isinstance(answer, dict):
            # 分步回答
            if 'chord_type' in answer:
                return self.guess_chordtype(answer['chord_type'])
            elif 'voicing' in answer:
                return self.guess_voicing(answer['voicing'])
            return False
        elif isinstance(answer, str):
            # 单次完整回答（只检查和弦类型）
            return self.guess_chordtype(answer)
        return False
    
    def give_up(self):
        """放弃当前问题"""
        self.q_status = self.QSTATUS_VOICING_SOLVED
    
    def play_question(self) -> Dict[str, Any]:
        """返回播放数据"""
        if self.q_status == self.QSTATUS_NO or not self.m_notes:
            return None
        
        return {
            'notes': self.m_notes,
            'mode': 'chord',
            'chord_type': self.m_chord_type["name"] if self.m_chord_type else None,
            'inversion': getattr(self, 'inversion', 0)
        }


# ==================== 辅助函数 ====================

def generate_question_id() -> str:
    """生成唯一问题ID"""
    return str(uuid.uuid4())


def parse_intervals_list(intervals: List[str]) -> List[int]:
    """解析音程字符串列表"""
    result = []
    interval_map = {iv['abbr'].lower(): iv['semitones'] for iv in INTERVALS}
    interval_map.update({str(iv['semitones']): iv['semitones'] for iv in INTERVALS})
    interval_map.update({iv['name'].lower().replace(' ', ''): iv['semitones'] for iv in INTERVALS})
    
    for interval in intervals:
        interval = interval.strip().lower()
        if interval in interval_map:
            result.append(interval_map[interval])
    
    return result if result else list(range(1, 13))


def get_interval_info(semitones: int) -> Optional[Dict]:
    """获取音程信息"""
    return next((iv for iv in INTERVALS if iv['semitones'] == semitones), None)


def get_chord_info(chord_id: str) -> Optional[Dict]:
    """获取和弦信息"""
    return next((ct for ct in CHORD_TYPES if ct["id"] == chord_id), None)


def mpd_notename_to_int(notename: str) -> int:
    """将音名转换为 MIDI 整数"""
    try:
        p = MusicalPitch.new_from_notename(notename)
        return p.semitone_pitch()
    except:
        return 60


# ==================== 全局实例 ====================

session_manager = SessionManager()
stats_db = StatisticsDB()


# ==================== API 端点 ====================

@app.get("/")
async def root():
    """根路径 - 返回 API 信息"""
    return {
        "name": "Solfege API",
        "version": "4.1.0",
        "description": "视唱练耳训练系统 Web API - 基于 GNU Solfege 核心模块",
        "has_solfege_core": HAS_SOLFEGE_CORE,
        "docs_url": "/api/docs",
        "endpoints": {
            "sessions": "/api/sessions",
            "exercises": "/api/exercises",
            "statistics": "/api/statistics",
            "constants": "/api/constants"
        }
    }


# 会话管理端点

@app.post("/api/session/create", response_model=dict, tags=["会话"])
def create_session(request: SessionCreateRequest):
    """创建新的训练会话"""
    session_id = session_manager.create_session(
        exercise_type=request.exercise_type.value,
        user_config=request.user_config
    )
    session = session_manager.get_session(session_id)
    return {
        "session_id": session_id,
        "exercise_type": session["exercise_type"],
        "created_at": datetime.fromtimestamp(session["created_at"]).isoformat(),
        "message": "会话创建成功"
    }


@app.get("/api/sessions", response_model=List[SessionInfo], tags=["会话"])
def list_sessions():
    """获取所有会话列表"""
    return stats_db.get_all_sessions()


@app.get("/api/session/{session_id}", response_model=dict, tags=["会话"])
def get_session(session_id: str):
    """获取指定会话的详细信息"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    stats = stats_db.get_session_statistics(session_id)
    return {
        "session_id": session["session_id"],
        "exercise_type": session["exercise_type"],
        "created_at": datetime.fromtimestamp(session["created_at"]).isoformat(),
        "question_count": session["question_count"],
        "correct_count": session["correct_count"],
        "statistics": stats.model_dump()
    }


@app.delete("/api/session/{session_id}", tags=["会话"])
def delete_session(session_id: str):
    """删除指定会话"""
    if session_manager.delete_session(session_id):
        return {"message": "会话已删除"}
    raise HTTPException(status_code=404, detail="会话不存在")


@app.post("/api/session/{session_id}/close", tags=["会话"])
def close_session(session_id: str):
    """关闭指定会话"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    stats_db.close_session(session_id)
    return {"message": "会话已关闭"}


# 问题生成端点

@app.post("/api/new_question", response_model=QuestionResponse, tags=["练习"])
def generate_new_question(session_id: str, config: Optional[Dict[str, Any]] = None):
    """为指定会话生成新问题"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    teacher = session.get("teacher")
    if not teacher:
        raise HTTPException(status_code=400, detail="该会话类型的 Teacher 未实现")
    
    if config:
        session["user_config"].update(config)
        exercise_type = session["exercise_type"]
        teacher_class_map = {
            "harmonic_interval": HarmonicIntervalTeacher,
            "melodic_interval": MelodicIntervalTeacher,
            "idtone": IdToneTeacher,
            "chord": ChordTeacher,
            "chordvoicing": ChordVoicingTeacher,
            "rhythm": RhythmTeacher,
            "bpm": BPMTeacher,
            "twelvetone": TwelveToneTeacher,
            "toneincontext": ToneInContextTeacher,
            "solmisation": SolmisationTeacher,
            "sing_interval": SingIntervalTeacher,
            "sing_chord": SingChordTeacher,
            "compareintervals": CompareIntervalsTeacher,
            "rhythm_tapping": RhythmTappingTeacher,
            "rhythm_dictation": RhythmDictationTeacher,
            "dictation": DictationTeacher,
            "elembuilder": ElemBuilderTeacher,
        }
        teacher_class = teacher_class_map.get(exercise_type)
        if teacher_class:
            teacher = teacher_class(session["user_config"])
            session["teacher"] = teacher
    
    try:
        question_data = teacher.new_question()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成问题时出错: {str(e)}")
    
    question_id = question_data.pop("question_id", generate_question_id())
    session["question_count"] += 1
    session["current_question"] = question_id
    session["current_question_data"] = question_data.copy()
    session["question_start_time"] = time.time()
    
    stats_db.save_question(
        question_id=question_id,
        session_id=session_id,
        question_type=session["exercise_type"],
        question_data=question_data,
        correct_answer=question_data.get("correct_answer")
    )
    
    return QuestionResponse(
        question_id=question_id,
        type=question_data.get("type", session["exercise_type"]),
        data=question_data,
        correct_answer=question_data.get("correct_answer"),
        correct_answer_name=question_data.get("correct_answer_name"),
        options=question_data.get("options"),
        play_mode=question_data.get("play_mode")
    )


@app.post("/api/evaluate", response_model=AnswerResponse, tags=["练习"])
def evaluate_answer(request: AnswerSubmitRequest):
    """提交答案并获取结果"""
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    teacher = session.get("teacher")
    if not teacher:
        raise HTTPException(status_code=400, detail="该会话类型的 Teacher 未实现")
    
    time_taken = 0
    if session.get("question_start_time"):
        time_taken = int((time.time() - session["question_start_time"]) * 1000)
    
    try:
        is_correct = teacher.guess_answer(request.answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"判断答案时出错: {str(e)}")
    
    current_question = session.get("current_question")
    if current_question:
        is_new_record = stats_db.save_answer(current_question, request.answer, is_correct, time_taken)
    else:
        is_new_record = False
    
    stats_db.update_user_statistics(is_correct=is_correct, time_taken=time_taken)
    
    if is_correct:
        session["correct_count"] += 1
    
    correct_answer = None
    correct_answer_name = None
    question_data = session.get("current_question_data", {})
    
    if "correct_answer" in question_data:
        correct_answer = question_data["correct_answer"]
        correct_answer_name = question_data.get("correct_answer_name")
    elif hasattr(teacher, 'm_interval'):
        correct_answer = abs(teacher.m_interval)
        interval_info = get_interval_info(abs(teacher.m_interval))
        if interval_info:
            correct_answer_name = interval_info["name"]
    elif hasattr(teacher, 'm_chord_type'):
        correct_answer = teacher.m_chord_type["id"]
        correct_answer_name = teacher.m_chord_type["name"]
    elif hasattr(teacher, 'm_bpm'):
        correct_answer = teacher.m_bpm
        correct_answer_name = f"{teacher.m_bpm} BPM"
    
    feedback = "回答正确！" if is_correct else f"正确答案是: {correct_answer_name or correct_answer}"
    
    return AnswerResponse(
        correct=is_correct,
        correct_answer=correct_answer,
        correct_answer_name=correct_answer_name,
        is_new_record=is_new_record,
        feedback=feedback
    )


@app.post("/api/play_question/{session_id}", response_model=dict, tags=["练习"])
def play_question(session_id: str):
    """获取问题的播放数据"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    teacher = session.get("teacher")
    if not teacher or not hasattr(teacher, 'play_question'):
        raise HTTPException(status_code=400, detail="该会话不支持播放")
    
    play_data = teacher.play_question()
    if not play_data:
        raise HTTPException(status_code=400, detail="没有可播放的问题")
    
    return {
        "play_data": play_data,
        "session_id": session_id
    }


@app.post("/api/give_up/{session_id}", response_model=dict, tags=["练习"])
def give_up(session_id: str):
    """放弃当前问题"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    teacher = session.get("teacher")
    if not teacher:
        raise HTTPException(status_code=400, detail="该会话类型的 Teacher 未实现")
    
    teacher.give_up()
    
    correct_answer = None
    correct_answer_name = None
    question_data = session.get("current_question_data", {})
    
    if "correct_answer" in question_data:
        correct_answer = question_data["correct_answer"]
        correct_answer_name = question_data.get("correct_answer_name")
    elif hasattr(teacher, 'm_interval'):
        correct_answer = abs(teacher.m_interval)
        interval_info = get_interval_info(abs(teacher.m_interval))
        if interval_info:
            correct_answer_name = interval_info["name"]
    elif hasattr(teacher, 'm_chord_type'):
        correct_answer = teacher.m_chord_type["id"]
        correct_answer_name = teacher.m_chord_type["name"]
    elif hasattr(teacher, 'm_bpm'):
        correct_answer = teacher.m_bpm
        correct_answer_name = f"{teacher.m_bpm} BPM"
    
    return {
        "message": "已放弃",
        "correct_answer": correct_answer,
        "correct_answer_name": correct_answer_name
    }


# 统计端点

@app.get("/api/statistics/session/{session_id}", response_model=StatisticsResponse, tags=["统计"])
def get_session_statistics(session_id: str):
    """获取指定会话的统计信息"""
    if not session_manager.get_session(session_id):
        raise HTTPException(status_code=404, detail="会话不存在")
    return stats_db.get_session_statistics(session_id)


@app.get("/api/statistics/user/{user_id}", response_model=dict, tags=["统计"])
def get_user_statistics(user_id: str = "default"):
    """获取用户总体统计信息"""
    return stats_db.get_user_statistics(user_id)


@app.get("/api/statistics/overview", response_model=dict, tags=["统计"])
def get_statistics_overview():
    """获取统计概览"""
    sessions = stats_db.get_all_sessions()
    total_sessions = len(sessions)
    total_questions = sum(s.questions_count for s in sessions)
    total_correct = sum(s.correct_count for s in sessions)
    
    exercise_stats = {}
    for ex_type in ["harmonic_interval", "melodic_interval", "idtone", "chord", "chordvoicing", "rhythm", "bpm",
                    "twelvetone", "toneincontext", "solmisation", "compareintervals"]:
        stats = stats_db.get_exercise_stats_by_type(ex_type)
        if stats:
            exercise_stats[ex_type] = stats
    
    return {
        "total_sessions": total_sessions,
        "total_questions": total_questions,
        "total_correct": total_correct,
        "overall_accuracy": round(total_correct / total_questions * 100, 2) if total_questions > 0 else 0,
        "by_exercise_type": exercise_stats,
        "recent_sessions": [s.model_dump() for s in sessions[:10]]
    }


# 练习类型端点

@app.get("/api/exercises", response_model=dict, tags=["练习"])
def list_exercises():
    """列出所有可用的练习类型"""
    return {
        "exercises": [
            {"id": "harmonic_interval", "name": "和声音程识别", "name_en": "Harmonic Interval"},
            {"id": "melodic_interval", "name": "旋律音程识别", "name_en": "Melodic Interval"},
            {"id": "idtone", "name": "单音识别", "name_en": "Identify Tone"},
            {"id": "chord", "name": "和弦识别", "name_en": "Chord Identification"},
            {"id": "chordvoicing", "name": "和弦转位识别", "name_en": "Chord Voicing"},
            {"id": "rhythm", "name": "节奏识别", "name_en": "Rhythm Identification"},
            {"id": "bpm", "name": "节拍速度识别", "name_en": "BPM Identification"},
            {"id": "twelvetone", "name": "十二音序列", "name_en": "Twelve Tone"},
            {"id": "toneincontext", "name": "调内音识别", "name_en": "Tone in Context"},
            {"id": "solmisation", "name": "视唱练耳", "name_en": "Solmisation"},
            {"id": "sing_interval", "name": "唱音程", "name_en": "Sing Interval"},
            {"id": "sing_chord", "name": "唱和弦", "name_en": "Sing Chord"},
            {"id": "compareintervals", "name": "比较音程", "name_en": "Compare Intervals"},
            {"id": "rhythm_tapping", "name": "节奏打拍", "name_en": "Rhythm Tapping"},
            {"id": "rhythm_dictation", "name": "节奏听写", "name_en": "Rhythm Dictation"},
            {"id": "dictation", "name": "旋律听写", "name_en": "Dictation"},
            {"id": "elembuilder", "name": "元素构建", "name_en": "Element Builder"},
        ],
        "constants": {
            "intervals": INTERVALS,
            "chord_types": CHORD_TYPES,
            "rhythms": RHYTHMS,
            "bpms": BPM_VALUES,
            "solmisation": SOLMISATION_SYLLABLES,
            "key_data": KEY_DATA,
            "note_names": NOTE_NAMES,
            "instruments": INSTRUMENT_NAMES
        }
    }


@app.get("/api/constants", response_model=dict, tags=["常量"])
def get_constants():
    """获取所有常量定义"""
    return {
        "intervals": INTERVALS,
        "chord_types": CHORD_TYPES,
        "rhythms": RHYTHMS,
        "bpms": BPM_VALUES,
        "solmisation": SOLMISATION_SYLLABLES,
        "key_data": KEY_DATA,
        "note_names": NOTE_NAMES,
        "note_names_with_flat": NOTE_NAMES_WITH_FLAT,
        "instruments": INSTRUMENT_NAMES,
        "octaves": [-2, -1, 0, 1, 2, 3]
    }


@app.get("/api/intervals", response_model=List[Dict], tags=["常量"])
def get_intervals():
    """获取所有音程定义"""
    return INTERVALS


@app.get("/api/chords", response_model=List[Dict], tags=["常量"])
def get_chords():
    """获取所有和弦类型定义"""
    return CHORD_TYPES


@app.get("/api/rhythms", response_model=List[str], tags=["常量"])
def get_rhythms():
    """获取所有节奏型定义"""
    return RHYTHMS


@app.get("/api/bpms", response_model=List[int], tags=["常量"])
def get_bpms():
    """获取所有 BPM 值"""
    return BPM_VALUES


@app.get("/api/keys", response_model=Dict, tags=["常量"])
def get_keys():
    """获取所有调性定义"""
    return KEY_DATA


# 健康检查端点

@app.get("/api/health", tags=["系统"])
def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "has_solfege_core": HAS_SOLFEGE_CORE,
        "import_error": SOLFEGE_IMPORT_ERROR,
        "active_sessions": len(session_manager.sessions),
        "database_path": stats_db.db_path,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/info", tags=["系统"])
def get_info():
    """获取系统信息"""
    return {
        "version": "4.1.0",
        "based_on": "GNU Solfege",
        "features": [
            "和声音程识别",
            "旋律音程识别", 
            "单音识别",
            "和弦识别",
            "和弦转位识别",
            "节奏识别",
            "BPM识别",
            "十二音序列",
            "调内音识别",
            "视唱练耳",
            "唱音程",
            "唱和弦",
            "比较音程",
            "节奏打拍",
            "节奏听写",
            "旋律听写",
            "元素构建"
        ],
        "has_native_modules": HAS_SOLFEGE_CORE
    }


# ==================== 主程序入口 ====================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="GNU Solfege Web API Server")
    parser.add_argument("--host", default="0.0.0.0", help="服务器主机地址")
    parser.add_argument("--port", type=int, default=8000, help="服务器端口")
    parser.add_argument("--reload", action="store_true", help="启用自动重载")
    parser.add_argument("--debug", action="store_true", help="启用调试模式")
    
    args = parser.parse_args()
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║           GNU Solfege Web API - 视唱练耳训练系统             ║
║                                                              ║
║  版本: 4.1.0                                                 ║
║  基于 GNU Solfege 核心模块                                   ║
║  Solfege 核心: {"已加载" if HAS_SOLFEGE_CORE else "未加载 (使用内置实现)"}                                      ║
║                                                              ║
║  API 文档: http://{args.host}:{args.port}/api/docs                      ║
║  健康检查: http://{args.host}:{args.port}/api/health                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="debug" if args.debug else "info"
    )