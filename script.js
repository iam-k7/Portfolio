const views = {
    home: document.getElementById('home-view'),
    about: document.getElementById('about-view'),
    skills: document.getElementById('skills-view'),
    projects: document.getElementById('projects-view'),
    certifications: document.getElementById('certifications-view')
};

const backBtn = document.getElementById('back-btn');
const body = document.body;
const themeClasses = ['home-theme', 'dark-theme', 'light-theme', 'projects-active'];

function setBackButtonVisible(isVisible) {
    if (!backBtn) return;
    backBtn.style.opacity = isVisible ? '1' : '0';
    backBtn.style.pointerEvents = isVisible ? 'auto' : 'none';
}

function setBodyTheme(themeName, includeProjectsClass = false) {
    body.classList.remove(...themeClasses);
    body.classList.add(themeName);
    if (includeProjectsClass) {
        body.classList.add('projects-active');
    }
}

function activateViewFallback(viewName) {
    const resolvedViewName = views[viewName] ? viewName : 'home';
    Object.values(views).forEach((el) => {
        if (!el) return;
        el.classList.toggle('active-view', el.id === `${resolvedViewName}-view`);
    });
    if (resolvedViewName === 'home') {
        setBodyTheme('home-theme');
        setBackButtonVisible(false);
    } else {
        setBackButtonVisible(true);
    }
}

function goHome(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    try {
        changeView('home');
    } catch (err) {
        console.error('Unable to return home view:', err);
        activateViewFallback('home');
    }
}

if (backBtn) {
    backBtn.addEventListener('click', goHome);
}

// --- Typewriter Effect ---
function initTypewriter() {
    const consoleTexts = document.querySelectorAll('.console-text');
    consoleTexts.forEach(el => {
        const text = el.innerText;
        el.setAttribute('data-text', text);
        el.innerText = '';
    });
}
window.addEventListener('DOMContentLoaded', initTypewriter);

function runTypewriter() {
    const consoleTexts = document.querySelectorAll('.console-text');
    consoleTexts.forEach((el, index) => {
        const text = el.getAttribute('data-text');
        el.innerText = '';
        setTimeout(() => {
            let i = 0;
            function type() {
                if (i < text.length) {
                    el.innerText += text.charAt(i);
                    i++;
                    setTimeout(type, 30); // Improved from 15ms for better readability
                }
            }
            type();
        }, index * 1000); // Stagger paragraphs
    });
}



// --- Particles for Projects Page ---

const skillsCanvas = document.getElementById('skills-canvas');
if (skillsCanvas) {
    const ctx = skillsCanvas.getContext('2d');
    let width, height;
    let particles = [];

    function resizeSkills() {
        width = window.innerWidth;
        height = window.innerHeight;
        skillsCanvas.width = width;
        skillsCanvas.height = height;
        initParticles();
    }

    class Point {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
    }

    let isSkillsVisible = true;

    function initParticles() {
        particles = [];
        for (let i = 0; i < 25; i++) particles.push(new Point()); // Reduced from 40
    }

    function drawSkills() {
        // Skip if not visible or page hidden
        if (!isSkillsVisible || document.hidden) {
            requestAnimationFrame(drawSkills);
            return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffffff';
        ctx.strokeStyle = '#ffffffff';

        particles.forEach((p, index) => {
            p.update();
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();

            for (let j = index + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        });
        requestAnimationFrame(drawSkills);
    }

    // Visibility detection
    const skillsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isSkillsVisible = entry.isIntersecting;
        });
    }, { threshold: 0.1 });
    skillsObserver.observe(skillsCanvas);

    window.addEventListener('resize', resizeSkills);
    resizeSkills();
    drawSkills();
}



// --- 3D Point Cloud Sphere Animation ---
const portalCanvas = document.getElementById('portal-canvas');
let portalInstance = null;

