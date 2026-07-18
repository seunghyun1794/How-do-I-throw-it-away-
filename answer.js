'use strict';

const STORAGE_KEYS = {
  question: 'recycleQuestion',
  location: 'recycleLocation'
};

document.addEventListener('DOMContentLoaded', initializeAnswerPage);

/**
 * 답변 페이지 초기화
 */
function initializeAnswerPage() {
  const elements = getPageElements();

  if (!elements) {
    console.error('답변 페이지에 필요한 HTML 요소가 없습니다.');
    return;
  }

  loadAnswer(elements);
}

/**
 * 페이지에서 사용하는 HTML 요소 가져오기
 */
function getPageElements() {
  const questionElement = document.getElementById('questionText');
  const locationElement = document.getElementById('locationText');
  const loadingElement = document.getElementById('loadingSection');
  const answerElement = document.getElementById('answerSection');
  const answerTextElement = document.getElementById('answerText');
  const errorElement = document.getElementById('errorSection');
  const errorTextElement = document.getElementById('errorText');
  const retryButton = document.getElementById('retryButton');

  const requiredElements = [
    questionElement,
    loadingElement,
    answerElement,
    answerTextElement
  ];

  if (requiredElements.some((element) => !element)) {
    return null;
  }

  return {
    questionElement,
    locationElement,
    loadingElement,
    answerElement,
    answerTextElement,
    errorElement,
    errorTextElement,
    retryButton
  };
}

/**
 * 저장된 질문을 불러오고 서버에 답변 요청
 */
async function loadAnswer(elements) {
  const question = sessionStorage
    .getItem(STORAGE_KEYS.question)
    ?.trim();

  const location =
    sessionStorage.getItem(STORAGE_KEYS.location)?.trim() ||
    '위치 정보 없음';

  if (!question) {
    showError(elements, '질문 정보가 없습니다.');
    return;
  }

  elements.questionElement.textContent = question;

  if (elements.locationElement) {
    elements.locationElement.textContent = location;
  }

  showLoading(elements);

  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question,
        location
      })
    });

    const data = await readResponseData(response);

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        '서버에서 질문을 처리하지 못했습니다.'
      );
    }

    const answer = normalizeAnswer(data.answer);

    showAnswer(elements, answer);
  } catch (error) {
    console.error('질문 처리 오류:', error);

    showError(
      elements,
      error instanceof Error
        ? error.message
        : '서버에서 질문을 처리하지 못했습니다.'
    );
  }
}

/**
 * 서버 응답을 안전하게 읽기
 */
async function readResponseData(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();

  return {
    error: text || '서버에서 올바르지 않은 응답을 받았습니다.'
  };
}

/**
 * 답변 내용 정리
 */
function normalizeAnswer(answer) {
  if (typeof answer !== 'string') {
    return '잘 모르겠습니다.';
  }

  const cleanedAnswer = answer
    .replace(/^(role|topic|reasoning|thought)\s*[:：].*$/gim, '')
    .replace(/^(역할|주제|추론|사고\s*과정)\s*[:：].*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleanedAnswer || '잘 모르겠습니다.';
}

/**
 * 로딩 화면 표시
 */
function showLoading(elements) {
  elements.loadingElement.hidden = false;
  elements.answerElement.hidden = true;

  if (elements.errorElement) {
    elements.errorElement.hidden = true;
  }

  if (elements.retryButton) {
    elements.retryButton.disabled = true;
  }
}

/**
 * 답변 화면 표시
 */
function showAnswer(elements, answer) {
  // 답변 완료 후 로딩 문구 숨기기
  elements.loadingElement.hidden = true;

  if (elements.errorElement) {
    elements.errorElement.hidden = true;
  }

  elements.answerTextElement.textContent = answer;
  elements.answerElement.hidden = false;

  if (elements.retryButton) {
    elements.retryButton.disabled = false;
  }
}

/**
 * 오류 화면 표시
 */
function showError(elements, message) {
  // 오류가 발생해도 로딩 문구는 반드시 숨김
  elements.loadingElement.hidden = true;
  elements.answerElement.hidden = true;

  if (elements.errorElement && elements.errorTextElement) {
    elements.errorTextElement.textContent = message;
    elements.errorElement.hidden = false;
  } else {
    elements.answerTextElement.textContent = message;
    elements.answerElement.hidden = false;
  }

  if (elements.retryButton) {
    elements.retryButton.disabled = false;
  }
}

/**
 * 같은 질문 다시 요청
 */
function retryQuestion() {
  const elements = getPageElements();

  if (!elements) {
    return;
  }

  loadAnswer(elements);
}

/**
 * 홈 화면으로 이동
 */
function goHome() {
  window.location.href = './index.html';
}

// HTML의 onclick에서도 호출할 수 있도록 등록
window.retryQuestion = retryQuestion;
window.goHome = goHome;