/* =========================================================
   NIMBO — interaction & motion
   - One rAF loop. Sleeps when nothing is moving.
   - Scroll-linked work reads cached geometry only; layout is
     measured on resize, never per frame.
   - Writes go straight to element.style.transform/opacity
     (no inherited CSS variables → no style recalc cascades).
   ========================================================= */

const root = document.documentElement;
const mq = (q) => window.matchMedia(q);
const reduceMQ = mq("(prefers-reduced-motion: reduce)");
const fineMQ = mq("(hover: hover) and (pointer: fine)");
const wideMQ = mq("(min-width: 960px)");
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- Spring (semi-implicit Euler, critically-ish damped) ---------- */
class Spring {
  constructor(value = 0, { stiffness = 170, damping = 26, mass = 1 } = {}) {
    this.value = this.target = value;
    this.velocity = 0;
    Object.assign(this, { stiffness, damping, mass });
  }
  step(dt) {
    const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
    this.velocity += (force / this.mass) * dt;
    this.value += this.velocity * dt;
    return this.settled();
  }
  settled() {
    if (Math.abs(this.velocity) < 0.01 && Math.abs(this.value - this.target) < 0.01) {
      this.value = this.target;
      this.velocity = 0;
      return true;
    }
    return false;
  }
  snap(v) { this.value = this.target = v; this.velocity = 0; }
}

/* ---------- Frame loop ---------- */
const springTasks = new Set(); // fn(dt) -> true when settled
const scrollTasks = new Set(); // fn(scrollY)
let rafId = 0;
let lastT = 0;
let scrollDirty = true;

function frame(t) {
  const dt = Math.min((t - lastT) / 1000 || 1 / 60, 1 / 30);
  lastT = t;
  if (scrollDirty) {
    scrollDirty = false;
    const y = window.scrollY;
    scrollTasks.forEach((fn) => fn(y));
  }
  springTasks.forEach((fn) => { if (fn(dt)) springTasks.delete(fn); });
  rafId = springTasks.size || scrollDirty ? requestAnimationFrame(frame) : 0;
}
function wake() {
  if (!rafId) { lastT = performance.now(); rafId = requestAnimationFrame(frame); }
}
function animate(fn) { springTasks.add(fn); wake(); }

addEventListener("scroll", () => { scrollDirty = true; wake(); }, { passive: true });

const measureTasks = new Set();
let resizeTimer;
function remeasure() {
  measureTasks.forEach((fn) => fn());
  scrollDirty = true;
  wake();
}
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(remeasure, 120);
}, { passive: true });

/* =========================================================
   Intro
   ========================================================= */
const fontsReady = document.fonts ? Promise.race([
  document.fonts.ready,
  new Promise((r) => setTimeout(r, 1200)),
]) : Promise.resolve();
fontsReady.then(() => requestAnimationFrame(() => {
  root.classList.add("is-loaded");
  remeasure(); // fonts change metrics
}));

/* =========================================================
   Header: hide on scroll down, reveal on scroll up,
   flip color over paper sections
   ========================================================= */
const hdr = $("[data-hdr]");
{
  let lastY = window.scrollY;
  scrollTasks.add((y) => {
    const delta = y - lastY;
    if (Math.abs(delta) > 6) {
      hdr.classList.toggle("is-hidden", delta > 0 && y > window.innerHeight * 0.6);
      lastY = y;
    }
    hdr.classList.toggle("is-scrolled", y > 40);
  });
  // Reveal header when keyboard focus lands inside it
  hdr.addEventListener("focusin", () => hdr.classList.remove("is-hidden"));

  const lightSections = $$(".paper, .contact");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { e.target._underHdr = e.isIntersecting; });
    const under = lightSections.find((s) => s._underHdr);
    hdr.dataset.theme = !under ? "dark" : under.classList.contains("contact") ? "signal" : "light";
  }, { rootMargin: "-36px 0px -96% 0px" });
  lightSections.forEach((s) => io.observe(s));
}

