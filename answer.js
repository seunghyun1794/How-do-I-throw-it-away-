'use strict';

const ASK_ENDPOINT = '/api/ask';
const STORAGE_KEYS = {
  question: 'recycleQuestion',
  location: 'recycleLocation',
  legacyLocation: 'recycleQuestionLocation'
};

function firstElement(...ids) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) return element;
  }
  return null;
}

function normalizeLocation(value) {
  if (typeof value !== 'string') return '위치 정보 없음';
  let text = value.trim();

  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      text = typeof parsed?.name === 'string' ? parsed.name.trim() : '';
    } catch {
      text = '';
    }
  }

  const invalid = new Set([
    '', '[object Object]', '찾는 중...', '현재 위치',
    '위치 정보 불가', '위치 미확인', '위치 정보 없음'
  ]);
  return invalid.has(text) ? '위치 정보 없음' : text.slice(0, 80);
}

function readPageData() {
  const params = new URLSearchParams(window.location.search);
  const question = (
    sessionStorage.getItem(STORAGE_KEYS.question) ||
    params.get('q') ||
    ''
  ).trim();

  const location = normalizeLocation(
    sessionStorage.getItem(STORAGE_KEYS.location) ||
    sessionStorage.getItem(STORAGE_KEYS.legacyLocation) ||
    localStorage.getItem('lastRecycleLocation') ||
    params.get('location') ||
    ''
  );

  return { question, location };
}

function getElements() {
  return {
    question: firstElement('questionText'),
    location: firstElement('locationLabel', 'locationText'),
    loading: firstElement('answerLoading', 'loadingSection'),
    resultBox: firstElement('answerResult', 'answerSection'),
    resultText: firstElement('answerText', 'answerResult'),
    errorBox: firstElement('answerError', 'errorSection'),
    errorText: firstElement('errorText', 'answerError'),
    backButton: firstElement('backBtn'),
    homeButton: firstElement('homeBtn'),
    askAgainButton: firstElement('askAgainBtn'),
    retryButton: firstElement('retryButton')
  };
}

function goHome() {
  window.location.href = './index.html';
}

function setHidden(element, hidden) {
  if (element) element.hidden = hidden;
}

function showLoading(elements) {
  setHidden(elements.loading, false);
  setHidden(elements.resultBox, true);
  setHidden(elements.errorBox, true);
}

function showAnswer(elements, answer, relevant = true) {
  setHidden(elements.loading, true);
  setHidden(elements.errorBox, true);
  setHidden(elements.resultBox, false);

  const text = relevant
    ? String(answer || '').trim() || '잘 모르겠습니다.'
    : '잘 모르겠습니다.';

  if (elements.resultText) elements.resultText.textContent = text;
  elements.resultBox?.classList.toggle('out-of-scope', !relevant);
}

function showError(elements, message) {
  setHidden(elements.loading, true);
  setHidden(elements.resultBox, true);
  setHidden(elements.errorBox, false);

  if (elements.errorText) {
    elements.errorText.textContent = message;
  } else if (elements.resultText) {
    setHidden(elements.resultBox, false);
    elements.resultText.textContent = message;
  }
}

async function readResponse(response) {
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) return response.json();
  return { error: (await response.text()).trim() };
}

async function requestAnswer(question, location) {
  const response = await fetch(ASK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, location })
  });

  const data = await readResponse(response);
  if (!response.ok) {
    throw new Error(data.error || data.message || '서버에서 질문을 처리하지 못했습니다.');
  }
  return data;
}

async function loadAnswer(elements) {
  const { question, location } = readPageData();

  if (!elements.question || !elements.loading || !elements.resultBox) {
    console.error('answer.html과 answer.js의 요소 ID가 일치하지 않습니다.');
    return;
  }

  elements.question.textContent = question || '입력된 질문이 없습니다.';
  if (elements.location) {
    elements.location.textContent = location === '위치 정보 없음'
      ? '일반적인 기준'
      : `${location} 기준`;
  }

  if (!question) {
    showError(elements, '홈 화면에서 질문을 다시 입력해 주세요.');
    return;
  }

  showLoading(elements);

  try {
    const data = await requestAnswer(question, location);
    showAnswer(elements, data.answer, data.relevant !== false);
  } catch (error) {
    console.error('질문 처리 오류:', error);
    showError(
      elements,
      error instanceof Error ? error.message : '답변을 불러오지 못했습니다.'
    );
  }
}

function initialize() {
  const elements = getElements();
  elements.backButton?.addEventListener('click', goHome);
  elements.homeButton?.addEventListener('click', goHome);
  elements.askAgainButton?.addEventListener('click', goHome);
  elements.retryButton?.addEventListener('click', () => loadAnswer(elements));
  loadAnswer(elements);
}

window.goHome = goHome;
window.retryQuestion = () => loadAnswer(getElements());

document.addEventListener('DOMContentLoaded', initialize);