if (portalCanvas) {
    const ctx = portalCanvas.getContext('2d');
    let width, height;
    let points = [];
    let animationId;

    // Sphere Settings
    const globeRadius = Math.min(window.innerWidth, window.innerHeight) * 0.25;
    const pointCount = 400; // Reduced from 1200 for performance (67% reduction)
    const perspective = 800;
    let isPortalVisible = true;

    // Rotation state
    let angleY = 0;
    let angleX = 0;
    const rotationSpeed = 0.003;

    // Animation States
    const STATE = {
        IDLE: 'IDLE',
        EXPANDING: 'EXPANDING',
        RETURNING: 'RETURNING'
    };
    let currentState = STATE.IDLE;

    function resizePortal() {
        width = window.innerWidth;
        height = window.innerHeight;
        portalCanvas.width = width;
        portalCanvas.height = height;
        if (points.length === 0) initSpherePoints();
    }

    window.addEventListener('resize', resizePortal);
    width = window.innerWidth;
    height = window.innerHeight;
    portalCanvas.width = width;
    portalCanvas.height = height;

    // 3D Point Class
    class SpherePoint {
        constructor(x, y, z) {
            // Target (Base) Position on Sphere Lattice
            this.bx = x;
            this.by = y;
            this.bz = z;

            // Current Position (Animated)
            this.x = x;
            this.y = y;
            this.z = z;

            // Project result
            this.sx = 0; // Screen X
            this.sy = 0; // Screen Y
            this.scale = 1;
            this.alpha = 1;
        }

        update() {
            if (currentState === STATE.RETURNING) {
                // Lerp current pos to base pos
                // Using an easing factor that is random per point for "organic" feel
                const ease = 0.05 + Math.random() * 0.03;
                this.x += (this.bx - this.x) * ease;
                this.y += (this.by - this.y) * ease;
                this.z += (this.bz - this.z) * ease;
            } else if (currentState === STATE.EXPANDING) {
                // Fly outwards from center rapidly
                this.x *= 1.08;
                this.y *= 1.08;
                this.z *= 1.08;
            } else if (currentState === STATE.IDLE) {
                // Snap to base to ensure sphere integrity during rotation
                this.x = this.bx;
                this.y = this.by;
                this.z = this.bz;
            }
        }

        project(angleX, angleY) {
            // Rotate the CURRENT position (this.x,y,z)
            // 1. Rotation Y
            let x1 = this.x * Math.cos(angleY) - this.z * Math.sin(angleY);
            let z1 = this.z * Math.cos(angleY) + this.x * Math.sin(angleY);
            let y1 = this.y;

            // 2. Rotation X 
            let y2 = y1 * Math.cos(angleX) - z1 * Math.sin(angleX);
            let z2 = z1 * Math.cos(angleX) + y1 * Math.sin(angleX);
            let x2 = x1;

            // 3. Perspective Projection
            const scale = perspective / (perspective + z2);
            this.scale = scale;

            this.sx = width / 2 + x2 * scale;
            this.sy = height / 2 + y2 * scale;

            this.alpha = mapRange(z2, -globeRadius, globeRadius, 1, 0.4);

            // Color Logic 
            const nY = (this.y / globeRadius + 1) / 2; // 0 to 1
            this.color = interpolateColor('#ffec3dff', '#ff0000ff', Math.max(0, Math.min(1, nY)));
        }

        draw(ctx) {
            // Safety check for alpha
            let a = this.alpha;
            if (a < 0) a = 0; if (a > 1) a = 1;

            ctx.globalAlpha = a;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            const size = 1.5 * this.scale;
            ctx.arc(this.sx, this.sy, size > 0 ? size : 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Helpers
    function mapRange(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }

    function interpolateColor(c1, c2, factor) {
        const r1 = parseInt(c1.substring(1, 3), 16);
        const g1 = parseInt(c1.substring(3, 5), 16);
        const b1 = parseInt(c1.substring(5, 7), 16);

        const r2 = parseInt(c2.substring(1, 3), 16);
        const g2 = parseInt(c2.substring(3, 5), 16);
        const b2 = parseInt(c2.substring(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);

        return `rgb(${r},${g},${b})`;
    }

    function initSpherePoints() {
        points = [];
        const phi = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < pointCount; i++) {
            const y = 1 - (i / (pointCount - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;

            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;

            points.push(new SpherePoint(x * globeRadius, y * globeRadius, z * globeRadius));
        }
    }

    function animatePortal() {
        // Skip if not visible or page hidden
        if (!isPortalVisible || document.hidden) {
            animationId = requestAnimationFrame(animatePortal);
            return;
        }

        ctx.clearRect(0, 0, width, height);

        // Update Rotation
        if (currentState !== STATE.EXPANDING) {
            angleY += rotationSpeed;
            angleX = Math.sin(Date.now() * 0.001) * 0.1;
        }

        // Draw Points
        points.forEach(p => {
            p.update();
            p.project(angleX, angleY);
            p.draw(ctx);
        });

        // Check Return Completion
        if (currentState === STATE.RETURNING) {
            const p0 = points[0];
            const dist = Math.abs(p0.x - p0.bx) + Math.abs(p0.y - p0.by);
            if (dist < 1) currentState = STATE.IDLE;
        }

        animationId = requestAnimationFrame(animatePortal);
    }

    // Interaction
    function onPortalClick() {
        if (currentState !== STATE.IDLE) return;
        currentState = STATE.EXPANDING;

        setTimeout(() => {
            changeView('about');
        }, 600);
    }

    portalCanvas.addEventListener('click', onPortalClick);
    const centerHub = document.querySelector('.center-hub');
    if (centerHub) centerHub.addEventListener('click', onPortalClick);

    // External Control
    window.portalControl = {
        startReturn: () => {
            currentState = STATE.RETURNING;
            // SCATTER!
            points.forEach(p => {
                const r = 2000 + Math.random() * 1000;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                p.x = r * Math.sin(phi) * Math.cos(theta);
                p.y = r * Math.sin(phi) * Math.sin(theta);
                p.z = r * Math.cos(phi);
            });
        },
        reset: () => {
            currentState = STATE.IDLE;
            initSpherePoints();
        }
    };

    // Visibility detection for portal
    const portalObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isPortalVisible = entry.isIntersecting;
        });
    }, { threshold: 0.1 });
    portalObserver.observe(portalCanvas);

    initSpherePoints();
    animatePortal();
}

// --- About Page Background Stars ---
const aboutCanvas = document.getElementById('about-canvas');
if (aboutCanvas) {
    const ctx = aboutCanvas.getContext('2d');
    let width, height;
    let stars = [];

    function resizeAbout() {
        width = window.innerWidth;
        height = window.innerHeight;
        aboutCanvas.width = width;
        aboutCanvas.height = height;
        initAboutStars();
    }
    window.addEventListener('resize', resizeAbout);

    class Star {
        constructor() {
            // Ring distribution
            const angle = Math.random() * Math.PI * 2;
            // Random radius from center, mostly keeping edges open
            const minR = 300;
            const maxR = Math.max(width, height) * 0.8;
            const r = minR + Math.random() * (maxR - minR);

            this.x = width / 2 + Math.cos(angle) * r;
            this.y = height / 2 + Math.sin(angle) * r;

            this.size = Math.random() * 2;
            this.alpha = Math.random();
            this.alphaSpeed = 0.005 + Math.random() * 0.01;
            // Orbit speed
            this.angle = angle;
            this.radius = r;
            this.speed = 0.0005 + Math.random() * 0.0005;
        }

        update() {
            // Rotate
            this.angle += this.speed;
            this.x = width / 2 + Math.cos(this.angle) * this.radius;
            this.y = height / 2 + Math.sin(this.angle) * this.radius;

            // Twinkle
            this.alpha += this.alphaSpeed;
            if (this.alpha > 1 || this.alpha < 0.1) this.alphaSpeed *= -1;
        }

        draw() {
            ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
            // Gold/Yellow color #ffffffff
            ctx.fillStyle = '#ffffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // Glow
            if (this.size > 1.5) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#d8d8d8ff';
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    let isAboutVisible = true;

    function initAboutStars() {
        stars = [];
        for (let i = 0; i < 80; i++) { // Reduced from 150
            stars.push(new Star());
        }
    }

    function animateAboutStars() {
        // Skip if not visible or page hidden
        if (!isAboutVisible || document.hidden) {
            requestAnimationFrame(animateAboutStars);
            return;
        }

        ctx.clearRect(0, 0, width, height);
        stars.forEach(s => {
            s.update();
            s.draw();
        });
        requestAnimationFrame(animateAboutStars);
    }

    // Visibility detection
    const aboutObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isAboutVisible = entry.isIntersecting;
        });
    }, { threshold: 0.1 });
    aboutObserver.observe(aboutCanvas);

    // Init
    resizeAbout();
    animateAboutStars();
}

