import React, { useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck, PlayCircle } from 'lucide-react';

interface WebsiteHeroProps {
  onEnterPlatform?: () => void;
  showNavAction?: boolean;
}

export const WebsiteHero: React.FC<WebsiteHeroProps> = ({
  onEnterPlatform,
  showNavAction = true
}) => {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fit = () => {
      if (!stageRef.current) return;
      const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
      stageRef.current.style.transform = `scale(${s})`;
    };

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white overflow-hidden z-20 font-['Sora',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
        
        :root {
          --ink: #0e2a1f;
          --mint: #2bb673;
          --mint-l: #e3f7ed;
          --mint-m: #bfead3;
          --red: #e0334c;
          --mute: #5f776b;
        }

        .hero-stage {
          width: 1280px;
          height: 720px;
          flex: none;
          position: relative;
          overflow: hidden;
          transform-origin: center;
          background: radial-gradient(900px 600px at 80% 55%, #e3f7ed 0%, #fff 70%);
          animation: hero-loop 6s linear infinite;
        }

        .hero-brand {
          position: absolute;
          left: 90px;
          top: 56px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 24px;
          color: var(--ink);
        }

        .hero-nav {
          position: absolute;
          right: 90px;
          top: 56px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 10;
        }

        .hero-txt {
          position: absolute;
          left: 90px;
          top: 220px;
          width: 600px;
        }

        .hero-h {
          margin: 0;
          font-size: 58px;
          line-height: 1.12;
          font-weight: 700;
          letter-spacing: -0.02em;
          position: absolute;
          left: 0;
          top: 0;
          width: 600px;
          color: var(--ink);
        }

        #hero-heading-a {
          animation: hero-ha 6s ease-out infinite both;
        }

        #hero-heading-b {
          animation: hero-hb 6s ease-out infinite both;
        }

        .hero-sub {
          position: absolute;
          left: 0;
          top: 155px;
          width: 520px;
          margin: 0;
          font-size: 21px;
          line-height: 1.5;
          color: #3d5a4c;
          animation: hero-hb 6s ease-out infinite both;
        }

        .hero-actions {
          position: absolute;
          left: 0;
          top: 245px;
          display: flex;
          align-items: center;
          gap: 16px;
          animation: hero-hb 6s ease-out infinite both;
        }

        .hero-e1 {
          stroke-dasharray: 1;
          animation: hero-d1 6s ease-in-out infinite both;
        }

        .hero-e2 {
          stroke-dasharray: 1;
          animation: hero-d2 6s ease-in-out infinite both;
        }

        .hero-e3 {
          stroke-dasharray: 1;
          animation: hero-d3 6s ease-in-out infinite both;
        }

        .hero-nd {
          animation: hero-nd 6s ease-out infinite both;
        }

        .hero-amt {
          animation: hero-amt 6s linear infinite both;
        }

        .hero-rd {
          animation: hero-amt 6s linear infinite both;
        }

        .hero-ring {
          transform-box: fill-box;
          transform-origin: center;
          animation: hero-ring 6s ease-out infinite both;
        }

        .hero-badge {
          position: absolute;
          left: 870px;
          top: 610px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1.5px solid var(--red);
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
          box-shadow: 0 4px 20px rgba(224, 51, 76, 0.15);
          animation: hero-badge 6s ease-out infinite both;
        }

        .hero-badge i {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--red);
        }

        @keyframes hero-loop {
          0% { opacity: 0; }
          3%, 95% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes hero-ha {
          0%, 4% { opacity: 0; transform: translateY(14px); }
          12%, 40% { opacity: 1; transform: none; }
          46%, 100% { opacity: 0; transform: translateY(-10px); }
        }

        @keyframes hero-hb {
          0%, 46% { opacity: 0; transform: translateY(14px); }
          54%, 92% { opacity: 1; transform: none; }
          97%, 100% { opacity: 0; }
        }

        @keyframes hero-d1 {
          0%, 38% { stroke-dashoffset: 1; }
          50%, 100% { stroke-dashoffset: 0; }
        }

        @keyframes hero-d2 {
          0%, 50% { stroke-dashoffset: 1; }
          62%, 100% { stroke-dashoffset: 0; }
        }

        @keyframes hero-d3 {
          0%, 62% { stroke-dashoffset: 1; }
          74%, 100% { stroke-dashoffset: 0; }
        }

        @keyframes hero-nd {
          0%, 36% { stroke: #bfead3; fill: #e3f7ed; }
          48%, 100% { stroke: #e0334c; fill: #fff; }
        }

        @keyframes hero-amt {
          0%, 66% { opacity: 0; }
          74%, 100% { opacity: 1; }
        }

        @keyframes hero-ring {
          0%, 68% { opacity: 0; transform: scale(0.6); }
          78%, 100% { opacity: 1; transform: scale(1); }
        }

        @keyframes hero-badge {
          0%, 76% { opacity: 0; transform: translateY(10px); }
          84%, 100% { opacity: 1; transform: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-stage, .hero-stage * { animation: none !important; }
          #hero-heading-a { opacity: 0; }
        }
      `}</style>

      <div
        id="stage"
        ref={stageRef}
        className="hero-stage"
        aria-label="TraceNet detects circular money laundering transfers in real time"
      >
        {/* Brand Header */}
        <div className="hero-brand">
          <svg width="34" height="34" viewBox="0 0 34 34" style={{ position: 'static' }}>
            <g stroke="#2bb673" strokeWidth="2.5" fill="none">
              <path d="M7 8L27 14L15 28Z" />
            </g>
            <g fill="#2bb673">
              <circle cx="7" cy="8" r="4" />
              <circle cx="27" cy="14" r="4" />
              <circle cx="15" cy="28" r="4" />
            </g>
          </svg>
          <span>TraceNet</span>
        </div>

        {/* Top Navigation CTA */}
        {showNavAction && onEnterPlatform && (
          <div className="hero-nav">
            <button
              onClick={onEnterPlatform}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Access Compliance Portal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}

        {/* Dynamic Headings */}
        <div className="hero-txt">
          <h1 className="hero-h" id="hero-heading-a">Money moves in seconds.</h1>
          <h1 className="hero-h" id="hero-heading-b">Spot laundering loops live.</h1>
          <p className="hero-sub">Real-time fraud and AML detection for UPI, IMPS, NEFT and RTGS.</p>

          {onEnterPlatform && (
            <div className="hero-actions">
              <button
                onClick={onEnterPlatform}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
              >
                <span>Launch Platform</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-emerald-800/80 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Indian Rails Orchestration
              </span>
            </div>
          )}
        </div>

        {/* Real-time Animated Graph SVG */}
        <svg
          width="1280"
          height="720"
          viewBox="0 0 1280 720"
          className="absolute left-0 top-0 pointer-events-none"
        >
          <defs>
            <marker
              id="hero-ar"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0L10 5L0 10z" fill="#e0334c" />
            </marker>
            <path id="hero-p1" d="M700 330L840 200" />
            <path id="hero-p2" d="M1000 120L1180 200" />
            <path id="hero-p3" d="M1160 520L1100 330" />
            <path id="hero-p4" d="M720 600L900 540" />
            <path id="hero-p5" d="M700 330L900 540" />
            <path id="hero-p6" d="M1000 120L840 200" />
          </defs>

          {/* Background network edges */}
          <g stroke="#bfead3" strokeWidth="2" fill="none">
            <use href="#hero-p1" />
            <use href="#hero-p2" />
            <use href="#hero-p3" />
            <use href="#hero-p4" />
            <use href="#hero-p5" />
            <use href="#hero-p6" />
            <path d="M1180 200L1100 330" />
          </g>

          {/* Normal circulating money flows */}
          <g fill="#2bb673">
            <circle r="4.5">
              <animateMotion dur="3s" repeatCount="indefinite">
                <mpath href="#hero-p1" />
              </animateMotion>
            </circle>
            <circle r="4.5">
              <animateMotion dur="3s" begin="-1s" repeatCount="indefinite">
                <mpath href="#hero-p2" />
              </animateMotion>
            </circle>
            <circle r="4.5">
              <animateMotion dur="2s" begin="-0.5s" repeatCount="indefinite">
                <mpath href="#hero-p3" />
              </animateMotion>
            </circle>
            <circle r="4.5">
              <animateMotion dur="3s" begin="-2s" repeatCount="indefinite">
                <mpath href="#hero-p4" />
              </animateMotion>
            </circle>
            <circle r="4.5">
              <animateMotion dur="2s" begin="-1.2s" repeatCount="indefinite">
                <mpath href="#hero-p5" />
              </animateMotion>
            </circle>
            <circle r="4.5">
              <animateMotion dur="3s" begin="-0.3s" repeatCount="indefinite">
                <mpath href="#hero-p6" />
              </animateMotion>
            </circle>
          </g>

          {/* Regular account nodes */}
          <g fill="#e3f7ed" stroke="#bfead3" strokeWidth="2">
            <circle cx="700" cy="330" r="18" />
            <circle cx="1000" cy="120" r="16" />
            <circle cx="1180" cy="200" r="16" />
            <circle cx="1160" cy="520" r="18" />
            <circle cx="720" cy="600" r="16" />
            <circle cx="1100" cy="330" r="1" />
          </g>

          {/* Flagged circular ring vector path (A -> B -> C -> A) */}
          <g
            fill="none"
            stroke="#e0334c"
            strokeWidth="4"
            strokeLinecap="round"
            markerEnd="url(#hero-ar)"
          >
            <path className="hero-e1" pathLength="1" d="M861 211L1076 318" />
            <path className="hero-e2" pathLength="1" d="M1085 346L915 524" />
            <path className="hero-e3" pathLength="1" d="M896 518L844 222" />
          </g>

          {/* Outer glow aura on ring nodes */}
          <g className="hero-ring" fill="none" stroke="#e0334c" strokeOpacity="0.3" strokeWidth="7">
            <circle cx="840" cy="200" r="42" />
          </g>
          <g className="hero-ring" fill="none" stroke="#e0334c" strokeOpacity="0.3" strokeWidth="7">
            <circle cx="1100" cy="330" r="42" />
          </g>
          <g className="hero-ring" fill="none" stroke="#e0334c" strokeOpacity="0.3" strokeWidth="7">
            <circle cx="900" cy="540" r="42" />
          </g>

          {/* Flagged ring nodes */}
          <g strokeWidth="3.5">
            <circle className="hero-nd" cx="840" cy="200" r="24" />
            <circle className="hero-nd" cx="1100" cy="330" r="24" />
            <circle className="hero-nd" cx="900" cy="540" r="24" />
          </g>

          {/* Suspicious money particle flowing along the circular loop */}
          <g className="hero-rd" fill="#e0334c">
            <circle r="6">
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                path="M840 200L1100 330L900 540Z"
              />
            </circle>
          </g>

          {/* Indian Rupee transaction amount callouts */}
          <g
            className="hero-amt"
            fontSize="15"
            fontWeight="600"
            fill="#e0334c"
            textAnchor="middle"
            stroke="#fff"
            strokeWidth="6"
            paintOrder="stroke"
          >
            <text x="990" y="244">₹4,80,000</text>
            <text x="1038" y="458">₹4,65,000</text>
            <text x="800" y="388">₹4,50,000</text>
          </g>
        </svg>

        {/* Alert pill indicator */}
        <div className="hero-badge">
          <i />
          <span>Circular transfer flagged</span>
        </div>
      </div>
    </div>
  );
};
