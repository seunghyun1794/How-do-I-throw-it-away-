'use strict';

const RECYCLE_DATA = {
  plastic: {
    name: '플라스틱',
    icon: '🍾',
    guide: '내용물을 완전히 비우고 물로 헹군 뒤 배출합니다. 라벨지는 떼어내고, 다른 재질의 뚜껑은 분리해주세요.',
    rules: ['이물질이 남아 있으면 재활용이 어려워요.', '여러 재질이 섞인 제품은 재질별로 분리해요.']
  },
  paper: {
    name: '종이류',
    icon: '📄',
    guide: '물에 젖지 않게 보관하고, 테이프나 비닐 코팅된 부분은 제거합니다. 종이팩은 일반 종이와 따로 모아주세요.',
    rules: ['비닐 코팅 종이는 일반쓰레기일 수 있어요.', '휴지와 영수증은 종이류로 배출하지 않아요.']
  },
  glass: {
    name: '유리병',
    icon: '🍶',
    guide: '내용물을 비우고 물로 헹굽니다. 병뚜껑은 재질에 따라 따로 배출해주세요.',
    rules: ['깨진 유리는 신문지 등으로 감싸 안전하게 배출해요.', '도자기와 거울은 유리병류가 아니에요.']
  },
  can: {
    name: '캔/고철',
    icon: '🥫',
    guide: '내용물을 비우고 물로 헹궈 배출합니다. 다른 재질의 뚜껑이나 부속품은 분리해주세요.',
    rules: ['가스 용기는 내용물을 완전히 제거한 뒤 지역 기준에 따라 배출해요.', '페인트가 남은 통은 일반 캔류로 배출하지 않아요.']
  },
  food: {
    name: '음식물',
    icon: '🍎',
    guide: '물기와 이물질을 최대한 제거한 후 음식물 전용 용기에 배출합니다.',
    rules: ['큰 뼈와 조개껍데기 등은 일반쓰레기예요.', '국물은 따라 버리고 건더기만 배출해요.']
  },
  vinyl: {
    name: '비닐',
    icon: '🛍️',
    guide: '내용물을 비우고 이물질을 제거한 뒤 깨끗한 상태로 배출합니다.',
    rules: ['심하게 오염된 비닐은 종량제 봉투에 배출해요.', '재질 표시와 지역 수거 기준을 확인해요.']
  },
  styrofoam: {
    name: '스티로폼',
    icon: '📦',
    guide: '테이프, 운송장, 음식물 등 이물질을 완전히 제거한 뒤 배출합니다.',
    rules: ['색상이나 코팅 여부에 따라 재활용이 어려울 수 있어요.', '오염된 스티로폼은 지역 기준을 확인해요.']
  },
  battery: {
    name: '전지/전자',
    icon: '🔋',
    guide: '건전지와 소형 전자제품은 일반쓰레기와 섞지 말고 전용 수거함을 이용합니다.',
    rules: ['리튬배터리는 단자를 테이프로 절연해요.', '부풀거나 파손된 배터리는 가까운 행정복지센터에 문의해요.']
  }
};

const DAILY_TIPS = [
  '페트병은 <span class="tip-highlight">라벨을 떼고 찌그러뜨린 뒤</span> 뚜껑을 닫아 배출하면 부피를 줄일 수 있어요.',
  '택배 상자는 <span class="tip-highlight">테이프와 운송장을 완전히 제거</span>한 후 종이류로 배출합니다.',
  '음식물 쓰레기는 <span class="tip-highlight">물기를 꼭 짜서</span> 배출해야 처리 과정의 부담을 줄일 수 있어요.',
  '종이컵에 남은 음료는 비우고, <span class="tip-highlight">플라스틱 뚜껑은 분리</span>해서 각각 배출하세요.',
  '기름이나 음식물이 심하게 묻은 비닐은 <span class="tip-highlight">깨끗이 씻기 어렵다면 종량제 봉투</span>에 버려야 해요.',
  '여러 재질이 붙어 있는 포장재는 <span class="tip-highlight">분리할 수 있는 부분부터 나눠서</span> 배출하세요.',
  '형광등은 <span class="tip-highlight">깨지지 않게</span> 전용 수거함에 배출해야 합니다.'
];

