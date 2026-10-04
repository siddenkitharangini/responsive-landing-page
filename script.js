const navbar = document.querySelector(".navbar");
const navLinks = [...document.querySelectorAll(".nav-links a")];
const sections = [...document.querySelectorAll("main > section")];
const sectionLinks = document.querySelectorAll('a[href^="#"]:not(.logo)');
const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-links");
const mobileNavigation = window.matchMedia("(max-width: 768px)");

if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

function setMobileMenuOpen(isOpen) {
    if (!isOpen && navMenu.contains(document.activeElement)) {
        menuToggle.focus();
    }
    navbar.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    navMenu.inert = mobileNavigation.matches && !isOpen;
    navMenu.setAttribute("aria-hidden", String(mobileNavigation.matches && !isOpen));
}

function updateNavbar() {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
}

window.addEventListener("scroll", updateNavbar, { passive: true });
window.addEventListener("resize", updateNavbar);
updateNavbar();

function navigateToSection(section, behavior = "auto") {
    navbar.style.transition = "none";
    if (section.id === "home") {
        navbar.classList.remove("scrolled");
    } else {
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        navbar.classList.toggle("scrolled", Math.max(0, sectionTop - navbar.offsetHeight) > 50);
        void navbar.offsetHeight;
    }

    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
        top: section.id === "home" ? 0 : Math.max(0, sectionTop - navbar.offsetHeight),
        behavior
    });
    setActiveLink(section.id);

    window.requestAnimationFrame(() => {
        navbar.style.removeProperty("transition");
        updateNavbar();
    });
}

let lastRoutedHash = "";

function routeToCurrentHash() {
    const hash = window.location.hash;
    if (!hash || hash === lastRoutedHash) {
        return;
    }

    const section = document.getElementById(hash.slice(1));
    if (!section) {
        return;
    }

    lastRoutedHash = hash;
    navigateToSection(section);
}

sectionLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const section = document.getElementById(link.hash.slice(1));
        if (!section) {
            return;
        }

        event.preventDefault();

        if (link.closest(".nav-links")) {
            setMobileMenuOpen(false);
        }

        if (window.location.hash !== link.hash) {
            window.history.pushState(null, "", link.hash);
        }

        lastRoutedHash = link.hash;
        navigateToSection(section);
    });
});

const logo = document.querySelector(".logo");

if (logo) {
    logo.addEventListener("click", (event) => {
        event.preventDefault();
        setMobileMenuOpen(false);

        if ("scrollRestoration" in history) {
            history.scrollRestoration = "manual";
        }

        const reloadUrl =
            window.location.pathname +
            "?home=" + Date.now() +
            "#home";

        window.location.replace(reloadUrl);
    });
}

window.addEventListener("popstate", routeToCurrentHash);
window.addEventListener("hashchange", routeToCurrentHash);

menuToggle.addEventListener("click", () => {
    setMobileMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

document.addEventListener("click", (event) => {
    if (navbar.classList.contains("menu-open") && !navbar.contains(event.target)) {
        setMobileMenuOpen(false);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navbar.classList.contains("menu-open")) {
        setMobileMenuOpen(false);
        menuToggle.focus();
    }
});

function updateNavigationLayout() {
    if (!mobileNavigation.matches) {
        navbar.classList.remove("menu-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation menu");
    }
    navMenu.inert = mobileNavigation.matches && !navbar.classList.contains("menu-open");
    navMenu.setAttribute("aria-hidden", String(mobileNavigation.matches && !navbar.classList.contains("menu-open")));
}

mobileNavigation.addEventListener("change", updateNavigationLayout);
updateNavigationLayout();

routeToCurrentHash();

const revealTargets = document.querySelectorAll(
    ".section-heading, .about-copy, .skills-card, .skills span, .cards > *, .project-container > *, .contact > *"
);

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: "0px 0px -6% 0px"
    });

    revealTargets.forEach((element) => {
        element.classList.add("reveal");
        revealObserver.observe(element);
    });

    const sectionObserver = new IntersectionObserver((entries) => {
        const visibleSections = entries
            .filter((entry) => entry.isIntersecting)
            .sort((first, second) => {
                const firstCenter = Math.abs(first.boundingClientRect.top + first.boundingClientRect.height / 2 - window.innerHeight / 2);
                const secondCenter = Math.abs(second.boundingClientRect.top + second.boundingClientRect.height / 2 - window.innerHeight / 2);
                return firstCenter - secondCenter;
            });

        if (visibleSections.length > 0) {
            setActiveLink(visibleSections[0].target.id);
        }
    }, {
        rootMargin: "-35% 0px -50% 0px",
        threshold: 0
    });

    sections.forEach((section) => sectionObserver.observe(section));
} else {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
}

function setActiveLink(sectionId) {
    navLinks.forEach((link) => {
        const isActive = link.hash === `#${sectionId}`;
        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "location");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}