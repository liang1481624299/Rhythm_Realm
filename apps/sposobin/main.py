# main.py
import tkinter as tk
from tkinter import ttk, filedialog
import tkinter.messagebox
import re
import time
import xml.etree.ElementTree as ET
from xml.dom import minidom
from dna import MAJOR_DNA, MINOR_DNA
from tonality import KEY_REGISTRY, transpose_dna, spell_midi
from engine import calculate_best_voicing, get_chord_candidates, build_full_dag, v_to_tuple, tuple_to_v, get_chord_siblings
from player import play_history, stop_audio, get_available_instruments, set_instrument, get_current_instrument
from renderer import ScoreRenderer
from rules import evaluate_voicing

import ctypes
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except:
    try: ctypes.windll.user32.SetProcessDPIAware()
    except: pass


# ==========================================
# 和弦家族自动映射表 (语义 -> 物理)
# ==========================================
CHORD_FAMILIES = {
    "T": ["T", "T不完全", "T双三"],
    "t": ["t", "t不完全"],
    "D₇": ["D₇", "D₇不完全"]
}

def get_base_chord(chord_name):
    """将底层的变体和弦（如 T不完全）折叠回显示用的基础和弦（如 T）"""
    for base, variants in CHORD_FAMILIES.items():
        if chord_name in variants:
            return base
    return chord_name

def format_chord_name(name):
    """格式化和弦名称用于显示"""
    clean_name = name.replace("♮⁵", "").replace("♭⁵", "").replace("不完全", "").replace("双三", "")
    base_name = clean_name.split('/')[0] if '/' in clean_name else clean_name
    suffix = "/" + clean_name.split('/')[1] if '/' in clean_name else ""
    core = base_name
    if "♭⁵" in name or ("♭" in base_name and "VI" not in base_name):
        core += "♭5" if "♭⁵" in name else "♭"
    elif "♮⁵" in name:
        core += "♮5"
    return core + suffix

