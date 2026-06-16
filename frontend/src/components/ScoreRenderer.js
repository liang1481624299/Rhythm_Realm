/**
 * ScoreRenderer - 四声部和弦乐谱渲染组件
 * 完全按照 src1 (ScoreRenderer.vue) 的实现
 * 使用 Bravura 音乐字体（SMuFL 标准）绘制音符和符号
 */

import { icons } from './icons.js';

// 五线谱布局常量 - 完全按照 src1 ScoreRenderer.vue
const STAFF_TOP = 40;      // 高音谱表 Y 起始位置 (第一根线)
const STAFF_BOTTOM = 170;  // 低音谱表 Y 起始位置 (第一根线)
const STAFF_GAP = 10;
const CLEF_X = 30;
const SIG_START_X = 92;
const SIG_SPACING = 11;
const NODE_SPACING = 55;
const EXTRA_BAR_SPACING = 12;
const SVG_HEIGHT = 300;
const GROUP_OFFSET_Y = 25;

// 音符符头映射（支持节奏类型）
const NOTE_HEADS = {
  whole: '\uE0A2',      // 全音符（空心符头）
  half: '\uE0A3',       // 二分音符（空心符头）
  quarter: '\uE0A4',    // 四分音符（实心符头）
  eighth: '\uE0A4',     // 八分音符（实心符头）
  sixteenth: '\uE0A4',  // 十六分音符（实心符头）
  thirtySecond: '\uE0A4', // 三十二分音符（实心符头）
  sixtyFourth: '\uE0A4',  // 六十四分音符（实心符头）
  // 附点音符
  halfDot: '\uE0A3',
  quarterDot: '\uE0A4',
  eighthDot: '\uE0A4',
  sixteenthDot: '\uE0A4',
  thirtySecondDot: '\uE0A4',
  // 附附点音符
  halfDoubleDot: '\uE0A3',
  quarterDoubleDot: '\uE0A4',
  eighthDoubleDot: '\uE0A4',
  sixteenthDoubleDot: '\uE0A4',
  // 休止符
  restWhole: '\uE4E3',
  restHalf: '\uE4E4',
  restQuarter: '\uE4E5',
  restEighth: '\uE4E6',
  restSixteenth: '\uE4E7',
  restThirtySecond: '\uE4E8',
};

// 符尾数量映射
const FLAG_COUNT = {
  eighth: 1,
  eighthDot: 1,
  eighthDoubleDot: 1,
  sixteenth: 2,
  sixteenthDot: 2,
  sixteenthDoubleDot: 2,
  thirtySecond: 3,
  thirtySecondDot: 3,
  sixtyFourth: 4,
};

/**
 * 创建五线谱渲染容器
 */
export function createScoreRenderer(store) {
  const container = document.createElement('div');
  container.className = 'glass-card score-section';
  container.id = 'score-renderer';

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.innerHTML = `
    <div class="btn-group">
      <button id="play-btn" class="modern-btn btn-success">
        <span class="icon">▶</span> 试听序列
      </button>
      <button id="clear-btn" class="modern-btn btn-danger">
        <span class="icon">🗑️</span> 清空画板
      </button>
      <button id="export-btn" class="modern-btn btn-primary" style="background: #7C3AED;">
        <span class="icon">🎼</span> 导出 MusicXML
      </button>
    </div>
    <div class="hint-text">
      <span>💡 提示：点击五线谱上的和弦可将其 <b>断点回退</b></span>
    </div>
  `;

  const scoreContainer = document.createElement('div');
  scoreContainer.className = 'score-container';
  scoreContainer.id = 'score-container';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'score-svg';
  svg.setAttribute('height', String(SVG_HEIGHT));
  scoreContainer.appendChild(svg);

  container.appendChild(toolbar);
  container.appendChild(scoreContainer);

  container.querySelector('#play-btn').addEventListener('click', () => {
    if (window.sposobinAudio) {
      window.sposobinAudio.togglePlay();
    }
  });

  container.querySelector('#export-btn').addEventListener('click', () => {
    if (window.sposobinAPI) {
      window.sposobinAPI.exportMusicXML();
    }
  });

  container.querySelector('#clear-btn').addEventListener('click', () => {
    store.resetState();
  });

  return container;
}

