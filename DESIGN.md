# Design: UDAN Immigration & Tours

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

## System
- Genre: editorial (travel and visa agency, Vastrapur, Ahmedabad)
- Redesign depth: restyle (layout and content kept; system, type, surfaces and controls changed)
- Theme: brand (UDAN visiting-card colours kept)
- Axes: light/roman-serif/chromatic-green · posture: full palette
  - field: deep teal, nav-adjacent bands, footer, dark sections
  - signal: UDAN green, the primary action and active states only
  - seals: sky and lime, only on the teal field (accent text, icons)

## Tokens
`src/styles/hallmark/tokens.css` holds the roles; `src/styles/tokens.css` aliases legacy names (`--color-teal`, `--color-action`, `--fs-*`, `--space-*`) to them. Components read either; never a literal colour or font-family.
```css
--color-paper / -2 / -3 (green-tinted off-white, no pure white) · --color-paper-visa
--color-ink / --color-ink-2 / --color-muted / --color-rule / --color-rule-strong
--color-accent (green action) / --color-accent-hover / --color-accent-ink / --color-accent-text
--color-field (teal) / --color-field-deep / --color-on-field / --color-on-field-soft
--color-sky-on-field / --color-lime-on-field · --color-focus / --color-focus-on-field
--font-display: Piazzolla Variable (600) · --font-body: Manrope Variable (400, 600, 700)
--radius-card: 6px (buttons and cards) · --radius-pill only for filter chips · --shadow-card: none (hairlines)
```

## Rules
- Heads: Piazzolla 600, one weight, one colour, tracking -0.02em, `text-wrap: balance`. No italic word inside a roman head.
- Labels, captions, nav, chips, footer heads: Manrope, a step smaller, sentence case, untracked. No eyebrows, no uppercase tracked labels.
- Icons at text size in currentColor, never in a tinted circle/coin. No side-stripe borders; hairline all round or none.
- Surface ladder: whitespace, hairline, tinted well, card (border XOR shadow). Never a card in a card.
- No middle-dot meta strings, no arrows glued to link text, no decorative dots.

## Controls
- Primary: filled `--color-accent`, `--color-accent-ink` text, 6px radius, 48px tall. One filled primary per view.
- Secondary: 1px outline in `--color-field` (on paper) or `--color-on-field` (on teal), same radius and height.
- Quiet: underlined text link. Every control: hover, :active (1px translate), :focus-visible (instant outline), :disabled.

## Motion
- Character: calm. Transitions on colour/transform/opacity only, `--dur-short` `--ease-out`. No image zoom on hover. Reduced motion ends everything at once.

## Exports
`src/styles/hallmark/tokens.css` in this project.
