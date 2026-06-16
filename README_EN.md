# 🎹 Rhythm Realm (徵羽乐界)

[中文版本 (Chinese Version)](README.md)

![Python Version](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Node Version](https://img.shields.io/badge/Node.js-18+-green.svg)
![Vue Version](https://img.shields.io/badge/Vue.js-3.5+-orange.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## 🙏 Acknowledgments

This project is based on the [Sposobin](https://github.com/Huaishu61/Sposobin) project. Special thanks to the original author [**Huaishu61**](https://github.com/Huaishu61) for the open source contribution!

**Contributors:**
- [**Huaishu61**](https://github.com/Huaishu61) - Original author of Sposobin Harmony Engine
- Project Maintenance Team - Solfege training module & Web frontend development

---

A music sanctuary above the aurora — where music theory and creation converge. From traditional harmony to modern techniques, every exploration is filled with inspiration.

---

## 📁 Project Structure

```
Sposobin-web-/
├── api/                           # Backend API Services
│   ├── solfege/                   # Solfege Training System API
│   │   └── api.py                 # FastAPI Service Entry
│   └── sposobin/                  # Sposobin Harmony Engine API
│       └── api.py                 # FastAPI Service Entry
├── apps/                          # Core Application Modules
│   └── solfege/                   # GNU Solfege Core Module
│       ├── exercises/             # Exercise Files Library
│       ├── feta/                  # Score Rendering Fonts
│       └── graphics/              # Graphics Resources
├── frontend/                      # Vue.js + Vite Frontend Project
│   ├── public/                    # Static Resources
│   ├── src/
│   │   ├── components/            # Reusable Components
│   │   ├── pages/                 # Page Components
│   │   ├── audio/                 # Audio Processing Module
│   │   └── lib/                   # Utility Library
│   ├── index.html                 # Home Page Entry
│   ├── sposobin.html              # Harmony Workstation Entry
│   ├── package.json               # Frontend Dependencies Configuration
│   └── vite.config.js             # Vite Build Configuration
├── .devcontainer/                 # Dev Container Configuration
├── .gitignore                     # Git Ignore Rules
└── README.md                      # Project Documentation
```

> **Note**: The following directories/files are NOT uploaded to Git (configured via `.gitignore`):
> - `.venv/` - Python virtual environment (create with `python -m venv .venv`)
> - `node_modules/` - npm dependencies (install with `npm install`)
> - `history_ver/` - History version backups
> - `*.db` - SQLite database files
> - `*.log` - Log files

---

## ✨ Core Features

### 🧠 Sposobin Harmony Engine (V1.3)

An intelligent harmony configuration system based on dynamic programming and Viterbi algorithm:

- **DAG Global Path Search**: Constructs directed acyclic graphs to search for optimal harmony paths under target melody constraints
- **Voice-Leading Rules**: Strictly avoids parallel fifths/octaves, hidden fifths/octaves, voice crossing and voice overlapping
- **Multi-Mode Workflow**:
  - Soprano Mode: Input target melody, automatically generate harmony configurations
  - Bass Mode: Automated harmony configuration based on bass melody
  - Composition Mode: Interactive note input with real-time connectivity evaluation
  - Free Mode: Freely explore legal state transition paths in the chord network

### 🎵 Solfege Training System

Web-based training platform built on GNU Solfege core modules:

- **Interval Recognition**: Melodic and harmonic interval training
- **Chord Recognition**: Triad and seventh chord training
- **Rhythm Training**: Beat recognition and rhythm dictation
- **Tonality Training**: Scale degree recognition and tonality perception
- **Solmisation Training**: Moveable do solfege practice

### 📊 Intelligent Grading System

- **Photo Grading**: Upload handwritten harmony assignments for automatic recognition and scoring
- **Rule Engine**: Intelligent scoring based on Sposobin harmony rules
- **Error Diagnosis**: Detailed error analysis and improvement suggestions

### 🎹 Interactive Score Rendering

- **Vector Staff Rendering**: Professional-grade score display
- **Real-time Audio Playback**: MIDI audio synthesis based on Web Audio API
- **MusicXML Export**: Export to standard score format

---

## 🚀 Quick Start

### Requirements

| Component | Version | Description |
|-----------|---------|-------------|
| Python | 3.11+ | Recommended 3.11.9 for best pygame compatibility |
| Node.js | 18+ | Frontend build environment |
| npm | 9+ | Package manager |

### 1. Clone Repository

```bash
git clone <repository-url>
cd Sposobin-web-
```

### 2. Backend Setup

#### Create Virtual Environment

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/macOS
python3 -m venv .venv
source .venv/bin/activate
```

#### Install Dependencies

```bash
pip install fastapi uvicorn pydantic python-multipart
```

#### Start Backend Service

**Option 1: Start Sposobin Harmony Engine**

```bash
cd api/sposobin
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

**Option 2: Start Solfege API**

```bash
cd api/solfege
uvicorn api:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Access Application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend Home | http://localhost:5173 | Main application entry |
| Harmony Workstation | http://localhost:5173/sposobin.html | Harmony analysis tool |
| API Documentation | http://localhost:8000/api/docs | Backend API docs |
| Admin Dashboard | http://localhost:8000/admin | Traffic monitoring panel |

---

## 🔧 Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.100+ | RESTful API framework |
| Uvicorn | 0.23+ | ASGI server |
| Pydantic | 2.0+ | Data validation |
| SQLite3 | Built-in | Lightweight database |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue.js | 3.5+ | Frontend framework |
| Vite | 8.0+ | Build tool |
| Tone.js | 15.1+ | Web Audio API wrapper |
| Tailwind CSS | 3.0+ | CSS framework (via CDN) |

### Core Algorithms

- **Dynamic Programming (DP)**: Global optimal path search
- **DAG (Directed Acyclic Graph)**: State space modeling
- **Viterbi Algorithm**: Hidden Markov Model decoding
- **Penalty Function**: Voice smoothness evaluation

---

## 🔌 API Endpoints

### Harmony Engine

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sync_state` | POST | Sync harmony state, get available next chords |
| `/api/export_musicxml` | POST | Export MusicXML score |
| `/api/submit_issue` | POST | Submit issue/dead-end report |
| `/api/grade/manual` | POST | Manual chord sequence grading |
| `/api/grade/photo` | POST | Photo upload grading |

### Solfege Training

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | POST | Create practice session |
| `/api/questions` | GET | Get questions |
| `/api/answers` | POST | Submit answers |
| `/api/statistics` | GET | Get statistics |

---

## 🎯 Usage Guide

### Harmony Workstation Workflow

1. **Select Mode**: Soprano / Bass / Composition / Free mode
2. **Select Key**: Choose target tonality from dropdown menu
3. **Input Melody**: Click on virtual piano to input target melody (Soprano/Bass mode)
4. **Select Chord**: Choose appropriate chords from recommended functional groups
5. **View Result**: Real-time view of four-part harmony arrangement and score rendering
6. **Export Score**: Click export button to generate MusicXML file

### Solfege Training Workflow

1. **Select Exercise Type**: Interval recognition, chord recognition, rhythm training, etc.
2. **Configure Parameters**: Customize range, tonality, difficulty, etc.
3. **Start Practice**: Listen to audio and select correct answer
4. **View Statistics**: Check practice progress and accuracy statistics

---

## 🔒 Admin Dashboard

Access `http://localhost:8000/admin` for the monitoring panel:

- **Credentials**: Username `admin`, Password `SposobinSecure2026`
- **Features**:
  - Real-time traffic monitoring
  - Unique user statistics
  - Issue/dead-end report pool
  - 5-second auto-refresh

---

## 📦 Project Extension

### Adding New Exercise Types

1. Add new Teacher class in `api/solfege/api.py`
2. Add corresponding exercise component in frontend `src/pages/Solfege.js`
3. Update `ExerciseType` enum

### Adding New Tonality Support

1. Add new tonality definition in `apps/sposobin/tonality.py`
2. Update `KEY_REGISTRY` registry

---

## 📋 Features Under Development

- [ ] More complete chord transition rules
- [ ] Custom chord user configuration
- [ ] More characteristic chord type support (Augmented sixth, Neapolitan sixth, etc.)
- [ ] Music theory knowledge base expansion
- [ ] Improved unit test coverage
- [ ] Mobile responsive adaptation

---

## 📖 Related Documents

- **Sposobin Harmony Theory**: Theoretical foundation of the system implementation
- **GNU Solfege Documentation**: Core reference for solfege training module
- **MusicXML Specification**: Standard score export format

---

## 📄 License

This project is open source under the MIT License.

---

## 🤝 Contribution Guide

Welcome to submit Issues and Pull Requests!

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Create Pull Request

---

[中文版本 (Chinese Version)](README.md)