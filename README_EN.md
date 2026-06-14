# 🎹 Rhythm Realm (徵羽乐界)

![Python Version](https://img.shields.io/badge/Python-3.11.9-blue.svg)
![UI](https://img.shields.io/badge/UI-Tkinter%20%7C%20Web-orange.svg)
![Algorithm](https://img.shields.io/badge/Algorithm-DP%20%7C%20DAG%20%7C%20Viterbi-success.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

A music sanctuary above the aurora — where music theory and creation converge. From traditional harmony to modern techniques, every exploration is filled with inspiration.

## 📁 Project Structure

```
Rhythm_Realm/
├── apps/
│   └── sposobin/                 # Sposobin Harmony Engine Core Module
│       ├── __init__.py
│       ├── main.py                # Tkinter Desktop Application Entry
│       ├── app.py                 # FastAPI Web Service Entry
│       ├── engine.py              # Solver: DAG Construction & Viterbi Path Optimization
│       ├── rules.py               # Rule Engine: Transition Penalty Calculation
│       ├── dna.py                 # Data Dictionary: Chord Function Network (T-S-D)
│       ├── tonality.py            # Tonality Math Model: Scale Offset, Semitone Mapping
│       ├── renderer.py             # Renderer: Canvas Vector Graphics, Staff Layout
│       ├── player.py               # Audio Synthesis Layer: MIDI Waveform Generation
│       ├── download.py             # Audio Sample Download Utility
│       └── bug.md                 # Development Log & TODOs
├── frontend/                      # Vue.js + Vite Frontend Project
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Sposobin.js        # Harmony Workstation Page
│   │   │   └── Home.js            # Home Page
│   │   ├── components/
│   │   │   ├── ScoreRenderer.*    # Score Renderer Component
│   │   │   ├── PianoKeyboard.*     # Virtual Piano Component
│   │   │   └── ChordSelector.*     # Chord Selector Component
│   │   └── ...
│   └── ...
├── requirements.txt               # Python Dependencies
├── start_backend.bat              # Windows Backend Startup Script
└── start_server.sh                # Unix Backend Startup Script
```

## ✨ Core Features

### 🧠 Core Algorithm Engine (Viterbi & DAG)
- Uses dynamic programming to construct a global Directed Acyclic Graph (DAG), exhaustively searching for the optimal global path under melody boundary constraints
- Employs penalty functions to evaluate voice smoothness and minimize state transition costs

### 🏛️ Strict Classical Voice-Leading Rules
- **Hard-blocking mechanisms**: Strictly avoid parallel fifths/octaves, hidden fifths/octaves, voice crossing and voice overlapping
- **Augmented/Diminished interval filters**: Precisely intercept non-classical lateral augmented/diminished intervals, with legitimate exemptions for sequences and chromatic transitions
- **Seventh chord style constraints**: Built-in strict seventh tone preparation and resolution mechanisms
- **Characteristic chord validation**: Supports augmented sixth chords (It⁺⁶, Ger⁺⁶, Fr⁺⁶), Neapolitan sixth chord (N₆), and cadential six-four chord (K₆₄)

### 🛠️ Multi-Mode Workflow
- **Soprano harmonization mode**: Input target melody sequence, engine automatically completes state space generation and global path optimization
- **Bass mode**: Automated harmony configuration based on bass melody
- **Composition mode**: Interactive note input with real-time connectivity evaluation and dynamic pruning
- **Free mode**: Freely explore legal state transition paths in the underlying chord network

### 📊 Web API Service
- FastAPI-based cloud REST API
- Real-time traffic monitoring and admin dashboard
- User issue reporting and dead-end diagnosis system

## 🚀 Quick Start

### Requirements

- **Python 3.11.9** (recommended for best pygame compatibility)
- **Node.js 18+**
- **npm 9+**

### Backend Setup

```bash
# 1. Create virtual environment (recommended in project root)
python -m venv .venv

# 2. Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Start backend service
# Windows:
.\start_backend.bat
# Linux/macOS:
bash start_server.sh

# Or manually start
cd apps/sposobin
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🔧 Tech Stack

- **Backend**: Python 3.11.9 / FastAPI / Tkinter
- **Frontend**: Vue.js 3 / Vite / TailwindCSS
- **Algorithm**: Dynamic Programming / DAG / Viterbi
- **Audio**: pygame.midi

## ⚠️ Features Under Development

The following features are actively being developed:
- [ ] More complete chord transition rules
- [ ] Custom chord user configuration
- [ ] More characteristic chord type support
- [ ] Music theory knowledge base expansion
- [ ] Improved unit test coverage

## 📖 Related Documents

- Algorithm complexity analysis: See `apps/sposobin/bug.md` for development history and TODOs
- Sposobin harmony theory rules: The theoretical foundation of the system

## 📄 License

This project is open source under the MIT License.
