# Oxlo Vision

Oxlo Vision is a project created for the Oxlo.ai hackathon.
It is a platform that extracts information from PDF files.
Unlike many alternatives, it is powered by the AI models provided by Oxlo.ai.

Oxlo Vision aims to:
- Read regular PDFs and scanned PDFs that are mostly images and do not allow copy-paste
- Generate high-quality summaries from extracted content
- Build mind maps from PDF content
- Build concept maps from PDF content
- Produce .md files and skills that developers can use with their preferred AI assistants
- Generate diagrams from PDFs for both technical and non-technical users (UML, ER models, and more)
- Orchestrate all AI capabilities provided by the backend in an efficient way

The project also includes a Micronaut + Java backend microservice with its documentation.

## Checklist Front-end

- [x] PDF upload with drag and drop or file picker.
- [x] Text extraction from regular PDFs using PDF.js.
- [x] OCR support for scanned PDFs (pages without selectable text).
- [x] Summary generation using backend endpoint `/v1/chat/completions`.
- [x] Results shown in tabs: summary, key points, markdown, and extracted text.
- [x] Mind map generation based on real PDF content (React Flow).
- [x] Concept map generation based on real PDF content.
- [x] Chat over the uploaded PDF with Oxlo model selection (light to strong).
- [x] Skill file generation for AI assistants (copy and paste ready).
- [x] UML/ER diagram export from processed content.

## Runtime Notes

- Frontend uses `VITE_BACKEND_URL=/api` by default in development.
- The Vite proxy uses `BACKEND_URL` (if defined in `.env`) or falls back to `http://localhost:8080`.
- You can configure `VITE_BACKEND_URL` with another base path if needed.
- OCR is applied automatically when a PDF page has no extractable text.

## Deploy on Vercel

- The project includes serverless proxies in `api/[...path].js` and `v1/[...path].js`.
- The frontend keeps `VITE_BACKEND_URL=/api` and never exposes the real backend URL in the bundle.
- In Vercel, configure this environment variable:
  - `BACKEND_URL=https://oxlo-backend.onrender.com`
- Proxy mapping:
  - `/api/:path*` -> `BACKEND_URL/api/:path*`
  - `/v1/:path*` -> `BACKEND_URL/v1/:path*`
- Build command: `npm run build`
- Output directory: `dist`