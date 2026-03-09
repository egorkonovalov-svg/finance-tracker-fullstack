(() => {
  'use strict';

  const screens = [
    { label: 'Dashboard', file: '04-dashboard.svg' },
    { label: 'Transactions', file: '05-transactions.svg' },
    { label: 'Add Transaction', file: '06-add-transaction.svg' },
    { label: 'Analytics', file: '07-analytics.svg' },
    { label: 'Settings', file: '08-settings.svg' },
    { label: 'Welcome', file: '01-welcome.svg' },
  ];

  const SVG_BASE = 'screens/';

  /* ── Theme toggle ────────────────────────────────────────── */
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('ft-theme');
  if (stored === 'dark' || (!stored && matchMedia('(prefers-color-scheme:dark)').matches)) {
    root.setAttribute('data-theme', 'dark');
  }
  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('ft-theme', next);
  });

  /* ── Fetch SVG helper ────────────────────────────────────── */
  async function loadSVG(file) {
    try {
      const res = await fetch(SVG_BASE + file);
      if (!res.ok) return '';
      return await res.text();
    } catch { return ''; }
  }

  /* ── Hero phone ──────────────────────────────────────────── */
  const heroScreen = document.getElementById('heroScreen');
  loadSVG('04-dashboard.svg').then(svg => { heroScreen.innerHTML = svg; });

  /* ── Carousel ────────────────────────────────────────────── */
  const track = document.getElementById('carousel');
  const dotsContainer = document.getElementById('carouselDots');
  const labelEl = document.getElementById('carouselLabel');
  let currentIndex = 0;
  let items = [];

  async function buildCarousel() {
    for (let i = 0; i < screens.length; i++) {
      const item = document.createElement('div');
      item.className = 'carousel-item phone-small';
      item.innerHTML = `
        <div class="phone-frame">
          <div class="phone-notch"></div>
          <div class="phone-screen"></div>
        </div>`;
      const svg = await loadSVG(screens[i].file);
      item.querySelector('.phone-screen').innerHTML = svg;
      item.addEventListener('click', () => goTo(i));
      track.appendChild(item);

      const dot = document.createElement('button');
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', screens[i].label);
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
    items = track.querySelectorAll('.carousel-item');
    goTo(0);
  }

  function goTo(idx) {
    currentIndex = idx;
    const dots = dotsContainer.querySelectorAll('.carousel-dot');

    items.forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });
    dots.forEach((el, i) => el.classList.toggle('active', i === idx));
    labelEl.textContent = screens[idx].label;

    updateTrackPosition();
  }

  function updateTrackPosition() {
    if (!items.length) return;
    const containerWidth = track.parentElement.offsetWidth - 88;
    const activeItem = items[currentIndex];
    const itemCenter = activeItem.offsetLeft + activeItem.offsetWidth / 2;
    const offset = containerWidth / 2 - itemCenter;
    track.style.transform = `translateX(${offset}px)`;
  }

  document.getElementById('prevBtn').addEventListener('click', () => {
    goTo((currentIndex - 1 + screens.length) % screens.length);
  });
  document.getElementById('nextBtn').addEventListener('click', () => {
    goTo((currentIndex + 1) % screens.length);
  });

  window.addEventListener('resize', updateTrackPosition);

  buildCarousel();

  /* ── Scroll reveal ───────────────────────────────────────── */
  const revealTargets = '.feature-card, .tech-card, .cta-inner, .section-title, .section-label';
  document.querySelectorAll(revealTargets).forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  /* ── Navbar shadow on scroll ─────────────────────────────── */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 10 ? 'var(--shadow)' : 'none';
  }, { passive: true });

  /* ── Keyboard nav for carousel ───────────────────────────── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo((currentIndex - 1 + screens.length) % screens.length);
    if (e.key === 'ArrowRight') goTo((currentIndex + 1) % screens.length);
  });
})();
