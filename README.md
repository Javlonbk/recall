# recall

A personal **active-recall** study site — learn by question, not by re-reading.

Every concept is framed as a **question** answered in the clearest minimal form (a
table, code, a diagram, or a sharp line or two). Two surfaces per subject:

- **Q&A** — the primary surface. Collapse-to-recall, topic → subtopic hierarchy,
  per-card "known" tracking, ⌘K search across all subjects, and a calm review mode.
- **Book** — long-form reference per subject, optimized for reading and searching.

Subjects: JavaScript, TypeScript, Node.js, System Design (and easy to add more).

## Stack

- **[Astro](https://astro.build)** — builds to a fully static `dist/` (no backend).
- The UI is a self-contained, data-driven app (`public/scripts/recall.js` +
  `public/styles/recall.css`), designed in [Claude Design](https://claude.ai/design).
- Content lives as JSON in `src/content/tech/*.json` and is baked into each page
  at build time (`window.RECALL_CONTENT`).

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output → dist/
npm run preview  # serve the build locally
```

## Content

Each subject is one file: `src/content/tech/<id>.json`
(`name`, `blurb`, `order`, nested `topics → subtopics → cards`, and `book` sections;
answers are HTML). Edit the JSON directly, or use the built-in editor:

1. Run `npm run dev` and open `/qa.html`.
2. Profile avatar (top-right) → **Admin sign-in** (default passcode `recall`) →
   **Enable edit mode**.
3. Add / edit / delete and drag-reorder topics, subtopics, and questions in place.
4. Click **Save to file** (local dev only) to write the JSON back, then commit.

Edit-mode changes are stored per-browser in `localStorage` until saved/exported, so
the deployed site is read-only for visitors.

## Deploy

Static host. For **Cloudflare Pages**: build command `npm run build`, output
directory `dist`.

## License

[MIT](./LICENSE) — © Javlonbek
