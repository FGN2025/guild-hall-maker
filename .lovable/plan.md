

# Plan: Downloadable PDF Documents (README & ARCHITECTURE)

## Approach

Create a new admin-accessible page that renders both documents as formatted, print-ready HTML and provides download buttons that open a print-to-PDF dialog — using the same proven pattern already in `exportSeasonStats.ts` and the legal pages.

## Implementation

### 1. Create `src/lib/exportDocuments.ts`

Two functions: `exportReadmePdf()` and `exportArchitecturePdf()`. Each will:
- Contain the full document content as styled HTML (headings, tables, lists, code blocks)
- Open a new browser window and trigger `window.print()` for browser-native PDF export
- Use the same styling approach as `exportPdf` in `exportSeasonStats.ts`

The markdown content from both files will be converted to structured HTML with proper print styles (page breaks, monospace code blocks, table formatting).

### 2. Add download buttons to Admin Settings page

Add a "Documentation" section to `src/pages/admin/AdminSettings.tsx` with two buttons:
- "Download README (PDF)"
- "Download Architecture Guide (PDF)"

Each button calls the corresponding export function.

### 3. Content source

Since we cannot dynamically read `.md` files at runtime in a Vite SPA without extra tooling, the HTML content will be statically authored in the export functions, mirroring the current README.md (567 lines) and ARCHITECTURE.md (605 lines). This ensures the PDFs are always formatted correctly with proper styling.

### Technical details

- No new dependencies required — uses `window.open()` + `window.print()` (browser-native PDF)
- Print CSS will include: page margins, header styling, table borders, code block backgrounds, automatic page breaks before H2 sections
- Both documents will include an FGN header with generation date