/**
 * 渲染五线谱 - 完全按照 src1 的实现
 */
export function renderScore(store) {
  const svg = document.getElementById('score-svg');
  const scoreContainer = document.getElementById('score-container');
  if (!svg || !scoreContainer) return;

  const renderData = store.renderData || { sigs: [], nodes: [] };
  const timeSignature = store.time_signature || '4/4';
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]) || 4;

  // 获取容器宽度，让五线谱填满可用空间
  const containerWidth = scoreContainer.clientWidth || window.innerWidth - 60;
  const minWidth = 800;

  // 计算布局参数
  const sigCount = renderData.sigs?.length || 0;
  const keySigEnd = SIG_START_X + (sigCount * SIG_SPACING);
  const timeSigWidth = timeSignature ? 24 : 0;
  const paddingAfterControls = timeSignature ? (NODE_SPACING / 1.7) : 15;
  const firstNodeX = keySigEnd + timeSigWidth + paddingAfterControls;

  // 计算 SVG 宽度 - 使用容器宽度，确保填满可用空间
  const nodeCount = renderData.nodes?.length || 0;
  let svgWidth = Math.max(minWidth, containerWidth);
  
  // 如果有节点，计算节点需要的最小宽度
  if (nodeCount > 0) {
    const lastNodeX = getNodeX(nodeCount - 1, beatsPerMeasure, firstNodeX);
    const nodeRequiredWidth = lastNodeX + NODE_SPACING + 50;
    svgWidth = Math.max(svgWidth, nodeRequiredWidth);
  }

  svg.setAttribute('width', String(svgWidth));
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${SVG_HEIGHT}`);

  // 清空
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // 获取深色模式状态（参考 history_ver/2026-6-14-15-13）
  const isDark = document.documentElement.classList.contains('dark');
  const lineColor = isDark ? '#ffffff' : '#000000';
  const noteColor = isDark ? '#ffffff' : '#0F172A';

  // 添加样式
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .bravura-text { font-family: 'Bravura', sans-serif; dominant-baseline: central; text-anchor: middle; user-select: none; }
    .staff-lines line { stroke: ${lineColor}; stroke-width: 1; }
    .bar-line { stroke: ${lineColor}; stroke-width: 1.6; }
    .note-head { fill: ${noteColor}; }
    .note-head-pending { fill: #F59E0B; }
    .note-head-target { fill: ${isDark ? '#94A3B8' : '#9CA3AF'}; }
    .chord-label { font-weight: 500; font-family: 'Lora', 'Georgia', serif; font-size: 16px; fill: ${isDark ? '#ffffff' : '#E11D48'}; text-anchor: middle; }
    .hover-bg { fill: transparent; transition: fill 0.2s; }
    .clickable-node { cursor: pointer; }
    .clickable-node:hover .hover-bg { fill: ${isDark ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.06)'}; }
    .playhead-line { stroke: #10B981; stroke-width: 2; stroke-dasharray: 4,2; }
    .playhead-layer { pointer-events: none; }
    .ledger-line { stroke: ${noteColor}; stroke-width: 1.5; }
    .stem { stroke: ${noteColor}; stroke-width: 1.6; }
    .flag { fill: ${noteColor}; }
    .dot { fill: ${noteColor}; }
  `;
  svg.appendChild(style);

  // 主分组 - 整体偏移
  const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  mainGroup.setAttribute('transform', `translate(0, ${GROUP_OFFSET_Y})`);

  // ================ 五线谱线 ================
  const staffLinesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  staffLinesGroup.classList.add('staff-lines');

  // 高音谱表线
  for (let i = 0; i < 5; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '40');
    line.setAttribute('y1', String(STAFF_TOP + i * STAFF_GAP));
    line.setAttribute('x2', String(svgWidth - 20));
    line.setAttribute('y2', String(STAFF_TOP + i * STAFF_GAP));
    staffLinesGroup.appendChild(line);
  }

  // 低音谱表线
  for (let i = 0; i < 5; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '40');
    line.setAttribute('y1', String(STAFF_BOTTOM + i * STAFF_GAP));
    line.setAttribute('x2', String(svgWidth - 20));
    line.setAttribute('y2', String(STAFF_BOTTOM + i * STAFF_GAP));
    staffLinesGroup.appendChild(line);
  }

  // 左侧边界线
  const leftLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  leftLine.setAttribute('x1', '40');
  leftLine.setAttribute('y1', '40');  // STAFF_TOP + STAFF_GAP
  leftLine.setAttribute('x2', '40');
  leftLine.setAttribute('y2', '210'); // STAFF_BOTTOM + 4 * STAFF_GAP
  leftLine.setAttribute('stroke', lineColor);
  leftLine.setAttribute('stroke-width', '2');
  staffLinesGroup.appendChild(leftLine);

  mainGroup.appendChild(staffLinesGroup);

  // ================ 谱号 ================
  // 高音谱号
  const trebleClef = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  trebleClef.setAttribute('x', '30');
  trebleClef.setAttribute('y', '210');
  trebleClef.classList.add('bravura-text');
  trebleClef.setAttribute('font-size', '170');
  trebleClef.setAttribute('fill', lineColor);
  trebleClef.textContent = '\uE000';
  mainGroup.appendChild(trebleClef);

  // 低音谱号1 (在高音谱表上)
  const bassClef1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  bassClef1.setAttribute('x', '65');
  bassClef1.setAttribute('y', '63');
  bassClef1.classList.add('bravura-text');
  bassClef1.setAttribute('font-size', '40');
  bassClef1.setAttribute('dy', '6');
  bassClef1.setAttribute('fill', lineColor);
  bassClef1.textContent = '\uE050';
  mainGroup.appendChild(bassClef1);

  // 低音谱号2 (在低音谱表上)
  const bassClef2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  bassClef2.setAttribute('x', '65');
  bassClef2.setAttribute('y', '185');
  bassClef2.classList.add('bravura-text');
  bassClef2.setAttribute('font-size', '40');
  bassClef2.setAttribute('dy', '-4');
  bassClef2.setAttribute('fill', lineColor);
  bassClef2.textContent = '\uE062';
  mainGroup.appendChild(bassClef2);

  // ================ 调号 ================
  renderData.sigs?.forEach((sig, i) => {
    const x = SIG_START_X + i * SIG_SPACING;
    
    // 高音谱表调号
    const tAcc = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tAcc.setAttribute('x', String(x));
    tAcc.setAttribute('y', String(sig.t_y));
    tAcc.classList.add('bravura-text');
    tAcc.setAttribute('font-size', '37');
    tAcc.setAttribute('dy', '0');
    tAcc.setAttribute('fill', lineColor);
    tAcc.textContent = getSMuFLChar(sig.sym);
    mainGroup.appendChild(tAcc);

    // 低音谱表调号
    const bAcc = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    bAcc.setAttribute('x', String(x));
    bAcc.setAttribute('y', String(sig.b_y));
    bAcc.classList.add('bravura-text');
    bAcc.setAttribute('font-size', '37');
    bAcc.setAttribute('dy', '0');
    bAcc.setAttribute('fill', lineColor);
    bAcc.textContent = getSMuFLChar(sig.sym);
    mainGroup.appendChild(bAcc);
  });

  // ================ 拍号 ================
  if (timeSignature) {
    const tsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const tsX = SIG_START_X + sigCount * SIG_SPACING + 12;
    const num = String.fromCharCode(0xE080 + parseInt(timeSignature.split('/')[0]));
    const den = String.fromCharCode(0xE080 + parseInt(timeSignature.split('/')[1]));

    // 高音谱表拍号
    const tNum = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tNum.setAttribute('x', String(tsX));
    tNum.setAttribute('y', '50');
    tNum.classList.add('bravura-text');
    tNum.setAttribute('font-size', '42');
    tNum.setAttribute('text-anchor', 'middle');
    tNum.setAttribute('fill', lineColor);
    tNum.textContent = num;
    tsGroup.appendChild(tNum);

    const tDen = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tDen.setAttribute('x', String(tsX));
    tDen.setAttribute('y', '70');
    tDen.classList.add('bravura-text');
    tDen.setAttribute('font-size', '42');
    tDen.setAttribute('text-anchor', 'middle');
    tDen.setAttribute('fill', lineColor);
    tDen.textContent = den;
    tsGroup.appendChild(tDen);

    // 低音谱表拍号
    const bNum = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    bNum.setAttribute('x', String(tsX));
    bNum.setAttribute('y', '180');
    bNum.classList.add('bravura-text');
    bNum.setAttribute('font-size', '42');
    bNum.setAttribute('text-anchor', 'middle');
    bNum.setAttribute('fill', lineColor);
    bNum.textContent = num;
    tsGroup.appendChild(bNum);

    const bDen = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    bDen.setAttribute('x', String(tsX));
    bDen.setAttribute('y', '200');
    bDen.classList.add('bravura-text');
    bDen.setAttribute('font-size', '42');
    bDen.setAttribute('text-anchor', 'middle');
    bDen.setAttribute('fill', lineColor);
    bDen.textContent = den;
    tsGroup.appendChild(bDen);

    mainGroup.appendChild(tsGroup);
  }

  // ================ 小节线 ================
  const barlinesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  barlinesGroup.classList.add('barlines-layer');

  renderData.nodes?.forEach((node, index) => {
    if (beatsPerMeasure && (index + 1) % beatsPerMeasure === 0 && index < renderData.nodes.length - 1) {
      const barX = getNodeX(index + 1, beatsPerMeasure, firstNodeX) - NODE_SPACING / 2;
      const barLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      barLine.setAttribute('x1', String(barX));
      barLine.setAttribute('y1', '40');
      barLine.setAttribute('x2', String(barX));
      barLine.setAttribute('y2', '210');
      barLine.classList.add('bar-line');
      barlinesGroup.appendChild(barLine);
    }
  });

  mainGroup.appendChild(barlinesGroup);

  // ================ 和弦节点 ================
  renderData.nodes?.forEach((node, index) => {
    const nodeX = getNodeX(index, beatsPerMeasure, firstNodeX);
    const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeG.setAttribute('transform', `translate(${nodeX}, 0)`);

    if (node.type === 'history') {
      const clickableG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      clickableG.classList.add('clickable-node');

      // 悬停背景 - 扩大点击区域，覆盖整个五线谱高度
      const hoverBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hoverBg.setAttribute('x', '-30');
      hoverBg.setAttribute('y', '-100');
      hoverBg.setAttribute('width', '60');
      hoverBg.setAttribute('height', '350');
      hoverBg.setAttribute('rx', '8');
      hoverBg.classList.add('hover-bg');
      clickableG.appendChild(hoverBg);

      // 和弦标签 - 移至下方，直接设置 fill 属性
      const chordLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      chordLabel.setAttribute('x', '0');
      chordLabel.setAttribute('y', '270');
      chordLabel.classList.add('chord-label');
      chordLabel.setAttribute('fill', isDark ? '#ffffff' : '#E11D48');
      chordLabel.textContent = node.chord_display || '';
      clickableG.appendChild(chordLabel);

      // 点击事件
      clickableG.addEventListener('click', () => {
        if (node.original_index !== undefined) {
          store.rewindTo(node.original_index);
        }
      });

      nodeG.appendChild(clickableG);
    }

    // 获取当前和弦的节奏信息
    const rhythmKey = store.history?.[index]?.rhythm?.key || 'quarter';
    const isRest = store.history?.[index]?.rhythm?.isRest;
    const noteHeadChar = NOTE_HEADS[rhythmKey] || '\uE0A4';
    const flagCount = FLAG_COUNT[rhythmKey] || 0;
    const hasDot = rhythmKey.includes('Dot') && !rhythmKey.includes('DoubleDot');
    const hasDoubleDot = rhythmKey.includes('DoubleDot');

    // 音符
    node.notes?.forEach(note => {
      const noteG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      // 休止符
      if (isRest) {
        const restHead = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        restHead.setAttribute('x', String(note.x));
        restHead.setAttribute('y', String(note.y));
        restHead.classList.add('bravura-text');
        restHead.setAttribute('font-size', '48');
        restHead.setAttribute('dy', '0');
        restHead.setAttribute('fill', getNodeColor(node.type, isDark));
        restHead.textContent = noteHeadChar;
        noteG.appendChild(restHead);
      } else {
        // 符头 - 根据节奏类型选择不同的符头
        const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        noteHead.setAttribute('x', String(note.x));
        noteHead.setAttribute('y', String(note.y));
        noteHead.classList.add('bravura-text');
        noteHead.setAttribute('font-size', '48');
        noteHead.setAttribute('dy', '0');
        noteHead.setAttribute('fill', getNodeColor(node.type, isDark));
        noteHead.textContent = noteHeadChar;
        noteG.appendChild(noteHead);

        // 符干 - 全音符和二分音符不需要符干
        if (!rhythmKey.startsWith('whole') && !rhythmKey.startsWith('half')) {
          const isUpper = note.v === 'S' || note.v === 'T';
          const stemX = note.x + (isUpper ? 6.5 : -6.5);
          const stemLength = 26 + flagCount * 6;
          const stemY2 = isUpper ? note.y - stemLength : note.y + stemLength;
          const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          stem.setAttribute('x1', String(stemX));
          stem.setAttribute('y1', String(note.y));
          stem.setAttribute('x2', String(stemX));
          stem.setAttribute('y2', String(stemY2));
          stem.setAttribute('stroke', getNodeColor(node.type, isDark));
          stem.setAttribute('stroke-width', '1.6');
          stem.classList.add('stem');
          noteG.appendChild(stem);

          // 符尾
          if (flagCount > 0) {
            const flagY = isUpper ? stemY2 : stemY2;
            for (let i = 0; i < flagCount; i++) {
              const flag = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              flag.setAttribute('x', String(stemX + (isUpper ? 2 : -2)));
              flag.setAttribute('y', String(flagY + i * 8 * (isUpper ? 1 : -1)));
              flag.classList.add('bravura-text');
              flag.setAttribute('font-size', '24');
              flag.setAttribute('fill', getNodeColor(node.type, isDark));
              flag.textContent = isUpper ? '\uE240' : '\uE241'; // 向上/向下符尾
              noteG.appendChild(flag);
            }
          }
        }

        // 附点
        if (hasDot) {
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('cx', String(note.x + 14));
          dot.setAttribute('cy', String(note.y - 4));
          dot.setAttribute('r', '3');
          dot.setAttribute('fill', getNodeColor(node.type, isDark));
          dot.classList.add('dot');
          noteG.appendChild(dot);
        }

        // 附附点
        if (hasDoubleDot) {
          const dot1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot1.setAttribute('cx', String(note.x + 14));
          dot1.setAttribute('cy', String(note.y - 4));
          dot1.setAttribute('r', '3');
          dot1.setAttribute('fill', getNodeColor(node.type, isDark));
          dot1.classList.add('dot');
          noteG.appendChild(dot1);

          const dot2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot2.setAttribute('cx', String(note.x + 20));
          dot2.setAttribute('cy', String(note.y));
          dot2.setAttribute('r', '2.5');
          dot2.setAttribute('fill', getNodeColor(node.type, isDark));
          dot2.classList.add('dot');
          noteG.appendChild(dot2);
        }

        // 临时升降号
        if (note.acc) {
          const accText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          accText.setAttribute('x', String(note.acc_x));
          accText.setAttribute('y', String(note.y));
          accText.classList.add('bravura-text');
          accText.setAttribute('font-size', '32');
          accText.setAttribute('dy', '1');
          accText.setAttribute('fill', noteColor);
          accText.textContent = getSMuFLChar(note.acc);
          noteG.appendChild(accText);
        }

        // 加线
        note.ledgers?.forEach(ly => {
          const ledger = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          ledger.setAttribute('x1', String(note.x - 12));
          ledger.setAttribute('y1', String(ly));
          ledger.setAttribute('x2', String(note.x + 12));
          ledger.setAttribute('y2', String(ly));
          ledger.setAttribute('stroke', noteColor);
          ledger.setAttribute('stroke-width', '1.5');
          ledger.classList.add('ledger-line');
          noteG.appendChild(ledger);
        });
      }

      nodeG.appendChild(noteG);
    });

    mainGroup.appendChild(nodeG);
  });

  // ================ 播放游标 ================
  const historyLen = store.history?.length || 0;
  const targetLen = store.target_melody?.length || 0;
  if (historyLen > 0 || targetLen > 0) {
    let playheadIndex;
    if (store.playbackIndex !== null && store.playbackIndex !== undefined) {
      playheadIndex = store.playbackIndex;
    } else {
      playheadIndex = Math.max(0, historyLen - 1);
    }

    const playheadX = getNodeX(playheadIndex, beatsPerMeasure, firstNodeX);

    const playheadG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    playheadG.classList.add('playhead-layer');

    // 游标线
    const playheadLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    playheadLine.setAttribute('x1', String(playheadX));
    playheadLine.setAttribute('y1', '-15');
    playheadLine.setAttribute('x2', String(playheadX));
    playheadLine.setAttribute('y2', '240');
    playheadLine.classList.add('playhead-line');
    playheadG.appendChild(playheadLine);

    // 三角形标记
    const playheadTriangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    playheadTriangle.setAttribute('points', `${playheadX - 6},-15 ${playheadX + 6},-15 ${playheadX},-5`);
    playheadTriangle.setAttribute('fill', '#10B981');
    playheadG.appendChild(playheadTriangle);

    mainGroup.appendChild(playheadG);

    // 自动滚动
    if (scoreContainer) {
      const offset = playheadX - scoreContainer.clientWidth * 0.382;
      scoreContainer.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
    }
  }

  svg.appendChild(mainGroup);
}

