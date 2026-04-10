// ==========================================
// 核心引擎与路由逻辑
// ==========================================
const app = {
  shuffledQuestions: [],
  answers: {},
  previewMode: false,
  currentTheme: null
};

const screens = {
  selector: document.getElementById('selector'),
  intro: document.getElementById('intro'),
  test: document.getElementById('test'),
  result: document.getElementById('result')
};

const questionList = document.getElementById('questionList');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const submitBtn = document.getElementById('submitBtn');
const testHint = document.getElementById('testHint');

// 1. 解析 URL 参数，决定加载哪个数据
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const theme = urlParams.get('theme');

  if (theme) {
    app.currentTheme = theme.toLowerCase();
    loadThemeData(app.currentTheme);
  } else {
    showScreen('selector');
  }
});

// 2. 动态加载对应的 dataXX.js
function loadThemeData(theme) {
  screens.selector.innerHTML = `<div class="loading-text">正在为您构建【${theme.toUpperCase()}】宇宙通道，请稍候...</div>`;
  showScreen('selector');

  const scriptName = `data${theme.toUpperCase()}.obf.js`;
  const script = document.createElement('script');
  script.src = scriptName;
  
  script.onload = () => {
    if (typeof TestData !== 'undefined') {
      initUI();
      showScreen('intro');
    } else {
      alert("数据加载异常，请检查文件内容！");
      window.location.href = window.location.pathname;
    }
  };

  script.onerror = () => {
    alert(`跃迁失败：找不到数据文件 ${scriptName}，请确保该文件与 index.html 在同一文件夹下！`);
    window.location.href = window.location.pathname;
  };

  document.body.appendChild(script);
}

// 3. 点击卡片触发刷新加载
document.querySelectorAll('.hub-card').forEach(card => {
  card.addEventListener('click', () => {
    const theme = card.getAttribute('data-theme');
    window.location.href = `?theme=${theme}`;
  });
});

// 返回枢纽按钮逻辑
const goHub = () => { window.location.href = window.location.pathname; };
document.getElementById('backHubBtnIntro').addEventListener('click', goHub);
document.getElementById('backHubBtnResult').addEventListener('click', goHub);

// ==========================================
// 测试逻辑
// ==========================================
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('active', key === name);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initUI() {
  const ui = TestData.ui;
  document.getElementById('ui-pageTitle').textContent = ui.pageTitle;
  document.getElementById('ui-homeTitle').textContent = ui.homeTitle;
  
  if(document.getElementById('ui-authorText')) document.getElementById('ui-authorText').textContent = ui.authorText;
  if(document.getElementById('ui-reauthorText')) document.getElementById('ui-reauthorText').textContent = ui.reauthorName;
  if(document.getElementById('ui-reauthorLink')) document.getElementById('ui-reauthorLink').href = ui.reauthorLink;
  if(document.getElementById('ui-authorLink')) {
    document.getElementById('ui-authorLink').textContent = ui.authorName;
    document.getElementById('ui-authorLink').href = ui.authorLink;
  }
  
  document.getElementById('ui-hostText').textContent = ui.hostText;
  document.getElementById('ui-domainText').textContent = ui.domainText;
  
  document.getElementById('startBtn').textContent = ui.btnStart;
  document.getElementById('backIntroBtn').textContent = ui.btnBackToHome;
  document.getElementById('submitBtn').textContent = ui.btnSubmit;
  document.getElementById('restartBtn').textContent = ui.btnRestart;
  
  document.getElementById('ui-resultSectionAnalysis').textContent = ui.resultSectionAnalysis;
  document.getElementById('ui-resultSectionDim').textContent = ui.resultSectionDim;
  document.getElementById('ui-resultSectionNote').textContent = ui.resultSectionNote;
  
  const summaryEle = document.getElementById('ui-authorBoxSummary');
  summaryEle.textContent = ui.authorBoxSummary;
  summaryEle.setAttribute('data-expand', ui.authorBoxExpand);
  summaryEle.setAttribute('data-collapse', ui.authorBoxCollapse);
  
  document.getElementById('ui-authorBoxContent').innerHTML = ui.authorBoxContent.map(p => `<p>${p}</p>`).join('');
  updateProgress();
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getVisibleQuestions() {
  const visible = [...app.shuffledQuestions];
  const gateIndex = visible.findIndex(q => q.id === TestData.specialQuestions[0].id);
  if (gateIndex !== -1 && app.answers[TestData.specialQuestions[0].id] === 3) {
    visible.splice(gateIndex + 1, 0, TestData.specialQuestions[1]);
  }
  return visible;
}

function getQuestionMetaLabel(q) {
  if (q.special) return TestData.ui.questionMetaSpecial;
  return app.previewMode ? TestData.dimensionMeta[q.dim].name : TestData.ui.questionMetaHidden;
}

function renderQuestions() {
  const visibleQuestions = getVisibleQuestions();
  questionList.innerHTML = '';
  visibleQuestions.forEach((q, index) => {
    const card = document.createElement('article');
    card.className = 'question';
    card.innerHTML = `
      <div class="question-meta">
        <div class="badge">${TestData.ui.questionBadge(index + 1)}</div>
        <div>${getQuestionMetaLabel(q)}</div>
      </div>
      <div class="question-title">${q.text}</div>
      <div class="options">
        ${q.options.map((opt, i) => {
          const code = ['A', 'B', 'C', 'D'][i] || String(i + 1);
          const checked = app.answers[q.id] === opt.value ? 'checked' : '';
          return `
            <label class="option">
              <input type="radio" name="${q.id}" value="${opt.value}" ${checked} />
              <div class="option-code">${code}</div>
              <div>${opt.label}</div>
            </label>
          `;
        }).join('')}
      </div>
    `;
    questionList.appendChild(card);
  });

  questionList.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const { name, value } = e.target;
      app.answers[name] = Number(value);

      if (name === TestData.specialQuestions[0].id) {
        if (Number(value) !== 3) {
          delete app.answers[TestData.specialQuestions[1].id];
        }
        renderQuestions();
        return;
      }
      updateProgress();
    });
  });
  updateProgress();
}

