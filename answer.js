'use strict';

const ASK_ENDPOINT = '/api/ask';
const STORAGE_KEYS = {
  question: 'recycleQuestion',
  location: 'recycleLocation',
  legacyLocation: 'recycleQuestionLocation'
};

function getStoredQuestion() {
  return (sessionStorage.getItem(STORAGE_KEYS.question) || '').trim();
}

function normalizeStoredLocation(value) {
  if (typeof value !== 'string') return '위치 정보 없음';

  let text = value.trim();
  if (!text || text === '[object Object]') return '위치 정보 없음';

  // 이전 버전에서 위치 객체를 JSON 문자열로 저장한 경우도 처리합니다.
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      text = typeof parsed?.name === 'string' ? parsed.name.trim() : '';
    } catch {
      text = '';
    }
  }

  const invalidValues = new Set([
    '',
    '찾는 중...',
    '위치 정보 불가',
    '위치 미확인',
    '[object Object]'
  ]);

  return invalidValues.has(text) ? '위치 정보 없음' : text.slice(0, 80);
}

function getStoredLocation() {
  const currentValue = sessionStorage.getItem(STORAGE_KEYS.location);
  const legacyValue = sessionStorage.getItem(STORAGE_KEYS.legacyLocation);
  return normalizeStoredLocation(currentValue || legacyValue || '');
}

function goHome() {
  window.location.href = 'index.html';
}

function setLoading(isLoading) {
  const loading = document.getElementById('answerLoading');
  if (loading) loading.hidden = !isLoading;
}

function resetMessages() {
  const result = document.getElementById('answerResult');
  const error = document.getElementById('answerError');
  if (result) {
    result.hidden = true;
    result.textContent = '';
  }
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
}

function showResult(answer, relevant) {
  const result = document.getElementById('answerResult');
  if (!result) return;

  result.hidden = false;
  result.classList.toggle('out-of-scope', !relevant);
  result.textContent = relevant ? String(answer || '').trim() : '잘 모르겠습니다.';
}

function showError(message) {
  const errorBox = document.getElementById('answerError');
  if (!errorBox) return;

  errorBox.hidden = false;
  errorBox.textContent = message;
}

async function requestAnswer(question, location) {
  const response = await fetch(ASK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, location })
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;

  try {
    data = contentType.includes('application/json')
      ? await response.json()
      : { error: await response.text() };
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || '질문에 답변하지 못했습니다.');
  }

  return data || {};
}

async function initializeAnswerPage() {
  const question = getStoredQuestion();
  const location = getStoredLocation();

  resetMessages();
  document.getElementById('locationLabel').textContent =
    location === '위치 정보 없음'
      ? '일반적인 기준'
      : `${location} 기준`;

  if (!question) {
    document.getElementById('questionText').textContent = '입력된 질문이 없습니다.';
    setLoading(false);
    showError('홈 화면에서 재활용 또는 쓰레기 관련 질문을 입력해 주세요.');
    return;
  }

  document.getElementById('questionText').textContent = question;
  setLoading(true);

  try {
    const result = await requestAnswer(question, location);
    setLoading(false);
    showResult(result.answer, result.relevant === true);
  } catch (error) {
    setLoading(false);
    showError(error instanceof Error
      ? error.message
      : '답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

document.getElementById('backBtn')?.addEventListener('click', goHome);
document.getElementById('homeBtn')?.addEventListener('click', goHome);
document.getElementById('askAgainBtn')?.addEventListener('click', goHome);

document.addEventListener('DOMContentLoaded', initializeAnswerPage);
