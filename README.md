# Ayush — 3D Portfolio

An award-style 3D portfolio with cinematic smooth scrolling.

## Tech
- **Three.js** — animated 3D background (morphing torus knot, wireframe shell, 1200 particles, mouse parallax, scroll-driven camera)
- **GSAP + ScrollTrigger** — text reveals, staggered char animations, scroll-scrubbed parallax
- **Lenis** — buttery smooth "legendary" scrolling
- Custom cursor, animated loader, scroll progress bar

All via CDN — **no build step needed**.

## Run it
Because browsers block ES modules over `file://`, run a tiny local server:

```bash
# Option 1: Python (already on most machines)
cd 3d-portfolio
python -m http.server 5500
# then open http://localhost:5500

# Option 2: VS Code
# Right-click index.html → "Open with Live Server"

# Option 3: Node
npx serve
```

## Make it yours
- **Name/title** → `index.html` (hero section, nav logo)
- **Projects** → edit the `.project` articles in `index.html`
- **Colors** → `:root` variables in `style.css` (`--accent`, `--accent-2`)
- **3D object** → swap `TorusKnotGeometry` in `main.js` for any Three.js geometry
- **Email/socials** → contact section in `index.html`

## Deploy
Drop the folder on **Netlify**, **Vercel**, or **GitHub Pages** — it's all static.
