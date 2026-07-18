const RECYCLE_DATA = {
  plastic: {
    name: '플라스틱',
    icon: '🍾',
    guide: '내용물을 완전히 비우고 물로 헹군 뒤 배출합니다. 라벨지는 떼어내고, 다른 재질의 뚜껑은 분리해주세요.',
    rules: ['이물질이 남아있으면 재활용 불가', '여러 재질이 섞인 제품은 일반쓰레기']
  },
  paper: {
    name: '종이류',
    icon: '📄',
    guide: '물에 젖지 않게 보관하고, 테이프나 비닐 코팅된 부분은 제거합니다. 종이팩은 따로 모아주세요.',
    rules: ['비닐코팅 종이는 일반쓰레기', '휴지는 재활용 불가']
  },
  glass: {
    name: '유리병',
    icon: '🍶',
    guide: '내용물을 비우고 물로 헹굽니다. 병뚜껑은 금속류로 따로 배출해주세요.',
    rules: ['깨진 유리는 종량제 봉투에', '도자기, 거울은 재활용 불가']
  },
  can: {
    name: '캔/고철',
    icon: '🥫',
    guide: '내용물을 비우고 물로 헹궈 배출합니다. 알루미늄 캔과 철캔은 함께 배출 가능합니다.',
    rules: ['부탄가스 용기는 구멍을 뚫어 배출', '페인트 통은 재활용 불가']
  },
  food: {
    name: '음식물',
    icon: '🍎',
    guide: '물기를 최대한 제거한 후 음식물 전용 용기에 배출합니다.',
    rules: ['껍질·뼈·조개껍데기는 일반쓰레기', '국물은 반드시 따라버리기']
  },
  vinyl: {
    name: '비닐',
    icon: '🛍️',
    guide: '이물질이 묻은 비닐은 깨끗이 씻어 말린 후 배출합니다.',
    rules: ['오염된 비닐은 일반쓰레기', '여러 장 겹쳐서 배출']
  },
  styrofoam: {
    name: '스티로폼',
    icon: '📦',
    guide: '이물질을 제거하고 부피가 크면 잘게 부수어 배출합니다.',
    rules: ['코팅된 스티로폼은 일반쓰레기', '과일 포장 스티로폼은 깨끗이']
  },
  battery: {
    name: '전지/전자',
    icon: '🔋',
    guide: '건전지는 전용 수거함에 따로 배출합니다. 일반 쓰레기와 섞이면 화재 위험이 있습니다.',
    rules: ['주민센터나 마트 수거함 이용', '리튬배터리는 단자 절연 필수']
  }
};

const DAILY_TIPS = [
  '페트병은 <span class="tip-highlight">라벨을 떼고 찌그러뜨려</span> 뚜껑을 닫아 배출하면 부피를 줄일 수 있어요.',
  '택배 상자는 <span class="tip-highlight">테이프를 완전히 제거</span>한 후 종이류로 배출합니다.',
  '음식물 쓰레기는 <span class="tip-highlight">물기를 꼭 짜서</span> 배출해야 해요. 수분이 많으면 처리가 어려워집니다.',
  '종이컵에 남은 음료는 비우고, <span class="tip-highlight">플라스틱 뚜껑은 분리</span>해서 각각 배출하세요.',
  '라면 봉지 같은 <span class="tip-highlight">기름 묻은 비닐은 재활용이 안 돼요.</span> 종량제 봉투에 버려야 합니다.',
  '아이스크림 통 같은 <span class="tip-highlight">종이+비닐 코팅 제품</span>은 일반 쓰레기예요.',
  '깨진 형광등은 <span class="tip-highlight">절대 깨지 않게</span> 전용 수거함에 버려야 합니다. 수은이 들어있어요.'
];

const GEMMA_MODEL = 'gemma-4-31b-it';
let GEMMA_API_KEY = '';
let GEMMA_ENDPOINT = '';