function updateProgress() {
  if(typeof TestData === 'undefined') return;
  const visibleQuestions = getVisibleQuestions();
  const total = visibleQuestions.length;
  const done = visibleQuestions.filter(q => app.answers[q.id] !== undefined).length;
  const percent = total ? (done / total) * 100 : 0;
  
  progressBar.style.width = `${percent}%`;
  progressText.textContent = TestData.ui.progressText(done, total);
  
  const complete = done === total && total > 0;
  submitBtn.disabled = !complete;
  testHint.textContent = complete ? TestData.ui.hintComplete : TestData.ui.hintIncomplete;
}

function sumToLevel(score) {
  if (score <= 3) return 'L';
  if (score === 4) return 'M';
  return 'H';
}

function levelNum(level) {
  return { L: 1, M: 2, H: 3 }[level];
}

function parsePattern(pattern) {
  return pattern.replace(/-/g, '').split('');
}

function getDrunkTriggered() {
  return app.answers[TestData.config.drunkTriggerQuestionId] === 2;
}

function computeResult() {
  const rawScores = {};
  const levels = {};
  Object.keys(TestData.dimensionMeta).forEach(dim => { rawScores[dim] = 0; });

  TestData.questions.forEach(q => {
    rawScores[q.dim] += Number(app.answers[q.id] || 0);
  });

  Object.entries(rawScores).forEach(([dim, score]) => {
    levels[dim] = sumToLevel(score);
  });

  const userVector = TestData.config.dimensionOrder.map(dim => levelNum(levels[dim]));
  const ranked = TestData.NORMAL_TYPES.map(type => {
    const vector = parsePattern(type.pattern).map(levelNum);
    let distance = 0;
    let exact = 0;
    for (let i = 0; i < vector.length; i++) {
      const diff = Math.abs(userVector[i] - vector[i]);
      distance += diff;
      if (diff === 0) exact += 1;
    }
    const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
    return { ...type, ...TestData.TYPE_LIBRARY[type.code], distance, exact, similarity };
  }).sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (b.exact !== a.exact) return b.exact - a.exact;
    return b.similarity - a.similarity;
  });

  const bestNormal = ranked[0];
  const drunkTriggered = getDrunkTriggered();
  const ui = TestData.ui;

  let finalType, modeKicker, badge, sub, special, secondaryType = null;

  if (drunkTriggered) {
    const keys = Object.keys(TestData.TYPE_LIBRARY);
    const drunkKey = keys[keys.length - 1]; 
    finalType = TestData.TYPE_LIBRARY[drunkKey];
    secondaryType = bestNormal;
    modeKicker = ui.calcKickerDrunk;
    badge = ui.calcBadgeDrunk;
    sub = ui.calcSubDrunk;
    special = true;
  } else if (bestNormal.similarity < 60) {
    let bottomKey = "HHHH";
    if(!TestData.TYPE_LIBRARY[bottomKey]) bottomKey = "Joker";
    if(!TestData.TYPE_LIBRARY[bottomKey]) bottomKey = Object.keys(TestData.TYPE_LIBRARY)[Object.keys(TestData.TYPE_LIBRARY).length - 2];
    
    finalType = TestData.TYPE_LIBRARY[bottomKey];
    modeKicker = ui.calcKickerBottom;
    badge = ui.calcBadgeBottom(bestNormal.similarity);
    sub = ui.calcSubBottom;
    special = true;
  } else {
    finalType = bestNormal;
    modeKicker = ui.calcKickerNormal;
    badge = ui.calcBadgeNormal(bestNormal.similarity, bestNormal.exact);
    sub = ui.calcSubNormal;
    special = false;
  }

  return { rawScores, levels, ranked, bestNormal, finalType, modeKicker, badge, sub, special, secondaryType };
}

