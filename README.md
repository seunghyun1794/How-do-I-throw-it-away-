# 어떻게 버리지?

사진을 촬영하면 Gemma 4가 품목을 인식하고, 분리배출 방법과 지역별 안내를 보여주는 웹앱입니다.

## 반영된 수정 사항

- 기본 AI 모델을 `gemma-4-26b-a4b-it`로 변경했습니다.
- 함수 호출 방식으로 응답을 구조화하여 `Role`, `Topic`, `Reasoning`, 추론 과정이 화면에 나오지 않도록 했습니다.
- 서버와 브라우저 양쪽에서 메타 문구를 다시 제거합니다.
- 즐겨찾기가 비어 있어도 안내 모달과 문구가 표시됩니다.
- 품목명이 `인식된 품목`, `물건`, `알 수 없음`처럼 모호하거나 확신도가 낮으면 `인식 실패`로 표시합니다.
- 사진의 방향을 보정하고 크기·품질을 자동 조절하여 글자, 단자, 재질 표시를 더 안정적으로 분석합니다.
- 확신도가 낮을 때만 한 번 재분석하여 호출 횟수와 대기 시간을 줄였습니다.
- API 키는 브라우저에 전달하지 않고 서버의 `/api/analyze`, `/api/regional`에서만 사용합니다.

## 로컬 실행

1. `.env.example`을 `.env`로 복사합니다.

```bash
cp .env.example .env
```

Windows PowerShell에서는 다음 명령을 사용할 수 있습니다.

```powershell
Copy-Item .env.example .env
```

2. `.env`에 Google AI Studio에서 발급받은 키를 입력합니다.

```env
GEMMA_API_KEY=실제_API_KEY
GEMMA_MODEL=gemma-4-26b-a4b-it
GEMMA_RETRY_THRESHOLD=0.68
```

3. Node.js 20 이상에서 실행합니다.

```bash
npm start
```

4. 브라우저에서 `http://localhost:3000`을 엽니다.

## Vercel 배포

1. Vercel 프로젝트의 환경 변수에 `GEMMA_API_KEY`를 등록합니다.
2. 필요하면 `GEMMA_MODEL`과 `GEMMA_RETRY_THRESHOLD`도 등록합니다.
3. 예전에 사용하던 `api/env.js`가 있다면 삭제합니다. API 키를 브라우저로 보내면 안 됩니다.

## 모델 변경

기본 모델은 속도와 성능의 균형을 고려한 다음 모델입니다.

```env
GEMMA_MODEL=gemma-4-26b-a4b-it
```

더 큰 모델을 시험하려면 다음과 같이 변경할 수 있습니다.

```env
GEMMA_MODEL=gemma-4-31b-it
```

## 파일 구성

```text
.
├── api/
│   ├── analyze.js
│   └── regional.js
├── lib/
│   └── gemma.js
├── index.html
├── script.js
├── style.css
├── server.js
├── package.json
└── .env.example
```
