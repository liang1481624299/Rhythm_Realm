// 拍照批改页面：支持图片上传和手动输入，调用后端规则库进行智能评分
import { gsap } from 'gsap';

const API_BASE = 'http://localhost:8000';

// 调性列表（使用完整的调性名称，与后端 KEY_REGISTRY 保持一致）
const KEY_OPTIONS = [
  'C 大调 (C Major)', 'G 大调 (G Major)', 'D 大调 (D Major)', 'A 大调 (A Major)',
  'E 大调 (E Major)', 'B 大调 (B Major)', 'F# 大调 (F# Major)', 'Gb 大调 (Gb Major)',
  'F 大调 (F Major)', 'Bb 大调 (Bb Major)', 'Eb 大调 (Eb Major)', 'Ab 大调 (Ab Major)',
  'Db 大调 (Db Major)',
  'c 小调 (c minor)', 'g 小调 (g minor)', 'd 小调 (d minor)', 'a 小调 (a minor)',
  'e 小调 (e minor)', 'b 小调 (b minor)', 'f# 小调 (f# minor)', 'c# 小调 (c# minor)',
  'g# 小调 (g# minor)', 'd# 小调 (d# minor)', 'f 小调 (f minor)', 'bb 小调 (bb minor)',
  'eb 小调 (eb minor)', 'ab 小调 (ab minor)'
];

export function renderGrading(container) {
  container.innerHTML = `
    <section class="page-enter page-container grading-layout mt-8">
      <div class="glass-card grading-header-card">
        <div class="grading-header-inner">
          <div class="grading-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </div>
          <div>
            <h1 class="home-info-title" style="font-size: 1.5rem; font-family: var(--font-display);">拍照批改</h1>
            <p class="home-info-desc" style="margin-top: 0.25rem;">上传和声作业，AI 根据斯波索宾规则库智能评分</p>
          </div>
        </div>
      </div>

      <!-- 输入与结果 -->
      <div class="grading-grid">
        <!-- 输入卡片 -->
        <div class="glass-card w-full-padding-md">
          <!-- 调性选择 -->
          <div class="grading-manual-panel">
            <label class="form-label">作业调性</label>
            <select id="grading-key" class="grading-select">
              ${KEY_OPTIONS.map(k => `<option value="${k}">${k}</option>`).join('')}
            </select>
          </div>

          <!-- 模式切换 -->
          <div class="tab-group">
            <button id="tab-photo" class="grading-tab grading-tab-active" data-tab="photo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              <span>拍照上传</span>
            </button>
            <button id="tab-manual" class="grading-tab" data-tab="manual">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>手动输入</span>
            </button>
          </div>

          <!-- 拍照上传面板 -->
          <div id="panel-photo" class="grading-panel">
            <div id="drop-zone" class="file-drag-zone">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); margin: 0 auto 0.75rem;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              <p class="home-info-title" style="font-size: 0.9rem; text-align: center;">点击或拖拽上传作业图片</p>
              <p class="home-info-desc" style="text-align: center;">支持 JPG、PNG 格式</p>
              <input type="file" id="file-input" accept="image/*" style="display: none;">
            </div>
            <div id="preview-area" class="grading-preview-wrap" style="display: none;">
              <img id="preview-img" class="grading-preview-img">
              <div>
                <button id="clear-photo" class="grading-preview-clear">清除图片</button>
              </div>
              
              <!-- 识别结果编辑区域 -->
              <div id="ocr-result-area" class="grading-ocr-box" style="display: none;">
                <div class="grading-ocr-title-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-indigo);"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  <span class="grading-ocr-title">识别结果</span>
                  <span class="grading-ocr-subtitle">(可进行编辑修改)</span>
                </div>
                <textarea id="ocr-chord-input" rows="2" class="grading-textarea" placeholder="识别出的和弦序列将显示在这里，可手动修改"></textarea>
              </div>
            </div>
          </div>

          <!-- 手动输入面板 -->
          <div id="panel-manual" class="grading-panel" style="display: none;">
            <label class="form-label">和弦序列</label>
            <textarea id="chord-input" rows="3" class="grading-textarea" placeholder="输入和弦序列，用空格或逗号分隔，例如：T S D T"></textarea>
            <p class="home-info-desc">支持格式: T S D T 或 T, S, D, T</p>
          </div>

          <!-- 提交按钮 -->
          <button id="btn-grade" class="btn-grade-submit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <span>开始智能批改</span>
          </button>
        </div>

        <!-- 结果展示卡片 -->
        <div id="result-area" class="glass-card result-card" style="display: none;">
          <!-- 分数与评级 -->
          <div class="result-header">
            <div id="score-circle" class="score-radial-box" style="--score-deg: 0deg;">
              <div class="score-radial-inner">
                <div style="text-align: center;">
                  <div id="score-number" class="score-val">0</div>
                  <div class="home-info-desc" style="font-size: 0.65rem; margin: 0; font-weight: 600;">/ 100</div>
                </div>
              </div>
            </div>
            <div>
              <div id="score-level" class="home-badge" style="padding: 0.25rem 0.75rem;">待批改</div>
              <p id="score-summary" class="home-info-desc" style="font-size: 0.9rem; color: var(--text-body); font-weight: 500;"></p>
            </div>
          </div>

          <!-- 维度得分 -->
          <div class="grading-dimension-section">
            <h3 class="grading-dimension-title">各维度得分</h3>
            <div id="dimension-bars" class="grading-dimension-container"></div>
          </div>

          <!-- 统计信息 -->
          <div id="stats-area" class="grading-stats-grid"></div>

          <!-- 详细反馈 -->
          <div>
            <h3 class="grading-dimension-title">详细报错诊断</h3>
            <div id="feedback-list" class="issue-list"></div>
          </div>

          <!-- 学习建议 -->
          <div id="suggestions-area" class="grading-suggestions-box">
            <h3 class="grading-suggestions-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
              针对性提升建议
            </h3>
            <ul id="suggestions-list" class="grading-suggestions-list"></ul>
          </div>
        </div>
      </div>
    </section>
  `;

  bindGradingEvents(container);
}

