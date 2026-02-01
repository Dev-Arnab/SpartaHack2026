import React, { useEffect, useMemo, useRef, useState } from "react";

type MediaKind = "image" | "audio";

type Analysis = {
  kind: MediaKind;
  aiScore: number; // 0..1
  label: "Likely AI" | "Unclear" | "Likely Real";
  confidenceText: string;
  hashHex: string;
};

type ActivityItem = {
  id: string;
  t: number;
  type: "upload" | "analyze" | "result" | "error";
  message: string;
};

function bytesToHuman(n: number) {
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deterministic placeholder score (NOT random):
 * Same file -> same score. Replace later with real API output.
 */
function scoreFromHash(hashHex: string) {
  const head = hashHex.slice(0, 8);
  const asInt = parseInt(head, 16);
  const normalized = (asInt % 10_000) / 10_000; // 0..0.9999
  return 0.05 + normalized * 0.9; // 0.05..0.95
}

function labelFromScore(s: number): Analysis["label"] {
  if (s >= 0.7) return "Likely AI";
  if (s <= 0.35) return "Likely Real";
  return "Unclear";
}

function confidenceCopy(s: number) {
  if (s >= 0.85) return "High confidence";
  if (s >= 0.7) return "Moderate confidence";
  if (s >= 0.5) return "Mixed signals";
  if (s >= 0.35) return "Leaning real";
  return "High confidence";
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Ring({
  value,
  size = 170,
  stroke = 12,
  accent = "rgba(255,45,45,0.95)",
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  accent?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - clamp01(value));

  return (
    <svg width={size} height={size} className="drop-shadow-sm">
      <defs>
        <linearGradient id="ringGradTron" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="55%" stopColor="rgba(255,120,120,0.80)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
        </linearGradient>
        <filter id="glowRed">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={stroke}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#ringGradTron)"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="transparent"
        strokeDasharray={c}
        strokeDashoffset={dash}
        filter="url(#glowRed)"
        style={{ transition: "stroke-dashoffset 750ms ease" }}
      />
    </svg>
  );
}

function Icon({
  name,
  className = "w-5 h-5",
}: {
  name:
    | "spark"
    | "upload"
    | "image"
    | "audio"
    | "shield"
    | "x"
    | "bolt"
    | "users"
    | "wave"
    | "pulse";
  className?: string;
}) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "upload":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 3v12" />
          <path d="M7 8l5-5 5 5" />
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 2l1.5 6L20 10l-6.5 2L12 22l-1.5-10L4 10l6.5-2L12 2z" />
        </svg>
      );
    case "image":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M8 11l2.5 3 3.5-4 4 6" />
          <path d="M9 9h.01" />
        </svg>
      );
    case "audio":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M9 18V6l12-2v12" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="19" cy="16" r="2" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" />
          <path d="M9 12l2 2 4-5" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M13 2L3 14h7l-1 8 12-14h-7l-1-6z" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "wave":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 12c2 0 2-6 4-6s2 12 4 12 2-12 4-12 2 6 4 6 2-3 2-3" />
        </svg>
      );
    case "pulse":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 12h4l2-6 4 12 2-6h6" />
        </svg>
      );
  }
}

function Chip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "red";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm backdrop-blur-2xl",
        tone === "red"
          ? "border-[rgba(255,45,45,0.30)] bg-[rgba(255,45,45,0.10)] text-white/85"
          : "border-white/10 bg-white/5 text-white/75"
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          tone === "red" ? "bg-[rgba(255,45,45,0.9)]" : "bg-white/40"
        )}
      />
      {label}
    </span>
  );
}

/**
 * Ambient particles (SVGator vibe, but pure SVG)
 */