/**
 * 计算节点 X 坐标（与 src1 一致）
 */
function getNodeX(index, beatsPerMeasure, firstNodeX) {
  const barCount = Math.floor(index / beatsPerMeasure);
  return firstNodeX + index * NODE_SPACING + barCount * EXTRA_BAR_SPACING;
}

/**
 * 将音乐符号名称转换为 SMuFL 字体对应的 Unicode 字符
 */
function getSMuFLChar(sym) {
  if (!sym) return '';
  if (sym === '♭') return '\uE260';
  if (sym === '♮') return '\uE261';
  if (sym === '♯' || sym === '#') return '\uE262';
  if (sym === 'x') return '\uE263';
  if (sym === '♭♭') return '\uE264';
  return sym;
}

/**
 * 根据节点类型返回对应的颜色（考虑深色/浅色模式）
 */
function getNodeColor(type, isDark) {
  if (type === 'history') return isDark ? '#ffffff' : '#0F172A';   // 已弹奏历史
  if (type === 'pending') return '#F59E0B';   // 待弹奏提示
  return isDark ? '#94A3B8' : '#9CA3AF';       // 目标参考
}

/**
 * 获取音符符头的 CSS 类名
 */
function getNoteHeadClass(type) {
  if (type === 'history') return 'note-head';
  if (type === 'pending') return 'note-head-pending';
  return 'note-head-target';
}

/**
 * 获取谱号颜色
 */
function getClefColor() {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? '#ffffff' : '#000000';
}

/**
 * 获取五线谱线颜色
 */
function getStaffLineColor() {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? '#ffffff' : '#000000';
}