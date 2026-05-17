# Skew fractional BM

Animated canvas visualisation of fractional-Brownian-like paths, occupation memory, and a skew interface.

The deployed page is available at:

[https://cagnotti-matteo.github.io/singular-drift-playground/](https://cagnotti-matteo.github.io/singular-drift-playground/)

## Idea

Particles start at the interface \(x=0\) and move horizontally under noisy increments. Their recent trajectories are drawn as thin threads, while the accumulated occupation is rendered as a pixel field.

The central vertical line represents a thin skew/singular interface. The parameter \(\varepsilon\) controls the width of the interface region, and \(\beta\) controls the direction and strength of the bias near it.

The visual model is not meant to be a numerically exact simulation of skew fractional Brownian motion. It is a fast animated sketch inspired by the objects appearing in singular-drift and local-time problems.

## Controls

- **\(H\)** — controls the memory of the noise.
  - \(H < 1/2\): anti-persistent, rougher motion.
  - \(H = 1/2\): Brownian-looking motion.
  - \(H > 1/2\): persistent, streakier motion.

- **\(\beta\)** — controls the skew/interface bias.
  - \(\beta > 0\): particles are biased to the right near the interface.
  - \(\beta < 0\): particles are biased to the left near the interface.

- **\(\varepsilon\)** — controls the interface width.

- **\(N\)** — number of particles.

- **\(v\)** — animation speed.

The layer buttons toggle particle paths, occupation memory, and the interface.

## Implementation

The project is built with:

- [Vite](https://vite.dev/)
- React
- TypeScript
- HTML canvas

The simulation is intentionally lightweight. The \(H\)-slider currently uses a cheap correlated-increment proxy rather than an exact Davies--Harte or Hosking fractional Gaussian noise generator. This keeps the animation live and responsive in the browser.