// --- About Row Reveal Animation ---
const aboutViewSection = document.getElementById('about-view');
const aboutTrackRows = document.querySelectorAll('.about-track-row');
if (aboutViewSection && aboutTrackRows.length > 0) {
    const aboutRowObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            aboutRowObserver.unobserve(entry.target);
        });
    }, {
        root: aboutViewSection,
        threshold: 0.28
    });

    aboutTrackRows.forEach((row) => aboutRowObserver.observe(row));
}

// Updated View Logic for Theme
// Updated View Logic for Theme
function changeView(viewName) {
    const resolvedViewName = views[viewName] ? viewName : 'home';
    const target = views[resolvedViewName];
    if (!target) return;

    // Find current active view to determine previous view
    let previousViewId = '';
    Object.values(views).forEach(el => {
        if (!el) return;
        if (el.classList.contains('active-view')) {
            previousViewId = el.id;
        }
        el.classList.remove('active-view');
    });

    // Show target
    target.classList.add('active-view');

    // Handle Theme & UI
    if (resolvedViewName === 'home') {
        setBodyTheme('home-theme');
        setBackButtonVisible(false);

        // Trigger Return Animation ONLY if coming from About (The "Click Here" flow)
        if (window.portalControl) {
            if (previousViewId === 'about-view') {
                window.portalControl.startReturn();
            } else {
                window.portalControl.reset();
            }
        }
    } else if (resolvedViewName === 'about') {
        setBodyTheme('dark-theme');
        setBackButtonVisible(true);
        if (aboutViewSection) aboutViewSection.scrollTop = 0;
        runTypewriter();
    } else if (resolvedViewName === 'projects') {
        // Projects -> Dark Theme (WORK section)
        setBodyTheme('dark-theme', true);
        setBackButtonVisible(true);
    } else if (resolvedViewName === 'certifications') {
        // Certifications -> White Theme
        setBodyTheme('home-theme');
        setBackButtonVisible(true);
        const certGridEl = document.getElementById('cert-grid');
        if (certGridEl) certGridEl.scrollTop = 0;
    } else {
        // Skills -> Light
        setBodyTheme('light-theme');
        setBackButtonVisible(true);
    }

    document.dispatchEvent(new CustomEvent('portfolio:viewchange', {
        detail: {
            previousViewId,
            viewName: resolvedViewName
        }
    }));
}
window.changeView = changeView;



