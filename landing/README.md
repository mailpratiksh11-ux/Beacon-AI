# Beacon AI — marketing landing page

A standalone, self-contained landing page. No build step, no dependencies.

## Preview locally

```bash
cd landing
python serve.py       # http://localhost:8791
```

`serve.py` sends `Cache-Control: no-store`, so a plain refresh always shows the
current HTML while you are iterating.

## Notes

- **Single file.** All CSS and JS are inline in `index.html`. The only external
  request is the Google Fonts stylesheet (Familjen Grotesk, Public Sans,
  JetBrains Mono); without network access it falls back to Georgia/Arial/Menlo.
- **`/login` links.** The three "Get Started" buttons and the footer "Sign in"
  point at `/login`. They 404 when previewing locally and resolve once the page
  is served from the app's domain root.
- **Themes.** Light and dark are both defined via CSS custom properties and
  follow the visitor's system preference.
- **Capability claims** are limited to features that exist in the product today.
  Open tracking, A/B testing, follow-up sequences, team workspaces and mailbox
  warmup are deliberately not mentioned because they are not built.
- **Logo.** The mark is the same SVG as `frontend/src/app/shared/logo-mark.ts`,
  defined once as a `<symbol>` and reused in the header and footer.
