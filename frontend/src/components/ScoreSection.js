/**
 * ScoreSection 组件 - 五线谱显示区域
 * 使用矢量方式绘制谱号，避免字体问题
 */

// 五线谱常量
const STAFF_TOP = 40;
const STAFF_GAP = 10;
const STAFF_BASS_OFFSET = 170;
const TREBLE_CLEF_X = 15;
const SIG_START_X = 50;
const NODE_SPACING = 85;
const NOTE_RX = 7;
const NOTE_RY = 5;
const STEM_LENGTH = 28;

export function createScoreSection(store) {
  const section = document.createElement('section');
  section.className = 'glass-card score-section';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'score-toolbar';

  const btnGroup = document.createElement('div');
  btnGroup.className = 'score-btn-group';

  const playBtn = document.createElement('button');
  playBtn.className = 'modern-btn modern-btn-success';
  playBtn.innerHTML = '<span>▶</span> 试听序列';
  playBtn.addEventListener('click', () => {
    // 播放序列逻辑
    if (window.sposobinAudio) {
      window.sposobinAudio.playSequence();
    }
  });

  const exportBtn = document.createElement('button');
  exportBtn.className = 'modern-btn modern-btn-primary';
  exportBtn.innerHTML = '<span>🎼</span> 导出';

  // 创建导出模态框
  const exportModal = document.createElement('div');
  exportModal.className = 'export-modal';
  exportModal.innerHTML = `
    <div class="export-modal-content">
      <div class="export-modal-title">选择导出格式</div>
      <button class="export-modal-option" data-format="musicxml">
        <span class="export-modal-icon">🎼</span>
        <span class="export-modal-label">MusicXML</span>
        <span class="export-modal-desc">用于乐谱软件如 Sibelius, Finale</span>
      </button>
      <button class="export-modal-option" data-format="midi">
        <span class="export-modal-icon">🎹</span>
        <span class="export-modal-label">MIDI</span>
        <span class="export-modal-desc">用于音乐制作软件</span>
      </button>
      <button class="export-modal-cancel">取消</button>
    </div>
  `;

  exportModal.style.display = 'none';
  exportModal.style.position = 'fixed';
  exportModal.style.top = '0';
  exportModal.style.left = '0';
  exportModal.style.right = '0';
  exportModal.style.bottom = '0';
  exportModal.style.background = 'rgba(0,0,0,0.5)';
  exportModal.style.zIndex = '1000';
  exportModal.style.justifyContent = 'center';
  exportModal.style.alignItems = 'center';

  const modalContent = exportModal.querySelector('.export-modal-content');
  modalContent.style.background = 'var(--color-bg)';
  modalContent.style.borderRadius = '12px';
  modalContent.style.padding = '24px';
  modalContent.style.minWidth = '300px';
  modalContent.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';

  const modalTitle = exportModal.querySelector('.export-modal-title');
  modalTitle.style.fontSize = '18px';
  modalTitle.style.fontWeight = '600';
  modalTitle.style.marginBottom = '16px';
  modalTitle.style.textAlign = 'center';
  modalTitle.style.color = 'var(--color-fg-title)';

  const modalCancelBtn = exportModal.querySelector('.export-modal-cancel');
  modalCancelBtn.style.marginTop = '12px';
  modalCancelBtn.style.width = '100%';
  modalCancelBtn.style.padding = '10px';
  modalCancelBtn.style.background = 'transparent';
  modalCancelBtn.style.border = '1px solid var(--color-border)';
  modalCancelBtn.style.borderRadius = '8px';
  modalCancelBtn.style.color = 'var(--color-fg-secondary)';
  modalCancelBtn.style.cursor = 'pointer';

  exportModal.querySelectorAll('.export-modal-option').forEach(option => {
    option.style.display = 'flex';
    option.style.alignItems = 'center';
    option.style.width = '100%';
    option.style.padding = '12px 16px';
    option.style.marginTop = '8px';
    option.style.background = 'var(--color-bg-secondary)';
    option.style.border = '1px solid var(--color-border)';
    option.style.borderRadius = '8px';
    option.style.cursor = 'pointer';
    option.style.gap = '12px';
    option.style.transition = 'all 0.2s';
  });

  exportModal.querySelectorAll('.export-modal-icon').forEach(icon => {
    icon.style.fontSize = '24px';
  });

  exportModal.querySelectorAll('.export-modal-label').forEach(label => {
    label.style.fontWeight = '600';
    label.style.color = 'var(--color-fg-title)';
    label.style.flex = '1';
  });

  exportModal.querySelectorAll('.export-modal-desc').forEach(desc => {
    desc.style.fontSize = '12px';
    desc.style.color = 'var(--color-fg-secondary)';
  });

  exportBtn.addEventListener('click', () => {
    exportModal.style.display = 'flex';
  });

  exportModal.querySelectorAll('.export-modal-option').forEach(option => {
    option.addEventListener('mouseenter', () => {
      option.style.background = 'var(--accent-indigo-light)';
      option.style.borderColor = 'var(--accent-indigo)';
    });
    option.addEventListener('mouseleave', () => {
      option.style.background = 'var(--color-bg-secondary)';
      option.style.borderColor = 'var(--color-border)';
    });
    option.addEventListener('click', () => {
      const format = option.dataset.format;
      if (window.sposobinAPI) {
        if (format === 'musicxml') {
          window.sposobinAPI.exportMusicXML();
        } else if (format === 'midi') {
          window.sposobinAPI.exportMIDI();
        }
      }
      exportModal.style.display = 'none';
    });
  });

  modalCancelBtn.addEventListener('click', () => {
    exportModal.style.display = 'none';
  });

  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) {
      exportModal.style.display = 'none';
    }
  });

  document.body.appendChild(exportModal);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'modern-btn modern-btn-danger';
  clearBtn.innerHTML = '<span>🗑️</span> 清空画板';
  clearBtn.addEventListener('click', () => {
    store.resetState();
  });

  btnGroup.appendChild(playBtn);
  btnGroup.appendChild(exportBtn);
  btnGroup.appendChild(clearBtn);

  const hint = document.createElement('span');
  hint.className = 'score-hint';
  hint.textContent = '💡 点击五线谱上的和弦可回退';

  toolbar.appendChild(btnGroup);
  toolbar.appendChild(hint);

  // Score container
  const scoreContainer = document.createElement('div');
  scoreContainer.className = 'score-container';
  scoreContainer.id = 'score-container';

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.id = 'score-svg';
  svgEl.setAttribute('height', '280');
  svgEl.style.display = 'block';
  svgEl.style.minWidth = '100%';
  scoreContainer.appendChild(svgEl);

  section.appendChild(toolbar);
  section.appendChild(scoreContainer);

  return section;
}

