# Why this folder exists

This empty `pages/` directory is **required** even though the project uses the
Next.js **App Router** (routing lives in the root `app/` folder).

Feature-Sliced Design (FSD) keeps the real "pages" layer inside `src/pages/`.
Without an empty `pages/` folder at the project root, Next.js would treat
`src/pages/` as the **Pages Router** and the build would break.

Do not add route files here. App Router routes go in the root `app/` folder;
FSD page slices go in `src/pages/`.

See `.agents/skills/feature-sliced-design/references/framework-integration.md`.
