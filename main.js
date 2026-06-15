import * as THREE from 'three';

/* ============================================================
   1. THREE.JS — INTERACTIVE 3D WAVE GRID
   A vast field of glowing points receding to the horizon.
   It ripples like an ocean of light and lifts toward the
   cursor in real time. Depth fog keeps the far field soft and
   text readable.
   ============================================================ */
const canvas = document.querySelector('#webgl');
const sizes = { w: window.innerWidth, h: window.innerHeight };
let scrollProgress = 0;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#04070d', 0.045);

const camera = new THREE.PerspectiveCamera(65, sizes.w / sizes.h, 0.1, 200);
camera.position.set(0, 7, 18);
camera.lookAt(0, 0, -6);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.w, sizes.h);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor('#04070d', 1);

// --- Build a grid of points on the XZ plane ---
const SEG = 160;                 // points per side
const SPAN = 70;                 // world size of the grid
const half = SPAN / 2;
const total = SEG * SEG;
const gridPos = new Float32Array(total * 3);
let k = 0;
for (let ix = 0; ix < SEG; ix++) {
  for (let iz = 0; iz < SEG; iz++) {
    gridPos[k++] = (ix / (SEG - 1)) * SPAN - half;        // x
    gridPos[k++] = 0;                                      // y (displaced in shader)
    gridPos[k++] = (iz / (SEG - 1)) * SPAN - half - 10;    // z (pushed back a bit)
  }
}
const gridGeo = new THREE.BufferGeometry();
gridGeo.setAttribute('position', new THREE.BufferAttribute(gridPos, 3));

const gridMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  fog: true,
  uniforms: {
    ...THREE.UniformsLib.fog,
    uTime:   { value: 0 },
    uMouse:  { value: new THREE.Vector2(0, 0) },  // in grid/world coords
    uScroll: { value: 0 },
    uPixel:  { value: renderer.getPixelRatio() },
    uColorLow:  { value: new THREE.Color('#0a3a66') }, // troughs (deep blue)
    uColorHigh: { value: new THREE.Color('#3df0ff') }, // peaks (bright cyan)
  },
  vertexShader: `
    uniform float uTime, uScroll, uPixel;
    uniform vec2 uMouse;
    varying float vH;
    #include <fog_pars_vertex>

    void main(){
      vec3 p = position;

      // layered travelling waves
      float w = 0.0;
      w += sin(p.x * 0.18 + uTime * 0.9) * 0.9;
      w += cos(p.z * 0.15 + uTime * 0.7) * 0.9;
      w += sin((p.x + p.z) * 0.10 + uTime * 0.5) * 0.6;
      w += sin(length(p.xz) * 0.20 - uTime * 1.1) * 0.5; // ripple from center

      // interactive bump that rises toward the cursor
      float md = distance(p.xz, uMouse);
      w += exp(-md * md * 0.012) * 4.0;

      p.y += w;
      vH = w;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = uPixel * (220.0 / -mvPosition.z) * (0.5 + smoothstep(-1.0, 4.0, w) * 0.9);
      gl_Position = projectionMatrix * mvPosition;

      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    uniform vec3 uColorLow, uColorHigh;
    varying float vH;
    #include <fog_pars_fragment>

    void main(){
      // round, soft points
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if (d > 0.5) discard;
      float glow = smoothstep(0.5, 0.0, d);

      float h = clamp(vH * 0.25 + 0.5, 0.0, 1.0);
      vec3 col = mix(uColorLow, uColorHigh, h);

      gl_FragColor = vec4(col, glow * (0.45 + h * 0.55));
      #include <fog_fragment>
    }
  `,
});

const grid = new THREE.Points(gridGeo, gridMat);
scene.add(grid);

// --- Mouse → smoothed world target on the grid plane ---
const mouse = { tx: 0, ty: 0, x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
  // map screen → approximate grid coordinates
  mouse.tx = (e.clientX / window.innerWidth - 0.5) * SPAN;
  mouse.ty = (e.clientY / window.innerHeight - 0.5) * SPAN * 0.6 - 6;
});

// --- Render loop ---
const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();
  mouse.x += (mouse.tx - mouse.x) * 0.06;
  mouse.y += (mouse.ty - mouse.y) * 0.06;

  gridMat.uniforms.uTime.value = t;
  gridMat.uniforms.uScroll.value = scrollProgress;
  gridMat.uniforms.uMouse.value.set(mouse.x, mouse.y);

  // slow camera drift + gentle rise as you scroll
  camera.position.x = Math.sin(t * 0.1) * 1.5;
  camera.position.y = 7 + scrollProgress * 6;
  camera.lookAt(0, 0, -6);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
  sizes.w = window.innerWidth; sizes.h = window.innerHeight;
  camera.aspect = sizes.w / sizes.h; camera.updateProjectionMatrix();
  renderer.setSize(sizes.w, sizes.h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  gridMat.uniforms.uPixel.value = renderer.getPixelRatio();
});

