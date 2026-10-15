# Rulepath

Rulepath is an offline-capable library of connected tabletop rules procedures and references. Browse procedure flows, follow links, retrace your navigation path, open reference sheets, and search the included content. Resource URLs can be opened directly. Rulepath does not roll dice, choose outcomes, or track game state.

## Included sample

The included Ironsworn SRD sample contains five procedures: Gather Information, Secure an Advantage, Action Roll, Pay the Price, and the yes/no option of Ask the Oracle. Six references cover Momentum, Matches, Stats, Oracle Options, the Pay the Price Table, and attribution.

This unofficial sample is not a complete Ironsworn rules reference. Consult the official SRD for moves and details outside the included procedures. The Oracle Options reference describes all four options; the Ask the Oracle procedure covers the yes/no roll.

## Development

On Linux or macOS, use Node.js 22.20 or later in the Node 22 series, or a newer LTS, and npm:

```sh
npm ci
npm run dev
```

For browser tests, install Chromium. On Linux, install its system dependencies if needed:

```sh
npx playwright install chromium
# Linux only, if required:
npx playwright install-deps chromium
```

Run the checks and build:

```sh
npm run validate:content
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run validate:content` checks the included rules data. `npm run preview` serves the production build locally.

## Rules content

Rules content lives under `content/ironsworn/`. `game.yaml` defines the game's metadata and contents list; `procedures/` contains flow graphs; `reference/` contains supporting text; and `crosslinks.yaml` records links between procedures. The content schema is in `src/content/schema.ts`.

Source and licensing metadata are defined in `game.yaml` and can be specified for individual resources. The app displays source information with each procedure and reference.

## Licensing and attribution

- Original Rulepath application code and original application assets: [MIT](LICENSE), copyright ©2026 Rulepath contributors.
- Adapted Ironsworn rules content in `content/ironsworn/`: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
- Third-party fonts and assets: their respective licenses. See [third-party assets](docs/THIRD_PARTY_ASSETS.md) and the retained font license files.

The MIT license applies to the original application code; it does not replace or override the separate licenses for rules content or third-party materials.

This work is based on [Ironsworn](https://www.ironswornrpg.com), created by Shawn Tomkin, and licensed for our use under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/). Copyright ©2018 Shawn Tomkin.

The textual source is the [official Ironsworn SRD](https://docs.google.com/document/d/11ypqt6GfLuBhGDJuBGWKlHa-Ru48Tf3G_6zbrYKmXgY/edit), version .09, updated January 14, 2023, linked from the [publisher's licensing page](https://tomkinpress.com/pages/licensing). Selected text has been reorganized and paraphrased into linked procedures and references; the adaptations remain CC BY 4.0. No publisher artwork, icons, or layout assets are included. Rulepath is unofficial and does not imply endorsement. Source and license links are available in each resource's source disclosure.
