import { useEffect, useRef, useState } from "react";
import "./index.css";

type Particle = {
  x: number;
  prevX: number;
  y: number;
  prevNoise: number;
  path: Array<[number, number]>;
};

type Params = {
  hurst: number;
  beta: number;
  epsilon: number;
  particleCount: number;
  speed: number;
  showPaths: boolean;
  showOccupation: boolean;
  showInterface: boolean;
};

const GRID_W = 260;
const GRID_H = 150;
const MAX_PATH_LENGTH = 150;
const X_RANGE = 2.6;

function randn() {
  let u = 0;
  let v = 0;

  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, () => {
    const x = 0;
    const y = Math.random();

    return {
      x,
      prevX: x,
      y,
      prevNoise: randn(),
      path: [[x, y]],
    };
  });
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const occupationRef = useRef<Float32Array>(new Float32Array(GRID_W * GRID_H));
  const animationRef = useRef<number | null>(null);

  const [paused, setPaused] = useState(false);
  const [resetIndex, setResetIndex] = useState(0);

  const [params, setParams] = useState<Params>({
    hurst: 0.5,
    beta: 0.7,
    epsilon: 0.045,
    particleCount: 850,
    speed: 1,
    showPaths: true,
    showOccupation: true,
    showInterface: true,
  });

  function resetSimulation() {
    particlesRef.current = makeParticles(params.particleCount);
    occupationRef.current = new Float32Array(GRID_W * GRID_H);
    setResetIndex((n) => n + 1);
  }

  useEffect(() => {
    particlesRef.current = makeParticles(params.particleCount);
    occupationRef.current = new Float32Array(GRID_W * GRID_H);
  }, [params.particleCount]);

  useEffect(() => {
   const canvasElement = canvasRef.current;
if (!canvasElement) return;

const canvasContext = canvasElement.getContext("2d");
if (!canvasContext) return;

const canvas = canvasElement;
const context = canvasContext;
const dpr = window.devicePixelRatio || 1;

function resize() {
  const rect = canvas.getBoundingClientRect();

  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

    resize();
    window.addEventListener("resize", resize);

    const simToPx = (x: number, y: number) => {
      const rect = canvas.getBoundingClientRect();
      const px = rect.width * (0.5 + x / X_RANGE);
      const py = rect.height * (0.06 + 0.88 * y);

      return [px, py] as const;
    };

    const deposit = (x: number, y: number) => {
      const ix = Math.floor(GRID_W * (0.5 + x / X_RANGE));
      const iy = Math.floor(GRID_H * y);

      if (ix >= 0 && ix < GRID_W && iy >= 0 && iy < GRID_H) {
        occupationRef.current[iy * GRID_W + ix] += 1;
      }
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();

      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, rect.width, rect.height);

      context.fillStyle = "#070707";
      context.fillRect(0, 0, rect.width, rect.height);

      if (params.showOccupation) {
        const cellW = Math.ceil(rect.width / GRID_W);
        const cellH = Math.ceil(rect.height / GRID_H);
        const occ = occupationRef.current;

        let max = 1;
        for (let i = 0; i < occ.length; i++) {
          if (occ[i] > max) max = occ[i];
        }

        for (let y = 0; y < GRID_H; y++) {
          for (let x = 0; x < GRID_W; x++) {
            const v = occ[y * GRID_W + x] / max;
            if (v <= 0.004) continue;

            const a = Math.min(1, Math.pow(v, 0.42));
            const r = Math.floor(26 + 230 * a);
            const g = Math.floor(36 + 150 * a);
            const b = Math.floor(52 + 38 * a);

            context.fillStyle = `rgba(${r},${g},${b},${0.84 * a})`;
            context.fillRect(x * cellW, y * cellH, cellW, cellH);
          }
        }
      }

      if (params.showInterface) {
        const [x0] = simToPx(0, 0);
        const epsL = simToPx(-params.epsilon, 0)[0];
        const epsR = simToPx(params.epsilon, 0)[0];

        context.fillStyle = "rgba(255,255,255,0.055)";
        context.fillRect(epsL, 0, epsR - epsL, rect.height);

        context.fillStyle = "rgba(255,255,255,0.78)";
        context.fillRect(Math.round(x0) - 1, 0, 2, rect.height);

        context.fillStyle = "rgba(255,90,60,0.68)";
        context.fillRect(Math.round(x0) - 5, 0, 1, rect.height);
        context.fillRect(Math.round(x0) + 4, 0, 1, rect.height);
      }

      if (params.showPaths) {
        context.lineWidth = 1;
        context.strokeStyle = "rgba(235,246,222,0.32)";

        for (const p of particlesRef.current) {
          if (p.path.length < 2) continue;

          context.beginPath();

          const [x0, y0] = simToPx(p.path[0][0], p.path[0][1]);
          context.moveTo(x0, y0);

          for (let i = 1; i < p.path.length; i++) {
            const [x, y] = simToPx(p.path[i][0], p.path[i][1]);
            context.lineTo(x, y);
          }

          context.stroke();
        }
      }

      context.fillStyle = "rgba(245,245,245,0.82)";
      context.font =
        "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

      context.fillText(
        `x = 0 skew interface    H=${params.hurst.toFixed(
          2
        )}    β=${params.beta.toFixed(2)}    ε=${params.epsilon.toFixed(
          3
        )}    N=${params.particleCount}`,
        22,
        28
      );

      if (params.showInterface) {
        const [x0] = simToPx(0, 0);
        context.fillStyle = "rgba(245,245,245,0.52)";
        context.fillText("|x| < ε", x0 + 14, 50);
      }
    };

    const step = () => {
      if (!paused) {
        const dt = 0.004 * params.speed;
        const sigma = 0.55;
        const particles = particlesRef.current;

        /*
          Cheap live fractional-noise proxy.

          H = 1/2 gives independent Brownian-looking increments.
          H > 1/2 makes increments persistent.
          H < 1/2 makes increments anti-persistent.

          This is not a Davies--Harte fBm generator; it is a fast
          correlated-increment approximation for the visual sketch.
        */
        const rho = Math.tanh(3.6 * (params.hurst - 0.5));
        const innovationScale = Math.sqrt(Math.max(0, 1 - rho * rho));

        for (const p of particles) {
          p.prevX = p.x;

          const innovation = randn();
          const fractionalNoise = rho * p.prevNoise + innovationScale * innovation;

          p.prevNoise = fractionalNoise;

          const noise = sigma * Math.sqrt(dt) * fractionalNoise;

          /*
            Visual skew-interface model:
            beta > 0 biases motion to the right near x = 0.
            beta < 0 biases motion to the left near x = 0.

            The factor 1/epsilon makes the interface more concentrated
            as epsilon decreases.
          */
          const singularPush =
            Math.abs(p.x) < params.epsilon
              ? (params.beta * dt) / Math.max(params.epsilon, 0.004)
              : 0;

          p.x += noise + singularPush;

          if (p.x < -X_RANGE / 2 || p.x > X_RANGE / 2) {
            p.x = 0;
            p.prevX = 0;
            p.prevNoise = randn();
            p.y = Math.random();
            p.path = [[0, p.y]];
          }

          deposit(p.x, p.y);

          p.path.push([p.x, p.y]);
          if (p.path.length > MAX_PATH_LENGTH) {
            p.path.shift();
          }
        }

        for (let i = 0; i < occupationRef.current.length; i++) {
          occupationRef.current[i] *= 0.996;
        }
      }

      draw();
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [params, paused, resetIndex]);

  return (
    <main className="page">
      <section className="stageWrap">
        <canvas ref={canvasRef} className="stage" />
      </section>

      <section className="hero">
        <div className="copy">
          <p className="eyebrow">
            fractional noise / occupation / skew interface
          </p>
          <h1>Skew fractional BM</h1>
          <p className="subtitle">
            Particles start at the interface and move with
            fractional-Brownian-like increments. Bright pixels record where they
            spend time. H controls memory; β controls the skew bias at the
            interface.
          </p>
        </div>

        <div className="panel">
          <label>
            <span>
              H <small>noise memory</small>
            </span>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.01"
              value={params.hurst}
              onChange={(e) =>
                setParams((p) => ({ ...p, hurst: Number(e.target.value) }))
              }
            />
            <output>{params.hurst.toFixed(2)}</output>
          </label>

          <label>
            <span>
              β <small>skew bias</small>
            </span>
            <input
              type="range"
              min="-1.5"
              max="1.5"
              step="0.01"
              value={params.beta}
              onChange={(e) =>
                setParams((p) => ({ ...p, beta: Number(e.target.value) }))
              }
            />
            <output>{params.beta.toFixed(2)}</output>
          </label>

          <label>
            <span>
              ε <small>interface width</small>
            </span>
            <input
              type="range"
              min="0.008"
              max="0.16"
              step="0.001"
              value={params.epsilon}
              onChange={(e) =>
                setParams((p) => ({ ...p, epsilon: Number(e.target.value) }))
              }
            />
            <output>{params.epsilon.toFixed(3)}</output>
          </label>

          <label>
            <span>
              N <small>particles</small>
            </span>
            <input
              type="range"
              min="100"
              max="2500"
              step="50"
              value={params.particleCount}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  particleCount: Number(e.target.value),
                }))
              }
            />
            <output>{params.particleCount}</output>
          </label>

          <label>
            <span>
              v <small>speed</small>
            </span>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.05"
              value={params.speed}
              onChange={(e) =>
                setParams((p) => ({ ...p, speed: Number(e.target.value) }))
              }
            />
            <output>{params.speed.toFixed(2)}</output>
          </label>

          <div className="toggles">
            <button
              className={params.showPaths ? "active" : ""}
              onClick={() =>
                setParams((p) => ({ ...p, showPaths: !p.showPaths }))
              }
            >
              paths
            </button>
            <button
              className={params.showOccupation ? "active" : ""}
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  showOccupation: !p.showOccupation,
                }))
              }
            >
              occupation memory
            </button>
            <button
              className={params.showInterface ? "active" : ""}
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  showInterface: !p.showInterface,
                }))
              }
            >
              interface
            </button>
          </div>

          <div className="buttons">
            <button onClick={() => setPaused((v) => !v)}>
              {paused ? "resume" : "pause"}
            </button>
            <button onClick={resetSimulation}>reset</button>
          </div>

          <div className="legend">
            <p className="legendTitle">how to read it</p>
            <dl>
              <div>
                <dt>white threads</dt>
                <dd>recent particle traces</dd>
              </div>
              <div>
                <dt>amber pixels</dt>
                <dd>accumulated occupation</dd>
              </div>
              <div>
                <dt>central line</dt>
                <dd>the interface x = 0</dd>
              </div>
              <div>
                <dt>pale band</dt>
                <dd>the region |x| &lt; ε</dd>
              </div>
              <div>
                <dt>H</dt>
                <dd>anti-persistent / Brownian / persistent</dd>
              </div>
              <div>
                <dt>β &gt; 0 / β &lt; 0</dt>
                <dd>bias right / bias left</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}