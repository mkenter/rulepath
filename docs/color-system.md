# Rulepath color system

Rulepath uses **Vermilion / Ice / Plum**: a vivid warm identity plane, an icy
navigation accent, and quiet cool reading surfaces. Tokens live in
`src/styles/tokens.css`; components consume semantic roles rather than hex values.
Typography, layout, routes, and flow semantics are unchanged.

## Directions evaluated before implementation

| Direction | Brand and supporting colors | Reading, type, and boundaries | Interaction, status, and diagrams | Assessment |
| --- | --- | --- | --- | --- |
| **Vermilion / Ice / Plum — selected** | Vermilion `#F26047`, plum `#281D2F`, icy accent `#BDE8EB`, coral shell detail `#FFAA96` | Chalk `#F7F7FA`, white, lilac `#ECEAF1`; ink `#292331`, muted `#635D69`; dividers `#D7D2DA`, strong `#827989` | Dark ink on brand; warm hover `#FF735A`, pressed `#ED563E`; paper action/focus `#B53627`; status and routes below | Contemporary editorial wayfinding. Warm/cool opposition gives a memorable focal point while neutral reading areas remain comfortable and independent of game theme. Warm brand could suggest error; errors use magenta, explicit labels, and restrained placement. |
| Ultramarine / Citron / Frost | Brand `#343BD1`, ink shell `#171A35`, pale support `#E8ECFF`, citron `#D9ED52` | Frost `#F5F7FC`, white; ink `#202641`, muted `#5C6378`; borders `#D2D7E3` / `#7A8298` | White on brand; hover `#292FB1`, pressed `#222792`; citron focus on dark, ink on citron. Status success `#246347`, warning `#795408`, error `#AC3153`, info `#2759A5`; routes `#126B72`, `#7847A0`, `#A3442D`, `#81600E` | Precise and electric, with strong instrument-like wayfinding and low-chroma reading. Blue-heavy hierarchy could compete with route encoding and resemble generic technology products. |
| Aubergine / Lime / Lilac | Brand `#652A56`, shell `#291E30`, support `#EDE6F0`, lime `#D2EF5B` | Light `#FAF8FC`, white; ink `#302736`, muted `#695D70`; borders `#D9CFDF` / `#87768F` | White on brand; hover `#7A3668`, pressed `#502043`; lime focus on dark, aubergine on light. Status success `#25674C`, warning `#80570F`, error `#AC2949`, info `#24657E`; routes `#176674`, `#4B55A0`, `#A24B28`, `#81600E` | Nocturnal art-publishing character with acidic highlights. Sophisticated across games, but repeats the dark slab balance and risks lime dominating the editorial type or suggesting gaming hardware. |

All three can support accessible text through deliberate foreground/background
pairing. The chosen direction offers the strongest balance of distinctiveness,
impact, sophistication, coherence across pages, long-reading comfort, and neutral
support for different games. Alternatives are recorded as exploration, not
additional token families.

## Semantic roles and composition

| Role | Values | Use |
| --- | --- | --- |
| Brand | `#F26047`; hover `#FF735A`; pressed `#ED563E` | Library identity, Game Home and Search mastheads, section number chips |
| On brand | `#281D2A`; border `#6A322A` | All brand text, including small labels; never opacity-muted |
| Shell | `#281D2F`; raised/hover `#38283F`; selected `#493147` | Application shell, top navigation, elevated shell controls |
| On shell | Primary `#F7F5FA`; muted `#C3B8CB`; accent/focus `#FFAA96`; meaningful border `#8A7B91` | Coral logo and active underline connect reading pages to the identity |
| Signal | `#BDE8EB`; hover `#ABE0E5`; pressed `#9AD5DC` | Explore CTA and jump rail; ink/focus `#223943`, meaningful border `#48747B` |
| Reading | Page `#F7F7FA`; raised `#FFFFFF`; secondary/margin `#ECEAF1` | Long reading, action nodes, input, Library details, decisions |
| Reference | `#E6EFF1` | Reference aside, reference page card, reference sheet |
| On reading | Ink `#292331`; muted `#635D69` | Body and secondary text |
| Boundaries | Decorative `#D7D2DA`; meaningful `#827989` | Quiet dividers versus node/control outlines and neutral connectors |
| Reading actions | `#B53627`; hover `#96271D`; pressed `#7E2019` | Links, invocation text and edge, paper focus |
| Action fills | `#FCE8E2`; hover `#F9DAD1`; pressed `#F6D1C6` | Quiet warm interaction surfaces; pressed invocation text darkens |
| Diagram paths | Teal `#166B7A`; violet `#7650A3`; orange `#A64A28`; return ochre `#836013` | Diagram-only label, path, and arrowhead colors |
| Status | Success `#1F6E50` on `#E2F2E8`; warning `#805B0C` on `#FFF0C8`; error `#A32645` on `#FCE7EA`; info `#1E657B` on `#E1F1F6` | Reserved semantic roles; retain explicit words/icons |

Concentrate saturation in identity planes and small interaction cues. Keep body
text plum, decision fills lilac, action cards white, references pale cyan, and
section rules plum. Static Start/Decision/End kind labels and icons use muted
plum; invocation labels, links, and edges retain the action red. This focused
rendered refinement keeps structure quiet while actions and paths remain focal.
Do not reuse diagram colors as unrelated decoration. Flow
labels, arrowheads, line styles, node labels, and geometry retain the existing
non-color cues. No gradients or additional shadows are required.

Shared breadcrumbs and headers use contextual text/accent/focus tokens; light
contexts override those roles without mutating shell palette roles. Global focus
uses the contextual token. Brand and cyan controls use dark focus ink; Search
uses a paper border plus dark outer focus ring against the brand plane. Decorative
separators are intentionally lighter than meaningful control boundaries.

## Contrast evidence

Ratios use WCAG relative sRGB luminance, rounded to two decimals. Normal text
requires 4.5:1; meaningful boundaries and focus indicators require 3:1.

- Dark brand ink on default vermilion: **5.03:1**; pressed: **4.62:1**.
- Diagram label colors on the darker decision fill: **4.83:1 or better**.
- Meaningful reading border against secondary surface: **3.49:1**.
- Cyan boundary against its default surface: **3.92:1**; pressed: **3.18:1**.
- Reading action ink against reference surface: **5.11:1**.
- Invocation hover was narrowly lightened from `#F8D9D0` to `#F9DAD1` to
  avoid a 4.49:1 text combination. Pressed invocation, including its small label, uses the darker pressed ink
  with **7.05:1** contrast.

Browser validation checks actual rendered foreground/background pairs, including
hover, selected, focus, reference presentation, and diagram states. The soft grain
texture uses neutral chalk pigment; all other component colors use semantic
roles. PWA icon, HTML theme color, and manifest display metadata match the identity;
PWA behavior and caching are unchanged.
