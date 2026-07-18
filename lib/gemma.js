'use strict';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemma-4-26b-a4b-it';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]);

const CATEGORIES = [
  '플라스틱',
  '종이류',
  '유리병',
  '캔·고철',
  '비닐',
  '스티로폼',
  '음식물',
  '일반쓰레기',
  '전지·전자제품',
  '의류',
  '형광등',
  '폐식용유',
  '대형폐기물'
];

const ANALYSIS_PARAMETERS = {
  type: 'object',
  properties: {
    recognitionSuccess: {
      type: 'boolean',
      description: '사진에서 핵심 품목을 구체적으로 식별했으면 true, 식별하지 못했으면 false'
    },
    confidence: {
      type: 'number',
      description: '품목 식별 확신도. 0부터 1 사이의 수'
    },
    itemName: {
      type: 'string',
      description: '구체적인 한국어 품목명. 실패하면 인식 실패'
    },
    category: {
      type: 'string',
      enum: CATEGORIES
    },
    recyclable: {
      type: 'string',
      enum: ['가능', '불가능', '확인 필요']
    },
    disposalSteps: {
      type: 'array',
      items: { type: 'string' },
      description: '배출 전 준비와 실제 배출 방법을 순서대로 2~3개 작성'
    },
    cautions: {
      type: 'array',
      items: { type: 'string' },
      description: '주의사항을 1~2개 작성'
    },
    regional: {
      type: 'object',
      properties: {
        standard: { type: 'string', description: '해당 지역의 일반적인 분리배출 기준' },
        place: { type: 'string', description: '실제 배출 장소' },
        specialRule: { type: 'string', description: '지역 추가 규칙 또는 일반적인 기준으로 안내 문구' },
        tip: { type: 'string', description: '헷갈리기 쉬운 사례나 한 줄 팁' }
      },
      required: ['standard', 'place', 'specialRule', 'tip']
    },
    alternatives: {
      type: 'array',
      items: { type: 'string' },
      description: '사진이 모호할 때 가능한 다른 품목 후보. 확실하면 빈 배열'
    }
  },
  required: [
    'recognitionSuccess',
    'confidence',
    'itemName',
    'category',
    'recyclable',
    'disposalSteps',
    'cautions',
    'regional',
    'alternatives'
  ]
};

const REGIONAL_PARAMETERS = {
  type: 'object',
  properties: {
    standard: { type: 'string' },
    place: { type: 'string' },
    specialRule: { type: 'string' },
    tip: { type: 'string' }
  },
  required: ['standard', 'place', 'specialRule', 'tip']
};


const QUESTION_PARAMETERS = {
  type: 'object',
  properties: {
    relevant: {
      type: 'boolean',
      description: '질문이 재활용, 분리배출, 쓰레기 처리, 폐기물 감량, 재사용과 직접 관련되면 true'
    },
    answer: {
      type: 'string',
      description: '관련 질문이면 실용적인 한국어 답변, 관련이 없으면 반드시 잘 모르겠습니다.'
    }
  },
  required: ['relevant', 'answer']
};

const ANALYSIS_FUNCTION = {
  name: 'submit_recycling_analysis',
  description: '사진 속 품목의 인식 결과와 분리배출 안내를 구조화된 값으로 제출합니다.',
  parameters: ANALYSIS_PARAMETERS
};

const REGIONAL_FUNCTION = {
  name: 'submit_regional_guide',
  description: '지역별 분리배출 안내 네 항목을 구조화된 값으로 제출합니다.',
  parameters: REGIONAL_PARAMETERS
};

const QUESTION_FUNCTION = {
  name: 'submit_recycling_answer',
  description: '질문의 재활용 관련 여부와 최종 답변만 구조화해 제출합니다.',
  parameters: QUESTION_PARAMETERS
};

const FORBIDDEN_META_LINE = /(?:^|\b)(role|topic|reasoning|thought|analysis|chain[ -]?of[ -]?thought|system prompt|developer prompt|internal|추론|사고 과정|역할\s*:|주제\s*:|검토 과정)/i;
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

function getApiKey() {
  return process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY || '';
}