// --- Smooth Scroll Observer for Cert Cards ---
const certGrid = document.getElementById('cert-grid');
if (certGrid) {
    const certView = document.getElementById('certifications-view');
    let targetScrollTop = certGrid.scrollTop;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const syncTargetScrollTop = () => {
        targetScrollTop = certGrid.scrollTop;
    };
    const applyScrollDelta = (delta) => {
        const maxScrollTop = Math.max(0, certGrid.scrollHeight - certGrid.clientHeight);
        targetScrollTop = clamp(certGrid.scrollTop + delta, 0, maxScrollTop);
        certGrid.scrollTop = targetScrollTop;
        updateScrollProgress();
    };
    const updateScrollProgress = () => {
        const maxScrollTop = Math.max(1, certGrid.scrollHeight - certGrid.clientHeight);
        const progress = certGrid.scrollTop / maxScrollTop;
        certGrid.style.setProperty('--cert-scroll-progress', progress.toFixed(4));
    };

    // Enable top-to-bottom scroll from anywhere inside certifications view.
    if (certView) {
        certView.addEventListener('wheel', (e) => {
            if (!certView.classList.contains('active-view')) return;
            if (certGrid.scrollHeight <= certGrid.clientHeight) return;

            const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
            applyScrollDelta(delta);
            e.preventDefault();
        }, { passive: false });

        certGrid.addEventListener('scroll', () => {
            syncTargetScrollTop();
            updateScrollProgress();
        }, { passive: true });
    }

    document.addEventListener('keydown', (e) => {
        if (!certView || !certView.classList.contains('active-view')) return;
        if (certGrid.scrollHeight <= certGrid.clientHeight) return;

        const maxScrollTop = certGrid.scrollHeight - certGrid.clientHeight;
        const pageStep = Math.max(120, certGrid.clientHeight * 0.82);
        let nextTarget = targetScrollTop;
        let handled = true;

        if (e.key === 'Home') {
            nextTarget = 0;
        } else if (e.key === 'End') {
            nextTarget = maxScrollTop;
        } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
            nextTarget += pageStep;
        } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
            nextTarget -= pageStep;
        } else {
            handled = false;
        }

        if (!handled) return;
        targetScrollTop = clamp(nextTarget, 0, maxScrollTop);
        certGrid.scrollTop = targetScrollTop;
        updateScrollProgress();
        e.preventDefault();
    });

    document.addEventListener('portfolio:viewchange', (event) => {
        if (event.detail?.viewName === 'certifications') {
            syncTargetScrollTop();
            updateScrollProgress();
        }
    });

    window.addEventListener('resize', updateScrollProgress, { passive: true });
    updateScrollProgress();
}