/* Scrollspy for desktop nav */
{
  const links = $$(".hdr__nav a");
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const link = map.get(e.target.id);
      if (!link) return;
      if (e.isIntersecting) {
        links.forEach((l) => { l.classList.remove("is-active"); l.removeAttribute("aria-current"); });
        link.classList.add("is-active");
        link.setAttribute("aria-current", "true");
      } else if (link.classList.contains("is-active")) {
        link.classList.remove("is-active");
        link.removeAttribute("aria-current");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
}

/* =========================================================
   Mobile menu — <dialog> + clip-path reveal
   ========================================================= */
{
  const dialog = $("[data-menu]");
  const openBtn = $("[data-menu-open]");
  const closeBtn = $("[data-menu-close]");
  let closing = false;

  const open = () => {
    dialog.showModal();
    // next frame so the transition runs from the closed clip
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add("is-open")));
  };
  const close = (then) => {
    if (closing || !dialog.open) return;
    closing = true;
    dialog.classList.add("is-closing");
    dialog.classList.remove("is-open");
    const done = () => {
      dialog.classList.remove("is-closing");
      dialog.close();
      closing = false;
      then?.();
    };
    reduceMQ.matches ? setTimeout(done, 200) : setTimeout(done, 380);
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", () => close());
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  $$("a", dialog).forEach((a) => a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href.startsWith("#")) return;
    e.preventDefault();
    close(() => {
      const target = document.querySelector(href);
      target?.scrollIntoView({ behavior: reduceMQ.matches ? "auto" : "smooth" });
      history.replaceState(null, "", href);
    });
  }));
  wideMQ.addEventListener("change", (e) => { if (e.matches && dialog.open) dialog.close(); });
}

/* =========================================================
   Reveal on enter (one-shot)
   ========================================================= */
{
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });

  // Stagger siblings that share a parent
  const groups = new Map();
  $$("[data-reveal]").forEach((el) => {
    const list = groups.get(el.parentElement) || [];
    list.push(el);
    groups.set(el.parentElement, list);
  });
  groups.forEach((list) => list.forEach((el, i) => el.style.setProperty("--d", `${Math.min(i, 5) * 70}ms`)));
  $$("[data-reveal]").forEach((el) => io.observe(el));
}

/* =========================================================
   Hero: pointer parallax (spring) + scroll fade
   ========================================================= */
{
  const sky = $("[data-sky]");
  const heroEls = [$("[data-hero]"), $(".hero__meta")];
  const orbs = $$(".orb", sky);
  const depth = [1, -0.6, 1.6];
  const sx = new Spring(0, { stiffness: 50, damping: 14 });
  const sy = new Spring(0, { stiffness: 50, damping: 14 });
  let wraps = [];

  // Wrap each orb so pointer offset and CSS drift keyframes don't fight over `transform`
  orbs.forEach((orb) => {
    const w = document.createElement("span");
    w.style.cssText = "position:absolute;inset:0;will-change:transform";
    orb.replaceWith(w);
    w.append(orb);
    wraps.push(w);
  });

  const renderSky = () => {
    wraps.forEach((w, i) => {
      w.style.transform = `translate3d(${sx.value * 40 * depth[i]}px, ${sy.value * 40 * depth[i]}px, 0)`;
    });
  };
  const step = (dt) => {
    const a = sx.step(dt), b = sy.step(dt);
    renderSky();
    return a && b;
  };

  addEventListener("pointermove", (e) => {
    if (!fineMQ.matches || reduceMQ.matches || window.scrollY > window.innerHeight) return;
    sx.target = e.clientX / window.innerWidth - 0.5;
    sy.target = e.clientY / window.innerHeight - 0.5;
    animate(step);
  }, { passive: true });

  let vh = window.innerHeight;
  measureTasks.add(() => { vh = window.innerHeight; });
  scrollTasks.add((y) => {
    if (reduceMQ.matches || y > vh * 1.2) return;
    const p = clamp(y / vh, 0, 1);
    heroEls.forEach((el) => {
      el.style.transition = "none"; // scroll-linked: never lag behind the finger
      el.style.transform = `translate3d(0, ${p * vh * 0.18}px, 0)`;
      el.style.opacity = String(1 - p * 1.1);
    });
  });
}