if (window.ENV && typeof window.ENV.GEMMA_API_KEY === 'string') {
  GEMMA_API_KEY = window.ENV.GEMMA_API_KEY;
}

function updateGemmaEndpoint() {
  GEMMA_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent?key=${GEMMA_API_KEY}`;
}

updateGemmaEndpoint();

function isApiKeyProbablyValid() {
  return typeof GEMMA_API_KEY === 'string' && GEMMA_API_KEY.trim().length > 0 && !GEMMA_API_KEY.includes('YOUR_') && !GEMMA_API_KEY.includes('temp');
}

let currentLocation = null;
let favorites = JSON.parse(localStorage.getItem('recycleFavorites') || '[]');

function updateGreeting() {
  const hour = new Date().getHours();
  let greet;
  if (hour < 12) greet = '좋은 아침이에요!';
  else if (hour < 18) greet = '즐거운 오후예요!';
  else greet = '고생 많으셨어요!';
  document.getElementById('greetingText').textContent = greet + ' ☀️';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function requestLocation() {
  document.getElementById('locationText').classList.add('loading');
  document.getElementById('locationText').textContent = '찾는 중...';

  if (!navigator.geolocation) {
    document.getElementById('locationText').textContent = '위치 정보 불가';
    document.getElementById('locationText').classList.remove('loading');
    showToast('이 브라우저에서는 위치 정보를 사용할 수 없어요.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      getDistrictName(currentLocation.lat, currentLocation.lng);
    },
    () => {
      document.getElementById('locationText').textContent = '서울시 강남구';
      document.getElementById('locationText').classList.remove('loading');
      currentLocation = { lat: 37.5172, lng: 127.0473, name: '서울시 강남구' };
    },
    { timeout: 5000, enableHighAccuracy: true }
  );
}

async function getDistrictName(lat, lng) {
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`);
    const data = await resp.json();
    const address = data.address;
    let name = '';
    if (address.city || address.town || address.village || address.county) {
      name = (address.city || address.town || address.village || address.county || '') +
             (address.borough || address.suburb ? ' ' + (address.borough || address.suburb) : '');
      name = name.trim() || '현재 위치';
    } else {
      name = '현재 위치';
    }
    document.getElementById('locationText').textContent = name;
    document.getElementById('locationText').classList.remove('loading');
    currentLocation = { lat, lng, name };
  } catch (e) {
    document.getElementById('locationText').textContent = '현재 위치';
    document.getElementById('locationText').classList.remove('loading');
    currentLocation = { lat, lng, name: '현재 위치' };
  }
}

function setDailyTip() {
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
  document.getElementById('tipDate').textContent = dateStr;
  const idx = today.getDate() % DAILY_TIPS.length;
  document.getElementById('dailyTip').innerHTML = DAILY_TIPS[idx];
}

function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  const categories = Object.entries(RECYCLE_DATA);
  grid.innerHTML = '';
  categories.forEach(([key, data]) => {
    const item = document.createElement('button');
    item.className = 'category-item' + (favorites.includes(key) ? ' starred' : '');
    item.innerHTML = `<span class="cat-icon">${data.icon}</span><span class="cat-label">${data.name}</span>`;
    item.onclick = () => openDetail(key);
    item.addEventListener('contextmenu', (e) => { e.preventDefault(); toggleFavorite(key); });
    grid.appendChild(item);
  });
}

function toggleFavorite(key) {
  if (favorites.includes(key)) {
    favorites = favorites.filter(f => f !== key);
    showToast(`${RECYCLE_DATA[key].name} 즐겨찾기 해제`);
  } else {
    favorites.push(key);
    showToast(`${RECYCLE_DATA[key].name} 즐겨찾기 추가 ⭐`);
  }
  localStorage.setItem('recycleFavorites', JSON.stringify(favorites));
  renderCategories();
}