function Particles({
  density = 18,
}: {
  density?: number;
}) {
  const items = useMemo(() => {
    // deterministic pseudo-layout (not using Math.random)
    // based on simple sequence so it’s stable in demos
    const arr = Array.from({ length: density }).map((_, i) => {
      const x = (i * 73) % 100; // 0..99
      const y = (i * 41) % 100;
      const r = 1.2 + ((i * 7) % 18) / 10;
      const d = 10 + ((i * 13) % 18); // seconds
      const o = 0.08 + ((i * 11) % 20) / 200; // opacity
      const drift = 10 + ((i * 17) % 40); // px
      return { x, y, r, d, o, drift };
    });
    return arr;
  }, [density]);

  return (
    <svg className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id="pGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(255,45,45,0.9)" />
          <stop offset="40%" stopColor="rgba(255,45,45,0.35)" />
          <stop offset="100%" stopColor="rgba(255,45,45,0.00)" />
        </radialGradient>
        <filter id="pBlur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {items.map((p, idx) => (
        <g
          key={idx}
          style={{
            transformOrigin: "center",
            animation: `floatY ${p.d}s ease-in-out ${idx * 0.1}s infinite`,
          }}
        >
          <circle
            cx={`${p.x}%`}
            cy={`${p.y}%`}
            r={p.r}
            fill="rgba(255,255,255,0.35)"
            opacity={p.o}
          />
          <circle
            cx={`${p.x}%`}
            cy={`${p.y}%`}
            r={p.r * 7}
            fill="url(#pGlow)"
            opacity={p.o * 0.8}
            filter="url(#pBlur)"
          />
        </g>
      ))}
    </svg>
  );
}

/**
 * Fake “collab cursors” + presence chips (demo)
 */