// --- Particles for Skills Page ---

const canvas = document.getElementById('particle-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const particleCount = 100; // Reduced from 200 for better performance
    const colors = ['#00000091', '#454545c5', '#bababaff'];
    let mouse = { x: null, y: null };
    let isVisible = false;

    // Visibility detection for performance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isVisible = entry.isIntersecting;
        });
    }, { threshold: 0.1 });

    observer.observe(canvas);

    // Resize handling
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initParticles();
    }
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    // Reset mouse when leaving so particles don't get stuck
    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });
    class Particle {
        constructor() {
            this.reset();
            // Give random initial positions
            this.x = Math.random() * width;
            this.y = Math.random() * height;
        }
        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5; // Slow float velocity
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 3 + 1; // 1 to 4px
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.friction = 0.95; // For slowing down after acceleration

            // Shape props (some are dashes)
            this.isDash = Math.random() > 0.5;
            this.dashLength = Math.random() * 10 + 5;
            this.angle = Math.random() * Math.PI * 2;
        }
        update() {
            // Base movement
            this.x += this.vx;
            this.y += this.vy;
            // Mouse interaction (Attraction/Tracking)
            if (mouse.x != null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // "Mouse Track" effect: Pull towards mouse if close
                const interactionRadius = 300;
                const force = (interactionRadius - distance) / interactionRadius;
                if (distance < interactionRadius) {
                    const angle = Math.atan2(dy, dx);
                    const push = force * 2; // Strength of pull

                    this.vx += Math.cos(angle) * push;
                    this.vy += Math.sin(angle) * push;
                }
            }
            // Apply friction to dampen the crazy speeds from mouse pull
            this.vx *= this.friction;
            this.vy *= this.friction;
            // Keep slight movement if stopped
            if (Math.abs(this.vx) < 0.1) this.vx += (Math.random() - 0.5) * 0.05;
            if (Math.abs(this.vy) < 0.1) this.vy += (Math.random() - 0.5) * 0.05;

            // Wrap around screen
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;

            // Rotate dashes slowly
            this.angle += 0.01;
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            ctx.fillStyle = this.color;

            if (this.isDash) {
                // Draw a rounded rect style dash
                ctx.beginPath();
                ctx.roundRect(-this.dashLength / 2, -this.size / 2, this.dashLength, this.size, this.size);
                ctx.fill();
            } else {
                // Draw circle
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }
    function initParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        // Skip rendering if not visible for performance
        if (!isVisible) {
            requestAnimationFrame(animate);
            return;
        }

        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }

    // Start
    resize();
    animate();
}

