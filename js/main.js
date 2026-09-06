// Wait until the full DOM is loaded before running scripts
window.addEventListener("DOMContentLoaded", () => {
  // Register ScrollTrigger plugin from GSAP
  gsap.registerPlugin(ScrollTrigger);

  const header = document.querySelector("header");

  // Brand colour token, read from the stylesheet so the palette only ever
  // lives in one place.
  const css = getComputedStyle(document.documentElement);
  const GOLD = css.getPropertyValue("--gold").trim() || "#d1a355";

  // ==========================
  // Mobile Menu Toggle
  // ==========================

  function toggleMobileNav() {
    document.getElementById("mobileMenu").classList.toggle("show");
  }

  window.toggleMobileNav = toggleMobileNav;

  document.querySelectorAll(".mobile-nav a").forEach((link) => {
    link.addEventListener("click", () =>
      document.getElementById("mobileMenu").classList.remove("show")
    );
  });

  // ==========================
  // Menu Tabs (Section 3)
  // ==========================

  function setupMenuTabs() {
    const tabs = document.querySelectorAll(".menu-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetId = tab.dataset.target;

        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        document.querySelectorAll(".menu-panel").forEach((panel) => {
          panel.classList.toggle("active", panel.id === targetId);
        });

        ScrollTrigger.refresh();
      });
    });
  }

  // ==========================
  // Initial Page Load Animations
  // ==========================

  function runInitialAnimations() {
    const HERO_SPEED = 1;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set("header", { "--border-width": "100%" });
      gsap.set(".hero-content h1", {
        opacity: 1,
        color: GOLD,
        "-webkit-text-stroke": "0px " + GOLD,
      });
      gsap.set(".hero-visual-wrapper", { opacity: 1 });
      gsap.set(".hero-badge-slot", { opacity: 1, scale: 1 });
      return;
    }

    const onLoadTl = gsap.timeline({
      defaults: { ease: "power2.out", duration: 1.2 },
    });
    onLoadTl.timeScale(HERO_SPEED);

    onLoadTl
      // Header hairline draws in slowly underneath everything else
      .to("header", { "--border-width": "100%", duration: 2.2, ease: "power1.inOut" }, 0)

      // Logo lockup settles first
      .from(".logo-mark, .logo-en", { y: 18, opacity: 0, duration: 1.1, stagger: 0.13 }, 0)

      // Nav links drift down into place
      .from(
        ".desktop-nav a, .nav-cta",
        { y: -34, opacity: 0, duration: 1.1, stagger: 0.08, ease: "power3.out" },
        0.05
      )

      // Badge pops in
      .to(".hero-badge-slot", { opacity: 1, scale: 1, duration: 0.9, ease: "back.out(1.6)" }, 0.15)

      // Hero wordmark: fades up as an outline, then the gold fill bleeds in
      .to(".hero-content h1", { opacity: 1, duration: 1 }, 0.2)
      .from(
        ".hero-content .line",
        { x: 64, opacity: 0, duration: 1.4, stagger: 0.16, ease: "power3.out" },
        0.25
      )
      .to(
        ".hero-content h1",
        { color: GOLD, "-webkit-text-stroke": "0px " + GOLD, duration: 1.5, ease: "power1.inOut" },
        0.55
      )

      // Visual eases in slightly oversized and settles
      .fromTo(
        ".hero-visual-wrapper",
        { opacity: 0 },
        { opacity: 1, duration: 1.6, ease: "power2.out" },
        0.35
      )
      .fromTo(
        ".hero-visual",
        { scale: 1.08, rotate: 7 },
        { scale: 1, rotate: 4, duration: 1.8, ease: "power2.out" },
        0.35
      )

      // Tagline and actions trail the wordmark
      .from(".hero-tagline", { y: 18, opacity: 0, duration: 1.2 }, 1.1)
      .from(".hero-actions", { y: 18, opacity: 0, duration: 1.2 }, 1.25)
      .from(".scroll-cue", { y: 14, opacity: 0, duration: 1.1 }, 1.5);
  }

  // ==========================
  // Reusable Scroll-Based Animation Setup
  // ==========================

  function pinAndAnimate({
    trigger,
    endTrigger,
    end,
    pin,
    animations,
    markers = false,
    headerOffset = 0,
  }) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger,
        start: `top top+=${headerOffset}`,
        endTrigger,
        end: end || `top top+=${headerOffset}`,
        scrub: 1.1,
        pin,
        pinSpacing: false,
        markers: markers,
        invalidateOnRefresh: true,
      },
    });

    animations.forEach(({ target, vars, position = 0 }) => {
      tl.to(target, vars, position);
    });
  }

  // ==========================
  // Scroll Reveals (content sections)
  // ==========================

  function setupReveals() {
    const reveal = (target, opts = {}) => {
      const { triggerEl, ...vars } = opts;
      gsap.from(target, {
        y: 44,
        opacity: 0,
        duration: 1.4,
        ease: "power2.out",
        ...vars,
        scrollTrigger: {
          trigger: triggerEl || target,
          start: "top 88%",
          once: true,
        },
      });
    };

    // Intro column (Section 1 — Kimbo)
    reveal(".intro-left .small-title");
    reveal(".intro-left .main-heading", { delay: 0.08 });
    reveal(".intro-left .description", { delay: 0.14 });
    reveal(".stat-row .stat", { stagger: 0.12, triggerEl: ".stat-row" });
    reveal(".intro-left .cta-box", { delay: 0.2 });

    reveal(".ingredients-title");
    reveal(".ingredient-item", { x: 30, y: 0, stagger: 0.1, triggerEl: ".ingredients-log" });

    // Section 2 — Nos incontournables: cards stagger in as a group
    // (scoped to .section-showcase so these selectors never also match the
    // Menu section's heading, which reuses the same classes for styling —
    // two competing tweens on one element would otherwise leave it stuck.)
    reveal(".section-showcase .showcase-title");
    reveal(".section-showcase .showcase-heading", { delay: 0.06 });
    reveal(".showcase-card", {
      y: 60,
      stagger: 0.1,
      triggerEl: ".showcase-grid",
    });

    // Section 3 — Menu
    reveal(".section-menu .small-title");
    reveal(".section-menu .showcase-heading", { delay: 0.06 });
    reveal(".menu-note", { delay: 0.1 });
    reveal(".menu-tab", { y: 16, stagger: 0.06, triggerEl: ".menu-tabs" });

    // Section 4 — Expérience: text lines stagger, image is handled by parallax below
    gsap.from(".experience-line", {
      y: 36,
      opacity: 0,
      duration: 1.2,
      stagger: 0.15,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".section-experience",
        start: "top 65%",
        once: true,
      },
    });

    // Section 5 — Galerie
    reveal(".section-gallery .showcase-title");
    reveal(".section-gallery .showcase-heading", { delay: 0.06 });

    // Section 5 — Galerie: reveal + scale, item by item
    document.querySelectorAll(".gallery-item").forEach((item, i) => {
      gsap.from(item, {
        y: 50,
        opacity: 0,
        scale: 0.94,
        duration: 1.1,
        ease: "power2.out",
        delay: (i % 4) * 0.06,
        scrollTrigger: {
          trigger: item,
          start: "top 90%",
          once: true,
        },
      });
    });

    // Section 6 — Localisation
    reveal(".location-inner .small-title");
    reveal(".location-heading", { delay: 0.08 });
    reveal(".location-line", { stagger: 0.08, triggerEl: ".location-inner", delay: 0.14 });
    reveal(".location-inner .cta-box", { delay: 0.24 });

    // Section 7 — Commander (closing)
    reveal(".outro .small-title");
    reveal(".outro-heading", { delay: 0.08 });
    reveal(".outro .description", { delay: 0.14 });
    reveal(".outro .cta-box", { delay: 0.2 });
  }

  // ==========================
  // Gentle parallax for images that aren't part of the hero pin choreography
  // ==========================

  function setupParallax() {
    ScrollTrigger.matchMedia({
      "(min-width: 769px)": function () {
        // Experience section: background photo drifts and settles as it scales down slightly
        gsap.fromTo(
          ".experience-img",
          { scale: 1.16, y: -40 },
          {
            scale: 1.02,
            y: 40,
            ease: "none",
            scrollTrigger: {
              trigger: ".section-experience",
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          }
        );

        // Gallery: a light parallax drift on the taller feature tiles
        gsap.utils.toArray(".gallery-item.g-1 img, .gallery-item.g-7 img").forEach((img) => {
          gsap.fromTo(
            img,
            { y: -24 },
            {
              y: 24,
              ease: "none",
              scrollTrigger: {
                trigger: img,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
              },
            }
          );
        });
      },

      "(max-width: 768px)": function () {
        gsap.set(".experience-img", { scale: 1.04 });
      },
    });
  }

  // ==========================
  // ScrollTrigger Configurations for Desktop & Mobile
  // ==========================

  function setupScrollAnimations() {
    const headerOffset = header.offsetHeight - 1;

    ScrollTrigger.matchMedia({
      // Desktop: the hero visual is pinned and choreographed through the story
      "(min-width: 769px)": function () {
        // 1. Visual settles and straightens as it leaves the hero
        pinAndAnimate({
          trigger: ".hero",
          endTrigger: ".section-intro",
          pin: ".hero-visual-wrapper",
          animations: [
            { target: ".hero-visual", vars: { rotate: -2, scale: 0.82, x: "6%" } },
          ],
          headerOffset,
        });

        // 2. Visual drifts left and shrinks through the Kimbo intro
        pinAndAnimate({
          trigger: ".section-intro",
          endTrigger: ".section-showcase",
          pin: ".hero-visual-wrapper",
          animations: [
            { target: ".hero-visual", vars: { rotate: 3, scale: 0.62, x: "-18%", y: "6%" } },
          ],
          headerOffset,
        });

        // 3. Visual centres, shrinks further and fades before the showcase cards take over
        pinAndAnimate({
          trigger: ".section-showcase",
          endTrigger: ".section-menu",
          pin: ".hero-visual-wrapper",
          animations: [
            { target: ".hero-visual", vars: { rotate: 0, scale: 0.4, x: "0%", y: "10%", opacity: 0 } },
          ],
          headerOffset,
        });
      },

      // Mobile: no pinned choreography, just a simple fade-in already handled on load
      "(max-width: 768px)": function () {
        gsap.set(".hero-visual-wrapper", { opacity: 1 });
      },
    });
  }

  // ==========================
  // Init Everything on Load
  // ==========================

  runInitialAnimations();
  setupMenuTabs();
  setupReveals();
  setupParallax();
  setupScrollAnimations();

  ScrollTrigger.refresh();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
});