/* Live São Paulo clock */
{
  const el = $("[data-clock]");
  const fmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const tick = () => {
    const now = new Date();
    el.textContent = fmt.format(now);
    el.dateTime = now.toISOString();
  };
  tick();
  setInterval(tick, 15_000);
}

/* =========================================================
   Clients marquee (with an explicit pause control)
   ========================================================= */
{
  const marquee = $("[data-marquee]");
  const track = $("[data-marquee-track]");
  const toggle = $("[data-marquee-toggle]");
  // Duplicate once for a seamless -50% loop; clones are hidden from AT
  [...track.children].forEach((li) => {
    const c = li.cloneNode(true);
    c.setAttribute("aria-hidden", "true");
    track.append(c);
  });
  const sync = () => {
    const run = !reduceMQ.matches;
    marquee.classList.toggle("is-running", run);
    toggle.hidden = !run;
  };
  sync();
  reduceMQ.addEventListener("change", sync);
  toggle.addEventListener("click", () => {
    const paused = marquee.classList.toggle("is-paused");
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.textContent = paused ? "Retomar" : "Pausar";
  });
}

/* =========================================================
   Manifesto: words light up with scroll
   ========================================================= */
{
  const p = $("[data-words]");
  const text = p.textContent.trim();
  p.textContent = "";
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = text;
  p.append(sr);
  const words = text.split(/\s+/).map((w, i, arr) => {
    const s = document.createElement("span");
    s.className = "w";
    s.setAttribute("aria-hidden", "true");
    s.textContent = w;
    p.append(s);
    if (i < arr.length - 1) p.append(" ");
    return s;
  });
  let top = 0, height = 1, vh = 1;
  let lit = -1;
  measureTasks.add(() => {
    const r = p.getBoundingClientRect();
    top = r.top + window.scrollY;
    height = r.height;
    vh = window.innerHeight;
  });
  scrollTasks.add((y) => {
    if (reduceMQ.matches) {
      if (lit !== words.length) { words.forEach((w) => (w.style.opacity = "1")); lit = words.length; }
      return;
    }
    const start = top - vh * 0.8;
    const end = top + height - vh * 0.45;
    const progress = clamp((y - start) / (end - start), 0, 1);
    const n = Math.round(progress * words.length);
    if (n === lit) return;
    lit = n;
    words.forEach((w, i) => { w.style.opacity = i < n ? "1" : ""; });
  });
}

/* =========================================================
   Capabilities: preview that follows the pointer (spring)
   ========================================================= */
{
  const list = $("[data-caps]");
  const preview = $("[data-cap-preview]");
  const layers = $$(".cap-preview__layer", preview);
  const px = new Spring(0, { stiffness: 220, damping: 28 });
  const py = new Spring(0, { stiffness: 220, damping: 28 });
  const rot = new Spring(0, { stiffness: 180, damping: 20 });
  let w = 0, h = 0, primed = false;

  const render = () => {
    preview.style.transform = `translate3d(${px.value - w / 2}px, ${py.value - h / 2}px, 0) rotate(${rot.value}deg)`;
  };
  const step = (dt) => {
    const prev = px.value;
    const a = px.step(dt), b = py.step(dt);
    rot.target = clamp((px.value - prev) * 0.35, -8, 8);
    const c = rot.step(dt);
    render();
    return a && b && c;
  };

  list.addEventListener("pointermove", (e) => {
    if (!fineMQ.matches || reduceMQ.matches || !wideMQ.matches) return;
    if (!primed) {
      const r = preview.getBoundingClientRect();
      w = r.width; h = r.height;
      px.snap(e.clientX); py.snap(e.clientY);
      primed = true;
    }
    px.target = e.clientX;
    py.target = e.clientY;
    const item = e.target.closest("[data-preview]");
    if (item) {
      const idx = Number(item.dataset.preview);
      layers.forEach((l, i) => l.classList.toggle("is-active", i === idx));
      preview.classList.add("is-on");
    }
    animate(step);
  });
  list.addEventListener("pointerleave", () => { preview.classList.remove("is-on"); primed = false; });
  addEventListener("scroll", () => { if (preview.classList.contains("is-on")) { preview.classList.remove("is-on"); primed = false; } }, { passive: true });
}

