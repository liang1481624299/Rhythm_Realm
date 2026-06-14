# 🎹 徵羽乐界 Rhythm Realm

![Python Version](https://img.shields.io/badge/Python-3.11.9-blue.svg)
![UI](https://img.shields.io/badge/UI-Tkinter%20%7C%20Web-orange.svg)
![Algorithm](https://img.shields.io/badge/Algorithm-DP%20%7C%20DAG%20%7C%20Viterbi-success.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

一片极光之上的音乐殿堂。这里是音乐理论与创作的汇聚之地——从传统和声到现代技法，让每一次探索都充满灵感。

## 📁 项目结构

```
Rhythm_Realm/
├── apps/
│   └── sposobin/                 # Sposobin 和声引擎核心模块
│       ├── __init__.py
│       ├── main.py                # Tkinter 桌面应用主入口
│       ├── app.py                 # FastAPI Web 服务入口
│       ├── engine.py              # 求解器：DAG 构建与 Viterbi 路径寻优
│       ├── rules.py               # 规则引擎：转移罚分计算与违规拦截
│       ├── dna.py                 # 数据字典：和弦功能网络（T-S-D 序进）
│       ├── tonality.py            # 调性数学模型：音阶偏移、半音映射
│       ├── renderer.py             # 渲染器：Canvas 矢量绘图、五线谱排版
│       ├── player.py               # 音频合成层：MIDI 波形生成
│       ├── download.py             # 音频采样下载工具
│       └── bug.md                 # 开发日志与待办事项
├── frontend/                      # Vue.js + Vite 前端项目
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Sposobin.js        # 和声工作站页面
│   │   │   └── Home.js            # 首页
│   │   ├── components/
│   │   │   ├── ScoreRenderer.*    # 乐谱渲染组件
│   │   │   ├── PianoKeyboard.*    # 虚拟钢琴组件
│   │   │   └── ChordSelector.*    # 和弦选择器组件
│   │   └── ...
│   └── ...
├── requirements.txt               # Python 依赖
├── start_backend.bat              # Windows 后端启动脚本
└── start_server.sh                # Unix 后端启动脚本
```

## ✨ 核心特性

### 🧠 核心算法引擎 (Viterbi & DAG)
- 利用动态规划构建全局有向无环图（DAG），在目标旋律的边界约束下，穷举并搜索符合严格和声法则的最佳全局路径
- 采用惩罚函数（Penalty Function）评估声部平稳性，最小化状态转移代价

### 🏛️ 严苛的古典法则约束
- **硬性阻断机制**：严格规避平行五度/八度、隐伏五八度、声部交叉与声部超越
- **增减音程过滤器**：精准拦截非古典风格的横向增减音程，支持模进与半音阶过渡的合法豁免
- **副七和弦风格约束**：内置严格的七音预备与解决机制
- **特性和弦校验**：支持增六和弦、那不勒斯六和弦、终止四六和弦的特性解决

### 🛠️ 多模式工程流
- **高音题模式**：输入目标旋律序列，引擎自动完成状态空间生成与全局路径推演
- **低音题模式**：基于低音旋律的自动化和声配置
- **旋律写作模式**：交互式音符录入，实时评估连通性并动态剪枝
- **自由模式**：在底层和弦网络中自由探索合法状态转移路径

### 📊 Web API 服务
- 基于 FastAPI 的云端 REST API
- 实时流量监控与管理看板
- 用户错题上报与断链诊断系统

## 🚀 快速开始

### 环境要求

- **Python 3.11.9**（推荐，国内安装 pygame 兼容性最好）
- **Node.js 18+**
- **npm 9+**

### 后端配置

```bash
# 1. 创建虚拟环境（推荐在项目根目录）
python -m venv .venv

# 2. 激活虚拟环境
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# 3. 安装后端依赖
pip install -r requirements.txt

# 4. 启动后端服务
# Windows:
.\start_backend.bat
# Linux/macOS:
bash start_server.sh

# 或手动启动
cd apps/sposobin
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 前端配置

```bash
cd frontend
npm install
npm run dev
```

## 🔧 技术栈

- **后端**：Python 3.11.9 / FastAPI / Tkinter
- **前端**：Vue.js 3 / Vite / TailwindCSS
- **算法**：动态规划 / DAG / Viterbi
- **音频**：pygame.midi

## ⚠️ 开发中功能

以下功能正在积极开发中：
- [ ] 更完善的和弦转换规则
- [ ] 自定义和弦用户配置
- [ ] 更多的特性和弦类型支持
- [ ] 乐理知识库的扩展
- [ ] 单元测试覆盖率提升

## 📖 相关文档

- 算法复杂度分析：参见 `apps/sposobin/bug.md` 了解开发历史与待办事项
- 斯波索宾和声学规则：系统实现的理论基础

## 📄 开源协议

本项目采用 MIT License 协议开源。