function renderDimList(result) {
  const dimList = document.getElementById('dimList');
  dimList.innerHTML = TestData.config.dimensionOrder.map(dim => {
    const level = result.levels[dim];
    const explanation = TestData.DIM_EXPLANATIONS[dim][level];
    return `
      <div class="dim-item">
        <div class="dim-item-top">
          <div class="dim-item-name">${TestData.dimensionMeta[dim].name}</div>
          <div class="dim-item-score">${level} / ${result.rawScores[dim]}分</div>
        </div>
        <p>${explanation}</p>
      </div>
    `;
  }).join('');
}

function renderResult() {
  const result = computeResult();
  const type = result.finalType;

  document.getElementById('resultModeKicker').textContent = result.modeKicker;
  document.getElementById('resultTypeName').textContent = `${type.code}（${type.cn}）`;
  document.getElementById('matchBadge').textContent = result.badge;
  document.getElementById('resultTypeSub').textContent = result.sub;
  document.getElementById('resultDesc').textContent = type.desc;
  document.getElementById('posterCaption').textContent = type.intro;
  document.getElementById('funNote').textContent = result.special ? TestData.ui.noteSpecial : TestData.ui.noteNormal;

  const posterBox = document.getElementById('posterBox');
  const posterImage = document.getElementById('posterImage');
  const imageSrc = TestData.TYPE_IMAGES[type.code];
  
  if (imageSrc) {
    posterImage.src = imageSrc;
    posterImage.alt = `${type.code}（${type.cn}）`;
    posterBox.classList.remove('no-image');
  } else {
    posterImage.removeAttribute('src');
    posterImage.alt = '';
    posterBox.classList.add('no-image');
  }

  renderDimList(result);
  showScreen('result');
}

function startTest(preview = false) {
  app.previewMode = preview;
  app.answers = {};
  const shuffledRegular = shuffle(TestData.questions);
  const insertIndex = Math.floor(Math.random() * shuffledRegular.length) + 1;
  app.shuffledQuestions = [
    ...shuffledRegular.slice(0, insertIndex),
    TestData.specialQuestions[0],
    ...shuffledRegular.slice(insertIndex)
  ];
  renderQuestions();
  showScreen('test');
}

document.getElementById('startBtn').addEventListener('click', () => startTest(false));
document.getElementById('backIntroBtn').addEventListener('click', () => showScreen('intro'));
document.getElementById('submitBtn').addEventListener('click', renderResult);
document.getElementById('restartBtn').addEventListener('click', () => startTest(false));


// javascript-obfuscator engine.js --output engine.obf.js --string-array true --control-flow-flattening true
// # 混淆 CBTI 数据
// javascript-obfuscator dataCBTI.js --output dataCBTI.obf.js --string-array true --control-flow-flattening true

// # 混淆 HBTI 数据
// javascript-obfuscator dataHBTI.js --output dataHBTI.obf.js --string-array true --control-flow-flattening true

// # 混淆 HWTI 数据
// javascript-obfuscator dataHWTI.js --output dataHWTI.obf.js --string-array true --control-flow-flattening true

// # 混淆 SRTI 数据
// javascript-obfuscator dataSRTI.js --output dataSRTI.obf.js --string-array true --control-flow-flattening true