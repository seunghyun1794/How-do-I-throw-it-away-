# How-do-I-throw-it-away-

## 환경 변수 설정

1. `.env.example`를 `.env`로 복사합니다.

```bash
cp .env.example .env
```

2. `.env` 파일에 `GEMMA_API_KEY`를 입력합니다.

```env
GEMMA_API_KEY=YOUR_KEY_HERE
```

3. 로컬 서버를 실행합니다.

```bash
node server.js
```

4. 브라우저에서 `http://localhost:3000`을 엽니다.

## Vercel 배포

1. Vercel 프로젝트를 생성합니다.
2. Vercel 환경 변수에 `GEMMA_API_KEY`를 추가합니다.
3. `index.html`에서 `env.js` 대신 `/api/env`를 불러오도록 설정되어 있으므로, 추가 설정은 필요 없습니다.

> `api/env.js`는 Vercel에서 서버리스 함수로 동작하며, 환경 변수 `GEMMA_API_KEY`를 클라이언트로 전달합니다.