function bindGradingEvents(container) {
  let currentMode = 'photo';
  let currentImageBase64 = null;

  // Tab 切换
  container.querySelectorAll('.grading-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.tab;
      currentMode = mode;
      container.querySelectorAll('.grading-tab').forEach(t => t.classList.remove('grading-tab-active'));
      tab.classList.add('grading-tab-active');
      container.querySelectorAll('.grading-panel').forEach(p => p.style.display = 'none');
      container.querySelector(`#panel-${mode}`).style.display = 'block';
    });
  });

  // 文件上传
  const dropZone = container.querySelector('#drop-zone');
  const fileInput = container.querySelector('#file-input');
  const previewArea = container.querySelector('#preview-area');
  const previewImg = container.querySelector('#preview-img');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      currentImageBase64 = e.target.result;
      previewImg.src = currentImageBase64;
      previewArea.style.display = 'block';
      dropZone.style.display = 'none';
      
      // 调用拍照识别 API
      try {
        const ocrArea = container.querySelector('#ocr-result-area');
        const ocrInput = container.querySelector('#ocr-chord-input');
        ocrInput.value = '识别中...';
        ocrArea.style.display = 'block';
        
        const keyName = container.querySelector('#grading-key').value;
        const res = await fetch(`${API_BASE}/api/grade/photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_data: currentImageBase64, key_name: keyName })
        });
        const result = await res.json();
        
        if (result.error) {
          ocrInput.value = `识别失败: ${result.error}`;
        } else if (result.recognition_info && result.recognition_info.raw_texts) {
          if (result.chord_sequence && result.chord_sequence.length > 0) {
            ocrInput.value = result.chord_sequence.join(' ');
          } else {
            const rawTexts = result.recognition_info.raw_texts;
            ocrInput.value = rawTexts.length > 0 ? rawTexts.join(' ') : '未识别到和弦，请手动输入';
          }
        } else if (result.chord_sequence) {
          ocrInput.value = result.chord_sequence.join(' ');
        } else {
          ocrInput.value = '未识别到和弦序列，请手动输入';
        }
      } catch (err) {
        const ocrArea = container.querySelector('#ocr-result-area');
        const ocrInput = container.querySelector('#ocr-chord-input');
        ocrArea.style.display = 'block';
        console.error('OCR 请求失败:', err);
        ocrInput.value = 'T S D T';
      }
    };
    reader.readAsDataURL(file);
  }

  container.querySelector('#clear-photo')?.addEventListener('click', () => {
    currentImageBase64 = null;
    previewArea.style.display = 'none';
    dropZone.style.display = 'block';
    fileInput.value = '';
  });

  // 批改按钮
  container.querySelector('#btn-grade').addEventListener('click', async () => {
    const keyName = container.querySelector('#grading-key').value;
    const resultArea = container.querySelector('#result-area');
    const btn = container.querySelector('#btn-grade');

    btn.disabled = true;
    btn.innerHTML = `<span style="display: inline-block; width: 1rem; height: 1rem; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></span><span>批改中...</span>`;

    let result;
    try {
      if (currentMode === 'photo') {
        if (!currentImageBase64) {
          alert('请先上传图片');
          return;
        }
        const ocrInput = container.querySelector('#ocr-chord-input');
        const input = ocrInput.value.trim();
        if (!input) {
          alert('请输入和弦序列');
          return;
        }
        const defaultTexts = ['识别中...', '识别失败:', '未识别到和弦，请手动输入', '未识别到和弦序列，请手动输入'];
        if (defaultTexts.includes(input)) {
          alert('请输入和弦序列');
          return;
        }
        const chords = input.split(/[,，\s]+/).filter(c => c);
        if (chords.length === 0) {
          alert('请输入有效的和弦序列');
          return;
        }
        const res = await fetch(`${API_BASE}/api/grade/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key_name: keyName, chord_sequence: chords })
        });
        result = await res.json();
      } else {
        const input = container.querySelector('#chord-input').value.trim();
        if (!input) {
          alert('请输入和弦序列');
          return;
        }
        const chords = input.split(/[,，\s]+/).filter(c => c);
        const res = await fetch(`${API_BASE}/api/grade/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key_name: keyName, chord_sequence: chords })
        });
        result = await res.json();
      }

      if (result.error) {
        alert(result.error);
        return;
      }

      displayResult(container, result);
      resultArea.style.display = 'block';
      resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      alert('请求失败，请确保后端服务已启动');
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg><span>开始智能批改</span>`;
    }
  });
}

function displayResult(container, data) {
  const scoreNum = container.querySelector('#score-number');
  const scoreCircle = container.querySelector('#score-circle');
  const scoreLevel = container.querySelector('#score-level');
  const scoreSummary = container.querySelector('#score-summary');

  const score = data.score || 0;
  const deg = (score / 100) * 360;

  let color = '#ef4444';
  if (score >= 90) color = '#10b981';
  else if (score >= 80) color = '#6366f1';
  else if (score >= 60) color = '#f97316';

  // 等级
  const levelMap = { '优秀': '#10b981', '良好': '#6366f1', '及格': '#f97316', '不及格': '#ef4444' };
  const levelColor = levelMap[data.level] || '#64748b';
  scoreLevel.textContent = data.level;
  scoreLevel.style.background = `${levelColor}15`;
  scoreLevel.style.color = levelColor;

  // 评语
  scoreSummary.textContent = data.summary || '';

  // GSAP 评分圆环及数值滚动生长动画
  const scoreObj = { val: 0, deg: 0 };
  gsap.to(scoreObj, {
    val: score,
    deg: deg,
    duration: 1.5,
    ease: 'power3.out',
    onUpdate: () => {
      scoreCircle.style.background = `conic-gradient(${color} 0deg, ${color} ${scoreObj.deg}deg, rgba(148,163,184,0.15) ${scoreObj.deg}deg)`;
      scoreCircle.style.setProperty('--score-deg', `${scoreObj.deg}deg`);
      scoreNum.textContent = Math.round(scoreObj.val);
    }
  });

  // 维度分数条
  const dimBars = container.querySelector('#dimension-bars');
  const dims = data.dimension_scores || {};
  const dimConfig = {
    '和弦进行': { max: 40, color: 'var(--accent-purple)' },
    '终止式': { max: 15, color: 'var(--accent-pink)' },
    '功能逻辑': { max: 15, color: 'var(--accent-cyan)' },
    '声部进行': { max: 30, color: 'var(--accent-green)' }
  };
  dimBars.innerHTML = Object.entries(dims).map(([name, val]) => {
    const cfg = dimConfig[name] || { max: 100, color: '#64748b' };
    const pct = Math.round((val / cfg.max) * 100);
    return `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="width: 4.5rem; font-size: 0.75rem; color: var(--text-muted); text-align: right; flex-shrink: 0; font-weight: 600;">${name}</span>
        <div style="flex: 1; height: 0.5rem; background: rgba(148,163,184,0.15); border-radius: 9999px; overflow: hidden;">
          <div class="dim-progress-bar" data-pct="${pct}" style="width: 0%; height: 100%; background: ${cfg.color}; border-radius: 9999px;"></div>
        </div>
        <span style="width: 2.5rem; font-size: 0.75rem; font-weight: 700; color: var(--text-title); flex-shrink: 0;">${val}/${cfg.max}</span>
      </div>
    `;
  }).join('');

  // GSAP 维度条生长动画
  gsap.fromTo(dimBars.querySelectorAll('.dim-progress-bar'),
    { width: '0%' },
    { 
      width: (index, target) => `${target.dataset.pct}%`, 
      duration: 1.2, 
      stagger: 0.08, 
      ease: 'power2.out',
      delay: 0.2
    }
  );

  // 统计
  const stats = data.statistics || {};
  const statsArea = container.querySelector('#stats-area');
  statsArea.innerHTML = `
    <div style="padding: 0.75rem; border-radius: var(--radius-sm); background: rgba(139,92,246,0.08); text-align: center; border: 1px solid var(--glass-border);">
      <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent-purple); font-family: var(--font-display);">${stats.chord_count || 0}</div>
      <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.125rem; font-weight: 600;">和弦数</div>
    </div>
    <div style="padding: 0.75rem; border-radius: var(--radius-sm); background: rgba(239,68,68,0.08); text-align: center; border: 1px solid var(--glass-border);">
      <div style="font-size: 1.25rem; font-weight: 800; color: #ef4444; font-family: var(--font-display);">${stats.invalid_transitions || 0}</div>
      <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.125rem; font-weight: 600;">违规连接</div>
    </div>
    <div style="padding: 0.75rem; border-radius: var(--radius-sm); background: rgba(249,115,22,0.08); text-align: center; border: 1px solid var(--glass-border);">
      <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent-orange); font-family: var(--font-display);">${stats.hard_violations || 0}</div>
      <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.125rem; font-weight: 600;">声部铁律</div>
    </div>
    <div style="padding: 0.75rem; border-radius: var(--radius-sm); background: rgba(16,185,129,0.08); text-align: center; border: 1px solid var(--glass-border);">
      <div style="font-size: 1rem; font-weight: 800; color: var(--accent-green); font-family: var(--font-display); height: 1.5rem; line-height: 1.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${stats.cadence_type || '无'}</div>
      <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.125rem; font-weight: 600;">终止式</div>
    </div>
  `;

  // GSAP 统计块浮现动画
  gsap.fromTo(statsArea.children,
    { scale: 0.8, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(1.5)', delay: 0.4 }
  );

  // 详细反馈
  const feedbackList = container.querySelector('#feedback-list');
  const feedbacks = data.feedback || [];
  if (feedbacks.length === 0) {
    feedbackList.innerHTML = `
      <div style="padding: 1rem; border-radius: var(--radius-md); background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15); text-align: center; color: var(--accent-green); font-size: 0.875rem; font-weight: 600;">
        ✨ 未发现明显问题，继续保持！
      </div>
    `;
  } else {
    feedbackList.innerHTML = feedbacks.map(fb => {
      const typeClass = fb.type === 'error' ? 'error' : 'warning';
      const severityTagClass = fb.type === 'error' ? 'error-tag' : 'warning-tag';
      const severityText = fb.type === 'error' ? '错误' : '警告';
      return `
        <div class="issue-card ${typeClass}">
          <button class="issue-header-btn" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
            <div class="issue-title-group">
              <span class="issue-severity-tag ${severityTagClass}">${severityText}</span>
              <span class="issue-main-title">[${fb.category}] ${fb.position}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <div class="issue-body-content">
            <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: var(--text-title);">${fb.message}</p>
            ${fb.suggestion ? `<p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);"><span style="font-weight: 700; color: var(--accent-indigo);">建议：</span>${fb.suggestion}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // GSAP 诊断列表淡入动画
  const issueCards = feedbackList.querySelectorAll('.issue-card');
  if (issueCards.length > 0) {
    gsap.fromTo(issueCards,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out', delay: 0.6 }
    );
  }

  // 学习建议
  const suggestionsList = container.querySelector('#suggestions-list');
  const suggestions = data.suggestions || [];
  if (suggestions.length === 0) {
    suggestionsList.innerHTML = '<li>当前表现优秀，可以尝试更复杂的和声语汇！</li>';
  } else {
    suggestionsList.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
  }

  // GSAP 建议卡片浮出动画
  gsap.fromTo(container.querySelector('#suggestions-area'),
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.8 }
  );
}

// 样式仅保留过渡与旋转动画
const style = document.createElement('style');
style.textContent = `
  .grading-panel {
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);