// --- Horizontal Swipe Navigation for Projects ---
const cardCarousel = document.querySelector('.card-carousel');
const flipCards = document.querySelectorAll('.flip-card');

if (cardCarousel && flipCards.length > 0) {
    const initialCardIndex = 0;
    let currentCardIndex = initialCardIndex;
    const projectsView = document.getElementById('projects-view');
    let suppressFlipClick = false;
    const supportsHoverFlip = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Tap/click to flip cards (except interactive controls).
    flipCards.forEach((card) => {
        card.addEventListener('click', (e) => {
            if (!projectsView || !projectsView.classList.contains('active-view')) return;
            if (suppressFlipClick) return;
            if (e.target.closest('.visit-btn, .card-icon')) return;
            if (supportsHoverFlip()) return;
            card.classList.toggle('is-flipped');
        });
    });

    // Keyboard navigation with left/right arrows.
    document.addEventListener('keydown', (e) => {
        if (!projectsView || !projectsView.classList.contains('active-view')) return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            navigateToCard(currentCardIndex + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            navigateToCard(currentCardIndex - 1);
        }
    });

    // Mouse wheel maps to horizontal swipe effect.
    cardCarousel.addEventListener('wheel', (e) => {
        if (!projectsView || !projectsView.classList.contains('active-view')) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            cardCarousel.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    }, { passive: false });

    // Drag to swipe (desktop).
    let isDragging = false;
    let startX = 0;
    let scrollStart = 0;

    cardCarousel.addEventListener('mousedown', (e) => {
        if (!projectsView || !projectsView.classList.contains('active-view')) return;
        isDragging = true;
        suppressFlipClick = false;
        startX = e.pageX;
        scrollStart = cardCarousel.scrollLeft;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = e.pageX - startX;
        if (Math.abs(delta) > 8) suppressFlipClick = true;
        cardCarousel.scrollLeft = scrollStart - delta;
    });

    window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        snapToNearestCard();
    });

    cardCarousel.addEventListener('mouseleave', () => {
        if (!isDragging) return;
        isDragging = false;
        snapToNearestCard();
    });

    // Touch swipe support.
    let touchStartX = 0;
    let touchEndX = 0;

    cardCarousel.addEventListener('touchstart', (e) => {
        suppressFlipClick = false;
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    cardCarousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 45) {
            suppressFlipClick = true;
            if (diff > 0) {
                navigateToCard(currentCardIndex + 1);
            } else {
                navigateToCard(currentCardIndex - 1);
            }
        }
    });

    function updateCurrentCardByPosition() {
        const carouselCenter = cardCarousel.scrollLeft + (cardCarousel.clientWidth / 2);
        let nearestIndex = 0;
        let minDistance = Number.POSITIVE_INFINITY;

        flipCards.forEach((card, index) => {
            const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
            const distance = Math.abs(cardCenter - carouselCenter);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = index;
            }
        });

        if (nearestIndex !== currentCardIndex) {
            currentCardIndex = nearestIndex;
        }

        updateActiveCardState();
    }

    function snapToNearestCard() {
        updateCurrentCardByPosition();
        navigateToCard(currentCardIndex);
    }

    function updateActiveCardState() {
        flipCards.forEach((card, index) => {
            card.classList.toggle('is-active', index === currentCardIndex);
        });
    }

    // Navigate to a specific card index.
    function navigateToCard(index) {
        if (index < 0 || index >= flipCards.length) return;
        currentCardIndex = index;
        updateActiveCardState();
        flipCards[index].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }

    // Track scroll position to keep the active card index in sync.
    cardCarousel.addEventListener('scroll', () => {
        updateCurrentCardByPosition();
    });

    // React to view changes without overriding global navigation logic.
    document.addEventListener('portfolio:viewchange', (event) => {
        if (event.detail?.viewName === 'projects') {
            window.setTimeout(() => {
                navigateToCard(initialCardIndex);
            }, 120);
            return;
        }

        // Reset project card interaction state when leaving projects.
        suppressFlipClick = false;
        flipCards.forEach((card) => card.classList.remove('is-flipped'));
    });

    // Initialize center card style on load.
    updateActiveCardState();
}
