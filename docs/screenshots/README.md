# README screenshots

Both images show the bundled Ironsworn sample in the production build at main
commit `2e2e99103ab30bd3069ee3be5570ba6e7c0098d9` ([PR #4](https://github.com/mkenter/rulepath/pull/4)),
captured with Chromium on October 24, 2026. No fixture content, style overrides,
or compositing is used.

- `game-home.png`: the original 1440 × 900 desktop capture of `/games/ironsworn`,
  retained from the [visual-review workflow](../../e2e/design-review.spec.ts).
- `procedure-flow.png`: a full-page capture at 1440 pixels wide showing Gather
  Information → Pay the Price. The complete flow, all three branches, supporting
  rules, and reference links are visible with no dialog open.

To recapture the procedure view, install dependencies and Playwright's Chromium,
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

The Game Home capture can be regenerated with `npm run screenshots:full` from
`artifacts/screenshots/full/game-desktop.png`, resized from 2× to 1440 pixels wide.
Full review captures remain ignored by Git.

The displayed rules retain their separate CC BY 4.0 license; see
[licensing and attribution](../../README.md#licensing-and-attribution).
