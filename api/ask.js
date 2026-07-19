'use strict';

const { answerRecyclingQuestion } = require('../lib/gemma');

function normalizeLocation(value) {
  if (value && typeof value === 'object') {
    value = value.name;
  }

  if (typeof value !== 'string') return '위치 정보 없음';

  const text = value.trim();
  if (!text || text === '[object Object]' || text === '찾는 중...') {
    return '위치 정보 없음';
  }

  return text.slice(0, 80);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'POST 요청만 지원합니다.' });
    return;
  }

  try {
    const question = typeof req.body?.question === 'string'
      ? req.body.question.trim()
      : '';
    const location = normalizeLocation(req.body?.location);

    if (!question) {
      res.status(400).json({ error: '질문을 입력해 주세요.' });
      return;
    }

    const result = await answerRecyclingQuestion({ question, location });
    res.status(200).json({ ...result, location });
  } catch (error) {
    console.error('질문 API 오류:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode && error.statusCode < 500
        ? error.message
        : '서버에서 질문을 처리하지 못했습니다.'
    });
  }
};