function getModel() {
  return String(process.env.GEMMA_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function assertApiKey() {
  const key = getApiKey().trim();
  if (!key || key.includes('YOUR_') || key.includes('temp-demo')) {
    const error = new Error('서버에 GEMMA_API_KEY가 설정되지 않았습니다.');
    error.statusCode = 500;
    throw error;
  }
  return key;
}

function cleanText(value, fallback = '') {
  const source = String(value ?? '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

  const cleaned = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !FORBIDDEN_META_LINE.test(line))
    .map((line) => line.replace(/^[-*•#\d.)\s]+/, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || fallback;
}

function cleanList(value, fallback, min = 1, max = 3) {
  const source = Array.isArray(value) ? value : [];
  const result = source
    .map((item) => cleanText(item))
    .filter(Boolean)
    .slice(0, max);

  const defaults = Array.isArray(fallback) ? fallback : [fallback];
  for (const item of defaults) {
    if (result.length >= min) break;
    const cleaned = cleanText(item);
    if (cleaned) result.push(cleaned);
  }

  return result.slice(0, max);
}

function isGenericItemName(value) {
  const cleaned = cleanText(value);
  const normalized = cleaned
    .replace(/[\s:：()[\]{}<>]/g, '')
    .toLowerCase();

  if (GENERIC_ITEM_NAMES.has(cleaned)) return true;
  return [
    '인식된품목',
    '알수없음',
    '확인불가',
    '미확인품목',
    'unknown',
    'item',
    'object'
  ].includes(normalized);
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function normalizeCategory(value) {
  const text = cleanText(value);
  if (CATEGORIES.includes(text)) return text;

  const aliases = [
    ['플라스틱', '플라스틱'],
    ['종이', '종이류'],
    ['유리', '유리병'],
    ['캔', '캔·고철'],
    ['고철', '캔·고철'],
    ['비닐', '비닐'],
    ['스티로폼', '스티로폼'],
    ['음식', '음식물'],
    ['일반', '일반쓰레기'],
    ['전자', '전지·전자제품'],
    ['전지', '전지·전자제품'],
    ['배터리', '전지·전자제품'],
    ['케이블', '전지·전자제품'],
    ['의류', '의류'],
    ['형광등', '형광등'],
    ['폐식용유', '폐식용유'],
    ['대형', '대형폐기물']
  ];

  return aliases.find(([keyword]) => text.includes(keyword))?.[1] || '일반쓰레기';
}

function normalizeRegional(value, location = '현재 위치') {
  const regional = value && typeof value === 'object' ? value : {};
  return {
    standard: cleanText(regional.standard, '일반적인 분리배출 기준으로 안내합니다.'),
    place: cleanText(
      regional.place,
      `${location}의 공동주택 분리배출 장소 또는 가까운 행정복지센터에 확인 후 배출하세요.`
    ),
    specialRule: cleanText(
      regional.specialRule,
      '구·군과 주거 형태에 따라 수거 요일과 장소가 달라 일반적인 기준으로 안내합니다.'
    ),
    tip: cleanText(regional.tip, '포장재와 내용물은 재질별로 분리한 뒤 배출하세요.')
  };
}

function normalizeAnalysis(raw, location = '현재 위치') {
  const confidence = clampConfidence(raw?.confidence);
  const itemName = cleanText(raw?.itemName, '인식 실패');
  const genericName = isGenericItemName(itemName);
  const recognitionSuccess = Boolean(raw?.recognitionSuccess)
    && !genericName
    && confidence >= 0.45;

  return {
    recognitionSuccess,
    confidence,
    itemName: recognitionSuccess ? itemName : '인식 실패',
    category: normalizeCategory(raw?.category),
    recyclable: ['가능', '불가능', '확인 필요'].includes(raw?.recyclable)
      ? raw.recyclable
      : '확인 필요',
    disposalSteps: cleanList(
      raw?.disposalSteps,
      ['사진을 더 밝고 가까이 촬영해 다시 확인하세요.', '품목의 재질 표시와 라벨을 직접 확인하세요.'],
      2,
      3
    ),
    cautions: cleanList(
      raw?.cautions,
      ['지역별 기준이 다를 수 있으므로 확실하지 않으면 행정복지센터에 확인하세요.'],
      1,
      2
    ),
    regional: normalizeRegional(raw?.regional, location),
    alternatives: cleanList(raw?.alternatives, [], 0, 3)
      .filter((name) => !isGenericItemName(name))
  };
}

function parseJsonText(text) {
  const source = String(text || '').trim();
  if (!source) throw new Error('Gemma 응답이 비어 있습니다.');

  const withoutFence = source
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch (firstError) {
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }
    throw firstError;
  }
}

function extractFunctionArgs(data, functionName) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      const functionCall = part?.functionCall;
      if (functionCall?.name === functionName && functionCall.args && typeof functionCall.args === 'object') {
        return functionCall.args;
      }
    }
  }
  return null;
}

function extractVisibleResponseText(data) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  return candidates
    .flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [])
    .filter((part) => part?.thought !== true)
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .filter(Boolean)
    .join('')
    .trim();
}

function makeSystemInstruction() {
  return {
    parts: [{
      text: [
        '당신은 대한민국 분리배출 안내 도우미입니다.',
        '답변은 한국어로만 작성합니다.',
        '내부 추론, 사고 과정, 역할, 주제, 분석 과정, 시스템 문구를 출력하지 않습니다.',
        '확실하지 않은 지역 규정은 단정하지 말고 일반적인 기준으로 안내라고 표시합니다.',
        '반드시 지정된 함수 하나를 호출하여 결과를 제출합니다.'
      ].join(' ')
    }]
  };
}

