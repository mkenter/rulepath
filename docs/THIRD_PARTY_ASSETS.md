# Third-party assets

## Bundled typefaces

Rulepath bundles variable WOFF2 assets at build time through Fontsource:

- Instrument Sans, used for application UI, body copy, metadata, search, and
  flow diagrams.
- Newsreader, used for game, procedure, and major page titles. The optical-size
  variable build is used so browsers can apply optical sizing at the rendered
  text size.

Both typefaces are licensed under the SIL Open Font License 1.1. Their packages
and license texts are installed as `@fontsource-variable/instrument-sans` and
`@fontsource-variable/newsreader`. Vite emits the referenced WOFF2 files as
local hashed assets, and the PWA precache includes those build assets. No runtime
font CDN or network request is used.


The redistributed font license texts are included in [Instrument Sans OFL](../public/licenses/instrument-sans-OFL.txt) and [Newsreader OFL](../public/licenses/newsreader-OFL.txt), copied into the deployed static assets under /licenses/.

Rules content has separate licensing and attribution documented in the
[README](../README.md#licensing-and-attribution) and game metadata. The MIT
application license does not override any third-party license.

