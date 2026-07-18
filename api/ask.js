'use strict';

const { answerRecyclingQuestion } = require('../lib/gemma');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'POST 요청만 지원합니다.' });
    return;
  }

  try {
    const result = await answerRecyclingQuestion({
      question: req.body?.question,
      location: req.body?.location
    });
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode && error.statusCode < 500
        ? error.message
        : '서버에서 질문을 처리하지 못했습니다.'
    });
  }
};
