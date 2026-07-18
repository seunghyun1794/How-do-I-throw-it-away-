'use strict';

const { getRegionalGuide } = require('../lib/gemma');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = await getRegionalGuide({
      itemName: body.itemName,
      location: body.location
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (error) {
    console.error('지역별 정보 조회 오류:', error);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode && error.statusCode < 500
        ? error.message
        : '지역별 정보를 불러오는 중 오류가 발생했습니다.'
    });
  }
};
