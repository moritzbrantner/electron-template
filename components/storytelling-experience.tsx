'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Mesh } from 'three';
import { Color, MathUtils, Vector3 } from 'three';

export type StoryScene = {
  id: string;
  title: string;
  description: string;
  progressionStart: number;
  progressionEnd: number;
  color: string;
  position: [number, number, number];
  scale?: number;
};

type StorytellingExperienceProps = {
  scenes: StoryScene[];
};

type InternalProgression = {
  absolute: number;
  sceneNumber: number;
  sceneProgression: number;
};

function deriveInternalProgression(absolute: number, sceneCount: number): InternalProgression {
  const safeSceneCount = Math.max(sceneCount, 1);
  const clamped = MathUtils.clamp(absolute, 0, safeSceneCount * 100 - Number.EPSILON);
  const sceneNumber = Math.floor(clamped / 100);
  const sceneProgression = clamped - sceneNumber * 100;

  return {
    absolute: clamped,
    sceneNumber,
    sceneProgression,
  };
}

function SceneNode({ scene, sceneProgression }: { scene: StoryScene; sceneProgression: number }) {
  const meshRef = useRef<Mesh>(null);
  const target = useMemo(() => new Vector3(...scene.position), [scene.position]);

  useFrame((state, delta) => {
    if (!meshRef.current) {
      return;
    }

    const normalizedSceneProgress = MathUtils.clamp(sceneProgression / 100, 0, 1);
    const pulse = Math.sin(normalizedSceneProgress * Math.PI);
    const zoom = MathUtils.lerp(8, 6.2, normalizedSceneProgress);

    state.camera.position.z = MathUtils.damp(state.camera.position.z, zoom, 4, delta);

    const destinationColor = new Color(scene.color);
    state.scene.background = state.scene.background ?? new Color(destinationColor);
    (state.scene.background as Color).lerp(destinationColor, 1 - Math.exp(-delta * 2.5));

    meshRef.current.position.lerp(target, 1 - Math.exp(-delta * 7));
    meshRef.current.position.y = target.y + pulse * 0.55;
    meshRef.current.scale.setScalar((scene.scale ?? 1) * (0.86 + pulse * 0.28));
    meshRef.current.rotation.y += delta * (0.35 + normalizedSceneProgress * 0.85);
    meshRef.current.rotation.x = MathUtils.lerp(
      meshRef.current.rotation.x,
      pulse * 0.22,
      1 - Math.exp(-delta * 6),
    );
  });

  return (
    <mesh ref={meshRef} position={scene.position}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color={scene.color} roughness={0.18} metalness={0.3} />
    </mesh>
  );
}

export function StorytellingExperience({ scenes }: StorytellingExperienceProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [absoluteProgression, setAbsoluteProgression] = useState(0);

  useEffect(() => {
    const updateProgression = () => {
      if (!sectionRef.current) {
        return;
      }

      const rect = sectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalScrollable = Math.max(sectionRef.current.offsetHeight - viewportHeight, 1);
      const consumed = MathUtils.clamp(-rect.top, 0, totalScrollable);
      const normalized = consumed / totalScrollable;
      const nextAbsolute = normalized * scenes.length * 100;

      setAbsoluteProgression(MathUtils.clamp(nextAbsolute, 0, scenes.length * 100));
    };

    updateProgression();
    window.addEventListener('scroll', updateProgression, { passive: true });
    window.addEventListener('resize', updateProgression);

    return () => {
      window.removeEventListener('scroll', updateProgression);
      window.removeEventListener('resize', updateProgression);
    };
  }, [scenes.length]);

  const internal = deriveInternalProgression(absoluteProgression, scenes.length);
  const activeScene = scenes[internal.sceneNumber] ?? scenes[scenes.length - 1];

  return (
    <section
      ref={sectionRef}
      className="relative h-[350vh] rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/30"
    >
      <div className="sticky top-6 mx-auto grid h-[calc(100vh-3rem)] max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-black/20">
          <Canvas
            camera={{ position: [0, 0, 8], fov: 45 }}
            onCreated={({ gl, scene }) => {
              gl.setClearColor('#0b1020');
              scene.background = new Color('#0b1020');
            }}
          >
            <ambientLight intensity={1.2} />
            <directionalLight position={[6, 8, 4]} intensity={1.6} />
            <SceneNode scene={activeScene} sceneProgression={internal.sceneProgression} />
          </Canvas>
        </div>

        <div className="flex flex-col rounded-xl border border-border/60 bg-background/85 p-6 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Internal Progression {internal.absolute.toFixed(0)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Scene {internal.sceneNumber + 1} at {internal.sceneProgression.toFixed(0)} units
          </p>

          <h2 className="mt-4 text-3xl font-semibold">{activeScene.title}</h2>
          <p className="mt-3 text-muted-foreground">{activeScene.description}</p>

          <div className="mt-6 h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-200"
              style={{ width: `${internal.sceneProgression}%` }}
            />
          </div>

          <ol className="mt-6 space-y-2 text-sm text-muted-foreground">
            {scenes.map((scene, index) => (
              <li
                key={scene.id}
                className={index === internal.sceneNumber ? 'font-semibold text-foreground' : undefined}
              >
                Scene {index + 1}: {scene.title}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
