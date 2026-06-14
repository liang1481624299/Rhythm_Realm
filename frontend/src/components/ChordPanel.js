/**
 * ChordPanel 组件 - 和弦选择面板
 * 参照原来 Vue 组件的实现
 */

export function createChordPanel(store) {
  const panel = document.createElement('div');
  panel.className = 'chord-panel';
  panel.id = 'chord-panel';

  // 左面板 - 自然音和弦
  const leftPanel = document.createElement('div');
  leftPanel.className = 'glass-card modern-panel';
  leftPanel.id = 'chord-panel-diatonic';
  leftPanel.innerHTML = `
    <h3 class="panel-header">自然音阶系统 (Diatonic)</h3>
    <div class="chord-categories" id="diatonic-categories"></div>
  `;

  // 右面板 - 副功能和弦
  const rightPanel = document.createElement('div');
  rightPanel.className = 'glass-card modern-panel chromatic-panel';
  rightPanel.id = 'chord-panel-chromatic';
  rightPanel.innerHTML = `
    <h3 class="panel-header chromatic-header">离调与变音体系 (Chromatic)</h3>
    <div class="chord-categories" id="chromatic-categories"></div>
  `;

  panel.appendChild(leftPanel);
  panel.appendChild(rightPanel);

  return panel;
}

export function updateChordPanel(store) {
  const diatonicCategories = document.getElementById('diatonic-categories');
  const chromaticCategories = document.getElementById('chromatic-categories');
  
  if (!diatonicCategories || !chromaticCategories) return;

  const categories = store.categories || { diatonic: {}, chromatic: {} };
  const isMinorKey = checkIsMinorKey(categories);

  // 渲染自然音和弦
  diatonicCategories.innerHTML = '';
  Object.entries(categories.diatonic || {}).forEach(([title, chords]) => {
    const row = createCategoryRow(title, chords, isMinorKey, store);
    diatonicCategories.appendChild(row);
  });

  // 渲染副功能和弦
  chromaticCategories.innerHTML = '';
  Object.entries(categories.chromatic || {}).forEach(([title, chords]) => {
    const row = createCategoryRow(title, chords, isMinorKey, store, true);
    chromaticCategories.appendChild(row);
  });
}

function checkIsMinorKey(categories) {
  const diatonicKeys = Object.keys(categories.diatonic || {});
  const mainKey = diatonicKeys.find(k => k.includes('主功能组'));
  if (mainKey) {
    const mainGroup = categories.diatonic[mainKey];
    return mainGroup.includes('t') || mainGroup.includes('t不完全');
  }
  return false;
}

function createCategoryRow(title, chords, isMinorKey, store, isChromatic = false) {
  const row = document.createElement('div');
  row.className = 'category-row';

  const catTitle = document.createElement('div');
  catTitle.className = 'cat-title';
  catTitle.textContent = title;
  row.appendChild(catTitle);

  const grid = document.createElement('div');
  grid.className = 'chord-grid-layout';

  chords.forEach(chord => {
    const btn = createChordButton(chord, isMinorKey, store, isChromatic);
    grid.appendChild(btn);
  });

  row.appendChild(grid);
  return row;
}

function createChordButton(chord, isMinorKey, store, isChromatic) {
  const btn = document.createElement('button');
  btn.className = 'modern-chord-btn' + (isChromatic ? ' chromatic-btn' : '');

  const badge = document.createElement('span');
  badge.className = 'chord-badge';

  const parsed = parseChord(chord, isMinorKey);

  // 主干音
  const core = document.createElement('span');
  core.className = 'chord-core' + (parsed.isMinor ? ' is-minor' : '');
  core.textContent = parsed.core;
  badge.appendChild(core);

  // 度数
  if (parsed.degree) {
    const degree = document.createElement('span');
    degree.className = 'chord-degree-sub';
    degree.textContent = parsed.degree;
    badge.appendChild(degree);
  }

  // 上标
  if (parsed.superText) {
    const superSpan = document.createElement('span');
    superSpan.className = 'chord-super';
    superSpan.textContent = parsed.superText;
    badge.appendChild(superSpan);
  }

  // 下标
  if (parsed.subText) {
    const sub = document.createElement('span');
    sub.className = 'chord-sub';
    sub.textContent = parsed.subText;
    badge.appendChild(sub);
  }

  // 堆叠数字
  if (parsed.topNum || parsed.bottomNum) {
    const stack = document.createElement('span');
    stack.className = 'chord-stack';
    if (parsed.topNum) {
      const top = document.createElement('span');
      top.className = 'stack-top';
      top.textContent = parsed.topNum;
      stack.appendChild(top);
    }
    if (parsed.bottomNum) {
      const bottom = document.createElement('span');
      bottom.className = 'stack-bottom';
      bottom.textContent = parsed.bottomNum;
      stack.appendChild(bottom);
    }
    badge.appendChild(stack);
  }

  // 副功能和弦后缀
  if (parsed.secondary) {
    const sec = document.createElement('span');
    sec.className = 'chord-secondary';
    sec.textContent = parsed.secondary;
    badge.appendChild(sec);
  }

  btn.appendChild(badge);

  btn.addEventListener('click', () => {
    store.sendAction(chord);
  });

  return btn;
}

