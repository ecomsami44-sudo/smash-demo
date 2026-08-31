/* ==========================================================================
   CINDER — Smash Burger Co.
   Interactions du site (vanilla JS, sans dépendance)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Navbar : effet au scroll ---------- */
  const navbar = document.getElementById('navbar');
  const setNavbarState = () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  setNavbarState();
  window.addEventListener('scroll', setNavbarState, { passive: true });

  /* ---------- Navbar : menu mobile ---------- */
  const navBurger = document.getElementById('navBurger');
  const navNav = document.getElementById('navbar-nav');

  const closeMobileNav = () => {
    navNav.classList.remove('is-open');
    navBurger.setAttribute('aria-expanded', 'false');
    navBurger.setAttribute('aria-label', 'Ouvrir le menu');
  };

  navBurger.addEventListener('click', () => {
    const isOpen = navNav.classList.toggle('is-open');
    navBurger.setAttribute('aria-expanded', String(isOpen));
    navBurger.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
  });

  navNav.querySelectorAll('.navbar__link').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  /* ---------- Halo qui suit le curseur ---------- */
  const cursorGlow = document.querySelector('.cursor-glow');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && cursorGlow) {
    let raf = null;
    window.addEventListener('pointermove', (e) => {
      cursorGlow.classList.add('is-active');
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cursorGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      });
    }, { passive: true });
    document.addEventListener('mouseleave', () => cursorGlow.classList.remove('is-active'));
  }

  /* ---------- Animations au scroll (reveal) ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-reveal-delay');
          if (delay) entry.target.style.transitionDelay = `${delay}ms`;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Filtrage de la carte (Menu) ---------- */
  const tabButtons = document.querySelectorAll('.menu-tabs__btn');
  const menuCards = document.querySelectorAll('.menu-card');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      tabButtons.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');

      menuCards.forEach(card => {
        const match = card.getAttribute('data-category') === filter;
        card.classList.toggle('is-hidden', !match);
      });
    });
  });

  /* ---------- Bouton "Commander" (démo, pas de backend) ---------- */
  const orderBtn = document.getElementById('orderBtn');
  if (orderBtn) {
    orderBtn.addEventListener('click', () => {
      const original = orderBtn.querySelector('span').textContent;
      orderBtn.querySelector('span').textContent = 'Commande envoyée — merci !';
      orderBtn.style.pointerEvents = 'none';
      setTimeout(() => {
        orderBtn.querySelector('span').textContent = original;
        orderBtn.style.pointerEvents = 'auto';
      }, 2600);
    });
  }

  /* ---------- Newsletter (démo, pas de backend) ---------- */
  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterNote = document.getElementById('newsletterNote');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      newsletterNote.textContent = 'Merci ! (démo — aucun e-mail n\'est réellement envoyé)';
      newsletterForm.reset();
    });
  }

});
