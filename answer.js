'use strict';

const ASK_ENDPOINT = '/api/ask';

function getStoredQuestion() {
  return (sessionStorage.getItem('recycleQuestion') || '').trim();
}

function getStoredLocation() {
  return (sessionStorage.getItem('recycleQuestionLocation') || '현재 위치').trim();
}

function goHome() {
  window.location.href = 'index.html';
}

function setLoading(isLoading) {
  document.getElementById('answerLoading').hidden = !isLoading;
}

function showResult(answer, relevant) {
  const result = document.getElementById('answerResult');
  result.hidden = false;
  result.classList.toggle('out-of-scope', !relevant);
  result.textContent = relevant ? answer : '잘 모르겠습니다.';
}

function showError(message) {
  const errorBox = document.getElementById('answerError');
  errorBox.hidden = false;
  errorBox.textContent = message;
}

async function requestAnswer(question, location) {
  const response = await fetch(ASK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, location })
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || '질문에 답변하지 못했습니다.');
  }

  return data;
}

async function initializeAnswerPage() {
  const question = getStoredQuestion();
  const location = getStoredLocation();

  document.getElementById('locationLabel').textContent = `${location} 기준`;

  if (!question) {
    document.getElementById('questionText').textContent = '입력된 질문이 없습니다.';
    setLoading(false);
    showError('홈 화면에서 재활용 또는 쓰레기 관련 질문을 입력해 주세요.');
    return;
  }

  document.getElementById('questionText').textContent = question;

  try {
    const result = await requestAnswer(question, location);
    setLoading(false);
    showResult(result.answer, result.relevant === true);
  } catch (error) {
    setLoading(false);
    showError(error.message || '답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

document.getElementById('backBtn').addEventListener('click', goHome);
document.getElementById('homeBtn').addEventListener('click', goHome);
document.getElementById('askAgainBtn').addEventListener('click', () => {
  goHome();
});

initializeAnswerPage();