function CollaborativePreview() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(255,45,45,0.25)] bg-[rgba(255,45,45,0.10)]">
            <Icon name="users" className="h-5 w-5 text-[rgba(255,90,90,0.95)]" />
          </div>
          <div>
            <div className="text-lg font-medium">Real-Time Collaborative Animations</div>
            <div className="text-sm text-white/60">Presence, cursors, and shared motion (demo)</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip label="Kajal (you)" tone="red" />
          <Chip label="Teammate A" />
          <Chip label="Teammate B" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* Mini canvas */}
        <div className="relative min-h-[180px] overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="absolute inset-0 opacity-70">
            <Particles density={10} />
          </div>

          {/* cursors */}
          <div className="absolute left-[12%] top-[22%] animate-cursorA">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur-2xl">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[rgba(255,45,45,0.9)]" />
              Kajal editing…
            </div>
          </div>

          <div className="absolute left-[58%] top-[52%] animate-cursorB">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur-2xl">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-white/40" />
              Teammate A
            </div>
          </div>

          <div className="absolute left-[28%] top-[68%] animate-cursorC">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur-2xl">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-white/40" />
              Teammate B
            </div>
          </div>

          {/* scan sweep */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-[40%] top-0 h-full w-[55%] bg-gradient-to-r from-transparent via-[rgba(255,45,45,0.18)] to-transparent animate-sweep" />
          </div>
        </div>

        {/* Explanation cards */}
        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-base font-medium text-white/85">
              <Icon name="pulse" className="h-4 w-4 text-[rgba(255,90,90,0.95)]" />
              Shared “aura” reacts to confidence
            </div>
            <div className="mt-1 text-sm text-white/60">
              When analysis completes, everyone sees the same pulsing ring + glow intensity.
              Perfect for live demos and group review.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-base font-medium text-white/85">
              <Icon name="wave" className="h-4 w-4 text-[rgba(255,90,90,0.95)]" />
              Cursor motion + micro-interactions
            </div>
            <div className="mt-1 text-sm text-white/60">
              Motion layers sell the product. Even in “mock mode,” it feels alive and collaborative.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
  accent = false,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-[28px] border bg-white/[0.03] p-6 backdrop-blur-2xl transition",
        accent ? "border-[rgba(255,45,45,0.25)]" : "border-white/10",
        "hover:bg-white/[0.05]"
      )}
    >
      <div
        className={cx(
          "absolute -right-24 -top-24 h-56 w-56 rounded-full blur-3xl transition-opacity",
          accent ? "bg-[rgba(255,45,45,0.25)]" : "bg-white/10",
          "opacity-50 group-hover:opacity-80"
        )}
      />
      <div className="relative">
        <div
          className={cx(
            "grid h-12 w-12 place-items-center rounded-2xl border bg-white/5",
            accent ? "border-[rgba(255,45,45,0.25)]" : "border-white/10"
          )}
        >
          {icon}
        </div>
        <div className="mt-4 text-lg font-semibold">{title}</div>
        <div className="mt-1 text-sm text-white/60 leading-relaxed">{desc}</div>

        <div className="mt-4 h-[2px] w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="mt-4 text-xs text-white/45">
          Hover glow + glass depth • built for demos
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const kind: MediaKind | null = useMemo(() => {
    if (!file) return null;
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("audio/")) return "audio";
    return null;
  }, [file]);

  function pushActivity(type: ActivityItem["type"], message: string) {
    setActivity((prev) => [
      { id: `${Date.now()}_${prev.length}`, t: Date.now(), type, message },
      ...prev,
    ].slice(0, 8));
  }

  function resetAll() {
    setStatus("idle");
    setErrorMsg(null);
    setAnalysis(null);
    setAnimatedScore(0);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    pushActivity("upload", "Reset workspace");
  }

  function validateAndSet(f: File) {
    // Reject video/text explicitly
    if (f.type.startsWith("video/")) {
      setErrorMsg("Video is disabled. Upload an image or audio file.");
      setStatus("error");
      pushActivity("error", "Blocked: video upload");
      return;
    }
    if (f.type.startsWith("text/") || f.type === "application/pdf") {
      setErrorMsg("Text/PDF is disabled. Upload an image or audio file.");
      setStatus("error");
      pushActivity("error", "Blocked: text/PDF upload");
      return;
    }
    if (!f.type.startsWith("image/") && !f.type.startsWith("audio/")) {
      setErrorMsg("Unsupported format. Please upload an image or audio file.");
      setStatus("error");
      pushActivity("error", "Blocked: unsupported format");
      return;
    }

    setErrorMsg(null);
    setStatus("idle");
    setAnalysis(null);
    setAnimatedScore(0);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setFile(f);

    pushActivity("upload", `Loaded ${f.name} (${bytesToHuman(f.size)})`);
  }

  async function analyze() {
    if (!file || !kind) return;

    setStatus("analyzing");
    setErrorMsg(null);
    pushActivity("analyze", "Running local analysis pipeline…");

    try {
      const hashHex = await sha256Hex(file);
      const s = scoreFromHash(hashHex);
      const label = labelFromScore(s);

      const result: Analysis = {
        kind,
        aiScore: s,
        label,
        confidenceText: confidenceCopy(s),
        hashHex,
      };

      setAnalysis(result);

      // Smooth scan animation to the real value (no randomness)
      setAnimatedScore(0);
      const start = performance.now();
      const duration = 900;

      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setAnimatedScore(s * eased);
        if (p < 1) requestAnimationFrame(tick);
        else {
          setStatus("done");
          pushActivity("result", `Result: ${Math.round(s * 100)}% • ${label}`);
        }
      };

      requestAnimationFrame(tick);
    } catch (e) {
      setStatus("error");
      setErrorMsg("Could not analyze this file in the browser.");
      pushActivity("error", "Analysis failed in browser");
    }
  }

  // Inject keyframe CSS once (no extra files needed)
  useEffect(() => {
    const id = "tron-anim-styles";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @keyframes floatY { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-18px); } }
      @keyframes sweep { 0% { transform: translateX(-40%); } 100% { transform: translateX(240%); } }

      @keyframes cursorA { 0%,100% { transform: translate(0,0); } 50% { transform: translate(18px, -10px);} }
      @keyframes cursorB { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-14px, 12px);} }
      @keyframes cursorC { 0%,100% { transform: translate(0,0); } 50% { transform: translate(10px, 16px);} }

      @keyframes glowPulse { 0%,100% { opacity: .25; transform: scale(1); } 50% { opacity: .5; transform: scale(1.08);} }

      .animate-sweep { animation: sweep 2.8s linear infinite; }
      .animate-cursorA { animation: cursorA 2.4s ease-in-out infinite; }
      .animate-cursorB { animation: cursorB 3.1s ease-in-out infinite; }
      .animate-cursorC { animation: cursorC 2.8s ease-in-out infinite; }
      .animate-glowPulse { animation: glowPulse 2.2s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  const accentGlowOpacity = analysis ? 0.15 + clamp01(animatedScore) * 0.25 : 0.18;

  return (
    <div className="min-h-screen text-white selection:bg-white/20 selection:text-white">
      {/* Background (Tron/Ares Red) */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#06070d]" />

        {/* red gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,45,45,0.18)] via-transparent to-[rgba(255,45,45,0.06)]" />

        {/* glow blobs */}
        <div className="absolute -top-24 -left-24 h-[520px] w-[520px] rounded-full bg-[rgba(255,45,45,0.20)] blur-[140px]" />
        <div className="absolute top-20 right-[-120px] h-[620px] w-[620px] rounded-full bg-[rgba(255,90,90,0.14)] blur-[170px]" />
        <div className="absolute bottom-[-180px] left-1/3 h-[680px] w-[680px] rounded-full bg-[rgba(255,45,45,0.12)] blur-[200px]" />

        {/* score-driven aura */}
        <div
          className="absolute left-1/2 top-[38%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[rgba(255,45,45,0.35)] blur-[160px] animate-glowPulse"
          style={{ opacity: accentGlowOpacity }}
        />

        {/* particle field */}
        <div className="absolute inset-0 opacity-90">
          <Particles density={22} />
        </div>

        {/* subtle grid */}
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:60px_60px]" />

        {/* scan sweep */}
        <div className="pointer-events-none absolute inset-0 opacity-55">
          <div className="absolute -left-[50%] top-0 h-full w-[55%] bg-gradient-to-r from-transparent via-[rgba(255,45,45,0.14)] to-transparent animate-sweep" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 sm:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,45,45,0.25)] bg-[rgba(255,45,45,0.10)] px-4 py-1.5 text-sm text-white/85 backdrop-blur-2xl">
              <span className="inline-flex items-center gap-2">
                <Icon name="shield" className="h-4 w-4 text-[rgba(255,90,90,0.95)]" />
                Media Authenticity
              </span>
              <span className="text-white/40">•</span>
              <span className="text-white/70">image + audio</span>
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Deepfake / AI Detector{" "}
              <span className="text-white/55">(frontend)</span>
            </h1>

            <p className="mt-3 max-w-3xl text-base sm:text-lg text-white/70">
              Upload an <span className="text-white">image</span> or{" "}
              <span className="text-white">audio</span>. No video, no text.
              Now with <span className="text-white">Tron / Ares red</span> ambient motion,
              collaborative demo effects, and a live activity feed.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Chip label="Ambient Background Motion" tone="red" />
              <Chip label="Collaborative Animations (demo)" />
              <Chip label="Live Activity Feed" />
            </div>
          </div>

          <button
            onClick={() => resetAll()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-base text-white/80 backdrop-blur-2xl transition hover:bg-white/10"
          >
            <Icon name="x" className="h-4 w-4" />
            Reset
          </button>
        </div>

        {/* Section: Upload + Result */}
        <div className="mt-10 grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          {/* Upload card */}
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 sm:p-8 shadow-[0_30px_100px_rgba(255,45,45,0.12)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(255,45,45,0.25)] bg-[rgba(255,45,45,0.10)]">
                  <Icon name="upload" className="h-5 w-5 text-[rgba(255,90,90,0.95)]" />
                </div>
                <div>
                  <div className="text-lg font-medium">Upload media</div>
                  <div className="text-base text-white/60">
                    Drag & drop or browse files
                  </div>
                </div>
              </div>

              <button
                onClick={() => inputRef.current?.click()}
                className="rounded-2xl border border-[rgba(255,45,45,0.25)] bg-[rgba(255,45,45,0.10)] px-5 py-2.5 text-base text-white/85 backdrop-blur-2xl transition hover:bg-[rgba(255,45,45,0.16)]"
              >
                Browse
              </button>

              <input
                ref={inputRef}
                type="file"
                accept="image/*,audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) validateAndSet(f);
                }}
              />
            </div>

            <div
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) validateAndSet(f);
              }}
              className={[
                "relative mt-6 rounded-[28px] border border-dashed transition min-h-[520px] p-8 sm:p-10 flex items-stretch overflow-hidden",
                dragOver
                  ? "border-[rgba(255,45,45,0.40)] bg-[rgba(255,45,45,0.10)]"
                  : "border-white/12 bg-white/4",
              ].join(" ")}
            >
              {/* local particle layer inside dropzone */}
              <div className="pointer-events-none absolute inset-0 opacity-60">
                <Particles density={10} />
              </div>

              {!file && (
                <div className="relative flex w-full flex-col items-center justify-center gap-6 text-center">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-2xl">
                    <Icon name="image" />
                    <span className="text-base text-white/85">Images</span>
                    <span className="text-white/30">•</span>
                    <Icon name="audio" />
                    <span className="text-base text-white/85">Audio</span>
                  </div>

                  <div className="text-2xl font-semibold">Drop your file here</div>
                  <div className="max-w-xl text-base text-white/60 leading-relaxed">
                    We’ll show a preview and compute an AI likelihood score.
                    <br />
                    <span className="text-white/50">
                      (Deterministic placeholder until your API key exists.)
                    </span>
                  </div>

                  <button
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(255,45,45,0.25)] bg-[rgba(255,45,45,0.14)] px-7 py-3.5 text-base font-medium text-white transition hover:bg-[rgba(255,45,45,0.20)]"
                  >
                    <Icon name="upload" className="h-4 w-4" />
                    Choose file
                  </button>
                </div>
              )}

              {file && (
                <div className="relative grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  {/* Preview */}
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium text-white/85">
                        Preview
                      </div>
                      <div className="text-sm text-white/50">
                        {kind?.toUpperCase()}
                      </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                      {kind === "image" && previewUrl && (
                        <img
                          src={previewUrl}
                          alt="preview"
                          className="max-h-[380px] w-full object-contain"
                        />
                      )}
                      {kind === "audio" && previewUrl && (
                        <div className="p-5">
                          <audio controls className="w-full">
                            <source src={previewUrl} />
                          </audio>
                          <div className="mt-3 text-sm text-white/50">
                            Tip: if audio doesn’t play, try mp3/wav.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File details + action */}
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium text-white/85">
                        File details
                      </div>
                      <button
                        onClick={resetAll}
                        className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/70 transition hover:bg-white/10"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 text-base">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/55">Name</span>
                        <span className="truncate text-right text-white/85">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/55">Type</span>
                        <span className="text-white/85">
                          {file.type || "unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/55">Size</span>
                        <span className="text-white/85">
                          {bytesToHuman(file.size)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/55">Last modified</span>
                        <span className="text-white/85">
                          {new Date(file.lastModified).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-base text-white/80">
                        <div className="font-medium">Upload blocked</div>
                        <div className="mt-1 text-white/60">{errorMsg}</div>
                      </div>
                    )}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={analyze}
                        disabled={!file || !kind || status === "analyzing"}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[rgba(255,45,45,0.25)] bg-[rgba(255,45,45,0.16)] px-6 py-3.5 text-base font-medium text-white transition hover:bg-[rgba(255,45,45,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="spark" className="h-4 w-4" />
                        {status === "analyzing" ? "Analyzing..." : "Analyze"}
                      </button>

                      <button
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-6 py-3.5 text-base text-white/80 backdrop-blur-2xl transition hover:bg-white/10"
                      >
                        <Icon name="upload" className="h-4 w-4" />
                        Swap file
                      </button>
                    </div>

                    <div className="mt-5 text-sm text-white/50">
                      Deterministic placeholder score. When you have a backend +
                      API key, swap `analyze()` to call your endpoint.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results card */}
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 sm:p-8 shadow-[0_30px_100px_rgba(255,45,45,0.12)] backdrop-blur-2xl">
            <div className="flex items-center gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(255,45,45,0.25)] bg-[rgba(255,45,45,0.10)]">
                <Icon name="shield" className="h-5 w-5 text-[rgba(255,90,90,0.95)]" />
              </div>
              <div>
                <div className="text-lg font-medium">Result</div>
                <div className="text-base text-white/60">
                  AI likelihood + verdict
                </div>
              </div>
            </div>

            <div className="mt-8 grid place-items-center">
              <div className="relative">
                <Ring value={analysis ? animatedScore : 0} size={170} stroke={12} />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-4xl font-semibold tabular-nums">
                      {analysis ? Math.round(animatedScore * 100) : 0}%
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      AI likelihood
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <div className="text-xl font-semibold">
                  {analysis ? analysis.label : "Upload & analyze"}
                </div>
                <div className="mt-2 text-base text-white/60">
                  {analysis
                    ? analysis.confidenceText
                    : "We’ll show a verdict once analysis completes."}
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="text-base font-medium text-white/85">
                Breakdown
              </div>

              <div className="mt-4 grid gap-3 text-base">
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Media kind</span>
                  <span className="text-white/85">{analysis?.kind ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Score</span>
                  <span className="text-white/85 tabular-nums">
                    {analysis ? analysis.aiScore.toFixed(3) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">File hash</span>
                  <span className="text-white/85 font-mono text-xs">
                    {analysis
                      ? `${analysis.hashHex.slice(0, 10)}…${analysis.hashHex.slice(-8)}`
                      : "—"}
                  </span>
                </div>

                <div className="pt-2 text-sm text-white/45">
                  Once you have a backend + API key, replace the hash score with
                  real detection output.
                </div>
              </div>
            </div>

            {/* Activity feed */}
            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <div className="text-base font-medium text-white/85">
                  Live activity
                </div>
                <Chip label={status === "analyzing" ? "processing" : "ready"} tone="red" />
              </div>

              <div className="mt-4 space-y-2">
                {activity.length === 0 ? (
                  <div className="text-sm text-white/55">
                    Upload a file to start generating activity events.
                  </div>
                ) : (
                  activity.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cx(
                            "mt-1 h-2 w-2 rounded-full",
                            a.type === "error"
                              ? "bg-[rgba(255,45,45,0.95)]"
                              : a.type === "result"
                              ? "bg-[rgba(255,140,140,0.85)]"
                              : "bg-white/35"
                          )}
                        />
                        <div>
                          <div className="text-sm text-white/80">{a.message}</div>
                          <div className="text-xs text-white/45">
                            {new Date(a.t).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-white/45">{a.type}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Collab demo */}
        <div className="mt-10">
          <CollaborativePreview />
        </div>

        {/* Section: Features */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <FeatureCard
            title="Ambient Background Motion"
            desc="Floating particles + scan sweep + score-driven aura. Makes the UI feel alive and premium (SVGator vibe, but lightweight)."
            accent
            icon={<Icon name="pulse" className="h-6 w-6 text-[rgba(255,90,90,0.95)]" />}
          />
          <FeatureCard
            title="Collaborative Review Mode"
            desc="Presence chips + shared animations so teams can audit suspicious media together in real time."
            icon={<Icon name="users" className="h-6 w-6 text-white/80" />}
          />
          <FeatureCard
            title="API-Ready Pipeline"
            desc="Deterministic local scoring today. Swap in your detector API later without changing the UI contract."
            icon={<Icon name="bolt" className="h-6 w-6 text-white/80" />}
          />
        </div>

        <div className="mt-10 text-center text-sm text-white/40">
          Built for hackathons: Tron/Ares aesthetic • ambient motion • collab demo • activity feed.
        </div>
      </div>
    </div>
  );
}