/**
 * 渲染五线谱
 */
export function renderScore(store) {
  const svg = document.getElementById('score-svg');
  if (!svg) return;

  const nodes = store.renderData?.nodes || [];
  const sigs = store.renderData?.sigs || [];
  const sigOffset = sigs.length * 12;
  const svgWidth = Math.max(900, nodes.length * NODE_SPACING + 180 + sigOffset);

  svg.setAttribute('width', String(svgWidth));
  svg.setAttribute('viewBox', `0 0 ${svgWidth} 280`);

  // 清空
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // CSS 样式
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .staff-line { stroke: var(--staff-line); stroke-width: 1; }
    .note-head-filled { fill: var(--note-head); }
    .note-head-pending { fill: var(--accent-amber); stroke: #B8860B; stroke-width: 1; }
    .note-head-target { fill: transparent; stroke: var(--staff-line); stroke-width: 1.5; stroke-dasharray: 2,2; }
    .stem-line { stroke-width: 1.5; }
    .chord-label { font-family: var(--font-serif); font-weight: bold; text-anchor: middle; fill: var(--accent-red); }
    .accidental { font-weight: bold; fill: var(--note-head); }
    .playhead-line { stroke: var(--accent-green); stroke-width: 2; stroke-dasharray: 4,2; }
    .ledger-line { stroke-width: 1.5; }
  `;
  svg.appendChild(style);

  // 五线谱线 - 高音谱表
  for (let i = 0; i < 5; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '45');
    line.setAttribute('y1', String(STAFF_TOP + i * STAFF_GAP));
    line.setAttribute('x2', String(svgWidth - 20));
    line.setAttribute('y2', String(STAFF_TOP + i * STAFF_GAP));
    line.setAttribute('class', 'staff-line');
    svg.appendChild(line);
  }

  // 五线谱线 - 低音谱表
  for (let i = 0; i < 5; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '45');
    line.setAttribute('y1', String(STAFF_BASS_OFFSET + i * STAFF_GAP));
    line.setAttribute('x2', String(svgWidth - 20));
    line.setAttribute('y2', String(STAFF_BASS_OFFSET + i * STAFF_GAP));
    line.setAttribute('class', 'staff-line');
    svg.appendChild(line);
  }

  // 花括号
  drawBrace(svg, TREBLE_CLEF_X + 22, STAFF_TOP, STAFF_BASS_OFFSET + 4 * STAFF_GAP);

  // 谱号 - 使用矢量绘制
  drawTrebleClef(svg, TREBLE_CLEF_X + 15, STAFF_TOP + 2 * STAFF_GAP);
  drawBassClef(svg, TREBLE_CLEF_X + 15, STAFF_BASS_OFFSET + 2 * STAFF_GAP);

  // 调号
  sigs.forEach((sig, i) => {
    const x = SIG_START_X + i * 12;
    const tText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tText.setAttribute('x', String(x));
    tText.setAttribute('y', String(sig.t_y));
    tText.setAttribute('font-size', '24');
    tText.setAttribute('class', 'accidental');
    tText.setAttribute('dominant-baseline', 'central');
    tText.textContent = sig.sym;
    svg.appendChild(tText);

    const bText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    bText.setAttribute('x', String(x));
    bText.setAttribute('y', String(sig.b_y));
    bText.setAttribute('font-size', '24');
    bText.setAttribute('class', 'accidental');
    bText.setAttribute('dominant-baseline', 'central');
    bText.textContent = sig.sym;
    svg.appendChild(bText);
  });

  // 渲染节点
  const startX = SIG_START_X + sigOffset + 30;
  nodes.forEach((node, index) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${startX + index * NODE_SPACING}, 0)`);

    if (node.type === 'history') {
      // 可交互区域
      const interactiveG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      interactiveG.style.cursor = 'pointer';

      // 悬停区域
      const hoverRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hoverRect.setAttribute('x', '-28');
      hoverRect.setAttribute('y', '8');
      hoverRect.setAttribute('width', '56');
      hoverRect.setAttribute('height', '245');
      hoverRect.setAttribute('rx', '8');
      hoverRect.setAttribute('fill', 'transparent');
      interactiveG.appendChild(hoverRect);

      // 和弦标签
      const chordLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      chordLabel.setAttribute('x', '0');
      chordLabel.setAttribute('y', '20');
      chordLabel.setAttribute('class', 'chord-label');
      chordLabel.setAttribute('font-size', '17');
      chordLabel.textContent = node.chord_display || '';
      interactiveG.appendChild(chordLabel);

      // 点击事件
      interactiveG.addEventListener('click', () => {
        if (node.original_index !== undefined) {
          store.rewindTo(node.original_index);
        }
      });

      // 播放高亮
      if (store.playbackIndex === index) {
        const hlRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        hlRect.setAttribute('x', '-32');
        hlRect.setAttribute('y', '5');
        hlRect.setAttribute('width', '64');
        hlRect.setAttribute('height', '250');
        hlRect.setAttribute('rx', '8');
        hlRect.setAttribute('fill', 'rgba(139, 105, 20, 0.08)');
        hlRect.setAttribute('class', 'playhead-active');
        interactiveG.insertBefore(hlRect, hoverRect);
      }

      g.appendChild(interactiveG);
    }

    // 音符
    node.notes?.forEach(note => {
      const noteG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const isHistory = node.type === 'history';
      const isPending = node.type === 'pending';
      const isTarget = node.type === 'target';

      // 符头
      const headClass = isHistory ? 'note-head-filled' : (isPending ? 'note-head-pending' : 'note-head-target');
      const head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      head.setAttribute('cx', String(note.x));
      head.setAttribute('cy', String(note.y));
      head.setAttribute('rx', String(NOTE_RX));
      head.setAttribute('ry', String(NOTE_RY));
      head.setAttribute('class', headClass);
      noteG.appendChild(head);

      // 符干
      const isUpper = note.v === 'S' || note.v === 'T';
      const stemX = note.x + (isUpper ? NOTE_RX - 0.5 : -(NOTE_RX - 0.5));
      const stemY1 = note.y;
      const stemY2 = isUpper ? note.y - STEM_LENGTH : note.y + STEM_LENGTH;
      const stemColor = isHistory ? 'var(--note-head)' : (isPending ? 'var(--accent-amber)' : 'var(--staff-line)');
      
      const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stem.setAttribute('x1', String(stemX));
      stem.setAttribute('y1', String(stemY1));
      stem.setAttribute('x2', String(stemX));
      stem.setAttribute('y2', String(stemY2));
      stem.setAttribute('stroke', stemColor);
      stem.setAttribute('stroke-width', '1.5');
      if (isTarget) stem.setAttribute('stroke-dasharray', '2,2');
      noteG.appendChild(stem);

      // 临时升降号
      if (note.acc) {
        const accEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        accEl.setAttribute('x', String(note.acc_x || (note.x - 15)));
        accEl.setAttribute('y', String(note.y));
        accEl.setAttribute('font-size', '22');
        accEl.setAttribute('class', 'accidental');
        accEl.setAttribute('dominant-baseline', 'central');
        accEl.textContent = note.acc;
        noteG.appendChild(accEl);
      }

      // 加线
      note.ledgers?.forEach(ly => {
        const ledger = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ledger.setAttribute('x1', String(note.x - 13));
        ledger.setAttribute('y1', String(ly));
        ledger.setAttribute('x2', String(note.x + 13));
        ledger.setAttribute('y2', String(ly));
        ledger.setAttribute('stroke', isTarget ? 'var(--staff-line)' : 'var(--note-head)');
        ledger.setAttribute('stroke-width', '1.5');
        ledger.setAttribute('class', 'ledger-line');
        noteG.appendChild(ledger);
      });

      g.appendChild(noteG);
    });

    svg.appendChild(g);
  });

  // 播放游标
  if (store.history?.length > 0 || store.target_melody?.length > 0 || store.pending_note) {
    const phG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    let phIndex = store.playbackIndex;
    let phX;
    if (phIndex !== null && phIndex !== undefined) {
      phX = startX + phIndex * NODE_SPACING;
    } else {
      const idx = Math.min(store.history?.length || 0, nodes.length - 1);
      phX = startX + Math.max(0, idx) * NODE_SPACING;
    }

    // 游标线
    const phLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    phLine.setAttribute('x1', String(phX));
    phLine.setAttribute('y1', '12');
    phLine.setAttribute('x2', String(phX));
    phLine.setAttribute('y2', '252');
    phLine.setAttribute('stroke', 'var(--accent-green)');
    phLine.setAttribute('stroke-width', '2');
    phLine.setAttribute('stroke-dasharray', '4,2');
    phG.appendChild(phLine);

    // 三角形标记
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', `${phX - 6},12 ${phX + 6},12 ${phX},22`);
    poly.setAttribute('fill', 'var(--accent-green)');
    phG.appendChild(poly);

    svg.appendChild(phG);

    // 自动滚动
    const container = document.getElementById('score-container');
    if (container) {
      const containerWidth = container.clientWidth;
      const targetScroll = phX - containerWidth * 0.382;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }
}

