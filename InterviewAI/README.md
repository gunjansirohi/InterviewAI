# InterviewAI

A clean full-stack starter with a React/Vite frontend and an Express/MongoDB backend.

## Getting started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend defaults to `http://localhost:5000`.

## Environment

Copy each package's `.env.example` to `.env`. The backend requires:

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: a long, cryptographically random secret that must not be committed
- `JWT_EXPIRES_IN`: JWT lifetime, such as `7d`
- `CLIENT_URL`: allowed browser origin

The frontend uses `VITE_API_URL` for the API base URL.

## Authentication API

- `POST /api/auth/register` â€” create an account and return a JWT
- `POST /api/auth/login` â€” authenticate and return a JWT
- `GET /api/auth/profile` â€” return the authenticated user; requires `Authorization: Bearer <token>`
- `GET /api/users/profile` â€” return the dashboard-safe user profile; requires `Authorization: Bearer <token>`
- `POST /api/resume/upload` â€” upload and analyze a PDF/DOCX resume; multipart field name: `resume`
- `GET /api/resume/profile` â€” return the authenticated user's latest resume analysis
- `POST /api/interview/start` â€” generate and persist a resume-personalized interview
- `POST /api/interview/answer` â€” save or update an answer in an owned interview session
- `GET /api/interview/history` â€” return the authenticated user's interview history
- `GET /api/interview/:id` â€” reload an owned interview session
- `POST /api/voice/transcribe` â€” transcribe an authenticated WebM/MP4/WAV/MP3/M4A/Ogg recording
- `POST /api/interview/voice-answer` â€” save a transcript and owned audio reference as a voice answer
- `POST /api/evaluation/evaluate` â€” generate or return the existing AI report for a completed interview
- `GET /api/evaluation/report/:id` â€” return an owned report by report or interview ID
- `GET /api/evaluation/history` â€” return all reports owned by the authenticated user
- `GET /api/analytics/dashboard` â€” return summary statistics, trends, and recent interviews
- `GET /api/analytics/history` â€” return paginated interview history with search and filters
- `GET /api/analytics/skills` â€” return category scores, strong areas, weak areas, and skill trends
- `GET /api/analytics/roadmap` â€” return a cached AI-generated learning roadmap
- `POST /api/resume-studio/create` â€” create a versioned studio resume
- `PUT /api/resume-studio/update/:id` â€” update an owned resume and create a version snapshot
- `POST /api/resume-studio/improve` â€” rewrite a resume section with server-side AI
- `POST /api/resume-studio/analyze` â€” run ATS scoring and target-role keyword analysis
- `GET /api/resume-studio/pdf/:resumeId` â€” download an owned resume as PDF
- `GET /api/resume-studio/history/:resumeId` â€” return resume version history
- `GET /api/resume-studio` â€” list owned studio resumes
- `GET /api/resume-studio/:id` â€” return one owned studio resume
- `POST /api/coding/start` â€” generate one to five coding interview problems
- `GET /api/coding/history` â€” return owned coding interview history
- `GET /api/coding/batch/:batchId` â€” return an owned multi-question batch
- `GET /api/coding/:id` â€” return a coding problem without hidden tests
- `POST /api/coding/:id/run` â€” run code with custom input through the configured sandbox
- `POST /api/coding/:id/submit` â€” run hidden tests, score, and generate AI code review

Passwords are hashed with bcrypt and never returned by the API. The protected frontend dashboard is available at `/dashboard` after authentication.

Resume analysis uses the Google Gemini API with structured JSON output. Configure `GEMINI_API_KEY` only in `backend/.env`; it is never sent to the frontend. `MAX_RESUME_SIZE_MB` defaults to `5`.

Coding question generation uses Gemini when `GEMINI_API_KEY` is configured. Local development falls back to deterministic starter problems when Gemini is missing or unavailable so `/api/coding/start` remains usable; production deployments should configure Gemini for topic-specific generated challenges.

Interview question generation uses the same server-only Gemini configuration. Users must have a completed resume analysis before starting an interview. The frontend setup is available at `/interview/setup`; active sessions use `/interview/:id`.

Voice interviews use browser speech synthesis for question playback and MediaRecorder for microphone capture. Completed recordings are transcribed server-side with Gemini model `gemini-1.5-flash` and capped by `MAX_AUDIO_SIZE_MB` (default `10`). Voice sessions use `/voice-interview/:id`. Browsers require a secure context (`https://` or localhost) for microphone access.

Completed interviews can be evaluated from the completion screen. Reports use strict AI structured output with validated 0â€“100 scores and are generated once per interview. Report history is available at `/evaluations`.

The protected analytics dashboard is available at `/analytics`. Interview history supports `page`, `limit`, `search`, `interviewType`, `difficulty`, `dateFrom`, and `dateTo` query parameters. Date values use `YYYY-MM-DD`.

The protected AI Resume Studio is available at `/resume-studio`. It supports classic, modern, and minimal PDF templates, live preview, versioned saves, ATS analysis, role-specific keywords, and factuality-constrained AI rewriting. AI keys remain in `backend/.env`.

The protected coding platform is available at `/coding` for Java, C++, Python, JavaScript, C, C#, and Go. User submissions run through Judge0 by default, so the Express host does not need language compilers installed. Set `CODE_EXECUTION_PROVIDER=judge0`, point `JUDGE0_URL` at a separately isolated Judge0 deployment, and optionally configure `JUDGE0_AUTH_TOKEN` or JSON `JUDGE0_LANGUAGE_IDS` overrides. Built-in IDs cover all seven languages. CPU, wall-time, memory, and file-size limits are configured with `CODE_CPU_TIME_LIMIT`, `CODE_WALL_TIME_LIMIT`, `CODE_MEMORY_LIMIT_KB`, and `CODE_MAX_FILE_SIZE_KB`. The local child-process provider remains available only as an explicit development fallback and is rejected in production.



