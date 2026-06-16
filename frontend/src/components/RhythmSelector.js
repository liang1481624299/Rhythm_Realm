/**
 * RhythmSelector - 节奏选择器组件
 * 类似于 Sibelius 的节奏输入方式
 * 支持多种音符时值、附点、附附点和休止符
 */

// 节奏类型定义（正确的 SMuFL 编码）
// 全音符和二分音符使用空心符头，四分音符及以下使用实心符头
// 八分音符及以下的区别在于符尾数量，符头相同
export const RHYTHM_TYPES = {
  // 音符
  whole: { name: '全音符', duration: 4.0, smufl: '\uE0A2', label: '1', dot: false },
  half: { name: '二分音符', duration: 2.0, smufl: '\uE0A3', label: '2', dot: false },
  quarter: { name: '四分音符', duration: 1.0, smufl: '\uE0A4', label: '4', dot: false },
  eighth: { name: '八分音符', duration: 0.5, smufl: '\uE0A4', label: '8', dot: false },
  sixteenth: { name: '十六分音符', duration: 0.25, smufl: '\uE0A4', label: '16', dot: false },
  thirtySecond: { name: '三十二分音符', duration: 0.125, smufl: '\uE0A4', label: '32', dot: false },
  sixtyFourth: { name: '六十四分音符', duration: 0.0625, smufl: '\uE0A4', label: '64', dot: false },
  
  // 附点音符
  halfDot: { name: '附点二分', duration: 3.0, smufl: '\uE0A3', label: '2.', dot: true },
  quarterDot: { name: '附点四分', duration: 1.5, smufl: '\uE0A4', label: '4.', dot: true },
  eighthDot: { name: '附点八分', duration: 0.75, smufl: '\uE0A4', label: '8.', dot: true },
  sixteenthDot: { name: '附点十六分', duration: 0.375, smufl: '\uE0A4', label: '16.', dot: true },
  thirtySecondDot: { name: '附点三十二分', duration: 0.1875, smufl: '\uE0A4', label: '32.', dot: true },
  
  // 附附点音符
  halfDoubleDot: { name: '附附点二分', duration: 3.5, smufl: '\uE0A3', label: '2..', doubleDot: true },
  quarterDoubleDot: { name: '附附点四分', duration: 1.75, smufl: '\uE0A4', label: '4..', doubleDot: true },
  eighthDoubleDot: { name: '附附点八分', duration: 0.875, smufl: '\uE0A4', label: '8..', doubleDot: true },
  sixteenthDoubleDot: { name: '附附点十六分', duration: 0.4375, smufl: '\uE0A4', label: '16..', doubleDot: true },
  
  // 休止符（正确的 Bravura 编码）
  restWhole: { name: '全休止', duration: 4.0, smufl: '\uE4E3', label: '休1', isRest: true },
  restHalf: { name: '二分休止', duration: 2.0, smufl: '\uE4E4', label: '休2', isRest: true },
  restQuarter: { name: '四分休止', duration: 1.0, smufl: '\uE4E5', label: '休4', isRest: true },
  restEighth: { name: '八分休止', duration: 0.5, smufl: '\uE4E6', label: '休8', isRest: true },
  restSixteenth: { name: '十六分休止', duration: 0.25, smufl: '\uE4E7', label: '休16', isRest: true },
  restThirtySecond: { name: '三十二分休止', duration: 0.125, smufl: '\uE4E8', label: '休32', isRest: true },
};

export const RHYTHM_GROUPS = [
  {
    name: '基础音符',
    items: ['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtySecond', 'sixtyFourth']
  },
  {
    name: '附点音符',
    items: ['halfDot', 'quarterDot', 'eighthDot', 'sixteenthDot', 'thirtySecondDot']
  },
  {
    name: '附附点音符',
    items: ['halfDoubleDot', 'quarterDoubleDot', 'eighthDoubleDot', 'sixteenthDoubleDot']
  },
  {
    name: '休止符',
    items: ['restWhole', 'restHalf', 'restQuarter', 'restEighth', 'restSixteenth', 'restThirtySecond']
  }
];

/**
 * 创建节奏选择器面板
 */
