import { useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

export default function AnimatedBackground({ isScanning = false }) {
    const canvasRef = useRef(null);
    // Use a ref so the animation loop always reads the latest intensity without re-render
    const intensityRef = useRef(1.0);

    // Drive intensity smoothly via ref
    useEffect(() => {
        const target = isScanning ? 1.65 : 1.0;
        const start = intensityRef.current;
        const startTime = performance.now();
        const duration = 600;

        const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        let raf;
        const animate = (now) => {
            const t = Math.min((now - startTime) / duration, 1);
            intensityRef.current = start + (target - start) * ease(t);
            if (t < 1) raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    }, [isScanning]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animId;
        let particles = [];
        const mouse = { x: -9999, y: -9999 };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const onMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        window.addEventListener('mousemove', onMouseMove);

        // ── Particle ────────────────────────────────────────────────────────
        class Particle {
            constructor(layer = 1) {
                this.layer = layer;
                this.reset(true);
            }
            reset(initial = false) {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                const speed = this.layer === 3 ? 0.25 : this.layer === 2 ? 0.18 : 0.1;
                this.vx = (Math.random() - 0.5) * speed;
                this.vy = (Math.random() - 0.5) * speed;
                this.baseVx = this.vx;
                this.baseVy = this.vy;
                this.size = this.layer === 3 ? Math.random() * 2.5 + 1.2
                    : this.layer === 2 ? Math.random() * 1.5 + 0.6
                        : Math.random() * 0.8 + 0.2;
                this.baseOpacity = this.layer === 3 ? Math.random() * 0.55 + 0.25
                    : this.layer === 2 ? Math.random() * 0.35 + 0.1
                        : Math.random() * 0.18 + 0.05;
                this.pulse = Math.random() * Math.PI * 2;
                this.pulseSpeed = Math.random() * 0.018 + 0.004;
                const palettes = {
                    1: ['0,186,238', '100,120,200'],
                    2: ['0,245,255', '168,85,247', '0,186,238'],
                    3: ['0,255,136', '0,245,255', '168,85,247'],
                };
                const cols = palettes[this.layer];
                this.color = cols[Math.floor(Math.random() * cols.length)];
            }
            update(intensity) {
                // Mouse repulsion
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                const repulseRadius = 120 * this.layer;
                if (d < repulseRadius && d > 0) {
                    const force = ((repulseRadius - d) / repulseRadius) * 0.012 * this.layer;
                    this.vx += (dx / d) * force;
                    this.vy += (dy / d) * force;
                }
                this.vx *= 0.99;
                this.vy *= 0.99;

                // Scale velocity by intensity (scanning = faster particles)
                this.x += this.vx * intensity;
                this.y += this.vy * intensity;
                this.pulse += this.pulseSpeed * intensity;

                if (this.x < -20) this.x = canvas.width + 20;
                if (this.x > canvas.width + 20) this.x = -20;
                if (this.y < -20) this.y = canvas.height + 20;
                if (this.y > canvas.height + 20) this.y = -20;
            }
            draw(intensity) {
                const opacityBoost = 1 + (intensity - 1) * 0.4; // subtle brightness increase
                const alpha = Math.min(1, this.baseOpacity * (0.75 + 0.25 * Math.sin(this.pulse)) * opacityBoost);
                if (this.layer === 3) {
                    const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
                    grd.addColorStop(0, `rgba(${this.color}, ${alpha})`);
                    grd.addColorStop(1, `rgba(${this.color}, 0)`);
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
                    ctx.fillStyle = grd;
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.color}, ${alpha})`;
                ctx.fill();
            }
        }

        // ── Init particles ───────────────────────────────────────────────────
        const total = Math.min(160, Math.floor((canvas.width * canvas.height) / 6500));
        for (let i = 0; i < total; i++) {
            const r = Math.random();
            const layer = r < 0.5 ? 1 : r < 0.8 ? 2 : 3;
            particles.push(new Particle(layer));
        }

        // ── Draw neural connections ──────────────────────────────────────────
        const drawConnections = (intensity) => {
            const alphaBoost = 1 + (intensity - 1) * 0.5;
            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const b = particles[j];
                    if (Math.abs(a.layer - b.layer) > 1) continue;
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const distSq = dx * dx + dy * dy;
                    const threshold = a.layer === 3 ? 160 : 120;
                    if (distSq > threshold * threshold) continue;
                    const dist = Math.sqrt(distSq);
                    const alpha = Math.min(0.25, (1 - dist / threshold) * 0.12 * ((a.layer + b.layer) / 6) * alphaBoost);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(0, 220, 255, ${alpha})`;
                    ctx.lineWidth = a.layer === 3 ? 0.8 : 0.4;
                    ctx.stroke();
                }
            }
        };

        // ── Animate ──────────────────────────────────────────────────────────
        const animate = () => {
            const intensity = intensityRef.current;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            [1, 2, 3].forEach(layer => {
                particles.filter(p => p.layer === layer).forEach(p => {
                    p.update(intensity);
                    p.draw(intensity);
                });
            });
            drawConnections(intensity);
            animId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Deep base gradient */}
            <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse 80% 70% at 50% 40%, #0a0f1e 0%, #050810 60%, #020408 100%)'
            }} />

            {/* Ambient glow blobs */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Blob 1 – top-left blue */}
                <div className="absolute rounded-full" style={{
                    width: 700, height: 500, top: '-15%', left: '-10%',
                    background: 'radial-gradient(ellipse, rgba(0,120,255,0.07) 0%, transparent 70%)',
                    animation: 'blobDrift1 18s ease-in-out infinite alternate',
                    filter: 'blur(40px)',
                }} />
                {/* Blob 2 – bottom-right purple */}
                <div className="absolute rounded-full" style={{
                    width: 600, height: 600, bottom: '-20%', right: '-10%',
                    background: 'radial-gradient(ellipse, rgba(130,60,255,0.08) 0%, transparent 70%)',
                    animation: 'blobDrift2 22s ease-in-out infinite alternate',
                    filter: 'blur(50px)',
                }} />
                {/* Blob 3 – center pulse, intensifies on scan */}
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        width: 900, height: 350,
                        top: '35%', left: '50%',
                        transform: 'translateX(-50%)',
                        filter: 'blur(60px)',
                    }}
                    animate={{
                        opacity: isScanning ? [0.5, 1, 0.5] : [0.3, 0.6, 0.3],
                        scaleX: isScanning ? [1, 1.25, 1] : [1, 1.1, 1],
                    }}
                    transition={{
                        duration: isScanning ? 1.2 : 28,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    <div style={{
                        width: '100%', height: '100%',
                        background: 'radial-gradient(ellipse, rgba(0,200,255,0.06) 0%, transparent 65%)',
                    }} />
                </motion.div>
                {/* Blob 4 – mid-page green accent */}
                <div className="absolute rounded-full" style={{
                    width: 400, height: 400, top: '20%', right: '15%',
                    background: 'radial-gradient(ellipse, rgba(0,255,136,0.05) 0%, transparent 70%)',
                    animation: 'blobDrift4 25s ease-in-out infinite alternate',
                    filter: 'blur(45px)',
                }} />
            </div>

            {/* Particle canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            <style>{`
        @keyframes blobDrift1 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(80px, 60px) scale(1.15); }
          100% { transform: translate(-40px, 100px) scale(0.9); }
        }
        @keyframes blobDrift2 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-70px, -50px) scale(1.1); }
          100% { transform: translate(50px, -90px) scale(0.95); }
        }
        @keyframes blobDrift4 {
          0%   { transform: translate(0, 0); opacity: 0.7; }
          50%  { transform: translate(-60px, 80px); opacity: 1; }
          100% { transform: translate(40px, -40px); opacity: 0.5; }
        }
      `}</style>
        </div>
    );
}