function openDetail(key) {
  const data = RECYCLE_DATA[key];
  document.getElementById('modalTitle').textContent = `${data.icon} ${data.name} 분리배출 방법`;
  let html = `<p>${data.guide}</p>`;
  html += '<div class="category-detail-card"><h4>✅ 올바른 배출 방법</h4>';
  html += '<p>' + data.rules.join('<br>') + '</p></div>';

  if (currentLocation && currentLocation.name) {
    html += `<div class="category-detail-card location-detail-card">`;
    html += `<h4>📍 ${currentLocation.name} 지역 기준</h4>`;
    html += `<p>지역별 세부 기준은 지자체 홈페이지에서 확인해 주세요.<br>일반적으로 위 기준이 전국 공통으로 적용됩니다.</p></div>`;
  }

  const favoriteButtonClass = favorites.includes(key) ? ' favorite-active' : '';
  html += '<div class="modal-actions">';
  html += `<button class="close-btn favorite-toggle-btn${favoriteButtonClass}" data-action="toggle-favorite-and-close" data-category="${key}">`;
  html += favorites.includes(key) ? '⭐ 즐겨찾기 해제' : '⭐ 즐겨찾기에 추가';
  html += '</button>';
  html += '</div>';

  openModal(`${data.icon} ${data.name} 분리배출 방법`, html, false);
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('open');
  renderCategories();
}

function openModal(titleText, contentHtml, hideStaticClose = false) {
  document.getElementById('modalTitle').textContent = titleText;
  document.getElementById('modalContent').innerHTML = contentHtml;
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  modalCloseBtn.style.display = hideStaticClose ? 'none' : 'block';
  document.getElementById('detailModal').classList.add('open');
}

function openCamera() {
  document.getElementById('cameraInput').click();
}

async function handlePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  document.getElementById('modalTitle').innerHTML = '📸 AI 분석 결과 <span class="ai-badge">✨ Gemma AI</span>';
  document.getElementById('modalContent').innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <div class="loading-text">Gemma AI가 이미지를 분석하고 있어요...</div>
      <div class="loading-text loading-subtext">${currentLocation ? currentLocation.name + ' 지역 기준으로 검토 중' : '지역 정보 없음'}</div>
    </div>
  `;
  document.getElementById('detailModal').classList.add('open');

  try {
    updateGemmaEndpoint();
    if (!isApiKeyProbablyValid()) {
      throw new Error('Gemma API 키가 설정되지 않았거나 올바르지 않습니다. script.js의 GEMMA_API_KEY를 확인해 주세요.');
    }

    const base64 = await fileToBase64(file);
    const result = await callGemmaAPI(base64, file.type);
    showAnalysisResult(result, base64, file.type);
  } catch (err) {
    console.error('Gemma API 오류:', err);
    const message = err.message.includes('API key not valid') || err.message.includes('API 키')
      ? 'Gemma API 키가 유효하지 않습니다. script.js에서 GEMMA_API_KEY를 확인해 주세요.'
      : 'API 호출에 실패했어요. 기본 정보를 보여드릴게요.';
    showToast(message);
    showFallbackResult(message);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function callGemmaAPI(base64Data, mimeType) {
  const locationName = currentLocation ? currentLocation.name : '현재 위치';
  const prompt = `당신은 대한민국 분리배출 전문가입니다. 아래 사진 속 품목을 보고, 사용자 위치(${locationName}) 기준으로 지역별 불리수거·재활용 기준을 아주 구체적으로 안내하세요.

반드시 한국어로만 답하고, 영어는 절대 사용하지 마세요. 영어가 나오면 무시하고 반드시 한국어로 다시 작성하세요.

출력은 아래 6개 섹션만 포함해야 합니다. 다른 설명, 생각, 검토, 내부 메타, 'Constraint Check', 'Reference', 'Strict interpretation', 'Wait', 프롬프트 내용, 또는 번역 논리를 포함하지 마세요.

## [품목명]
사진 속 품목의 이름을 짧고 정확하게 적어주세요.

