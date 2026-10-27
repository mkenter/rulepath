# README screenshots

Both images show the bundled Ironsworn content in a production build, captured
with Chromium on October 27, 2026 after the interaction, accessibility, and
editorial refinements. No fixture content, style overrides, or compositing is used.

- `game-home.png`: a 1440 × 900 desktop capture of `/games/ironsworn`, including
  the title/byline presentation and expanded game contents.
- `procedure-flow.png`: a full-page capture at 1440 pixels wide showing Gather
  Information → Pay the Price. The complete flow, all three branches, supporting
  rules, and reference links are visible with no dialog open.

To recapture both views, install dependencies and Playwright's Chromium,
then build and start the production preview:

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

In another terminal, run:

```sh
node docs/screenshots/capture.mjs
```

The script follows real links, waits for local fonts, and checks that the whole
flow fits and no dialog is open. It captures the full page to include the
supporting rules and references. It changes no application content or styling.
PNG compression is lossless.

The broader [visual-review workflow](../../e2e/design-review.spec.ts) remains
available through `npm run screenshots:full`. Full review captures remain ignored
by Git.

The displayed rules retain their separate CC BY 4.0 license; see
[licensing and attribution](../../README.md#licensing-and-attribution).
