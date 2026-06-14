/**
 * PianoPanel 组件 - 钢琴键盘输入面板
 */

export function createPianoPanel(store) {
  const panel = document.createElement('div');
  panel.className = 'piano-panel';
  panel.id = 'piano-panel';

  const scrollWrapper = document.createElement('div');
  scrollWrapper.className = 'piano-scroll-wrapper';

  const keysContainer = document.createElement('div');
  keysContainer.className = 'piano-keys';
  keysContainer.id = 'piano-keys';

  // 定义钢琴键 (从 C4 到 B5)
  const whiteNotes = [
    { note: 'C', midi: 60 },
    { note: 'D', midi: 62 },
    { note: 'E', midi: 64 },
    { note: 'F', midi: 65 },
    { note: 'G', midi: 67 },
    { note: 'A', midi: 69 },
    { note: 'B', midi: 71 },
    { note: 'C2', midi: 72 },
    { note: 'D2', midi: 74 },
    { note: 'E2', midi: 76 },
    { note: 'F2', midi: 77 },
    { note: 'G2', midi: 79 },
    { note: 'A2', midi: 81 },
    { note: 'B2', midi: 83 },
    { note: 'C3', midi: 84 },
    { note: 'D3', midi: 86 },
    { note: 'E3', midi: 88 },
  ];

  const blackNotes = [
    { note: 'C#', midi: 61, offsetWhite: 0 },
    { note: 'D#', midi: 63, offsetWhite: 1 },
    { note: 'F#', midi: 66, offsetWhite: 3 },
    { note: 'G#', midi: 68, offsetWhite: 4 },
    { note: 'A#', midi: 70, offsetWhite: 5 },
    { note: 'C#2', midi: 73, offsetWhite: 7 },
    { note: 'D#2', midi: 75, offsetWhite: 8 },
    { note: 'F#2', midi: 78, offsetWhite: 10 },
    { note: 'G#2', midi: 80, offsetWhite: 11 },
    { note: 'A#2', midi: 82, offsetWhite: 12 },
    { note: 'C#3', midi: 85, offsetWhite: 14 },
    { note: 'D#3', midi: 87, offsetWhite: 15 },
  ];

  const KEY_WIDTH = 28;
  const KEY_GAP = 2;

  // 创建白键
  whiteNotes.forEach((item, index) => {
    const key = document.createElement('div');
    key.className = 'piano-key-white';
    key.style.left = `${index * (KEY_WIDTH + KEY_GAP)}px`;
    key.dataset.midi = String(item.midi);

    key.addEventListener('mousedown', () => {
      key.classList.add('active');
      handleNoteInput(item.midi, store);
    });

    key.addEventListener('mouseup', () => {
      key.classList.remove('active');
    });

    key.addEventListener('mouseleave', () => {
      key.classList.remove('active');
    });

    keysContainer.appendChild(key);
  });

  // 创建黑键
  blackNotes.forEach((item) => {
    const key = document.createElement('div');
    key.className = 'piano-key-black';
    key.style.left = `${(item.offsetWhite + 1) * (KEY_WIDTH + KEY_GAP) - 9}px`;
    key.dataset.midi = String(item.midi);

    key.addEventListener('mousedown', () => {
      key.classList.add('active');
      handleNoteInput(item.midi, store);
    });

    key.addEventListener('mouseup', () => {
      key.classList.remove('active');
    });

    key.addEventListener('mouseleave', () => {
      key.classList.remove('active');
    });

    keysContainer.appendChild(key);
  });

  scrollWrapper.appendChild(keysContainer);
  panel.appendChild(scrollWrapper);

  return panel;
}

function handleNoteInput(midi, store) {
  if (store.mode === 'COMPOSE') {
    store.pending_note = midi;
    store.sync();
  } else if (store.mode === 'SOPRANO' || store.mode === 'BASS') {
    // 添加到旋律序列
    if (!store.target_melody) store.target_melody = [];
    store.target_melody.push(midi);
    store.sync();
  }
}

export function updatePianoPanelVisibility(store) {
  const panel = document.getElementById('piano-panel');
  if (panel) {
    panel.style.display = (store.mode === 'FREE') ? 'none' : 'block';
  }
}