## [분류]
해당 품목의 분류를 아래 중 하나로 적어주세요:
(플라스틱 / 종이류 / 유리병 / 캔·고철 / 비닐 / 스티로폼 / 음식물 / 일반쓰레기 / 전지·전자제품 / 의류 / 형광등 / 폐식용유 / 대형폐기물)

## [재활용 가능 여부]
"가능" 또는 "불가능"으로만 적어주세요.

## [배출 방법]
배출 전 준비 과정과 배출 방식 2~3단계를 간단하고 실용적으로 적어주세요.

## [주의사항]
주의해야 할 점을 2개 정도 짧게 적어주세요.

## [지역별 재활용 기준]
사용자 위치는 "${locationName}"입니다. 이 지역에서 이 품목에 대해 다음 4가지를 구체적으로 적어주세요.
- 기준: 해당 지역의 일반적인 분리배출/불리수거 기준
- 배출 장소: 주민센터, 재활용수거함, 마트, 아파트 공용 장소 중 어디에 배출하는지
- 특별 규정: 지역별로 추가로 지켜야 하는 규칙이 있다면 적기
- 참고: 헷갈리기 쉬운 사례나 한 줄 팁

이 모델에 인터넷 검색 옵션이 없다면, 공개적인 지식과 일반적인 지역 정보를 기반으로 안내하세요. 정보가 확실하지 않으면 "일반적인 기준으로 안내"라고 명시하십시오.`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: base64Data } }
      ]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024
    }
  };

  const resp = await fetch(GEMMA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errData = await resp.text();
    const invalidKey = errData.includes('API key not valid') || errData.includes('API key is not valid');
    const errorMessage = invalidKey
      ? 'API 키가 유효하지 않습니다. script.js의 GEMMA_API_KEY를 확인해 주세요.'
      : `API 오류 (${resp.status})`;
    throw new Error(`${errorMessage} ${errData}`);
  }

  const data = await resp.json();
  return data.candidates[0].content.parts[0].text;
}

function sanitizeGemmaResponseText(rawText) {
  if (!rawText) return '';
  const lines = String(rawText).split(/\r?\n/);
  const sanitized = [];
  let keep = false;

  const blacklist = [
    /\bwait\b/i,
    /\bstrict interpretation\b/i,
    /\bconstraint check\b/i,
    /\breference\b/i,
    /\bthe prompt says\b/i,
    /\bno english\b/i,
    /\bdisclaimer\b/i,
    /\bthis model\b/i,
    /\bif english\b/i,
    /\bthe prompt is very strict\b/i,
    /\bgeneral knowledge\b/i,
    /\bsearch\b/i,
    /\bprompt\b/i
  ];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (blacklist.some((re) => re.test(trimmed))) {
      continue;
    }

    if (/^(##\s*\[|\[품목명\]|\[분류\]|\[재활용 가능 여부\]|\[배출 방법\]|\[주의사항\]|\[지역별 재활용 기준\]|\[Ulsan Specifics\])/i.test(trimmed)) {
      keep = true;
    }

    if (!keep) continue;

    if (/^[A-Za-z0-9\s\-\(\)"'.,:;]+$/.test(trimmed) && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(trimmed)) {
      continue;
    }

    sanitized.push(trimmed);
  }

  return sanitized.join('\n');
}

function removeEnglishFromText(text, allowEnglishInItemName = false) {
  if (!text) return '';
  return String(text)
    .split(/\r?\n/)
    .map((line) => {
      const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(line);
      const hasEnglish = /[A-Za-z]/.test(line);
      if (!hasKorean && hasEnglish && !allowEnglishInItemName) return '';
      let cleaned = line.replace(/\([^)]*[A-Za-z][^)]*\)/g, '');
      cleaned = cleaned.replace(/\[[^\]]*[A-Za-z][^\]]*\]/g, '');
      cleaned = cleaned.replace(/\b(General waste|Battery|Electronic Products|Plastic|Paper|Glass|Can|Metal|Vinyl|Styrofoam|Food|Disposable|Recyclable|Recyclability|HDMI|Cable|Ulsan|Specifics|Reference|Constraint|Check|Strict|Interpretation|Wait)\b/gi, '');
      if (hasKorean) {
        cleaned = cleaned.replace(/[A-Za-z0-9]+/g, '');
      }
      cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
      if (!allowEnglishInItemName) {
        cleaned = cleaned.replace(/^[^ㄱ-ㅎㅏ-ㅣ가-힣]*/g, '').trim();
      }
      return cleaned;
    })
    .filter((line) => line.trim())
    .join('\n');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeForParsing(text) {
  return String(text || '')
    .replace(/\*\s{2,}\*/g, '*')
    .replace(/\*\s*\*\s*/g, '* ')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function extractInlineValue(text, labelPatterns) {
  const normalized = normalizeForParsing(text);
  for (const label of labelPatterns) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\n)\\*?\s*${escaped}\s*[:：]\s*([^\n]+)`, 'i');
    const match = normalized.match(regex);
    if (match) return match[1].trim();
  }
  return '';
}

