// Header compact on scroll
const header = document.querySelector("[data-header]");
let lastY = 0;
addEventListener("scroll", () => {
  const y = scrollY;
  header.classList.toggle("is-compact", y > 24 && y > lastY);
  lastY = y;
});

// Mobile nav
const toggleBtn = document.querySelector("[data-nav-toggle]");
const nav = document.getElementById("menu");
if (toggleBtn && nav){
  const toggle = () => {
    const open = nav.classList.toggle("open");
    toggleBtn.setAttribute("aria-expanded", String(open));
  };
  toggleBtn.addEventListener("click", toggle);
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    if (nav.classList.contains("open")) toggle();
  }));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) toggle();
  });
}

// Reveal on scroll
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("is-visible"); });
},{threshold: 0.12});
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// Carousel
const carousel = document.querySelector("[data-carousel]");
if (carousel){
  const track = carousel.querySelector("[data-track]");
  const prev = carousel.querySelector("[data-prev]");
  const next = carousel.querySelector("[data-next]");
  const move = (dir) => {
    const width = track.getBoundingClientRect().width;
    track.scrollBy({left: dir * (width * 0.9), behavior: "smooth"});
  };
  prev.addEventListener("click", ()=> move(-1));
  next.addEventListener("click", ()=> move(1));
  carousel.addEventListener("keydown", (e)=>{
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "ArrowRight") move(1);
  });
}

// Year
document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

// Form validation (basic)
const form = document.querySelector("[data-form]");
if (form){
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const required = ["nome","email","assunto","mensagem"];
    const missing = required.filter(k => !String(data[k]||"").trim());
    if (missing.length){
      alert("Por favor, preencha todos os campos.");
      return;
    }
    // Placeholder success
    alert("Mensagem enviada! (Protótipo)");
    form.reset();
  });
}

// ====== Brand carousel (auto scroll, pause on hover) ======
document.querySelectorAll('[data-brand-carousel]').forEach(scroller => {
  const track = scroller.querySelector('[data-brand-track]');
  if (!track) return;

  // Duplicar o conteúdo para permitir loop contínuo (A A A A → A A A A A A A A)
  track.innerHTML += track.innerHTML;

  // Respeitar o modo reduzir animações
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce){
    track.classList.add('is-animated');

    // Pausar animação ao passar o mouse ou focar
    const pause = () => track.style.animationPlayState = 'paused';
    const play  = () => track.style.animationPlayState = 'running';
    scroller.addEventListener('mouseenter', pause);
    scroller.addEventListener('mouseleave', play);
    scroller.addEventListener('focusin', pause);
    scroller.addEventListener('focusout', play);
  }

  // Acessibilidade via teclado (setas) para quem preferir navegar manualmente
  scroller.tabIndex = 0; // permite foco
  scroller.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowRight') scroller.scrollLeft += 80;
    if (e.key === 'ArrowLeft')  scroller.scrollLeft -= 80;
  });
});