/**
 * 绘制高音谱号 (矢量方式)
 */
function drawTrebleClef(svg, cx, cy) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 
    `M${cx},${cy+35} C${cx-3},${cy+28} ${cx-8},${cy+18} ${cx-5},${cy+8} ` +
    `C${cx-2},${cy-2} ${cx+5},${cy-10} ${cx+3},${cy-22} ` +
    `C${cx+1},${cy-32} ${cx-6},${cy-30} ${cx-6},${cy-22} ` +
    `C${cx-6},${cy-14} ${cx+2},${cy-8} ${cx+2},${cy+2} ` +
    `C${cx+2},${cy+12} ${cx-4},${cy+20} ${cx-4},${cy+28} ` +
    `C${cx-4},${cy+34} ${cx},${cy+38} ${cx},${cy+35}Z`
  );
  path.setAttribute('fill', 'var(--clef-color)');
  path.setAttribute('stroke', 'none');
  svg.appendChild(path);

  // 符干
  const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  stem.setAttribute('x1', String(cx + 2));
  stem.setAttribute('y1', String(cy - 22));
  stem.setAttribute('x2', String(cx + 2));
  stem.setAttribute('y2', String(cy + 42));
  stem.setAttribute('stroke', 'var(--clef-color)');
  stem.setAttribute('stroke-width', '1.5');
  svg.appendChild(stem);

  // 底部卷曲
  const curl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  curl.setAttribute('x1', String(cx + 2));
  curl.setAttribute('y1', String(cy + 42));
  curl.setAttribute('x2', String(cx - 1));
  curl.setAttribute('y2', String(cy + 44));
  curl.setAttribute('stroke', 'var(--clef-color)');
  curl.setAttribute('stroke-width', '1.5');
  svg.appendChild(curl);
}

