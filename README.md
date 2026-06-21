# 🎹 徵羽乐界 Rhythm Realm

[English Version (英文版)](README_EN.md)

![Python Version](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Node Version](https://img.shields.io/badge/Node.js-18+-green.svg)
![Vue Version](https://img.shields.io/badge/Vue.js-3.5+-orange.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## 🙏 致谢

本项目基于 [Sposobin](https://github.com/Huaishu61/Sposobin) 项目进行二次开发，特此感谢原项目作者 [**Huaishu61**](https://github.com/Huaishu61) 的开源贡献！

**Contributors:**
- [**Huaishu61**](https://github.com/Huaishu61) - Sposobin 和声引擎原作者
- 项目维护团队 - 视唱练耳模块与 Web 前端开发

> **说明**：本人作为一名大学生，学业繁忙，本项目为业余时间开发维护。

---

一片极光之上的音乐殿堂。这里是音乐理论与创作的汇聚之地——从传统和声到现代技法，让每一次探索都充满灵感。

---

## 📁 项目结构

```
Sposobin-web-/
├── api/                           # 后端 API 服务
│   ├── solfege/                   # 视唱练耳训练系统 API
│   │   └── api.py                 # FastAPI 服务入口
│   └── sposobin/                  # 斯波索宾和声引擎 API
│       └── api.py                 # FastAPI 服务入口
├── apps/                          # 核心应用模块
│   └── solfege/                   # GNU Solfege 核心模块
│       ├── exercises/             # 练习文件库
│       ├── feta/                  # 乐谱渲染字体
│       └── graphics/              # 图形资源
├── frontend/                      # Vue.js + Vite 前端项目
│   ├── public/                    # 静态资源
│   ├── src/
│   │   ├── components/            # 可复用组件
│   │   ├── pages/                 # 页面组件
│   │   ├── audio/                 # 音频处理模块
│   │   └── lib/                   # 工具库
│   ├── index.html                 # 主页入口
│   ├── sposobin.html              # 和声工作站入口
│   ├── package.json               # 前端依赖配置
│   └── vite.config.js             # Vite 构建配置
├── .devcontainer/                 # Dev Container 配置
├── .gitignore                     # Git 忽略规则
└── README.md                      # 项目说明文档
```

> **注意**：以下目录/文件不会上传到 Git（通过 `.gitignore` 配置）：
> - `.venv/` - Python 虚拟环境（运行 `python -m venv .venv` 创建）
> - `node_modules/` - npm 依赖包（运行 `npm install` 安装）
> - `history_ver/` - 历史版本备份
> - `*.db` - SQLite 数据库文件
> - `*.log` - 日志文件

---

## ✨ 核心特性

### 🧠 斯波索宾和声引擎 (V1.3)

基于动态规划和 Viterbi 算法的智能和声配置系统：

- **DAG 全局路径搜索**：构建有向无环图，在目标旋律约束下搜索最佳和声路径
- **声部进行法则**：严格规避平行五度/八度、隐伏五八度、声部交叉与超越
- **多模式工程流**：
  - 高音题模式：输入目标旋律，自动生成和声配置
  - 低音题模式：基于低音旋律的自动化和声配置
  - 旋律写作模式：交互式音符录入，实时评估连通性
  - 自由模式：在和弦网络中自由探索合法状态转移

### 🎵 视唱练耳训练系统

基于 GNU Solfege 核心模块构建的 Web 训练平台：

- **音程识别**：旋律音程与和声音程训练
- **和弦识别**：各类三和弦与七和弦训练
- **节奏训练**：节拍识别与节奏听写
- **调性训练**：调式音级识别与调性感知
- **唱名训练**：首调唱名法练习

### 📊 智能批改系统

- **拍照批改**：支持上传手写和声作业图片进行自动识别与评分
- **规则引擎**：基于斯波索宾和声学规则进行智能评分
- **错误诊断**：详细的错误分析与改进建议

### 🎹 交互式乐谱渲染

- **矢量五线谱渲染**：专业级乐谱显示
- **实时音频播放**：基于 Web Audio API 的 MIDI 音频合成
- **MusicXML 导出**：支持导出标准乐谱格式

---

## 🚀 快速开始

### 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Python | 3.11+ | 推荐 3.11.9，pygame 兼容性最佳 |
| Node.js | 18+ | 前端构建环境 |
| npm | 9+ | 包管理器 |

### 1. 克隆项目

```bash
git clone <repository-url>
cd Sposobin-web-
```

### 2. 后端配置

#### 创建虚拟环境

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/macOS
python3 -m venv .venv
source .venv/bin/activate
```

#### 安装依赖

```bash
pip install fastapi uvicorn pydantic python-multipart
```

#### 启动后端服务

**方式一：启动斯波索宾和声引擎**

```bash
cd api/sposobin
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

**方式二：启动视唱练耳 API**

```bash
cd api/solfege
uvicorn api:app --host 0.0.0.0 --port 8001 --reload
```

### 3. 前端配置

```bash
cd frontend
npm install
npm run dev
```

### 4. 访问应用

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端主页 | http://localhost:5173 | 主应用入口 |
| 和声工作站 | http://localhost:5173/sposobin.html | 和声分析工具 |
| API 文档 | http://localhost:8000/api/docs | 后端 API 文档 |
| 管理后台 | http://localhost:8000/admin | 流量监控面板 |

---

## 🔧 技术栈

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.100+ | RESTful API 框架 |
| Uvicorn | 0.23+ | ASGI 服务器 |
| Pydantic | 2.0+ | 数据验证 |
| SQLite3 | 内置 | 轻量级数据库 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue.js | 3.5+ | 前端框架 |
| Vite | 8.0+ | 构建工具 |
| Tone.js | 15.1+ | Web Audio API 封装 |
| Tailwind CSS | 3.0+ | CSS 框架（通过 CDN） |

### 核心算法

- **动态规划 (DP)**：全局最优路径搜索
- **DAG (有向无环图)**：状态空间建模
- **Viterbi 算法**：隐马尔可夫模型解码
- **惩罚函数**：声部平稳性评估

---

## 🔌 API 接口

### 和声引擎接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/sync_state` | POST | 同步和声状态，获取下一步可用和弦 |
| `/api/export_musicxml` | POST | 导出 MusicXML 乐谱 |
| `/api/submit_issue` | POST | 提交错题/死胡同报告 |
| `/api/grade/manual` | POST | 手动输入和弦序列批改 |
| `/api/grade/photo` | POST | 拍照上传批改 |

### 视唱练耳接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/sessions` | POST | 创建练习会话 |
| `/api/questions` | GET | 获取问题 |
| `/api/answers` | POST | 提交答案 |
| `/api/statistics` | GET | 获取统计数据 |

---

## 🎯 使用说明

### 和声工作站使用流程

1. **选择工作模式**：高音题模式 / 低音题模式 / 旋律写作 / 自由模式
2. **选择调性**：从下拉菜单选择目标调性
3. **输入旋律**：在钢琴键盘上点击输入目标旋律（高音题/低音题模式）
4. **选择和弦**：根据系统推荐的和弦功能组选择合适的和弦
5. **查看结果**：实时查看四声部排列与乐谱渲染
6. **导出乐谱**：点击导出按钮生成 MusicXML 文件

### 视唱练耳训练流程

1. **选择练习类型**：音程识别、和弦识别、节奏训练等
2. **配置参数**：自定义音域、调性、难度等参数
3. **开始练习**：听辨音频并选择正确答案
4. **查看统计**：查看练习进度与正确率统计

---

## 🔒 管理后台

访问 `http://localhost:8000/admin` 进入管理监控面板：

- **登录凭证**：用户名 `admin`，密码 `SposobinSecure2026`
- **功能特性**：
  - 实时流量监控
  - 独立用户统计
  - 错题/死胡同报告池
  - 5秒自动刷新

---

## 📦 项目扩展

### 添加新的练习类型

1. 在 `api/solfege/api.py` 中添加新的 Teacher 类
2. 在前端 `src/pages/Solfege.js` 中添加对应的练习组件
3. 更新 `ExerciseType` 枚举

### 添加新的调性支持

1. 在 `apps/sposobin/tonality.py` 中添加新的调性定义
2. 更新 `KEY_REGISTRY` 注册表

---

## 📋 开发中功能

- [ ] 更完善的和弦转换规则
- [ ] 自定义和弦用户配置
- [ ] 更多的特性和弦类型支持（增六和弦、那不勒斯六和弦等）
- [ ] 乐理知识库的扩展
- [ ] 单元测试覆盖率提升
- [ ] 移动端响应式适配

---

## 📖 相关文档

- **斯波索宾和声学**：系统实现的理论基础
- **GNU Solfege 文档**：视唱练耳模块的核心参考
- **MusicXML 规范**：乐谱导出格式标准

---

## 📄 开源协议

本项目采用 MIT License 协议开源。

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

[English Version (英文版)](README_EN.md)