function parseChord(chordStr, isMinorKey) {
  let s = chordStr;
  let secondary = '';
  
  // 处理转位
  if (s.includes('/')) {
    const parts = s.split('/');
    s = parts[0];
    secondary = '/' + parts[1];
  }
  
  let core = '';
  let degree = '';
  let superText = '';
  let subText = '';
  let topNum = '';
  let bottomNum = '';
  let isMinor = false;

  // 替换特殊字符
  s = s.replace('ᵥᵢᵢ', 'vii').replace('ᵢᵢᵢ', 'iii').replace('ᵢᵢ', 'ii');
  
  // VI 级处理
  if (s.startsWith('VI_阻碍')) { 
    core = isMinorKey ? 'tS' : 'TS'; 
    degree = 'VI'; 
    superText = '阻碍'; 
    s = ''; 
  }
  else if (s.startsWith('VI')) { 
    core = isMinorKey ? 'tS' : 'TS'; 
    degree = 'VI'; 
    s = s.slice(2); 
  }
  else if (s.startsWith('♭VI')) { 
    core = '♭' + (isMinorKey ? 'tS' : 'TS'); 
    degree = 'VI'; 
    s = s.slice(3); 
  }
  
  // 音级处理
  if (degree === '') {
    if (s.includes('vii') || s.includes('VII')) {
      degree = 'VII';
      s = s.replace('vii', '').replace('VII', '');
    } else if (s.includes('iii') || s.includes('III')) {
      degree = 'III';
      s = s.replace('iii', '').replace('III', '');
    } else if (s.includes('ii') || s.includes('II')) {
      degree = 'II';
      s = s.replace('ii', '').replace('II', '');
    }
  }
  
  // 功能根处理
  if (core === '') {
    if (s.startsWith('DT')) { core = 'DT'; s = s.slice(2); }
    else if (s.startsWith('♭VII')) { core = '♭VII'; s = s.slice(4); }
    else if (s.startsWith('VII')) { core = 'VII'; s = s.slice(3); }
    else if (s.startsWith('DD')) { core = 'DD'; s = s.slice(2); }
    else if (s.startsWith('It')) { core = 'It'; s = s.slice(2); }
    else if (s.startsWith('Ger')) { core = 'Ger'; s = s.slice(3); }
    else if (s.startsWith('Fr')) { core = 'Fr'; s = s.slice(2); }
    else if (s.startsWith('N')) { core = 'N'; s = s.slice(1); }
    else if (s.startsWith('K')) { core = 'K'; s = s.slice(1); }
    else if (s.startsWith('T')) { core = 'T'; s = s.slice(1); }
    else if (s.startsWith('t')) { core = 't'; isMinor = true; s = s.slice(1); }
    else if (s.startsWith('S')) { core = 'S'; s = s.slice(1); }
    else if (s.startsWith('s')) { core = 's'; isMinor = true; s = s.slice(1); }
    else if (s.startsWith('D')) { core = 'D'; s = s.slice(1); }
    else { core = s; s = ''; }
  }
  
  // 修饰符处理
  if (s.includes('不完全')) { superText = '不完全'; s = s.replace('不完全', ''); }
  if (s.includes('双三')) { superText = '双三'; s = s.replace('双三', ''); }
  if (s.includes('⁺⁶')) { superText = '+6'; s = s.replace('⁺⁶', ''); }
  
  // 和弦类型
  if (s.includes('₆₄') || s.includes('64')) { topNum = '6'; bottomNum = '4'; }
  else if (s.includes('₅₆') || s.includes('56')) { topNum = '6'; bottomNum = '5'; }
  else if (s.includes('₃₄') || s.includes('34')) { topNum = '4'; bottomNum = '3'; }
  else if (s.includes('₇⁶') || s.includes('76')) { topNum = '6'; bottomNum = '7'; }
  else if (s.includes('₆')) { subText = '6'; }
  else if (s.includes('₇')) { subText = '7'; }
  else if (s.includes('₂')) { subText = '2'; }
  else if (s.includes('₉♭')) { subText = '9'; superText = '♭'; }
  else if (s.includes('₉')) { subText = '9'; }
  
  return { core, degree, superText, subText, topNum, bottomNum, secondary, isMinor };
}