/* =========================================================
   Work: vertical scroll drives a pinned horizontal track
   ========================================================= */
{
  const section = $("[data-work]");
  const track = $("[data-work-track]");
  const bar = $("[data-work-progress]");
  const counter = $("[data-work-index]");
  const cases = $$("[data-case]", track);
  const imgs = cases.map((c) => $("img", c));
  let pinned = false;
  let top = 0, distance = 0, vw = 0;
  let centers = [];
  let current = -1;

  const shouldPin = () => wideMQ.matches && !reduceMQ.matches;

  const measure = () => {
    const want = shouldPin();
    if (want !== pinned) {
      pinned = want;
      section.classList.toggle("is-pinned", pinned);
      track.style.transform = "";
      imgs.forEach((i) => (i.style.transform = ""));
      section.style.height = "";
    }
    if (!pinned) return;
    vw = window.innerWidth;
    distance = Math.max(0, track.scrollWidth - vw);
    section.style.height = `${distance + window.innerHeight}px`;
    top = section.getBoundingClientRect().top + window.scrollY;
    centers = cases.map((c) => c.offsetLeft + c.offsetWidth / 2);
  };
  measureTasks.add(measure);
  measure();
  window.addEventListener("load", remeasure);

  scrollTasks.add((y) => {
    if (!pinned) return;
    const p = clamp((y - top) / (distance || 1), 0, 1);
    const x = -p * distance;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
    bar.style.transform = `scaleX(${p})`;
    // Gentle inner parallax: each image drifts against the track
    imgs.forEach((img, i) => {
      const offset = clamp((centers[i] + x - vw / 2) / vw, -1, 1); // -1..1 around viewport center
      img.style.transform = `translate3d(${offset * -3}%, 0, 0) scale(1.08)`;
    });
    // Which case is closest to center
    let best = 0, bestD = Infinity;
    centers.forEach((c, i) => { const d = Math.abs(c + x - vw / 2); if (d < bestD) { bestD = d; best = i; } });
    if (best !== current) { current = best; counter.textContent = String(best + 1).padStart(2, "0"); }
  });

  // Keyboard: focus inside the transformed track scrolls the page to that spot
  track.addEventListener("focusin", (e) => {
    if (!pinned) return;
    const item = e.target.closest(".case, .work__outro, .work__intro");
    if (!item) return;
    const p = clamp((item.offsetLeft - vw * 0.1) / (distance || 1), 0, 1);
    window.scrollTo({ top: top + p * distance, behavior: "auto" });
  });

  wideMQ.addEventListener("change", remeasure);
  reduceMQ.addEventListener("change", remeasure);
}