const ANALYZE_ENDPOINT = '/api/analyze';
const REGIONAL_ENDPOINT = '/api/regional';
const GENERIC_ITEM_NAMES = new Set([
  '',
  '인식된 품목',
  '품목',
  '물건',
  '재활용품',
  '알 수 없음',
  '확인 불가',
  '인식 실패',
  '미확인 품목'
]);

let currentLocation = null;
let regionalRequestId = 0;
let favorites = loadFavorites();

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem('recycleFavorites') || '[]');
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved.filter((key) => Object.hasOwn(RECYCLE_DATA, key)))];
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem('recycleFavorites', JSON.stringify(favorites));
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cleanDisplayText(value, fallback = '') {
  const forbidden = /(?:^|\b)(role|topic|reasoning|thought|analysis|chain[ -]?of[ -]?thought|system prompt|internal|추론|사고 과정|역할\s*:|주제\s*:|검토 과정)/i;
  const cleaned = String(value ?? '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !forbidden.test(line))
    .map((line) => line.replace(/^[-*•#\d.)\s]+/, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || fallback;
}

function isGenericItemName(value) {
  const text = cleanDisplayText(value);
  if (GENERIC_ITEM_NAMES.has(text)) return true;
  const compact = text.replace(/[\s:：()[\]{}<>]/g, '').toLowerCase();
  return ['인식된품목', '알수없음', '확인불가', '미확인품목', 'unknown', 'item', 'object'].includes(compact);
}

function updateGreeting() {
  const hour = new Date().getHours();

  let greeting;
  let emoji;

  if (hour < 6) {
    greeting = '늦은 새벽이에요!';
    emoji = '🌙';
  } else if (hour < 12) {
    greeting = '좋은 아침이에요!';
    emoji = '☀️';
  } else if (hour < 18) {
    greeting = '즐거운 오후예요!';
    emoji = '🌤️';
  } else {
    greeting = '고생 많으셨어요!';
    emoji = '🌙';
  }

  document.getElementById('greetingText').textContent =
    `${greeting} ${emoji}`;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function setLocationText(text) {
  const locationText = document.getElementById('locationText');
  locationText.textContent = text;
  locationText.classList.remove('loading');
}

function requestLocation() {
  const locationText = document.getElementById('locationText');
  locationText.classList.add('loading');
  locationText.textContent = '찾는 중...';

  if (!navigator.geolocation) {
    setLocationText('위치 정보 불가');
    showToast('이 브라우저에서는 위치 정보를 사용할 수 없어요.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => getDistrictName(coords.latitude, coords.longitude),
    () => {
      currentLocation = { name: '위치 미확인' };
      setLocationText('위치 미확인');
      showToast('위치 권한이 없어 일반 기준으로 안내합니다.');
    },
    { timeout: 7000, maximumAge: 300000, enableHighAccuracy: true }
  );
}

async function getDistrictName(lat, lng) {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('zoom', '14');
    url.searchParams.set('accept-language', 'ko');

    const response = await fetch(url);
    if (!response.ok) throw new Error('위치 이름 조회 실패');
    const data = await response.json();
    const address = data.address || {};
    const city = address.city || address.metropolitan_city || address.province || address.town || address.county || '';
    const district = address.borough || address.city_district || address.suburb || address.village || '';
    const name = `${city} ${district}`.trim() || '현재 위치';

    currentLocation = { lat, lng, name };
    setLocationText(name);
  } catch (error) {
    console.warn(error);
    currentLocation = { lat, lng, name: '현재 위치' };
    setLocationText('현재 위치');
  }
}

function setDailyTip() {
  const today = new Date();
  document.getElementById('tipDate').textContent = `${today.getMonth() + 1}/${today.getDate()}`;
  document.getElementById('dailyTip').innerHTML = DAILY_TIPS[today.getDate() % DAILY_TIPS.length];
}

function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = '';

  Object.entries(RECYCLE_DATA).forEach(([key, data]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `category-item${favorites.includes(key) ? ' starred' : ''}`;
    button.dataset.category = key;
    button.innerHTML = `<span class="cat-icon">${data.icon}</span><span class="cat-label">${escapeHtml(data.name)}</span>`;
    button.addEventListener('click', () => openDetail(key));
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      toggleFavorite(key);
    });
    grid.appendChild(button);
  });
}

function toggleFavorite(key) {
  const data = RECYCLE_DATA[key];
  if (!data) return;

  if (favorites.includes(key)) {
    favorites = favorites.filter((favorite) => favorite !== key);
    showToast(`${data.name} 즐겨찾기를 해제했어요.`);
  } else {
    favorites.push(key);
    showToast(`${data.name}을(를) 즐겨찾기에 추가했어요. ⭐`);
  }

  saveFavorites();
  renderCategories();
}

function openModal(title, content, hideStaticClose = false) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modalCloseBtn').hidden = hideStaticClose;
  document.getElementById('detailModal').classList.add('open');
}

function closeModal() {
  regionalRequestId += 1;
  document.getElementById('detailModal').classList.remove('open');
  document.getElementById('modalCloseBtn').hidden = false;
  renderCategories();
}

function renderRegionalGuide(regional) {
  const standard = cleanDisplayText(regional?.standard, '일반적인 분리배출 기준으로 안내합니다.');
  const place = cleanDisplayText(regional?.place, '공동주택 분리배출 장소 또는 가까운 행정복지센터에 확인하세요.');
  const specialRule = cleanDisplayText(regional?.specialRule, '구·군에 따라 기준이 달라 일반적인 기준으로 안내합니다.');
  const tip = cleanDisplayText(regional?.tip, '포장재와 내용물은 재질별로 분리하세요.');

  return `
    <dl class="regional-guide">
      <div><dt>기준</dt><dd>${escapeHtml(standard)}</dd></div>
      <div><dt>배출 장소</dt><dd>${escapeHtml(place)}</dd></div>
      <div><dt>특별 규정</dt><dd>${escapeHtml(specialRule)}</dd></div>
      <div><dt>참고</dt><dd>${escapeHtml(tip)}</dd></div>
    </dl>
  `;
}

async function openDetail(key) {
  const data = RECYCLE_DATA[key];
  if (!data) return;

  const locationName = currentLocation?.name || '현재 위치';
  const requestId = ++regionalRequestId;
  const favoriteText = favorites.includes(key) ? '⭐ 즐겨찾기 해제' : '⭐ 즐겨찾기에 추가';
  const favoriteClass = favorites.includes(key) ? ' favorite-active' : '';

  const html = `
    <p>${escapeHtml(data.guide)}</p>
    <div class="category-detail-card">
      <h4>✅ 올바른 배출 방법</h4>
      <ul class="detail-list">${data.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}</ul>
    </div>
    <div class="category-detail-card location-detail-card">
      <h4>📍 ${escapeHtml(locationName)} 지역 기준</h4>
      <div id="regionalDetail">
        <div class="inline-loading"><span class="mini-spinner"></span>지역별 세부 정보를 확인하고 있어요.</div>
      </div>
    </div>
    <button class="close-btn favorite-toggle-btn${favoriteClass}" data-action="toggle-favorite-and-close" data-category="${key}">${favoriteText}</button>
  `;

  openModal(`${data.icon} ${data.name} 분리배출 방법`, html);

  try {
    const response = await fetch(REGIONAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName: data.name, location: locationName })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '지역 정보 조회 실패');
    if (requestId !== regionalRequestId) return;

    const container = document.getElementById('regionalDetail');
    if (container) container.innerHTML = renderRegionalGuide(result);
  } catch (error) {
    console.warn('지역별 정보 조회 실패:', error);
    if (requestId !== regionalRequestId) return;
    const container = document.getElementById('regionalDetail');
    if (container) {
      container.innerHTML = renderRegionalGuide({
        standard: '일반적인 분리배출 기준으로 안내합니다.',
        place: '아파트 공용 분리배출 장소 또는 가까운 행정복지센터에 확인 후 배출하세요.',
        specialRule: '구·군과 주거 형태에 따라 수거 요일과 장소가 다를 수 있습니다.',
        tip: '배출 전 포장재와 내용물을 재질별로 분리하세요.'
      });
    }
  }
}