function makeGenerationConfig() {
  return {
    temperature: 0.1,
    topP: 0.85,
    maxOutputTokens: 1800,
    candidateCount: 1,
    thinkingConfig: {
      thinkingLevel: 'minimal'
    }
  };
}

async function callGemma(body) {
  const apiKey = assertApiKey();
  const model = getModel();
  const url = `${API_URL}/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(body)
  });

  const responseText = await response.text();
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const error = new Error(
      responseData?.error?.message || `Gemma API 오류 (${response.status})`
    );
    error.statusCode = response.status;
    error.apiBody = responseText;
    throw error;
  }

  return responseData;
}

async function requestStructuredContent({ parts, functionDeclaration }) {
  const baseBody = {
    contents: [{ role: 'user', parts }],
    systemInstruction: makeSystemInstruction(),
    tools: [{ functionDeclarations: [functionDeclaration] }],
    generationConfig: makeGenerationConfig()
  };

  const forcedBody = {
    ...baseBody,
    toolConfig: {
      functionCallingConfig: {
        mode: 'ANY',
        allowedFunctionNames: [functionDeclaration.name]
      }
    }
  };

  let responseData;
  try {
    responseData = await callGemma(forcedBody);
  } catch (error) {
    const detail = String(error.apiBody || error.message || '');
    const toolConfigCompatibilityError = error.statusCode === 400
      && /toolConfig|functionCallingConfig|allowedFunctionNames|unknown name|invalid json payload/i.test(detail);

    if (!toolConfigCompatibilityError) throw error;
    responseData = await callGemma(baseBody);
  }

  const functionArgs = extractFunctionArgs(responseData, functionDeclaration.name);
  if (functionArgs) return functionArgs;

  const text = extractVisibleResponseText(responseData);
  return parseJsonText(text);
}

function buildAnalysisPrompt(location, firstResult = null) {
  const retryContext = firstResult
    ? `\n첫 번째 결과의 확신도가 낮았습니다. 다음 결과를 그대로 복사하지 말고 사진을 처음부터 다시 확인하세요: ${JSON.stringify(firstResult)}`
    : '';

  return `사진에서 사용자가 버리려는 핵심 품목을 식별하고 대한민국 분리배출 기준을 안내하세요.

판별 규칙:
1. 화면 중앙과 전경에 실제로 보이는 물체를 우선합니다.
2. 제품 포장에 상품명이나 그림이 선명하면 실제 제품과 포장재를 구분합니다. 제품이 포장 안에 있다고 판단되면 구체적인 제품명을 적고, 포장만 버리는 상황이면 포장재 이름을 적습니다.
3. 글자, 재질 표시, 로고, 단자 모양, 용기 형태, 크기와 구조를 함께 확인합니다.
4. 전선이나 케이블은 플러그와 단자 형태까지 확인해 구체적인 종류를 적습니다.
5. 여러 물체가 있을 때는 사진에서 가장 크고 중심적인 하나를 선택합니다.
6. 구체적으로 식별할 수 없으면 recognitionSuccess는 false, itemName은 "인식 실패"로 작성합니다.
7. itemName에 "인식된 품목", "물건", "재활용품", "품목" 같은 일반 표현을 쓰지 않습니다.
8. confidence는 사진 근거에 맞게 보수적으로 정합니다.
9. 사용자 위치는 "${location}"입니다. 정확한 지자체 규정을 확인할 근거가 없으면 regional.specialRule에 "일반적인 기준으로 안내"를 포함합니다.
10. submit_recycling_analysis 함수를 한 번만 호출하고 다른 글은 출력하지 않습니다.${retryContext}`;
}

async function analyzeOnce({ imageBase64, mimeType, location, firstResult = null }) {
  return requestStructuredContent({
    parts: [
      { text: buildAnalysisPrompt(location, firstResult) },
      { inlineData: { mimeType, data: imageBase64 } }
    ],
    functionDeclaration: ANALYSIS_FUNCTION
  });
}

function getRetryThreshold() {
  const value = Number(process.env.GEMMA_RETRY_THRESHOLD);
  if (!Number.isFinite(value)) return 0.68;
  return Math.max(0.5, Math.min(0.9, value));
}

async function analyzeImage({ imageBase64, mimeType, location = '현재 위치' }) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    const error = new Error('지원하지 않는 이미지 형식입니다. JPEG, PNG, WEBP, HEIC 또는 HEIF를 사용하세요.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    const error = new Error('이미지 데이터가 올바르지 않습니다.');
    error.statusCode = 400;
    throw error;
  }

  // 인라인 이미지 제한과 서버리스 요청 크기를 고려해 과도하게 큰 입력을 차단합니다.
  if (imageBase64.length > 9_000_000) {
    const error = new Error('이미지 용량이 너무 큽니다. 더 작은 사진을 사용하세요.');
    error.statusCode = 413;
    throw error;
  }

  const safeLocation = cleanText(location, '현재 위치').slice(0, 80);
  const firstRaw = await analyzeOnce({ imageBase64, mimeType, location: safeLocation });
  let best = normalizeAnalysis(firstRaw, safeLocation);

  // 확신도가 낮은 사진만 한 번 재분석해 평소 호출 횟수와 응답 시간을 줄입니다.
  if (!best.recognitionSuccess || best.confidence < getRetryThreshold()) {
    try {
      const secondRaw = await analyzeOnce({
        imageBase64,
        mimeType,
        location: safeLocation,
        firstResult: firstRaw
      });
      const second = normalizeAnalysis(secondRaw, safeLocation);

      if (
        (second.recognitionSuccess && !best.recognitionSuccess)
        || second.confidence > best.confidence
      ) {
        best = second;
      }
    } catch (retryError) {
      console.warn('낮은 확신도 재분석 실패:', retryError.message);
    }
  }

  return best;
}

async function getRegionalGuide({ itemName, location = '현재 위치' }) {
  const safeItemName = cleanText(itemName, '해당 품목').slice(0, 80);
  const safeLocation = cleanText(location, '현재 위치').slice(0, 80);

  const prompt = `대한민국의 "${safeLocation}"에서 "${safeItemName}"을 배출하는 방법을 안내하세요.

submit_regional_guide 함수를 한 번만 호출하여 다음 항목을 채우세요.
- standard: 일반적인 분류와 배출 기준
- place: 주민센터, 전용 수거함, 마트, 아파트 공용 장소 등 실제 배출 장소
- specialRule: 구·군별 추가 규칙. 정확한 규칙을 확신하지 못하면 반드시 "일반적인 기준으로 안내"라고 적기
- tip: 헷갈리기 쉬운 사례나 한 줄 팁

정확한 수거 요일이나 특정 시설의 운영 여부를 추측하지 마세요. 내부 추론, Role, Topic, Reasoning, 사고 과정, 검색 과정은 출력하지 마세요.`;

  const raw = await requestStructuredContent({
    parts: [{ text: prompt }],
    functionDeclaration: REGIONAL_FUNCTION
  });

  return normalizeRegional(raw, safeLocation);
}

async function answerRecyclingQuestion({ question, location = '현재 위치' }) {
  const safeQuestion = cleanText(question).slice(0, 500);
  const safeLocation = cleanText(location, '현재 위치').slice(0, 80);

  if (!safeQuestion) {
    const error = new Error('질문을 입력해 주세요.');
    error.statusCode = 400;
    throw error;
  }

  const prompt = `사용자 질문: "${safeQuestion}"
사용자 위치: "${safeLocation}"

다음 기준에 따라 submit_recycling_answer 함수를 한 번만 호출하세요.
1. 재활용, 분리배출, 일반쓰레기, 음식물쓰레기, 폐가전, 대형폐기물, 재사용, 업사이클링, 쓰레기 감량, 배출 장소나 방법과 직접 관련된 질문만 relevant=true로 판단합니다.
2. 학교 과목, 연예, 게임, 코딩, 날씨, 정치, 건강 등 관련 없는 질문은 relevant=false로 판단하고 answer는 정확히 "잘 모르겠습니다."로 작성합니다.
3. 관련 질문이면 결론을 먼저 말하고, 사용자가 바로 실천할 수 있도록 3~6문장으로 답합니다.
4. 지역별 세부 규정을 확신할 수 없으면 "일반적인 기준으로 안내합니다."라고 밝힙니다.
5. 내부 추론, Role, Topic, Reasoning, 사고 과정은 출력하지 않습니다.`;

  const raw = await requestStructuredContent({
    parts: [{ text: prompt }],
    functionDeclaration: QUESTION_FUNCTION
  });

  const relevant = raw?.relevant === true;
  if (!relevant) {
    return { relevant: false, answer: '잘 모르겠습니다.' };
  }

  const answer = cleanText(raw?.answer);
  if (!answer || answer === '잘 모르겠습니다.') {
    return { relevant: false, answer: '잘 모르겠습니다.' };
  }

  return { relevant: true, answer };
}

module.exports = {
  CATEGORIES,
  analyzeImage,
  getRegionalGuide,
  answerRecyclingQuestion,
  normalizeAnalysis,
  normalizeRegional,
  isGenericItemName,
  cleanText
};
