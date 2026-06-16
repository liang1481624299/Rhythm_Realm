// 拍照批改页面：支持图片上传和手动输入，调用后端规则库进行智能评分

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
    <section class="page-enter page-container" style="padding-top: 2.5rem; padding-bottom: 2.5rem;">
      <div class="glass-card" style="padding: 2rem; margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: linear-gradient(135deg, #f59e0b, #f97316); display: grid; place-items: center; color: white; font-size: 1.25rem;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </div>
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 700; margin: 0; color: #0f172a;" class="dark:text-slate-50">拍照批改</h1>
            <p style="margin: 0; font-size: 0.875rem; color: #64748b;" class="dark:text-slate-300">上传和声作业，AI 根据斯波索宾规则库智能评分</p>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
        <!-- 左侧：输入 -->
        <div class="glass-card" style="padding: 1.5rem;">
          <!-- 调性选择 -->
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;" class="dark:text-slate-300">调性</label>
            <select id="grading-key" style="width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: rgba(255,255,255,0.7); font-size: 0.875rem; color: #0f172a; cursor: pointer;">
              ${KEY_OPTIONS.map(k => `<option value="${k}">${k}</option>`).join('')}
            </select>
          </div>

          <!-- 模式切换 -->
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
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
            <div id="drop-zone" style="border: 2px dashed #cbd5e1; border-radius: 0.75rem; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.3);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #94a3b8; margin: 0 auto 0.75rem;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              <p style="margin: 0 0 0.5rem; font-size: 0.875rem; color: #64748b; font-weight: 500;">点击或拖拽上传作业图片</p>
              <p style="margin: 0; font-size: 0.75rem; color: #94a3b8;">支持 JPG、PNG 格式</p>
              <input type="file" id="file-input" accept="image/*" style="display: none;">
            </div>
            <div id="preview-area" style="display: none; margin-top: 1rem;">
              <img id="preview-img" style="max-width: 100%; max-height: 300px; border-radius: 0.5rem; border: 1px solid #e2e8f0;">
              <button id="clear-photo" style="margin-top: 0.5rem; font-size: 0.75rem; color: #ef4444; background: none; border: none; cursor: pointer;">清除图片</button>
              
              <!-- 识别结果编辑区域 -->
              <div id="ocr-result-area" style="display: none; margin-top: 1rem; padding: 1rem; border-radius: 0.5rem; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15);">
                <div style="display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.5rem;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  <span style="font-size: 0.8rem; font-weight: 500; color: #3b82f6;">识别结果</span>
                  <span style="font-size: 0.65rem; color: #64748b;">(可编辑)</span>
                </div>
                <textarea id="ocr-chord-input" rows="2" placeholder="识别出的和弦序列将显示在这里，可手动修改" style="width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: white; font-size: 0.8rem; resize: vertical; font-family: inherit; color: #0f172a;"></textarea>
              </div>
            </div>
          </div>

          <!-- 手动输入面板 -->
          <div id="panel-manual" class="grading-panel" style="display: none;">
            <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;" class="dark:text-slate-300">和弦序列</label>
            <textarea id="chord-input" rows="3" placeholder="输入和弦序列，用空格或逗号分隔，例如：T S D T" style="width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: rgba(255,255,255,0.7); font-size: 0.875rem; resize: vertical; font-family: inherit;"></textarea>
            <p style="margin: 0.375rem 0 0; font-size: 0.75rem; color: #94a3b8;">支持格式: T S D T 或 T, S, D, T</p>
          </div>

          <!-- 提交按钮 -->
          <button id="btn-grade" style="width: 100%; margin-top: 1.25rem; padding: 0.625rem 1rem; border-radius: 0.5rem; border: none; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <span>开始批改</span>
          </button>
        </div>

        <!-- 右侧：结果 -->
        <div id="result-area" class="glass-card" style="padding: 1.5rem; display: none;">
          <!-- 分数 -->
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div id="score-circle" style="width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 1rem; display: grid; place-items: center; position: relative; background: conic-gradient(#22c55e 0deg, #22c55e var(--score-deg), #e2e8f0 var(--score-deg)); --score-deg: 0deg;">
              <div style="width: 96px; height: 96px; border-radius: 50%; background: white; display: grid; place-items: center;" class="dark:bg-slate-800">
                <div>
                  <div id="score-number" style="font-size: 2rem; font-weight: 700; color: #0f172a;" class="dark:text-slate-50">0</div>
                  <div style="font-size: 0.625rem; color: #64748b;">/ 100</div>
                </div>
              </div>
            </div>
            <div id="score-level" style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; background: #f1f5f9; color: #64748b;">待批改</div>
            <p id="score-summary" style="margin: 0.75rem 0 0; font-size: 0.875rem; color: #64748b; line-height: 1.5;" class="dark:text-slate-300"></p>
          </div>

          <!-- 维度分数 -->
          <div style="margin-bottom: 1.25rem;">
            <h3 style="font-size: 0.875rem; font-weight: 600; color: #0f172a; margin: 0 0 0.75rem;" class="dark:text-slate-50">各维度得分</h3>
            <div id="dimension-bars" style="display: flex; flex-direction: column; gap: 0.625rem;">
            </div>
          </div>

          <!-- 统计信息 -->
          <div id="stats-area" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
          </div>

          <!-- 详细反馈 -->
          <div>
            <h3 style="font-size: 0.875rem; font-weight: 600; color: #0f172a; margin: 0 0 0.75rem;" class="dark:text-slate-50">详细反馈</h3>
            <div id="feedback-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
            </div>
          </div>

          <!-- 学习建议 -->
          <div id="suggestions-area" style="margin-top: 1.25rem; padding: 1rem; border-radius: 0.5rem; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15);">
            <h3 style="font-size: 0.875rem; font-weight: 600; color: #2563eb; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.375rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
              学习建议
            </h3>
            <ul id="suggestions-list" style="margin: 0; padding-left: 1.25rem; font-size: 0.8rem; color: #3b82f6; line-height: 1.6;">
            </ul>
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
    dropZone.style.borderColor = '#f59e0b';
    dropZone.style.background = 'rgba(245,158,11,0.08)';
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#cbd5e1';
    dropZone.style.background = 'rgba(255,255,255,0.3)';
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#cbd5e1';
    dropZone.style.background = 'rgba(255,255,255,0.3)';
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
          // 识别成功或部分成功，显示和弦序列或原始文本
          if (result.chord_sequence && result.chord_sequence.length > 0) {
            ocrInput.value = result.chord_sequence.join(' ');
          } else {
            // 没有识别到和弦，但有原始文本
            const rawTexts = result.recognition_info.raw_texts;
            ocrInput.value = rawTexts.length > 0 ? rawTexts.join(' ') : '未识别到和弦，请手动输入';
          }
          // 显示识别提示
          if (result.recognition_info.note) {
            console.log('识别提示:', result.recognition_info.note);
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
        ocrInput.value = '识别服务不可用，请手动输入和弦序列';
        // 显示示例和弦供用户参考
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
        // 使用编辑框中的和弦序列进行批改
        const ocrInput = container.querySelector('#ocr-chord-input');
        const input = ocrInput.value.trim();
        if (!input) {
          alert('请输入和弦序列');
          return;
        }
        // 检查是否是默认提示文本
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
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg><span>开始批改</span>`;
    }
  });
}

function displayResult(container, data) {
  // 分数动画
  const scoreNum = container.querySelector('#score-number');
  const scoreCircle = container.querySelector('#score-circle');
  const scoreLevel = container.querySelector('#score-level');
  const scoreSummary = container.querySelector('#score-summary');

  const score = data.score || 0;
  const deg = (score / 100) * 360;

  // 颜色映射
  let color = '#ef4444';
  if (score >= 90) color = '#22c55e';
  else if (score >= 80) color = '#3b82f6';
  else if (score >= 60) color = '#f59e0b';

  scoreCircle.style.background = `conic-gradient(${color} 0deg, ${color} ${deg}deg, #e2e8f0 ${deg}deg)`;
  scoreCircle.style.setProperty('--score-deg', `${deg}deg`);

  // 数字动画
  let current = 0;
  const step = Math.max(1, Math.floor(score / 20));
  const interval = setInterval(() => {
    current += step;
    if (current >= score) {
      current = score;
      clearInterval(interval);
    }
    scoreNum.textContent = current;
  }, 30);

  // 等级
  const levelMap = { '优秀': '#22c55e', '良好': '#3b82f6', '及格': '#f59e0b', '不及格': '#ef4444' };
  const levelColor = levelMap[data.level] || '#64748b';
  scoreLevel.textContent = data.level;
  scoreLevel.style.background = `${levelColor}15`;
  scoreLevel.style.color = levelColor;

  // 评语
  scoreSummary.textContent = data.summary || '';

  // 维度分数条
  const dimBars = container.querySelector('#dimension-bars');
  const dims = data.dimension_scores || {};
  const dimConfig = {
    '和弦进行': { max: 40, color: '#8b5cf6' },
    '终止式': { max: 15, color: '#ec4899' },
    '功能逻辑': { max: 15, color: '#06b6d4' },
    '声部进行': { max: 30, color: '#22c55e' }
  };
  dimBars.innerHTML = Object.entries(dims).map(([name, val]) => {
    const cfg = dimConfig[name] || { max: 100, color: '#64748b' };
    const pct = Math.round((val / cfg.max) * 100);
    return `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="width: 4.5rem; font-size: 0.75rem; color: #64748b; text-align: right; flex-shrink: 0;">${name}</span>
        <div style="flex: 1; height: 0.5rem; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: ${cfg.color}; border-radius: 9999px; transition: width 0.6s ease;"></div>
        </div>
        <span style="width: 2.5rem; font-size: 0.75rem; font-weight: 600; color: #0f172a; flex-shrink: 0;" class="dark:text-slate-50">${val}/${cfg.max}</span>
      </div>
    `;
  }).join('');

  // 统计
  const stats = data.statistics || {};
  const statsArea = container.querySelector('#stats-area');
  statsArea.innerHTML = `
    <div style="padding: 0.75rem; border-radius: 0.5rem; background: rgba(139,92,246,0.08); text-align: center;">
      <div style="font-size: 1.25rem; font-weight: 700; color: #8b5cf6;">${stats.chord_count || 0}</div>
      <div style="font-size: 0.7rem; color: #64748b; margin-top: 0.125rem;">和弦数</div>
    </div>
    <div style="padding: 0.75rem; border-radius: 0.5rem; background: rgba(239,68,68,0.08); text-align: center;">
      <div style="font-size: 1.25rem; font-weight: 700; color: #ef4444;">${stats.invalid_transitions || 0}</div>
      <div style="font-size: 0.7rem; color: #64748b; margin-top: 0.125rem;">违规连接</div>
    </div>
    <div style="padding: 0.75rem; border-radius: 0.5rem; background: rgba(245,158,11,0.08); text-align: center;">
      <div style="font-size: 1.25rem; font-weight: 700; color: #f59e0b;">${stats.hard_violations || 0}</div>
      <div style="font-size: 0.7rem; color: #64748b; margin-top: 0.125rem;">声部铁律</div>
    </div>
    <div style="padding: 0.75rem; border-radius: 0.5rem; background: rgba(34,197,94,0.08); text-align: center;">
      <div style="font-size: 1.25rem; font-weight: 700; color: #22c55e;">${stats.cadence_type || '无'}</div>
      <div style="font-size: 0.7rem; color: #64748b; margin-top: 0.125rem;">终止式</div>
    </div>
  `;

  // 详细反馈
  const feedbackList = container.querySelector('#feedback-list');
  const feedbacks = data.feedback || [];
  if (feedbacks.length === 0) {
    feedbackList.innerHTML = `
      <div style="padding: 1rem; border-radius: 0.5rem; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.15); text-align: center; color: #22c55e; font-size: 0.875rem;">
        未发现明显问题，继续保持！
      </div>
    `;
  } else {
    feedbackList.innerHTML = feedbacks.map(fb => {
      const typeColors = {
        error: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)', icon: '#ef4444', iconSvg: '<path d="M18 6L6 18M6 6l12 12"></path>' },
        warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)', icon: '#f59e0b', iconSvg: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>' },
        info: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)', icon: '#3b82f6', iconSvg: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>' }
      };
      const tc = typeColors[fb.type] || typeColors.info;
      return `
        <div style="padding: 0.75rem; border-radius: 0.5rem; background: ${tc.bg}; border: 1px solid ${tc.border};">
          <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${tc.icon}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 0.125rem;">${tc.iconSvg}</svg>
            <div style="min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.75rem; font-weight: 600; color: ${tc.icon};">[${fb.category}]</span>
                <span style="font-size: 0.75rem; color: #64748b;">${fb.position}</span>
              </div>
              <p style="margin: 0.25rem 0 0; font-size: 0.8rem; color: #0f172a; line-height: 1.4;" class="dark:text-slate-50">${fb.message}</p>
              ${fb.suggestion ? `<p style="margin: 0.25rem 0 0; font-size: 0.75rem; color: #64748b;"><span style="font-weight: 500;">建议：</span>${fb.suggestion}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 学习建议
  const suggestionsList = container.querySelector('#suggestions-list');
  const suggestions = data.suggestions || [];
  if (suggestions.length === 0) {
    suggestionsList.innerHTML = '<li>当前表现优秀，可以尝试更复杂的和声语汇！</li>';
  } else {
    suggestionsList.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
  }
}

// 样式
const style = document.createElement('style');
style.textContent = `
  .grading-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background: rgba(255,255,255,0.5);
    font-size: 0.875rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }
  .grading-tab:hover {
    background: rgba(255,255,255,0.8);
  }
  .grading-tab-active {
    background: linear-gradient(135deg, #f59e0b, #f97316) !important;
    color: white !important;
    border-color: transparent !important;
  }
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
  @media (min-width: 768px) {
    .page-container > div[style*="grid-template-columns"] {
      grid-template-columns: 1fr 1fr !important;
    }
  }
`;
document.head.appendChild(style);