function openCamera() {
  document.getElementById('cameraInput').click();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

async function optimizeImage(file) {
  const fallback = async () => {
    const dataUrl = await fileToDataUrl(file);
    const base64 = dataUrl.split(',')[1];
    if (!base64 || base64.length > 9_000_000) {
      throw new Error('사진 용량이 너무 큽니다. 카메라 해상도를 낮추거나 사진을 잘라 다시 시도해 주세요.');
    }
    return {
      dataUrl,
      mimeType: file.type || 'image/jpeg',
      base64
    };
  };

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const maxDimension = 2200;
    const initialScale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));
    let quality = 0.93;
    let dataUrl = '';

    // 서버리스 환경에서도 안정적으로 전송되도록 품질과 크기를 단계적으로 조절합니다.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('이미지 처리 기능을 사용할 수 없습니다.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      if (base64 && base64.length <= 3_600_000) {
        bitmap.close();
        return { dataUrl, mimeType: 'image/jpeg', base64 };
      }

      quality = Math.max(0.78, quality - 0.04);
      width = Math.max(1, Math.round(width * 0.88));
      height = Math.max(1, Math.round(height * 0.88));
    }

    bitmap.close();
    const base64 = dataUrl.split(',')[1];
    if (!base64 || base64.length > 9_000_000) {
      throw new Error('사진 용량을 줄이지 못했습니다. 사진을 잘라 다시 시도해 주세요.');
    }
    return { dataUrl, mimeType: 'image/jpeg', base64 };
  } catch (error) {
    console.warn('이미지 최적화 생략:', error);
    return fallback();
  }
}

