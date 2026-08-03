// Counter animation: any element with data-count="123" animates 0 -> 123 on first view
(function () {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const dur = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      el.textContent = Number.isInteger(target) ? Math.round(val).toLocaleString() : val.toFixed(1);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach(animate);
  }
})();

// Solutions: highlight the matching panel item while its story card crosses viewport center
(function () {
  const cards = document.querySelectorAll('.solution-card[data-solution]');
  const items = document.querySelectorAll('.solutions-panel li[data-solution]');
  if (!cards.length || !items.length || !('IntersectionObserver' in window)) return;
  const setActive = (key) => {
    items.forEach((li) => li.classList.toggle('is-active', li.dataset.solution === key));
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.dataset.solution); });
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
  );
  cards.forEach((el) => io.observe(el));
})();

// Subtle card tilt on mouse move
(function () {
  const cards = document.querySelectorAll('[data-tilt]');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
})();
