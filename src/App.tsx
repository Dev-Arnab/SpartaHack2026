import React, { useMemo, useRef, useState } from "react";

type MediaKind = "image" | "audio";

type Analysis = {
  kind: MediaKind;
  aiScore: number; // 0..1
  label: "Likely AI" | "Unclear" | "Likely Real";
  confidenceText: string;
  hashHex: string;
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

function Ring({
  value,
  size = 160,
  stroke = 12,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - clamp01(value));

  return (
    <svg width={size} height={size} className="drop-shadow-sm">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.65)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.30)" />
        </linearGradient>
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
        stroke="url(#ringGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="transparent"
        strokeDasharray={c}
        strokeDashoffset={dash}
        style={{ transition: "stroke-dashoffset 700ms ease" }}
      />
    </svg>
  );
}

function Icon({
  name,
  className = "w-5 h-5",
}: {
  name: "spark" | "upload" | "image" | "audio" | "shield" | "x";
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
  }
}

export default function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  const kind: MediaKind | null = useMemo(() => {
    if (!file) return null;
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("audio/")) return "audio";
    return null;
  }, [file]);

  function resetAll() {
    setStatus("idle");
    setErrorMsg(null);
    setAnalysis(null);
    setAnimatedScore(0);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function validateAndSet(f: File) {
    // Reject video/text explicitly
    if (f.type.startsWith("video/")) {
      setErrorMsg("Video is disabled. Upload an image or audio file.");
      setStatus("error");
      return;
    }
    if (f.type.startsWith("text/") || f.type === "application/pdf") {
      setErrorMsg("Text/PDF is disabled. Upload an image or audio file.");
      setStatus("error");
      return;
    }
    if (!f.type.startsWith("image/") && !f.type.startsWith("audio/")) {
      setErrorMsg("Unsupported format. Please upload an image or audio file.");
      setStatus("error");
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
  }

  async function analyze() {
    if (!file || !kind) return;

    setStatus("analyzing");
    setErrorMsg(null);

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
        else setStatus("done");
      };

      requestAnimationFrame(tick);
    } catch (e) {
      setStatus("error");
      setErrorMsg("Could not analyze this file in the browser.");
    }
  }

  return (
    <div className="min-h-screen text-white selection:bg-white/20 selection:text-white">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#070A12]" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/12 blur-3xl" />
        <div className="absolute top-24 right-[-90px] h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/3 h-[520px] w-[520px] rounded-full bg-white/8 blur-3xl" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 sm:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-2xl">
              <span className="inline-flex items-center gap-2">
                <Icon name="shield" className="h-4 w-4" />
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
              This build generates a deterministic “AI likelihood” score
              (API-ready).
            </p>
          </div>

          <button
            onClick={() => resetAll()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-base text-white/80 backdrop-blur-2xl transition hover:bg-white/10"
          >
            <Icon name="x" className="h-4 w-4" />
            Reset
          </button>
        </div>

        {/* Main grid */}
        <div className="mt-10 grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          {/* Upload card */}
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 sm:p-8 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <Icon name="upload" className="h-5 w-5" />
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
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-base text-white/80 backdrop-blur-2xl transition hover:bg-white/10"
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
                "mt-6 rounded-[28px] border border-dashed transition min-h-[520px] p-8 sm:p-10 flex items-stretch",
                dragOver ? "border-white/30 bg-white/10" : "border-white/12 bg-white/4",
              ].join(" ")}
            >
              {!file && (
                <div className="flex w-full flex-col items-center justify-center gap-6 text-center">
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
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-7 py-3.5 text-base font-medium text-white transition hover:bg-white/15"
                  >
                    <Icon name="upload" className="h-4 w-4" />
                    Choose file
                  </button>
                </div>
              )}

              {file && (
                <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
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
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/12 px-6 py-3.5 text-base font-medium text-white transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-50"
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
                      API key, swap the `analyze()` function to call your
                      endpoint.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results card */}
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 sm:p-8 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-center gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
                <Icon name="shield" className="h-5 w-5" />
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
                <Ring value={analysis ? animatedScore : 0} size={160} stroke={12} />
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
                      ? `${analysis.hashHex.slice(0, 10)}…${analysis.hashHex.slice(
                          -8
                        )}`
                      : "—"}
                  </span>
                </div>

                <div className="pt-2 text-sm text-white/45">
                  Once you have a backend + API key, replace the hash score with
                  real detection output.
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="text-base font-medium text-white/85">
                What’s next
              </div>
              <ul className="mt-4 space-y-3 text-base text-white/65">
                <li className="flex gap-3">
                  <span className="mt-[10px] h-2 w-2 rounded-full bg-white/40" />
                  Add a backend endpoint:{" "}
                  <span className="text-white/85">POST /detect</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[10px] h-2 w-2 rounded-full bg-white/40" />
                  Frontend uploads file → backend returns{" "}
                  <span className="text-white/85">score + label</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[10px] h-2 w-2 rounded-full bg-white/40" />
                  Drive visuals from score (colors, particles, “trust aura”)
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-white/40">
          Built for hackathons: glass UI + deterministic scoring + API-ready
          interface.
        </div>
      </div>
    </div>
  );
}