function extractSection(text, labelPatterns) {
  const normalized = normalizeForParsing(text);
  for (const label of labelPatterns) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\n)(?:#{1,6}\\s*\\[?${escaped}\\]?|\\*\\s*${escaped}|${escaped})\\s*(?:[:：]|\\]|\\n)\\s*([\\s\\S]*?)(?=\\n(?:#{1,6}\\s*\\[|\\*\\s*\\w|$))`, 'i');
    const match = normalized.match(regex);
    if (match) return match[1].trim();
  }
  return '';
}

function extractBracketHeadings(text) {
  const headings = [];
  const regex = /^(?:#{1,6})\s*\[([^\]]+)\]/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    headings.push(match[1].trim());
  }
  return headings;
}

function extractBracketHeadingValues(text) {
  const headings = extractBracketHeadings(text);
  const sectionLabels = new Set([
    '품목명', '품목', '인식된 품목', '분류', '카테고리', '재활용 가능 여부', '재활용여부', '재활용 여부',
    '배출 방법', '배출 방식', '주의사항', '주의', '지역별 재활용 기준', '지역 특이사항', '지역별 안내', '지역 안내',
    'Item Name', 'Item', 'Product', 'Classification', 'Recyclability', 'Recyclable', 'Disposal Method', 'Disposal Methods',
    'Precautions', 'Note', 'Ulsan Specifics', 'Ulsan'
  ]);

  return headings.filter(value => !sectionLabels.has(value));
}

function extractBulletFields(text) {
  const normalized = normalizeForParsing(text);
  const fields = [];
  const regex = /^(?:[-*\s]*)(기준|배출 장소|특별 규정|참고)\s*[:：]\s*([^\n]+)/gim;
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    fields.push(`${match[1]}: ${match[2].trim()}`);
  }
  return fields.join('\n');
}

