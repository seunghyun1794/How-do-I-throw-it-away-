'use strict';

const { analyzeImage } = require('../lib/gemma');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = await analyzeImage({
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      location: body.location
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (error) {
    console.error('이미지 분석 오류:', error);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode && error.statusCode < 500
        ? error.message
        : '이미지를 분석하는 중 오류가 발생했습니다.'
    });
  }
};
