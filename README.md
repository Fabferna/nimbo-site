# Nimbo — Estúdio de marca e produto digital

Site de portfólio de uma agência fictícia. HTML, CSS e JavaScript puros: sem build e sem dependências.

**Ao vivo:** https://fabferna.github.io/nimbo-site/

## Direção de arte
- **Conceito:** *nimbus*, a luz atrás das nuvens. Visual editorial em papel quente (`#EEEBE4`) e tinta (`#0B0B0A`), com uma única cor de sinal (`#FF5A1F`).
- **Tipografia:** Instrument Serif (display), Geist (texto e UI) e Geist Mono (rótulos).
- **Layout sem cards:** lista indexada de capacidades, galeria horizontal fixada com o scroll, números orgânicos em grid assimétrico e seções em "folhas" arredondadas que se sobrepõem.
- **Assets:** as capas dos cases (`assets/img/work/*.svg`) são ilustrações vetoriais feitas à mão. O ícone, o favicon e a imagem OG saem do símbolo em `assets/svg/nimbo-mark.svg`.

## Movimento & performance
- Um único loop de `requestAnimationFrame` que dorme quando nada se move. A geometria é medida só no resize, nunca a cada frame.
- Só animamos `transform`, `opacity` e `clip-path`, gravados direto no elemento (sem variáveis CSS herdadas).
- Springs físicos para parallax do hero, preview que segue o cursor e botões magnéticos.
- Barra de progresso via `animation-timeline: scroll()` (fora da main thread), com fallback em JS.
- `prefers-reduced-motion` desliga o pin horizontal, o parallax e o marquee e mantém só os fades.

## Mobile "nativo"
`viewport-fit=cover` com `env(safe-area-inset-*)`, `100svh`/`100dvh` no lugar de `100vh`, hover só em `(hover: hover) and (pointer: fine)`, sem tap highlight, `touch-action: manipulation`, `overscroll-behavior`, inputs de 16px (sem zoom no iOS) e menu em `<dialog>` nativo (foco preso, Esc fecha).

## Estrutura
- `index.html`: home (hero, clientes, manifesto, capacidades, trabalho, estúdio, processo, contato)
- `brand-kit.html`: marca, cores, tipografia e downloads
- `assets/css/styles.css`: tokens e estilos
- `assets/js/main.js`: motor de movimento e interações (ES module)

## Rodar localmente
```bash
python3 -m http.server 5173   # http://localhost:5173
```