/* ============================================================
   2. LENIS — Smooth scroll
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

const progressFill = document.querySelector('#progressFill');
function updateProgress() {
  const max = document.body.scrollHeight - window.innerHeight;
  scrollProgress = max > 0 ? window.scrollY / max : 0;
  progressFill.style.width = (scrollProgress * 100) + '%';
}

let lenis = null;
if (typeof Lenis !== 'undefined') {
  lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  lenis.on('scroll', ScrollTrigger.update);
  lenis.on('scroll', (e) => {
    scrollProgress = e.progress ?? (window.scrollY / (document.body.scrollHeight - window.innerHeight));
    progressFill.style.width = (scrollProgress * 100) + '%';
  });
} else {
  // Fallback: native scroll if Lenis failed to load
  console.warn('Lenis not available — using native scroll.');
  window.addEventListener('scroll', () => { updateProgress(); ScrollTrigger.update(); });
}

// anchor links → smooth scroll (works with or without Lenis)
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (lenis) lenis.scrollTo(a.getAttribute('href'), { offset: 0 });
    else if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ============================================================
   3. CUSTOM CURSOR
   ============================================================ */
const cursor = document.querySelector('#cursor');
const follow = document.querySelector('#cursorFollow');
let cx = 0, cy = 0, fx = 0, fy = 0;
window.addEventListener('mousemove', (e) => {
  cx = e.clientX; cy = e.clientY;
  cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
});
function cursorLoop() {
  fx += (cx - fx) * 0.15; fy += (cy - fy) * 0.15;
  follow.style.transform = `translate(${fx}px, ${fy}px) translate(-50%,-50%)`;
  requestAnimationFrame(cursorLoop);
}
cursorLoop();
document.querySelectorAll('[data-cursor]').forEach((el) => {
  el.addEventListener('mouseenter', () => follow.classList.add('grow'));
  el.addEventListener('mouseleave', () => follow.classList.remove('grow'));
});

// Make entire project cards clickable → open their link in a new tab
document.querySelectorAll('.project[data-href]').forEach((card) => {
  card.addEventListener('click', () => {
    window.open(card.getAttribute('data-href'), '_blank', 'noopener');
  });
});

/* ============================================================
   4. LOADER → reveal
   ============================================================ */
const loader = document.querySelector('#loader');
const loaderCount = document.querySelector('#loaderCount');
let loaderDone = false;
function hideLoader() {
  if (loaderDone) return;
  loaderDone = true;
  gsap.to(loader, {
    yPercent: -100, duration: 1, ease: 'power4.inOut',
    onComplete: () => { loader.style.display = 'none'; },
  });
  introAnimation();
}
let count = { v: 0 };
gsap.to(count, {
  v: 100, duration: 2, ease: 'power2.inOut',
  onUpdate: () => { loaderCount.textContent = Math.round(count.v); },
  onComplete: hideLoader,
});
// Failsafe: never let the loader trap the page, even if something errors above.
setTimeout(hideLoader, 4000);

/* ============================================================
   5. INTRO + SCROLL ANIMATIONS (GSAP)
   ============================================================ */
function introAnimation() {
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.from('.hero-title .word', { yPercent: 120, duration: 1.1, stagger: 0.12 })
    .from('.hero-eyebrow', { opacity: 0, y: 20, duration: 0.8 }, '-=0.8')
    .from('.hero-sub', { opacity: 0, y: 20, duration: 0.8 }, '-=0.6')
    .to('.hero-sub.reveal, .hero-eyebrow.reveal', { opacity: 1 }, '<');
}

// Split big-text into chars for stagger reveal
document.querySelectorAll('[data-stagger]').forEach((el) => {
  const text = el.innerHTML;
  // preserve <br> and spans
  el.innerHTML = text.replace(/<br\s*\/?>/g, '___BR___')
    .replace(/<span class="accent">(.*?)<\/span>/g, (m, p1) =>
      `<span class="accent">${wrapChars(p1)}</span>`);
  el.innerHTML = el.innerHTML.split('___BR___').map((seg) =>
    seg.includes('class="accent"') ? seg : wrapChars(seg)
  ).join('<br>');
});
function wrapChars(str) {
  // Group characters by word so lines never break in the middle of a word.
  return str.split(' ').map((word) => {
    if (word === '') return '';
    const chars = word.split('').map((c) => `<span class="char">${c}</span>`).join('');
    return `<span class="word-wrap">${chars}</span>`;
  }).join(' ');
}

// Animate each [data-stagger] block on scroll
gsap.utils.toArray('[data-stagger]').forEach((el) => {
  gsap.from(el.querySelectorAll('.char'), {
    scrollTrigger: { trigger: el, start: 'top 80%' },
    yPercent: 110, opacity: 0, duration: 0.8, stagger: 0.02, ease: 'power4.out',
  });
});

// Generic reveal elements
gsap.utils.toArray('.reveal').forEach((el) => {
  if (el.closest('.hero')) return; // hero handled by intro
  gsap.to(el, {
    scrollTrigger: { trigger: el, start: 'top 85%' },
    opacity: 1, y: 0, duration: 1, ease: 'power3.out',
  });
});

// Section index labels parallax
gsap.utils.toArray('.section-index').forEach((el) => {
  gsap.to(el, {
    scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    y: -60,
  });
});

// Projects slide in
gsap.utils.toArray('.project').forEach((el, i) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 88%' },
    x: -60, opacity: 0, duration: 0.9, ease: 'power3.out', delay: (i % 4) * 0.05,
  });
});

// Skill cards pop
gsap.from('.skill-card', {
  scrollTrigger: { trigger: '.skills-grid', start: 'top 80%' },
  y: 50, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(1.4)',
});

// Hero parallax on scroll
gsap.to('.hero-content', {
  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  yPercent: 40, opacity: 0.3,
});
