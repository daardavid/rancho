# ADR-017: Charts load only when Tendencias is opened

## Status

Proposed

Proposed with R-35, inside INC-006. Accepted when David merges it into `main`. Until then the chart library is not part of the accepted stack. [ADR-006](ADR-006-frontend-approach.md) still stands: the app is a React and Vite SPA. This ADR adds how that SPA draws trends, and it does not replace the small SVG on the animal record.

David decided this on 2026-11-25.

## Context

INC-006 keeps the first open light on a phone with a weak signal. The JavaScript of the initial load, measured on this branch before R-35, was 525,198 bytes (147,699 gzip, 126,042 brotli). A chart library in that file would add hundreds of kilobytes to every open, including the ones that never look at a trend.

The owner still needs a Tendencias screen: weight over time, herd gain per weighing round, and births and exits per month. The record already draws one animal's weights as a short SVG. Three charts, several animals, a break where a weighing was missed, and stacked exit reasons are past what that SVG was for.

The numbers are a read model. Gain per round uses the same pair rule as Crecimiento and is not stored. Kilograms stay text until the draw call.

## Decision

Use Apache ECharts, and only the modules the screen draws: line, bar, grid, tooltip, legend, and the canvas renderer. Do not import the full package.

Put that code in one chunk that the initial page does not request. The screen module is loaded with a dynamic `import()` when the route `#/tendencias` opens, and the chart modules travel with it. While those bytes download, the screen says «Preparando las gráficas…». If the download fails, it says so and offers another try.

The build of R-35 measured:

| File | Role | Raw | Gzip | Brotli |
| --- | --- | ---: | ---: | ---: |
| `index-*.js` before R-35 | Initial load | 525,198 | 147,699 | 126,042 |
| `index-*.js` after R-35 | Initial load | 528,785 | 148,926 | 126,891 |
| `Tendencias-*.js` | Screen and ECharts, loaded on open | 543,016 | 181,725 | 153,895 |

The initial file grew by 3,587 bytes (1,227 gzip, 849 brotli). It does not contain the strings `echarts` or `zrender`. `index.html` does not reference the deferred chunk. Opening Inicio does not request it. Opening Tendencias does.

## Why not the other approaches

- **ECharts in the initial bundle.** It would add the library's weight to every first open, which is the cost INC-006 is removing.
- **The full `echarts` package.** Tree-shaking would be left to chance. The screen imports the modules it registers and nothing else.
- **A larger hand-drawn SVG.** It was the right tool for one series on the record. It is still that tool. It is not this screen.

## Consequences

- The first open stays the initial file. Tendencias pays about 544 KB raw (182 KB gzip, 154 KB brotli) when the owner asks for the charts.
- A later chart has to stay behind the same dynamic import. Importing ECharts from a screen that loads at startup would put the library back in the initial file.
- The SVG on the animal record stays. This ADR does not make ECharts the way every small series is drawn.
- Sizes above are from the R-35 production build. A later dependency bump should be measured the same way: initial file, gzip, brotli, and a check that the initial file still does not contain the library.