class GridFlowFrame(tk.Frame):
    """自适应网格布局容器，用于动态排列和弦按钮"""
    def __init__(self, master, item_width=105, **kwargs):
        super().__init__(master, **kwargs)
        self.item_width = item_width
        self.bind('<Configure>', self._on_configure)
        self._last_cols = 0

    def _on_configure(self, event):
        w = event.width
        if w < 10: return
        cols = max(1, w // self.item_width)
        if cols != self._last_cols:
            self._last_cols = cols
            for idx, child in enumerate(self.winfo_children()):
                child.grid(row=idx // cols, column=idx % cols, padx=5, pady=4)


class HarmonyApp:
    def __init__(self, root):
        self.root = root
        self.root.title("传统和声推演引擎 - 专业版 (V1.3)")
        self.root.geometry("1150x880") 
        self.root.configure(bg="#F8F9FA")

        self.selected_key_name = "g 小调 (g minor)"
        self.key_info = KEY_REGISTRY[self.selected_key_name]
        self.active_dna_db = transpose_dna(MINOR_DNA, self.key_info["shift"])

        self.history = []
        self.target_melody = None 
        self.app_mode = "FREE"    
        self.input_midi_sequence = [] 
        self.dag_layers = None
        self.playback_index = None  
        self.pending_melody_note = None 
        self.time_signature = "4/4"  # 🌟 新增：拍号设置
        self.current_instrument = "piano"  # 🌟 新增：当前音色

        self.setup_ui()
        self.renderer = ScoreRenderer(self.canvas)
        self.renderer.on_history_click = self.revert_history
        self.clear_canvas()

    def setup_ui(self):
        self.key_info["app_mode"] = self.app_mode

        header_frame = tk.Frame(self.root, bg="#F8F9FA")
        header_frame.pack(fill=tk.X, padx=40, pady=(20, 5))
        
        tk.Label(header_frame, text="传统和声算法推演工作站", font=("Microsoft YaHei", 18, "bold"), bg="#F8F9FA", fg="#2C3E50").pack(side=tk.LEFT)
        
        self.mode_var = tk.StringVar(value="FREE")
        tk.Radiobutton(header_frame, text="自由模式", variable=self.mode_var, value="FREE", command=self.on_mode_change, font=("Microsoft YaHei", 12, "bold"), bg="#F8F9FA", fg="#2C3E50", cursor="hand2").pack(side=tk.LEFT, padx=(30, 5))
        tk.Radiobutton(header_frame, text="高音题模式", variable=self.mode_var, value="SOPRANO", command=self.on_mode_change, font=("Microsoft YaHei", 12, "bold"), bg="#F8F9FA", fg="#E67E22", cursor="hand2").pack(side=tk.LEFT, padx=5)
        tk.Radiobutton(header_frame, text="低音题模式", variable=self.mode_var, value="BASS", command=self.on_mode_change, font=("Microsoft YaHei", 12, "bold"), bg="#F8F9FA", fg="#16A085", cursor="hand2").pack(side=tk.LEFT, padx=5)
        tk.Radiobutton(header_frame, text="旋律写作模式", variable=self.mode_var, value="COMPOSE", command=self.on_mode_change, font=("Microsoft YaHei", 12, "bold"), bg="#F8F9FA", fg="#8E44AD", cursor="hand2").pack(side=tk.LEFT, padx=5)
        
        tk.Label(header_frame, text="全局调性：", font=("Microsoft YaHei", 11, "bold"), bg="#F8F9FA", fg="#6C757D").pack(side=tk.LEFT, padx=(15, 5))
        self.key_combobox = ttk.Combobox(header_frame, values=list(KEY_REGISTRY.keys()), state="readonly", font=("Microsoft YaHei", 11), width=18)
        self.key_combobox.set(self.selected_key_name)
        self.key_combobox.pack(side=tk.LEFT)
        self.key_combobox.bind("<<ComboboxSelected>>", self.on_key_changed)
        
        # 🌟 新增：拍号选择器
        tk.Label(header_frame, text="拍号：", font=("Microsoft YaHei", 11, "bold"), bg="#F8F9FA", fg="#6C757D").pack(side=tk.LEFT, padx=(15, 5))
        self.time_sig_combobox = ttk.Combobox(header_frame, values=["4/4", "3/4", "2/4"], state="readonly", font=("Microsoft YaHei", 11), width=6)
        self.time_sig_combobox.set(self.time_signature)
        self.time_sig_combobox.pack(side=tk.LEFT)
        self.time_sig_combobox.bind("<<ComboboxSelected>>", self.on_time_sig_changed)
        
        # 🌟 新增：音色选择器
        tk.Label(header_frame, text="音色：", font=("Microsoft YaHei", 11, "bold"), bg="#F8F9FA", fg="#6C757D").pack(side=tk.LEFT, padx=(15, 5))
        instruments = get_available_instruments()
        self.instrument_combobox = ttk.Combobox(header_frame, values=list(instruments.values()), state="readonly", font=("Microsoft YaHei", 11), width=14)
        self.instrument_combobox.set(instruments[self.current_instrument])
        self.instrument_combobox.pack(side=tk.LEFT)
        self.instrument_combobox.bind("<<ComboboxSelected>>", self.on_instrument_changed)

        self.soprano_frame = tk.Frame(self.root, bg="#FFF3E0", highlightbackground="#F39C12", highlightthickness=1)
        tk.Label(self.soprano_frame, text="旋律:", font=("Microsoft YaHei", 10, "bold"), bg="#FFF3E0", fg="#D35400").pack(side=tk.LEFT, padx=10)
        
        self.pk_canvas = tk.Canvas(self.soprano_frame, height=105, bg="white", highlightthickness=0)
        self.pk_canvas.pack(side=tk.LEFT, padx=(10, 0), pady=10)
        self.draw_piano_keyboard()

        self.seq_frame = tk.Frame(self.soprano_frame, bg="#FFF3E0")
        self.seq_frame.pack(side=tk.LEFT, padx=15, fill=tk.Y, pady=10)
        
        self.melody_entry_var = tk.StringVar()
        self.melody_entry = tk.Entry(self.seq_frame, textvariable=self.melody_entry_var, font=("Consolas", 12, "bold"), bg="white", fg="#2C3E50", width=25)
        self.melody_entry.pack(side=tk.TOP, fill=tk.X, ipady=3)
        
        btn_frame = tk.Frame(self.seq_frame, bg="#FFF3E0")
        btn_frame.pack(side=tk.TOP, fill=tk.X, pady=(5, 0))
        tk.Button(btn_frame, text="撤销", command=self.undo_note, font=("Microsoft YaHei", 9), padx=5, cursor="hand2").pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 2))
        tk.Button(btn_frame, text="清空", command=self.clear_notes, font=("Microsoft YaHei", 9), padx=5, cursor="hand2").pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(2, 0))

        self.gen_btn = tk.Button(self.soprano_frame, text="▶ 算法推演\n生成题解", font=("Microsoft YaHei", 10, "bold"), command=self.start_soprano_mode, bg="#E67E22", fg="white", relief="flat", cursor="hand2", padx=8, pady=8)
        self.gen_btn.pack(side=tk.LEFT, padx=(10, 20))

        self.canvas_frame = tk.Frame(self.root, bg="#F8F9FA")
        self.canvas_frame.pack(fill=tk.X, padx=40, pady=10)
        
        # 🌟 此处的 height 已扩大至 270 像素，防止下方低音加线被截断
        self.canvas = tk.Canvas(self.canvas_frame, height=270, bg="white", highlightbackground="#DEE2E6")
        self.scrollbar = tk.Scrollbar(self.canvas_frame, orient=tk.HORIZONTAL, command=self.canvas.xview)
        self.canvas.configure(xscrollcommand=self.scrollbar.set)
        self.canvas.pack(side=tk.TOP, fill=tk.X, expand=True)
        self.scrollbar.pack(side=tk.BOTTOM, fill=tk.X)

        self.status_lbl = tk.Label(self.root, text="", font=("Microsoft YaHei", 11, "bold"), bg="#F8F9FA", fg="#6C757D")
        self.status_lbl.pack(pady=(15, 5))
        
        self.control_frame = tk.Frame(self.root, bg="#F8F9FA")
        self.control_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=(10, 25))

        btn_container = tk.Frame(self.control_frame, bg="#F8F9FA")
        btn_container.pack(expand=True)
        tk.Button(btn_container, text="▶ 试听全曲", font=("Microsoft YaHei", 11, "bold"), command=self.play_full_song, bg="#2ECC71", fg="white", relief="flat", cursor="hand2", padx=15, pady=4).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_container, text="⏹ 停止", font=("Microsoft YaHei", 11, "bold"), command=self.stop_playback, bg="#95A5A6", fg="white", relief="flat", cursor="hand2", padx=10, pady=4).pack(side=tk.LEFT, padx=(5, 20))
        tk.Button(btn_container, text="🎼 导出MusicXML", font=("Microsoft YaHei", 10, "bold"), command=self.export_musicxml, bg="#7C3AED", fg="white", relief="flat", cursor="hand2", padx=15, pady=4).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_container, text="🗑️ 清空画板", font=("Microsoft YaHei", 10, "bold"), command=self.clear_canvas, bg="#E74C3C", fg="white", relief="flat", cursor="hand2", padx=15, pady=4).pack(side=tk.LEFT, padx=5)

        self.main_wrapper = tk.Frame(self.root, bg="#F8F9FA")
        self.main_wrapper.pack(fill=tk.BOTH, expand=True, padx=40)
        
        self.btn_canvas = tk.Canvas(self.main_wrapper, bg="#F8F9FA", highlightthickness=0)
        self.btn_scrollbar = ttk.Scrollbar(self.main_wrapper, orient=tk.VERTICAL, command=self.btn_canvas.yview)
        self.main_split_frame = tk.Frame(self.btn_canvas, bg="#F8F9FA")
        
        self.btn_window = self.btn_canvas.create_window((0, 0), window=self.main_split_frame, anchor="nw")
        self.btn_canvas.bind("<Configure>", lambda e: self.btn_canvas.itemconfig(self.btn_window, width=e.width))
        self.btn_canvas.configure(yscrollcommand=self.btn_scrollbar.set)
        self.btn_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.btn_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.btn_canvas.bind_all("<MouseWheel>", self._on_mousewheel)

    def _on_mousewheel(self, event):
        if self.btn_canvas.winfo_containing(event.x_root, event.y_root) == self.btn_canvas:
            self.btn_canvas.yview_scroll(int(-1*(event.delta/120)), "units")

    def draw_piano_keyboard(self):
        """绘制可视化钢琴键盘用于MIDI输入"""
        self.pk_canvas.delete("all")
        start_midi = 57 
        end_midi = 82
        
        white_midi = []
        black_midi = []
        for m in range(start_midi, end_midi + 1):
            if m % 12 in [0, 2, 4, 5, 7, 9, 11]: white_midi.append(m)
            else: black_midi.append(m)
                
        key_w = 26
        key_h = 105
        midi_to_x = {}
        
        for i, midi in enumerate(white_midi):
            x0 = i * key_w
            midi_to_x[midi] = x0
            rect = self.pk_canvas.create_rectangle(x0, 0, x0 + key_w, key_h, fill="white", outline="#34495E", activefill="#EAECEE", width=1.5)
            self.pk_canvas.tag_bind(rect, "<Button-1>", lambda e, n=midi: self.on_piano_key(n))
            
            if midi % 12 == 0:
                oct_num = (midi // 12) - 1
                self.pk_canvas.create_text(x0 + key_w/2, key_h - 15, text=f"C{oct_num}", font=("Arial", 8, "bold"), fill="#7F8C8D")
                
        for midi in black_midi:
            left_x = midi_to_x.get(midi - 1, 0)
            bw = 16
            rect = self.pk_canvas.create_rectangle(left_x + key_w - bw/2, 0, left_x + key_w + bw/2, key_h * 0.6, fill="#2C3E50", outline="#2C3E50", activefill="#5D6D7E", width=1.5)
            self.pk_canvas.tag_bind(rect, "<Button-1>", lambda e, n=midi: self.on_piano_key(n))
            
        self.pk_canvas.config(width=len(white_midi) * key_w)

    def on_piano_key(self, midi_note):
        if self.app_mode == "COMPOSE":
            self.pending_melody_note = midi_note
            self.update_ui()
        else:
            letter, abs_step, abs_alt, oct_res = spell_midi(midi_note, self.key_info, "")
            symbol = {-2: "bb", -1: "b", 0: "", 1: "#", 2: "x"}[abs_alt]
            note_str = f"{letter}{symbol}{oct_res}"
            current_text = self.melody_entry_var.get().strip()
            new_text = current_text + (" " if current_text else "") + note_str
            self.melody_entry_var.set(new_text)

    def undo_note(self):
        current = self.melody_entry_var.get().strip()
        if current:
            tokens = current.split()
            if tokens:
                tokens.pop()
                self.melody_entry_var.set(" ".join(tokens))
                self.target_melody = self.parse_melody_str(self.melody_entry_var.get().strip())
                if self.app_mode == "COMPOSE": self.update_ui()

    def clear_notes(self):
        self.melody_entry_var.set("")
        self.target_melody = None
        if self.app_mode == "COMPOSE": self.update_ui()

    def on_mode_change(self):
        self.app_mode = self.mode_var.get()
        self.key_info["app_mode"] = self.app_mode 
        self.pending_melody_note = None 
        self.stop_playback()

        if self.app_mode == "COMPOSE":
            self.soprano_frame.pack(fill=tk.X, padx=40, pady=(0, 5), after=self.root.winfo_children()[0])
            self.key_combobox.config(state=tk.DISABLED)
            self.seq_frame.pack_forget() 
            self.gen_btn.pack_forget()   
            self.target_melody = []      
            self.history = []
            self.dag_layers = None
            self.update_ui()
        elif self.app_mode == "SOPRANO":
            self.soprano_frame.pack(fill=tk.X, padx=40, pady=(0, 5), after=self.root.winfo_children()[0])
            self.key_combobox.config(state=tk.DISABLED)
            self.seq_frame.pack(side=tk.LEFT, padx=15, fill=tk.Y, pady=10) 
            self.gen_btn.pack(side=tk.LEFT, padx=(10, 20))
            self.target_melody = self.parse_melody_str(self.melody_entry_var.get().strip())
            self.history = []
            self.dag_layers = None
            self.update_ui()
        elif self.app_mode == "BASS":
            # 🌟 新增：低音题模式
            self.soprano_frame.pack(fill=tk.X, padx=40, pady=(0, 5), after=self.root.winfo_children()[0])
            self.key_combobox.config(state=tk.DISABLED)
            self.seq_frame.pack(side=tk.LEFT, padx=15, fill=tk.Y, pady=10) 
            self.gen_btn.pack(side=tk.LEFT, padx=(10, 20))
            self.target_melody = self.parse_melody_str(self.melody_entry_var.get().strip())
            self.history = []
            self.dag_layers = None
            self.update_ui()
        else:
            self.soprano_frame.pack_forget()
            self.key_combobox.config(state="readonly")
            self.target_melody = None
            self.dag_layers = None
            self.history = []
            self.clear_canvas()

    def parse_melody_str(self, text):
        midi_notes = []
        tokens = re.findall(r'([A-Ga-g])(bb|b|♭|##|x|#|♯)?\s*(\d)', text)
        if not tokens: return None
        note_names = {'C':0, 'D':2, 'E':4, 'F':5, 'G':7, 'A':9, 'B':11}
        for letter, acc, oct_str in tokens:
            base = note_names[letter.upper()]
            acc = acc.lower()
            alt = 0
            if acc in ['#', '♯']: alt = 1
            elif acc in ['##', 'x']: alt = 2
            elif acc in ['b', '♭']: alt = -1
            elif acc == 'bb': alt = -2
            octave = int(oct_str)
            midi_notes.append((octave + 1) * 12 + base + alt)
        return midi_notes

    def start_soprano_mode(self):
        text = self.melody_entry_var.get().strip()
        if not text:
            tk.messagebox.showerror("序列为空", "请录入旋律序列（可使用可视化键盘或文本输入）。")
            return
        parsed = self.parse_melody_str(text)
        if not parsed:
            tk.messagebox.showerror("格式错误", "旋律文本解析失败，请检查格式。")
            return
        self.target_melody = parsed
        self.dag_layers = build_full_dag(self.target_melody, self.active_dna_db, self.key_info)
        
        if not self.dag_layers:
            tk.messagebox.showerror("推演失败", "经过算法穷举验证，该序列在严格的古典和声法则下无法形成完整的合法通路。")
            show_dp_debugger_window(self.target_melody, self.history, self.active_dna_db, self.key_info)
            self.target_melody = None
            return
            
        self.history = []
        self.key_combobox.config(state=tk.DISABLED)
        self.update_ui()

    def on_key_changed(self, event=None):
        self.selected_key_name = self.key_combobox.get()
        self.key_info = KEY_REGISTRY[self.selected_key_name]
        self.key_info["app_mode"] = self.app_mode
        base_db = MAJOR_DNA if self.key_info["type"] == "MAJOR" else MINOR_DNA
        self.active_dna_db = transpose_dna(base_db, self.key_info["shift"])
        self.clear_canvas()

    def on_time_sig_changed(self, event=None):
        """拍号变更处理"""
        self.time_signature = self.time_sig_combobox.get()
        self.update_ui()

    def on_instrument_changed(self, event=None):
        """音色切换处理"""
        instruments = get_available_instruments()
        selected_name = self.instrument_combobox.get()
        # 找到对应的音色 key
        for key, name in instruments.items():
            if name == selected_name:
                self.current_instrument = key
                set_instrument(key)
                break

    def revert_history(self, index):
        if self.app_mode == "COMPOSE": self.pending_melody_note = None
        if 0 <= index < len(self.history):
            self.stop_playback()
            self.history = self.history[:index+1]
            if self.app_mode == "COMPOSE" and self.target_melody:
                self.target_melody = self.target_melody[:index+1]
            if self.app_mode == "SOPRANO":
                tokens = self.melody_entry_var.get().strip().split()
                if tokens: self.melody_entry_var.set(" ".join(tokens[:index+1]))
            self.update_ui()
            play_history([self.history[-1]], instrument=self.current_instrument) 

    def clear_canvas(self):
        self.stop_playback()
        self.history = []
        self.pending_melody_note = None
        if self.app_mode == "COMPOSE": self.target_melody = []
        self.update_ui()

    def update_ui(self):
        self.renderer.draw_entire_score(self.history, self.key_info, self.target_melody, self.playback_index, self.pending_melody_note)
        
        if hasattr(self, 'main_split_frame') and self.main_split_frame.winfo_exists():
            self.main_split_frame.destroy()
            
        self.main_split_frame = tk.Frame(self.btn_canvas, bg="#F8F9FA")
        self.main_split_frame.bind("<Configure>", lambda e: self.btn_canvas.configure(scrollregion=self.btn_canvas.bbox("all")))
        self.btn_canvas.itemconfig(self.btn_window, window=self.main_split_frame)

        # 🌟 更新：支持 SOPRANO 和 BASS 模式的完成检测
        if self.app_mode in ["SOPRANO", "BASS"]:
            if self.target_melody and len(self.history) >= len(self.target_melody):
                tk.Label(self.main_split_frame, text="✅ 验证完成：和声序列已成功覆盖所有目标音。", font=("Microsoft YaHei", 16, "bold"), bg="#F8F9FA", fg="#27AE60").pack(pady=40)
                return

        next_chords = []

        if not self.history:
            # 🌟 更新：支持 BASS 模式
            if self.app_mode in ["SOPRANO", "BASS"] and self.target_melody:
                self.status_lbl.config(text=f"当前进度：第 1/{len(self.target_melody)} 音级。算法已构建全局 DAG 连通图：")
                valid_states = self.dag_layers[0].keys()
                next_chords = list(set([state[0] for state in valid_states]))
            elif self.app_mode == "COMPOSE":
                if self.pending_melody_note is None:
                    self.status_lbl.config(text="🎹 旋律写作模式：请在键盘区输入初始旋律音。")
                else:
                    self.status_lbl.config(text=f"🎶 已输入旋律音级，推荐以下符合声部排列规则的初始和弦：")
                    tgt_s = self.pending_melody_note
                    for c_name in self.active_dna_db.keys():
                        if get_chord_candidates(c_name, self.active_dna_db, tgt_s):
                            next_chords.append(c_name)
                    if not next_chords:
                        self.status_lbl.config(text=f"⚠️ 校验未通过：当前和声规则库中不存在包含该音级的合法和弦，请检查输入。")
            else:
                self.status_lbl.config(text="初始化配置：请选择起始和弦分布（左侧：自然音阶 | 右侧：离调/半音体系）：")
                next_chords = list(self.active_dna_db.keys())
        else:
            current_item = self.history[-1]
            current_chord_name = current_item["chord"]
            
            # 🌟 更新：支持 BASS 模式
            if self.app_mode in ["SOPRANO", "BASS"]:
                self.status_lbl.config(text=f"当前进度：第 {len(self.history)+1}/{len(self.target_melody)} 音级。备选路径已校验：")
                step = len(self.history)
                if step >= len(self.target_melody): return
                
                last_state = (current_chord_name, v_to_tuple(current_item["voices"]))
                state_data = self.dag_layers[step-1].get(last_state)
                if not state_data: return
                valid_next_states = state_data['next']
                next_chords = list(set([state[0] for state in valid_next_states]))
                
            elif self.app_mode == "COMPOSE":
                if self.pending_melody_note is None:
                    self.status_lbl.config(text=f"🎹 已生成 {len(self.history)} 个和声节点，等待下一个旋律音输入...")
                else:
                    self.status_lbl.config(text=f"🎶 已接收第 {len(self.history)+1} 个旋律音，规则引擎通过连通性校验推荐以下连接：")
                    tgt_s = self.pending_melody_note
                    last_c = current_chord_name
                    last_v = current_item["voices"]
                    
                    possible_nexts = set()
                    for nxt in self.active_dna_db.get(last_c, {}).get("next", []):
                        possible_nexts.add(nxt)
                        possible_nexts.update(get_chord_siblings(nxt, self.active_dna_db))
                    base = last_c.split('₆')[0].split('₅')[0].split('₃')[0].split('₂')[0].split('₇')[0]
                    possible_nexts.update([k for k in self.active_dna_db.keys() if k.split('₆')[0].split('₅')[0].split('₃')[0].split('₂')[0].split('₇')[0] == base and "/" not in k and "/" not in last_c])
                    
                    for nxt_c in possible_nexts:
                        if nxt_c not in self.active_dna_db: continue
                        for nxt_v in get_chord_candidates(nxt_c, self.active_dna_db, tgt_s):
                            if evaluate_voicing(tuple_to_v(v_to_tuple(last_v)), nxt_v, last_c, nxt_c, self.key_info) < 999999:
                                next_chords.append(nxt_c)
                                break 
                    
                    if not next_chords:
                        self.status_lbl.config(text=f"⚠️ 连接失败：该旋律音将导致平行五八度、声部交叉或不规则跳进，已被规则引擎拦截。", fg="#E74C3C")
            else:
                raw_next_chords = self.active_dna_db.get(current_chord_name, {}).get("next", [])
                if not raw_next_chords:
                    tk.Label(self.main_split_frame, text="终止线校验通过", bg="#F8F9FA", font=("Microsoft YaHei", 12)).pack()
                    return
                
                self.status_lbl.config(text="⚡ 系统已完成通路连通性验证，当前备选和弦可确保合法步进：", fg="#2C3E50")
                self.root.update_idletasks()
                
                valid_next_chords = []
                last_c = current_chord_name
                last_v_tuple = v_to_tuple(current_item["voices"]) 
                
                for nxt_c in raw_next_chords:
                    if nxt_c not in self.active_dna_db: continue
                    can_connect = False
                    for nxt_v in get_chord_candidates(nxt_c, self.active_dna_db, None):
                        if evaluate_voicing(tuple_to_v(last_v_tuple), nxt_v, last_c, nxt_c, self.key_info) < 999999:
                            can_connect = True
                            break 
                    
                    if can_connect:
                        valid_next_chords.append(nxt_c)
                        
                next_chords = valid_next_chords
                
                if not next_chords:
                    self.status_lbl.config(text="⚠️ 连通性异常：当前和声路径已无可用节点，请回溯历史状态。", fg="#E74C3C")

        # 布局排版分割
        self.main_split_frame.columnconfigure(0, weight=1000, uniform="golden")  
        self.main_split_frame.columnconfigure(1, weight=0)     
        self.main_split_frame.columnconfigure(2, weight=618, uniform="golden")   

        left_panel = tk.Frame(self.main_split_frame, bg="#F8F9FA")
        left_panel.grid(row=0, column=0, sticky="nsew")
        
        ttk.Separator(self.main_split_frame, orient='vertical').grid(row=0, column=1, sticky="ns", padx=20)
        
        right_panel = tk.Frame(self.main_split_frame, bg="#F8F9FA")
        right_panel.grid(row=0, column=2, sticky="nsew")

        # 🌟 更新：匹配网页版的和弦分类逻辑
        diatonic = {
            "主功能组 (T / t / DT)": [], 
            "下属功能组 (S / s / TS_VI / VII)": [], 
            "属功能组 (D / K)": []
        }
        chromatic = {
            "重属功能组 (DD)": [],
            "导功能组 (Dᵥᵢᵢ)": [], 
            "变和弦组 (N / +6)": []
        }

        for chord in next_chords:
            if "/" in chord and not chord.startswith(("It", "Ger", "Fr")):
                target_deg = chord.split('/')[1]
                if chord.startswith(("D", "Dᵥᵢᵢ")):
                    cat = f"副属和弦 (至 {target_deg} 级)"
                elif chord.startswith(("S", "s", "Sᵢᵢ", "sᵢᵢ")):
                    cat = f"副下属和弦 (至 {target_deg} 级)"
                else:
                    cat = f"副属和弦 (至 {target_deg} 级)"
                if cat not in chromatic: 
                    chromatic[cat] = []
                chromatic[cat].append(chord)
            else:
                if chord.startswith(("N", "It", "Ger", "Fr")): 
                    chromatic["变和弦组 (N / +6)"].append(chord)
                elif chord.startswith("DD"): 
                    chromatic["重属功能组 (DD)"].append(chord)
                elif chord.startswith("Dᵥᵢᵢ"): 
                    chromatic["导功能组 (Dᵥᵢᵢ)"].append(chord)
                elif chord.startswith(("T", "t", "DT")): 
                    diatonic["主功能组 (T / t / DT)"].append(chord)
                elif chord.startswith(("S", "s", "VI", "♭VI", "sᵢᵢ", "Sᵢᵢ", "VII", "♭VII")): 
                    diatonic["下属功能组 (S / s / TS_VI / VII)"].append(chord)
                elif chord.startswith(("D", "K")): 
                    diatonic["属功能组 (D / K)"].append(chord)
                else: 
                    if "特殊扩展变音组" not in chromatic: 
                        chromatic["特殊扩展变音组"] = []
                    chromatic["特殊扩展变音组"].append(chord)

        theme_color = "#2980B9" if self.key_info["type"] == "MAJOR" else "#8E44AD"
        hover_color = "#EBF5FB" if self.key_info["type"] == "MAJOR" else "#F4ECF7"
        
        def render_category(parent_panel, title, chords, row_offset):
            if not chords: return row_offset
            lbl = tk.Label(parent_panel, text=title, font=("Microsoft YaHei", 9, "bold"), bg="#F8F9FA", fg="#7F8C8D")
            lbl.grid(row=row_offset, column=0, sticky="w", pady=(6, 2))
            
            row_frame = GridFlowFrame(parent_panel, item_width=105, bg="#F8F9FA")
            row_frame.grid(row=row_offset + 1, column=0, sticky="ew", padx=10, pady=(0, 6))
            parent_panel.columnconfigure(0, weight=1) 
            
            for col_idx, chord in enumerate(chords):
                btn_canvas = tk.Canvas(row_frame, width=90, height=45, bg="white", highlightthickness=1, highlightbackground=theme_color, cursor="hand2")
                btn_canvas.grid(row=0, column=col_idx, padx=5, pady=4)
                
                self.renderer.render_academic_layout(btn_canvas, 35, 22, chord, color=theme_color, font_size_core=14, font_size_sub=8)
                btn_canvas.bind("<Button-1>", lambda event, c=chord: self.on_chord_click(c))
                btn_canvas.bind("<Enter>", lambda event, bc=btn_canvas, hc=hover_color, tc=theme_color: bc.config(bg=hc, highlightbackground=tc))
                btn_canvas.bind("<Leave>", lambda event, bc=btn_canvas, tc=theme_color: bc.config(bg="white", highlightbackground=tc))
            return row_offset + 2

        # 🌟 更新：左侧显示自然音阶功能组，右侧显示半音体系
        current_row = 0
        for title, chords in diatonic.items(): 
            if chords:  # 只显示非空的分类
                current_row = render_category(left_panel, title, chords, current_row)
        current_row = 0
        for title, chords in chromatic.items(): 
            if chords:  # 只显示非空的分类
                current_row = render_category(right_panel, title, chords, current_row)

    def on_chord_click(self, target_chord_name):
        self.stop_playback()
        shift = self.key_info["shift"]
        v_shift = shift if shift <= 3 else shift - 12
        ideal_S, ideal_A, ideal_T, ideal_B = 72 + v_shift, 65 + v_shift, 60 + v_shift, 48 + v_shift
        
        def score_initial(v):
            return abs(v['S']-ideal_S)*1.5 + abs(v['A']-ideal_A) + abs(v['T']-ideal_T) + abs(v['B']-ideal_B)

        # 🌟 更新：支持 SOPRANO 和 BASS 模式
        if self.app_mode in ["SOPRANO", "BASS"] and self.target_melody:
            step = len(self.history)
            valid_states = []
            
            if step == 0:
                valid_states = [s for s in self.dag_layers[0].keys() if s[0] == target_chord_name]
            else:
                last_state = (self.history[-1]['chord'], v_to_tuple(self.history[-1]['voices']))
                state_data = self.dag_layers[step-1].get(last_state)
                if not state_data: return
                next_states = state_data['next']
                valid_states = [s for s in next_states if s[0] == target_chord_name]
                
            if not valid_states: return

            best_state = min(valid_states, key=lambda s: score_initial(tuple_to_v(s[1])))
            self.history.append({"chord": best_state[0], "voices": tuple_to_v(best_state[1])})
            self.update_ui()
            play_history([self.history[-1]], instrument=self.current_instrument)
            return
            
        if self.app_mode == "COMPOSE" and self.pending_melody_note is not None:
            tgt_s = self.pending_melody_note
            valid_states = []
            
            if not self.history:
                for v in get_chord_candidates(target_chord_name, self.active_dna_db, tgt_s):
                    valid_states.append((target_chord_name, v_to_tuple(v)))
            else:
                last_c = self.history[-1]["chord"]
                last_v = self.history[-1]["voices"]
                for nxt_v in get_chord_candidates(target_chord_name, self.active_dna_db, tgt_s):
                    if evaluate_voicing(tuple_to_v(v_to_tuple(last_v)), nxt_v, last_c, target_chord_name, self.key_info) < 999999:
                        valid_states.append((target_chord_name, v_to_tuple(nxt_v)))
            
            if not valid_states: return
                
            best_state = min(valid_states, key=lambda s: score_initial(tuple_to_v(s[1])))
            self.history.append({"chord": best_state[0], "voices": tuple_to_v(best_state[1])})
            
            if self.target_melody is None: self.target_melody = []
            self.target_melody.append(self.pending_melody_note)
            
            self.pending_melody_note = None 
            self.update_ui()
            play_history([self.history[-1]], instrument=self.current_instrument)
            return
            
        target_s = None
        candidates = get_chord_candidates(target_chord_name, self.active_dna_db, target_s)
        
        if not candidates: return
            
        if not self.history:
            best_v = min(candidates, key=score_initial)
            self.history.append({"chord": target_chord_name, "voices": best_v})
            self.update_ui()
            play_history([self.history[-1]], instrument=self.current_instrument)
            return

        chord_sequence = [item["chord"] for item in self.history] + [target_chord_name]
        initial_voicing = self.history[0]["voices"] 
        
        global_path = calculate_best_voicing(chord_sequence, initial_voicing, self.active_dna_db, self.key_info, self.target_melody)
        
        if global_path is None: 
            tk.messagebox.showwarning(
                "和声法则阻断", 
                f"引擎拦截：前置和弦声部约束导致强行连接 {target_chord_name} 会产生违规行为（如平行五八度、声部交叉或错误重复音）。\n\n该路径已被系统封锁，请重新规划和声。"
            )
            return

        self.history = []
        for name, voices in zip(chord_sequence, global_path):
            self.history.append({"chord": name, "voices": voices})
            
        self.update_ui()
        play_history([self.history[-1]], instrument=self.current_instrument)

    def play_full_song(self):
        if not self.history: return
        self.playback_index = 0
        self.is_playing = True
        self.renderer.update_playhead(self.history, self.key_info, self.target_melody, 0)
        
        def on_audio_ready():
            self.root.after(0, self._start_polling)
            
        # 🌟 传递当前选择的音色
        play_history(self.history, on_play_start=on_audio_ready, instrument=self.current_instrument)

    def _start_polling(self):
        if not getattr(self, 'is_playing', False): return
        self.start_time = time.time()
        self.poll_playhead()

    def stop_playback(self):
        stop_audio()
        self.is_playing = False
        self.playback_index = None
        self.renderer.update_playhead(self.history, self.key_info, self.target_melody, self.playback_index)

    def poll_playhead(self):
        if not getattr(self, 'is_playing', False): return
        
        elapsed = time.time() - self.start_time
        bpm = 65.0
        sec_per_chord = 60.0 / bpm
        total_duration = sec_per_chord * (len(self.history) + 1)
        
        if elapsed >= total_duration:
            self.stop_playback()
            return
            
        current_index = int(elapsed / sec_per_chord)
        if current_index >= len(self.history):
            current_index = len(self.history) - 1
            
        if current_index != self.playback_index:
            self.playback_index = current_index
            self.renderer.update_playhead(self.history, self.key_info, self.target_melody, self.playback_index)
            
        self.root.after(16, self.poll_playhead)

    def export_musicxml(self):
        """导出 MusicXML 格式乐谱"""
        if not self.history:
            tk.messagebox.showwarning("导出失败", "历史记录为空，无法导出乐谱。")
            return
        
        # 解析拍号
        beats_per_measure = int(self.time_signature.split('/')[0])
        
        fifths = self.key_info["sigs"]
        if self.key_info["sig_type"] == "flat":
            fifths = -fifths
        mode_str = "major" if self.key_info["type"] == "MAJOR" else "minor"
        
        num_chords = len(self.history)
        
        # 构建 MusicXML 根节点
        root = ET.Element("score-partwise", version="3.1")
        part_list = ET.SubElement(root, "part-list")
        score_part = ET.SubElement(part_list, "score-part", id="P1")
        ET.SubElement(score_part, "part-name").text = "Sposobin Harmony"
        
        part = ET.SubElement(root, "part", id="P1")
        
        # 将和弦序列按小节分块
        measures_data = [self.history[i:i + beats_per_measure] for i in range(0, num_chords, beats_per_measure)]
        
        for m_idx, m_chords in enumerate(measures_data):
            measure = ET.SubElement(part, "measure", number=str(m_idx + 1))
            
            if m_idx == 0:
                attributes = ET.SubElement(measure, "attributes")
                ET.SubElement(attributes, "divisions").text = "1"
                
                key = ET.SubElement(attributes, "key")
                ET.SubElement(key, "fifths").text = str(fifths)
                ET.SubElement(key, "mode").text = mode_str
                
                time = ET.SubElement(attributes, "time")
                ET.SubElement(time, "beats").text = str(beats_per_measure)
                ET.SubElement(time, "beat-type").text = "4"
                
                ET.SubElement(attributes, "staves").text = "2"
                
                clef1 = ET.SubElement(attributes, "clef", number="1")
                ET.SubElement(clef1, "sign").text = "G"
                ET.SubElement(clef1, "line").text = "2"
                
                clef2 = ET.SubElement(attributes, "clef", number="2")
                ET.SubElement(clef2, "sign").text = "F"
                ET.SubElement(clef2, "line").text = "4"
            
            voices_config = [
                {"name": "S", "voice": "1", "staff": "1", "stem": "up"},
                {"name": "A", "voice": "2", "staff": "1", "stem": "down"},
                {"name": "T", "voice": "3", "staff": "2", "stem": "up"},
                {"name": "B", "voice": "4", "staff": "2", "stem": "down"}
            ]
            
            current_measure_duration = len(m_chords)
            
            for v_idx, cfg in enumerate(voices_config):
                v_name = cfg["name"]
                for item in m_chords:
                    chord_name = item["chord"]
                    midi_note = item["voices"][v_name]
                    
                    if v_idx == 0:
                        display_chord = format_chord_name(chord_name)
                        direction = ET.SubElement(measure, "direction", placement="above")
                        dir_type = ET.SubElement(direction, "direction-type")
                        words = ET.SubElement(dir_type, "words", font_family="Lora", font_weight="normal", font_size="12")
                        words.set("default-y", "25")
                        words.text = display_chord
                        ET.SubElement(direction, "staff").text = "1"
                    
                    letter, _, abs_alt, octave = spell_midi(midi_note, self.key_info, chord_name)
                    
                    note = ET.SubElement(measure, "note")
                    pitch = ET.SubElement(note, "pitch")
                    ET.SubElement(pitch, "step").text = letter
                    if abs_alt != 0:
                        ET.SubElement(pitch, "alter").text = str(abs_alt)
                    ET.SubElement(pitch, "octave").text = str(octave)
                    
                    ET.SubElement(note, "duration").text = "1"
                    ET.SubElement(note, "voice").text = cfg["voice"]
                    ET.SubElement(note, "type").text = "quarter"
                    ET.SubElement(note, "stem").text = cfg["stem"]
                    ET.SubElement(note, "staff").text = cfg["staff"]
                
                if v_idx < 3 and current_measure_duration > 0:
                    backup = ET.SubElement(measure, "backup")
                    ET.SubElement(backup, "duration").text = str(current_measure_duration)
        
        # 格式化 XML
        raw_xml = ET.tostring(root, encoding="utf-8")
        parsed_xml = minidom.parseString(raw_xml)
        pretty_xml = parsed_xml.toprettyxml(indent="  ")
        
        musicxml_header = (
            '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
            '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n'
        )
        
        xml_lines = pretty_xml.split("\n")
        if xml_lines[0].startswith("<?xml"):
            body_start = pretty_xml.index("\n") + 1
            pretty_xml = pretty_xml[body_start:]
        
        final_xml_content = musicxml_header + pretty_xml
        
        # 保存文件
        file_path = filedialog.asksaveasfilename(
            defaultextension=".xml",
            filetypes=[("MusicXML files", "*.xml"), ("All files", "*.*")],
            initialfile=f"Sposobin_Harmony_{self.selected_key_name.replace(' ', '_')}.xml"
        )
        
        if file_path:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(final_xml_content)
            tk.messagebox.showinfo("导出成功", f"乐谱已成功导出至：\n{file_path}")

def show_dp_debugger_window(target_melody, history, dna_db, key_info):
    """
    动态规划状态监控控制台，用于调试 DAG 在高音/低音序列配和声时的断链节点
    """
    debug_win = tk.Toplevel()
    debug_win.title("🔍 连通性诊断控制台")
    debug_win.geometry("700x600")
    text_area = tk.Text(debug_win, font=("Consolas", 10), bg="#1E1E1E", fg="#D4D4D4")
    text_area.pack(expand=True, fill=tk.BOTH, padx=10, pady=10)
    def log(msg, color="#D4D4D4"):
        text_area.insert(tk.END, msg + "\n")
        text_area.see(tk.END)
        text_area.update()
    
    # 🌟 更新：支持 BASS 模式
    mode = key_info.get("app_mode", "SOPRANO")
    mode_name = "高音题" if mode == "SOPRANO" else "低音题" if mode == "BASS" else "未知模式"
    
    log("=== 启动 DAG 连通性诊断探针 ===", "#569CD6")
    log(f"模式: {mode_name}")
    log(f"调性: {key_info['type']} / 根音偏移: {key_info['shift']}")
    log(f"目标序列 (MIDI): {target_melody}")
    log("-" * 50)
    
    from engine import get_chord_candidates, v_to_tuple, tuple_to_v
    from rules import evaluate_voicing
    
    current_layer = {}
    start_index = 0
    if not history:
        start_chord = "T" if key_info["type"] == "MAJOR" else "t"
        # 🌟 更新：根据模式决定目标声部
        tgt_s = target_melody[0] if mode == "SOPRANO" else None
        tgt_b = target_melody[0] if mode == "BASS" else None
        cands = get_chord_candidates(start_chord, dna_db, target_s=tgt_s, target_b=tgt_b)
        for v in cands: current_layer[(start_chord, v_to_tuple(v))] = {start_chord}
        log(f"[节点 0] 目标 MIDI={target_melody[0]}, 初始 '{start_chord}' 合法状态数: {len(current_layer)}")
    else:
        last_h = history[-1]
        start_index = len(history)
        current_layer[(last_h["chord"], v_to_tuple(last_h["voices"]))] = {last_h["chord"]}
        log(f"基于已有状态集，从第 {start_index} 个节点继续推演...")

    for i in range(start_index + 1 if history else 1, len(target_melody)):
        next_layer = {}
        tgt_note = target_melody[i]
        # 🌟 更新：根据模式决定目标声部
        tgt_s = tgt_note if mode == "SOPRANO" else None
        tgt_b = tgt_note if mode == "BASS" else None
        
        all_possible_nexts = set()
        for c_name, _ in current_layer.keys():
            all_possible_nexts.update(dna_db.get(c_name, {}).get("next", []))
            
        cand_cache = {}
        for nxt_chord in all_possible_nexts:
            if nxt_chord in dna_db: 
                cand_cache[nxt_chord] = get_chord_candidates(nxt_chord, dna_db, target_s=tgt_s, target_b=tgt_b)
            
        for (c_name, v_tup), _ in current_layer.items():
            possible_nexts = dna_db.get(c_name, {}).get("next", [])
            for nxt_chord in possible_nexts:
                if nxt_chord not in dna_db: continue
                for nxt_v in cand_cache.get(nxt_chord, []):
                    if evaluate_voicing(tuple_to_v(v_tup), nxt_v, c_name, nxt_chord, key_info) < 999999: 
                        next_layer[(nxt_chord, v_to_tuple(nxt_v))] = True
                        
        log(f"[节点 {i}] 目标 MIDI={tgt_note}, 存活的合法连接状态数: {len(next_layer)}")
        
        if not next_layer:
            log("-" * 50)
            log(f"❌ 连通性异常：路径已断开", "#F44336")
            log(f"中断点: 节点 {i} (目标 MIDI: {tgt_note})")
            log(f"在上一个节点 (MIDI: {target_melody[i-1]}) 时，可用的合法配置包含：")
            
            surviving_chords = {}
            for c_name, _ in current_layer.keys(): surviving_chords[c_name] = surviving_chords.get(c_name, 0) + 1
            for c, count in surviving_chords.items(): log(f" - {c}: {count} 个有效声部排列")
            break
        current_layer = next_layer

if __name__ == "__main__":
    root = tk.Tk()
    app = HarmonyApp(root)
    root.mainloop()