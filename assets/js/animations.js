// Section reveal on scroll using IntersectionObserver (works without GSAP)
(function () {
  const els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
  );
  els.forEach((el) => io.observe(el));
})();

// GSAP-driven extras (loaded lazily if GSAP is present)
window.addEventListener('load', () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Hero headline char-by-char reveal
  document.querySelectorAll('[data-hero-text]').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.opacity = '0';
      span.style.display = 'inline-block';
      span.style.transform = 'translateY(20px)';
      el.appendChild(span);
      gsap.to(span, { opacity: 1, y: 0, duration: 0.5, delay: i * 0.03, ease: 'power2.out' });
    });
  });

  // Pinned horizontal scroll for sections marked [data-pin-horizontal]
  const horiz = document.querySelector('[data-pin-horizontal]');
  if (horiz) {
    const track = horiz.querySelector('[data-horizontal-track]');
    if (track) {
      const distance = () => track.scrollWidth - window.innerWidth + 48;
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: horiz,
          start: 'top top',
          end: () => '+=' + distance(),
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
    }
  }
});
