// Toggle header solid background once user scrolls past threshold
(function () {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const threshold = 80;
  const onScroll = () => {
    if (window.scrollY > threshold) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Highlight active nav link based on current pathname
(function () {
  const links = document.querySelectorAll('.nav-primary a');
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  links.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
    const cleaned = href.replace(/\/$/, '');
    if (cleaned && path.endsWith(cleaned)) a.classList.add('is-active');
  });
})();