export function createRhythmSelector(store) {
  const panel = document.createElement('div');
  panel.className = 'rhythm-selector glass-card';
  panel.id = 'rhythm-selector';

  panel.innerHTML = `
    <div class="rhythm-header">
      <h3 class="panel-header">🎵 节奏选择器</h3>
      <div class="rhythm-info">
        <span class="current-rhythm-label">当前: </span>
        <span class="current-rhythm-value" id="current-rhythm">四分音符</span>
      </div>
    </div>
    
    <div class="rhythm-groups" id="rhythm-groups"></div>
    
    <div class="rhythm-actions">
      <button id="apply-rhythm-btn" class="modern-btn btn-primary">应用到当前和弦</button>
      <button id="apply-all-rhythm-btn" class="modern-btn btn-secondary">应用到所有和弦</button>
      <button id="clear-rhythm-btn" class="modern-btn btn-danger">清除节奏</button>
    </div>
  `;

  // 渲染节奏组
  const rhythmGroupsEl = panel.querySelector('#rhythm-groups');
  RHYTHM_GROUPS.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'rhythm-group';
    
    const groupTitle = document.createElement('div');
    groupTitle.className = 'rhythm-group-title';
    groupTitle.textContent = group.name;
    groupEl.appendChild(groupTitle);
    
    const groupButtons = document.createElement('div');
    groupButtons.className = 'rhythm-buttons';
    
    group.items.forEach(itemKey => {
      const rhythm = RHYTHM_TYPES[itemKey];
      const btn = document.createElement('button');
      btn.className = 'rhythm-btn';
      btn.dataset.rhythmKey = itemKey;
      
      btn.innerHTML = `
        <span class="rhythm-smufl">${rhythm.smufl}</span>
        <span class="rhythm-label">${rhythm.label}</span>
      `;
      
      btn.addEventListener('click', () => {
        selectRhythm(itemKey, store);
      });
      
      groupButtons.appendChild(btn);
    });
    
    groupEl.appendChild(groupButtons);
    rhythmGroupsEl.appendChild(groupEl);
  });

  // 绑定按钮事件
  panel.querySelector('#apply-rhythm-btn').addEventListener('click', () => {
    applyRhythmToCurrent(store);
  });

  panel.querySelector('#apply-all-rhythm-btn').addEventListener('click', () => {
    applyRhythmToAll(store);
  });

  panel.querySelector('#clear-rhythm-btn').addEventListener('click', () => {
    clearAllRhythms(store);
  });

  return panel;
}

function selectRhythm(rhythmKey, store) {
  store.currentRhythm = rhythmKey;
  const rhythm = RHYTHM_TYPES[rhythmKey];
  document.querySelector('#current-rhythm').textContent = rhythm.name;
  
  // 更新选中状态
  document.querySelectorAll('.rhythm-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  document.querySelector(`[data-rhythm-key="${rhythmKey}"]`).classList.add('selected');
}

function applyRhythmToCurrent(store) {
  if (!store.currentRhythm || store.history.length === 0) return;
  
  const lastIndex = store.history.length - 1;
  const rhythm = RHYTHM_TYPES[store.currentRhythm];
  
  if (!store.history[lastIndex].rhythm) {
    store.history[lastIndex].rhythm = [];
  }
  
  store.history[lastIndex].rhythm = {
    key: store.currentRhythm,
    duration: rhythm.duration,
    isRest: rhythm.isRest || false
  };
  
  store.notify();
}

function applyRhythmToAll(store) {
  if (!store.currentRhythm || store.history.length === 0) return;
  
  const rhythm = RHYTHM_TYPES[store.currentRhythm];
  
  store.history.forEach(item => {
    item.rhythm = {
      key: store.currentRhythm,
      duration: rhythm.duration,
      isRest: rhythm.isRest || false
    };
  });
  
  store.notify();
}

function clearAllRhythms(store) {
  store.history.forEach(item => {
    delete item.rhythm;
  });
  store.currentRhythm = 'quarter';
  document.querySelector('#current-rhythm').textContent = '四分音符';
  store.notify();
}

/**
 * 获取指定和弦的节奏时长，如果没有设置则返回默认值
 */
export function getChordDuration(chordItem, defaultDuration = 1.0) {
  if (chordItem && chordItem.rhythm) {
    return chordItem.rhythm.duration;
  }
  return defaultDuration;
}

/**
 * 判断和弦是否为休止符
 */
export function isRest(chordItem) {
  return chordItem && chordItem.rhythm && chordItem.rhythm.isRest;
}