/* =========================================================
   Stats: count up once
   ========================================================= */
{
  const fmt = new Intl.NumberFormat("pt-BR");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      const to = Number(el.dataset.count);
      if (reduceMQ.matches) { el.textContent = fmt.format(to); return; }
      const dur = 1600;
      const t0 = performance.now();
      const tick = (t) => {
        const k = clamp((t - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt.format(Math.round(to * eased));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => { el.textContent = "0"; io.observe(el); });
}

/* =========================================================
   Process: progress line fills with scroll
   ========================================================= */
{
  const wrap = $("[data-process]");
  const line = $("[data-process-line]");
  const steps = $(".process__steps", wrap);
  let top = 0, height = 1, vh = 1;
  measureTasks.add(() => {
    const r = steps.getBoundingClientRect();
    top = r.top + window.scrollY;
    height = r.height;
    vh = window.innerHeight;
  });
  scrollTasks.add((y) => {
    const p = reduceMQ.matches ? 1 : clamp((y + vh * 0.6 - top) / height, 0, 1);
    line.style.transform = `scaleY(${p})`;
  });
}

/* =========================================================
   Footer wordmark rises as you reach the end
   ========================================================= */
{
  const mark = $("[data-ftr-mark] span");
  let top = 0, vh = 1;
  measureTasks.add(() => {
    mark.style.transform = "";
    top = mark.parentElement.getBoundingClientRect().top + window.scrollY;
    vh = window.innerHeight;
  });
  scrollTasks.add((y) => {
    if (reduceMQ.matches) return;
    const p = clamp((y + vh - top) / (vh * 0.6), 0, 1);
    mark.style.transform = `translate3d(0, ${lerp(45, 0, p)}%, 0)`;
  });
}

/* Scroll progress fallback where CSS scroll timelines aren't supported */
if (!CSS.supports("animation-timeline: scroll()")) {
  const bar = $(".progress span");
  let max = 1;
  measureTasks.add(() => { max = Math.max(1, root.scrollHeight - window.innerHeight); });
  scrollTasks.add((y) => { bar.style.transform = `scaleX(${clamp(y / max, 0, 1)})`; });
}

/* =========================================================
   Magnetic buttons (spring, fine pointers only)
   ========================================================= */
$$("[data-magnetic]").forEach((el) => {
  const x = new Spring(0, { stiffness: 260, damping: 18 });
  const y = new Spring(0, { stiffness: 260, damping: 18 });
  const step = (dt) => {
    const a = x.step(dt), b = y.step(dt);
    el.style.transform = `translate3d(${x.value}px, ${y.value}px, 0)`;
    return a && b;
  };
  el.addEventListener("pointermove", (e) => {
    if (!fineMQ.matches || reduceMQ.matches) return;
    const r = el.getBoundingClientRect();
    x.target = (e.clientX - (r.left + r.width / 2)) * 0.3;
    y.target = (e.clientY - (r.top + r.height / 2)) * 0.4;
    animate(step);
  });
  el.addEventListener("pointerleave", () => { x.target = 0; y.target = 0; animate(step); });
});

/* =========================================================
   Copy e-mail
   ========================================================= */
$$("[data-copy]").forEach((btn) => {
  const label = $("[data-copy-label]", btn);
  let t;
  const swap = (text) => {
    btn.classList.add("is-swapping");
    setTimeout(() => { label.textContent = text; btn.classList.remove("is-swapping"); }, 150);
  };
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      swap("Copiado ✓");
    } catch {
      swap("Selecione e copie");
    }
    clearTimeout(t);
    t = setTimeout(() => swap("Copiar"), 2000);
  });
});

/* =========================================================
   Form: inline validation, focus first error, honest status
   ========================================================= */
{
  const form = $("[data-form]");
  const status = $("[data-form-status]");
  const submit = $("[data-submit]");
  const submitLabel = $("[data-submit-label]");
  const rules = {
    nome: (v) => (v.trim().length >= 2 ? "" : "Diga como podemos te chamar."),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Use um e-mail válido, como nome@empresa.com."),
    mensagem: (v) => (v.trim().length >= 10 ? "" : "Conte um pouco mais — pelo menos 10 caracteres."),
  };

  const check = (name) => {
    const input = form.elements[name];
    const msg = rules[name](input.value);
    const err = $(`#e-${name}`);
    err.textContent = msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg) input.setAttribute("aria-describedby", err.id); else input.removeAttribute("aria-describedby");
    input.closest(".field").classList.toggle("is-invalid", Boolean(msg));
    return !msg;
  };

  Object.keys(rules).forEach((name) => {
    const input = form.elements[name];
    input.addEventListener("blur", () => { if (input.value) check(name); });
    input.addEventListener("input", () => { if (input.getAttribute("aria-invalid") === "true") check(name); });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    status.textContent = "";
    const invalid = Object.keys(rules).filter((n) => !check(n));
    if (invalid.length) {
      form.elements[invalid[0]].focus();
      return;
    }
    submit.classList.add("is-busy");
    submit.setAttribute("aria-busy", "true");
    submitLabel.textContent = "Enviando…";
    setTimeout(() => {
      submit.classList.remove("is-busy");
      submit.removeAttribute("aria-busy");
      submitLabel.textContent = "Enviar mensagem";
      const nome = form.elements.nome.value.trim().split(" ")[0];
      form.reset();
      $$("[aria-invalid]", form).forEach((i) => i.removeAttribute("aria-invalid"));
      status.textContent = `Obrigado, ${nome}! Recebemos sua mensagem e respondemos em até 1 dia útil.`;
    }, 900);
  });
}

/* Year */
$$("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));
