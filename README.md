<div align="center">
  <h1>Oxlo Vision Frontend</h1>
  <p><b>Visual workspace for document understanding with AI-powered outputs.</b></p>

  <img src="https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/XYFlow-12-FF007A?style=for-the-badge&logo=react&logoColor=white" alt="XYFlow" />
</div>

<br/>

> [!TIP]
> Oxlo Vision Frontend lets users upload PDFs, extract text (including OCR for scanned pages), generate summaries, and create mind maps or concept maps from document content.

---

## Project Scope

This frontend is focused on turning raw documents into structured knowledge with a practical workflow:

1. Upload PDF document
2. Extract text in-browser (with OCR fallback when needed)
3. Send structured prompts to the backend
4. Render outputs as summary, key points, markdown, and visual maps

Live demo: https://oxlovision.vercel.app/

---

## Main Features

- PDF upload via drag-and-drop or file picker
- Text extraction from digital PDFs using pdf.js
- OCR fallback for scanned pages using Tesseract.js
- Summary and key-point generation through backend AI endpoints
- Mind map and concept map generation from extracted content
- Mermaid diagram rendering for technical outputs
- Chat workflow over processed document context

---

## Source Structure (src)

- `pages/`: app-level screens (notably `Dashboard.tsx`)
- `features/mindmap/`: mind map types, utils, and UI
- `features/conceptmap/`: concept map types, utils, and UI
- `features/diagram/`: diagram generation and Mermaid preview
- `features/pdf/`: PDF extraction pipeline
- `features/skills/`: skills output types and formatting utilities
- `features/oxlo/`: backend chat integration layer

---

## Local Development

Requirements:
- Node.js 20+ recommended

Install and run:

```bash
cd front-end
npm install
npm run dev
```

Dev URL: `http://localhost:5173`

Backend integration in development:
- Vite proxy forwards `/api` and `/api/v1` to `BACKEND_URL`
- Default backend target is `http://localhost:8080` if `BACKEND_URL` is not set

---

## Tech Stack

| Technology | Usage |
| :--- | :--- |
| React 19 | UI rendering and app state composition |
| TypeScript | Type-safe frontend code |
| Vite 8 | Development server and build tooling |
| @xyflow/react | Interactive node-based UI components |
| Mermaid | Diagram rendering from generated text |
| pdfjs-dist | PDF parsing and text extraction |
| tesseract.js | OCR fallback for scanned documents |

---

<div align="center">
  Built for OxBuild with React, TypeScript, and Oxlo.ai backend integration.
</div>
