import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const ParticlesBackground = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <Particles
      id="hero-particles"
      className="absolute inset-0 z-[1]"
      options={{
        fullScreen: { enable: false },
        background: { color: { value: "transparent" } },
        fpsLimit: 60,
        particles: {
          color: { value: "#00ff88" },
          links: {
            color: "#00ff88",
            distance: 160,
            enable: true,
            opacity: 0.5,
            width: 1.5,
          },
          move: {
            enable: true,
            speed: 1.5,
            direction: "none",
            outModes: { default: "bounce" },
          },
          number: {
            density: { enable: true, width: 800, height: 800 },
            value: 80,
          },
          opacity: { value: 0.7 },
          shape: { type: "circle" },
          size: { value: { min: 2, max: 4 } },
        },
        interactivity: {
          events: {
            onHover: { enable: true, mode: "grab" },
            resize: { enable: true },
          },
          modes: {
            grab: { distance: 200, links: { opacity: 0.5 } },
          },
        },
        detectRetina: true,
      }}
    />
  );
};

export default ParticlesBackground;