function renderDetailText(text) {
  return String(text || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<div class="detail-line">${escapeHtml(line.replace(/^[-•*\d\.\)\s]*/, ''))}</div>`)
    .join('');
}

function showAnalysisResult(rawText, base64Data, mimeType) {
  const cleanedText = sanitizeGemmaResponseText(rawText);
  const parsed = parseGemmaResponse(cleanedText);
  let html = `<img class="analyzed-photo" src="data:${mimeType};base64,${base64Data}" alt="분석된 사진">`;

  html += `<div class="result-section"><h4>🔍 인식된 품목</h4><p class="result-item-name">${parsed.itemName}</p></div>`;

  html += `<div class="result-section"><h4>📦 재활용 분류</h4><p>${parsed.category}</p></div>`;

  const isRecyclable = parsed.isRecyclable === '재활용 가능';

  if (isRecyclable) {
    html += `<div class="result-section recyclable"><h4>🟢 재활용 가능 여부</h4><p class="result-status-text recyclable-text">✅ ${parsed.isRecyclable}</p></div>`;
  } else {
    html += `<div class="result-section not-recyclable"><h4>🔴 재활용 가능 여부</h4><p class="result-status-text not-recyclable-text">❌ ${parsed.isRecyclable}</p></div>`;
  }

  html += `<div class="result-section"><h4>🗑️ 올바른 배출 방법</h4><div class="detail-block">${renderDetailText(parsed.method)}</div></div>`;

  if (parsed.caution) {
    html += `<div class="result-section caution"><h4>⚠️ 주의사항</h4><div class="detail-block">${renderDetailText(parsed.caution)}</div></div>`;
  }

  if (parsed.localInfo) {
    html += `<div class="result-section location"><h4>📍 지역별 안내</h4><div class="detail-block">${renderDetailText(parsed.localInfo)}</div></div>`;
  }

  html += '<div class="modal-actions">';
  html += '<button class="close-btn modal-action-button" data-action="close-modal">확인했어요</button>';
  html += '</div>';

  openModal('📸 AI 분석 결과', html, true);
}

function parseGemmaResponse(text) {
  const normalized = normalizeForParsing(text);
  const lines = normalized.split('\n');

  const labelDefinitions = {
    itemName: ['품목명', '품목', '인식된 품목', 'Item Name', 'Item', 'Product'],
    category: ['분류', '카테고리', 'Classification', 'Category'],
    recyclable: ['재활용 가능 여부', '재활용여부', '재활용 여부', 'Recyclability', 'Recyclable'],
    method: ['배출 방법', '배출 방식', 'Disposal Method', 'Disposal Methods', 'Disposal'],
    caution: ['주의사항', '주의', 'Precautions', '주의 사항', 'Note'],
    localInfo: ['지역별 재활용 기준', '지역 특이사항', '지역별 안내', '지역 안내', 'Ulsan Specifics', 'Ulsan'],
  };

  const labelToKey = new Map();
  for (const [key, labels] of Object.entries(labelDefinitions)) {
    for (const label of labels) {
      labelToKey.set(label.toLowerCase(), key);
    }
  }

  const sectionValues = {
    itemName: '',
    category: '',
    recyclable: '',
    method: '',
    caution: '',
    localInfo: ''
  };

  let currentKey = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const labelMatch = line.match(/^(?:#{1,6}\s*)?\[?([^\]]+?)\]?\s*[:：]?\s*$/);
    const kvMatch = line.match(/^(?:#{1,6}\s*)?\[?([^\]]+?)\]?\s*[:：]\s*(.+)$/);
    const bulletKvMatch = line.match(/^[*-]\s*([^:：]+)\s*[:：]\s*(.+)$/);

    if (kvMatch) {
      const label = kvMatch[1].trim().toLowerCase();
      const value = kvMatch[2].trim();
      const key = labelToKey.get(label);
      if (key) {
        sectionValues[key] = value;
        currentKey = key;
        continue;
      }
    }

    if (labelMatch) {
      const label = labelMatch[1].trim().toLowerCase();
      const key = labelToKey.get(label);
      if (key) {
        currentKey = key;
        continue;
      }
    }

    if (bulletKvMatch) {
      const label = bulletKvMatch[1].trim().toLowerCase();
      const value = bulletKvMatch[2].trim();
      const key = labelToKey.get(label);
      if (key) {
        sectionValues[key] = value;
        currentKey = key;
        continue;
      }
    }

    if (currentKey) {
      sectionValues[currentKey] += (sectionValues[currentKey] ? '\n' : '') + line;
    }
  }

  const recyclableText = sectionValues.recyclable || '';
  let isRecyclable = '재활용 여부 확인 필요';
  if (recyclableText.match(/불가능|Impossible|No/i)) {
    isRecyclable = '재활용 불가능';
  } else if (recyclableText.match(/가능|Possible|Yes/i)) {
    isRecyclable = '재활용 가능';
  }

  let itemName = sectionValues.itemName || '';
  let category = sectionValues.category || '';
  const method = sectionValues.method || '올바른 분리배출 방법을 확인해 주세요.';
  const caution = sectionValues.caution || '';
  let localInfo = sectionValues.localInfo || '';

  if (!itemName) {
    const headings = extractBracketHeadingValues(text);
    if (headings.length > 0) itemName = headings[0];
  }

  if (!category) {
    const headings = extractBracketHeadingValues(text);
    if (headings.length > 1) category = headings[1];
  }

  if (!localInfo) {
    localInfo = extractBulletFields(normalized);
  }

  if (!itemName) itemName = '인식된 품목';
  if (!category) category = '분류 정보 없음';

  return {
    itemName: removeEnglishFromText(itemName, true).replace(/^\*\s*/, '').trim(),
    category: removeEnglishFromText(category, false).replace(/^\*\s*/, '').trim(),
    isRecyclable,
    method: removeEnglishFromText(method, false),
    caution: removeEnglishFromText(caution, false),
    localInfo: removeEnglishFromText(localInfo, false)
  };
}

function showFallbackResult(errorMessage = '') {
  let html = '<p class="muted-text">API 연결에 실패했어요. 아래 품목 중 해당하는 것을 골라주세요.</p>';
  if (errorMessage) {
    html += `<p class="muted-text" style="margin-top: 8px; color: #c62828;">${escapeHtml(errorMessage)}</p>`;
  }
  html += '<div class="vertical-list">';
  Object.entries(RECYCLE_DATA).forEach(([key, data]) => {
    html += `<div class="category-detail-card clickable" data-action="open-detail" data-category="${key}">`;
    html += `<h4>${data.icon} ${data.name}</h4>`;
    html += `<p>${data.guide.substring(0, 40)}...</p></div>`;
  });
  html += '</div>';
  html += '<div class="modal-actions">';
  html += '<button class="close-btn modal-action-button" data-action="close-modal">닫기</button>';
  html += '</div>';
  openModal('📸 AI 분석 결과', html, true);
}

function showFavorites() {
  if (favorites.length === 0) {
    showToast('즐겨찾기한 품목이 없어요. 품목을 길게 눌러 추가해보세요!');
    return;
  }

  const favData = favorites.map(k => RECYCLE_DATA[k]);
  document.getElementById('modalTitle').textContent = '⭐ 즐겨찾기한 품목';
  let html = '<div class="vertical-list">';
  favData.forEach(data => {
    const key = Object.keys(RECYCLE_DATA).find(k => RECYCLE_DATA[k].name === data.name);
    html += `<div class="category-detail-card clickable" data-action="open-detail" data-category="${key}">`;
    html += `<h4>${data.icon} ${data.name}</h4>`;
    html += `<p>${data.guide.substring(0, 40)}...</p></div>`;
  });
  html += '</div>';
  openModal('⭐ 즐겨찾기한 품목', html, false);
}

document.getElementById('locationBtn').addEventListener('click', requestLocation);
document.getElementById('cameraBtn').addEventListener('click', openCamera);
document.getElementById('favoriteBtn').addEventListener('click', showFavorites);
document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('cameraInput').addEventListener('change', handlePhoto);

document.querySelectorAll('.info-list [data-category]').forEach(item => {
  item.addEventListener('click', () => openDetail(item.dataset.category));
});

document.getElementById('modalContent').addEventListener('click', function(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const category = target.dataset.category;

  if (action === 'close-modal') {
    closeModal();
  } else if (action === 'open-detail' && category) {
    openDetail(category);
  } else if (action === 'toggle-favorite-and-close' && category) {
    toggleFavorite(category);
    closeModal();
  }
});

document.getElementById('detailModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

updateGreeting();
setDailyTip();
renderCategories();
requestLocation();