async function handlePhoto(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  const locationName = currentLocation?.name || '현재 위치';
  openModal(
    '📸 AI 분석 결과',
    `<div class="loading-spinner">
      <div class="spinner"></div>
      <div class="loading-text">사진의 물체와 글자를 함께 분석하고 있어요.</div>
      <div class="loading-text loading-subtext">${escapeHtml(locationName)} 기준으로 확인 중</div>
    </div>`,
    true
  );

  try {
    const image = await optimizeImage(file);
    const response = await fetch(ANALYZE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: image.base64,
        mimeType: image.mimeType,
        location: locationName
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '이미지 분석에 실패했습니다.');
    showAnalysisResult(result, image.dataUrl);
  } catch (error) {
    console.error('AI 분석 오류:', error);
    showFallbackResult(error.message);
  }
}

function mapCategoryToKey(categoryName) {
  const category = cleanDisplayText(categoryName);
  const categoryMap = {
    플라스틱: 'plastic',
    종이류: 'paper',
    유리병: 'glass',
    '캔·고철': 'can',
    비닐: 'vinyl',
    스티로폼: 'styrofoam',
    음식물: 'food',
    '전지·전자제품': 'battery',
    형광등: 'battery'
  };
  return categoryMap[category] || null;
}

function renderOrderedList(items, fallback) {
  const source = Array.isArray(items) ? items : [];
  const cleaned = source.map((item) => cleanDisplayText(item)).filter(Boolean);
  const finalItems = cleaned.length ? cleaned : [fallback];
  return `<ol class="result-list">${finalItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
}

function showRecognitionFailure(result, imageDataUrl) {
  const alternatives = Array.isArray(result?.alternatives)
    ? result.alternatives.map((item) => cleanDisplayText(item)).filter((item) => item && !isGenericItemName(item))
    : [];

  const alternativeHtml = alternatives.length
    ? `<div class="result-section"><h4>🔎 가능한 후보</h4><p>${alternatives.map(escapeHtml).join(', ')}</p></div>`
    : '';

  const html = `
    <img class="analyzed-photo" src="${imageDataUrl}" alt="분석한 사진">
    <div class="result-section recognition-failed">
      <h4>⚠️ 인식 실패</h4>
      <p>사진에서 품목을 정확하게 구분하지 못했어요.</p>
    </div>
    ${alternativeHtml}
    <div class="capture-guide">
      <strong>다시 촬영할 때</strong>
      <ul>
        <li>품목 한 개가 화면 중앙에 크게 보이게 촬영하세요.</li>
        <li>제품명, 재질 표시 또는 단자가 보이도록 밝게 촬영하세요.</li>
        <li>손이나 다른 물건이 품목을 가리지 않게 해주세요.</li>
      </ul>
    </div>
    <div class="modal-button-row">
      <button class="close-btn secondary-action" data-action="close-modal">닫기</button>
      <button class="close-btn" data-action="retake-photo">다시 촬영</button>
    </div>
  `;
  openModal('📸 AI 분석 결과', html, true);
}

function showAnalysisResult(result, imageDataUrl) {
  const itemName = cleanDisplayText(result?.itemName, '인식 실패');
  const confidence = Math.max(0, Math.min(1, Number(result?.confidence) || 0));
  const recognitionSuccess = Boolean(result?.recognitionSuccess)
    && !isGenericItemName(itemName)
    && confidence >= 0.45;

  if (!recognitionSuccess) {
    showRecognitionFailure(result, imageDataUrl);
    return;
  }

  const category = cleanDisplayText(result?.category, '분류 정보 없음');
  const recyclable = ['가능', '불가능', '확인 필요'].includes(result?.recyclable)
    ? result.recyclable
    : '확인 필요';
  const categoryKey = mapCategoryToKey(category);
  const isFavorite = categoryKey ? favorites.includes(categoryKey) : false;
  const confidencePercent = Math.round(confidence * 100);
  const confidenceClass = confidence < 0.65 ? ' low' : '';

  let statusClass = 'unknown-status';
  let statusIcon = '🟡';
  if (recyclable === '가능') {
    statusClass = 'recyclable';
    statusIcon = '✅';
  } else if (recyclable === '불가능') {
    statusClass = 'not-recyclable';
    statusIcon = '❌';
  }

  let html = `
    <img class="analyzed-photo" src="${imageDataUrl}" alt="분석한 사진">
    <div class="result-section">
      <div class="result-heading-row">
        <h4>🔍 인식된 품목</h4>
        <span class="confidence-badge${confidenceClass}">확신도 ${confidencePercent}%</span>
      </div>
      <p class="result-item-name">${escapeHtml(itemName)}</p>
    </div>
    <div class="result-section"><h4>📦 재활용 분류</h4><p>${escapeHtml(category)}</p></div>
    <div class="result-section ${statusClass}"><h4>♻️ 재활용 가능 여부</h4><p class="result-status-text">${statusIcon} ${escapeHtml(recyclable)}</p></div>
    <div class="result-section"><h4>🗑️ 올바른 배출 방법</h4>${renderOrderedList(result?.disposalSteps, '지역별 배출 기준을 확인해 주세요.')}</div>
    <div class="result-section caution"><h4>⚠️ 주의사항</h4>${renderOrderedList(result?.cautions, '확실하지 않으면 가까운 행정복지센터에 문의하세요.')}</div>
    <div class="result-section location"><h4>📍 지역별 안내</h4>${renderRegionalGuide(result?.regional)}</div>
  `;

  if (confidence < 0.65) {
    html += '<p class="confidence-warning">사진이 다소 모호해 결과가 정확하지 않을 수 있어요. 품목을 가까이에서 다시 촬영하면 더 정확해집니다.</p>';
  }

  html += '<div class="modal-button-stack">';
  if (categoryKey) {
    html += `<button class="close-btn favorite-toggle-btn${isFavorite ? ' favorite-active' : ''}" data-action="toggle-search-favorite" data-category="${categoryKey}">${isFavorite ? '⭐ 즐겨찾기 해제' : '⭐ 즐겨찾기'}</button>`;
  }
  html += '<button class="close-btn" data-action="close-modal">확인했어요</button></div>';

  openModal('📸 AI 분석 결과', html, true);
}

function showFallbackResult(errorMessage = '') {
  const html = `
    <div class="result-section recognition-failed">
      <h4>분석할 수 없어요</h4>
      <p>${escapeHtml(cleanDisplayText(errorMessage, 'AI 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'))}</p>
    </div>
    <p class="muted-text">아래 품목에서 직접 선택할 수 있어요.</p>
    <div class="vertical-list">
      ${Object.entries(RECYCLE_DATA).map(([key, data]) => `
        <button class="category-detail-card clickable text-button" data-action="open-detail" data-category="${key}">
          <strong>${data.icon} ${escapeHtml(data.name)}</strong>
          <span>${escapeHtml(data.guide.slice(0, 55))}...</span>
        </button>`).join('')}
    </div>
    <button class="close-btn modal-action-button secondary-close-btn" data-action="close-modal">닫기</button>
  `;
  openModal('📸 AI 분석 결과', html, true);
}

function showFavorites() {
  if (favorites.length === 0) {
    const html = `
      <div class="empty-state">
        <div class="empty-state-icon">⭐</div>
        <h4>즐겨찾기한 품목이 없어요</h4>
        <p>자주 확인하는 품목을 길게 누르거나, 상세 화면에서 즐겨찾기에 추가해 보세요.</p>
        <button class="close-btn" data-action="close-modal">품목 둘러보기</button>
      </div>
    `;
    openModal('⭐ 즐겨찾기', html, true);
    return;
  }

  const validFavorites = favorites.filter((key) => RECYCLE_DATA[key]);
  const html = `
    <div class="vertical-list">
      ${validFavorites.map((key) => {
        const data = RECYCLE_DATA[key];
        return `<button class="category-detail-card clickable text-button" data-action="open-detail" data-category="${key}">
          <strong>${data.icon} ${escapeHtml(data.name)}</strong>
          <span>${escapeHtml(data.guide.slice(0, 55))}...</span>
        </button>`;
      }).join('')}
    </div>
    <button class="close-btn modal-action-button" data-action="close-modal">닫기</button>
  `;
  openModal('⭐ 즐겨찾기한 품목', html, true);
}

function bindEvents() {
  document.getElementById('locationBtn').addEventListener('click', requestLocation);
  document.getElementById('cameraBtn').addEventListener('click', openCamera);
  document.getElementById('favoriteBtn').addEventListener('click', showFavorites);
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('cameraInput').addEventListener('change', handlePhoto);

  document.querySelectorAll('.info-list [data-category]').forEach((item) => {
    item.addEventListener('click', () => openDetail(item.dataset.category));
  });

  document.getElementById('modalContent').addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const category = target.dataset.category;

    if (action === 'close-modal') {
      closeModal();
    } else if (action === 'retake-photo') {
      closeModal();
      openCamera();
    } else if (action === 'open-detail' && category) {
      openDetail(category);
    } else if (action === 'toggle-favorite-and-close' && category) {
      toggleFavorite(category);
      closeModal();
    } else if (action === 'toggle-search-favorite' && category) {
      toggleFavorite(category);
      const isFavorite = favorites.includes(category);
      target.classList.toggle('favorite-active', isFavorite);
      target.textContent = isFavorite ? '⭐ 즐겨찾기 해제' : '⭐ 즐겨찾기';
    }
  });

  document.getElementById('detailModal').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeModal();
  });
}

function initialize() {
  updateGreeting();
  setDailyTip();
  renderCategories();
  bindEvents();
  requestLocation();
}

initialize();
