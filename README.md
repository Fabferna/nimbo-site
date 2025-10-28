# Nimbo — Agência Criativa (Protótipo)
Site estático moderno, acessível e responsivo para portfólio.

## Estrutura
- `index.html` — Home com Hero, Clientes, Serviços, Cases, Quem Somos e Contatos.
- `assets/css/styles.css` — Tokens, layout e componentes.
- `assets/js/main.js` — Navegação mobile, microinterações, carrossel, validação do formulário.
- `assets/svg/` — Logo e ícones.
- `assets/img/` — *Placeholders* para imagens de cases (substitua).

## Como rodar
Abra `index.html` no navegador. (Opcional) Use um servidor local:
- Python: `python3 -m http.server 5173` e acesse `http://localhost:5173`
- Node (serve): `npx serve .`

## Próximos passos
1. Substituir `assets/img/case-*.jpg` por imagens reais (do Gemini).
2. Inserir logos reais em `assets/svg/brand-*.svg` (ou PNGs).
3. Caso deseje, integrar o formulário a um serviço (Formspree/Netlify) ou API própria.
4. Criar páginas individuais de Case (template reutilizável).

## Acessibilidade
- Skip link, foco visível, contraste AA em botões e textos.
- Navegação por teclado no carrossel (setas) e close do menu via ESC.