/**
 * 绘制低音谱号 (矢量方式)
 */
function drawBassClef(svg, cx, cy) {
  // 主体
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  body.setAttribute('d', 
    `M${cx+6},${cy-8} C${cx+10},${cy-14} ${cx+10},${cy-20} ${cx+4},${cy-20} ` +
    `C${cx-4},${cy-20} ${cx-8},${cy-12} ${cx-6},${cy-4} ` +
    `C${cx-4},${cy+4} ${cx+2},${cy+8} ${cx+6},${cy+4}Z`
  );
  body.setAttribute('fill', 'var(--clef-color)');
  body.setAttribute('stroke', 'none');
  svg.appendChild(body);

  // 两个点
  const dot1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot1.setAttribute('cx', String(cx + 14));
  dot1.setAttribute('cy', String(cy - 8));
  dot1.setAttribute('r', '2.5');
  dot1.setAttribute('fill', 'var(--clef-color)');
  svg.appendChild(dot1);

  const dot2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot2.setAttribute('cx', String(cx + 14));
  dot2.setAttribute('cy', String(cy + 6));
  dot2.setAttribute('r', '2.5');
  dot2.setAttribute('fill', 'var(--clef-color)');
  svg.appendChild(dot2);
}

/**
 * 绘制花括号
 */
function drawBrace(svg, x, topY, bottomY) {
  const midY = (topY + bottomY) / 2;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 
    `M${x+3},${topY} C${x-4},${topY+15} ${x+6},${midY-15} ${x},${midY} ` +
    `C${x+6},${midY+15} ${x-4},${bottomY-15} ${x+3},${bottomY}`
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'var(--clef-color)');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
}
