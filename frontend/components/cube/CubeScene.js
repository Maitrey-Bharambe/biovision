'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/* -------------------------------------------------------------------- */
/*  MAIN SCENE                                                            */
/* -------------------------------------------------------------------- */
export function CubeScene({
  axes,
  cells,
  metric,
  operation,
  slice,                        // { dim: 'x'|'y'|'z', index: number }
  onHover,
  onSelect,
  selected,
  pivotKey,                     // change → animate rotation
}) {
  // Normalize every axis to a fixed world extent so the cube stays cubic
  // regardless of how many ticks a given dimension has.
  const SIZE = 5;
  const nx = Math.max(1, axes.x.values.length);
  const ny = Math.max(1, axes.y.values.length);
  const nz = Math.max(1, axes.z.values.length);
  const step = { x: SIZE / nx, y: SIZE / ny, z: SIZE / nz };

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.75]}
      camera={{ position: [8.5, 6.5, 9], fov: 38 }}
      style={{ background: 'transparent' }}>
      {/* very soft ambient palette — no fog so cells stay visible on the light backdrop */}
      <ambientLight intensity={0.9}/>
      <pointLight position={[6, 8, 6]}  intensity={0.55} color="#ffffff"/>
      <pointLight position={[-5, 4, -5]} intensity={0.35} color="#7fe3d4"/>

      <PivotGroup pivotKey={pivotKey}>
        {/* Center the cube around origin */}
        <group position={[-SIZE / 2, -SIZE / 2, -SIZE / 2]}>
          <Grid nx={nx} ny={ny} nz={nz} step={step}/>
          <CubeFrame nx={nx} ny={ny} nz={nz} step={step}/>
          <AxisLabels axes={axes} nx={nx} ny={ny} nz={nz} step={step} SIZE={SIZE}/>
          {slice && <SlicePlane slice={slice} nx={nx} ny={ny} nz={nz} step={step}/>}
          <Cells
            cells={cells} slice={slice} step={step}
            onHover={onHover} onSelect={onSelect} selected={selected}/>
        </group>
      </PivotGroup>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        rotateSpeed={0.9}
        zoomSpeed={0.85}
        minDistance={4} maxDistance={22}
        target={[0, 0, 0]}/>
    </Canvas>
  );
}

/* -------------------------------------------------------------------- */
/*  PIVOT ANIMATION                                                       */
/* -------------------------------------------------------------------- */
function PivotGroup({ pivotKey, children }) {
  const ref = useRef();
  const from = useRef(0);
  const to   = useRef(0);
  const t    = useRef(1);

  useEffect(() => {
    from.current = ref.current?.rotation.y ?? 0;
    to.current   = from.current + Math.PI * 0.5;
    t.current    = 0;
  }, [pivotKey]);

  useFrame((_, dt) => {
    if (t.current < 1) {
      t.current = Math.min(1, t.current + dt * 1.4);
      const e = 1 - Math.pow(1 - t.current, 3);
      if (ref.current) {
        ref.current.rotation.y = from.current + (to.current - from.current) * e;
      }
    }
  });
  return <group ref={ref}>{children}</group>;
}

/* -------------------------------------------------------------------- */
/*  GRID PLANES                                                           */
/* -------------------------------------------------------------------- */
function Grid({ nx, ny, nz, step }) {
  const c = "#1e5670";
  const lines = [];
  for (let i = 0; i <= nx; i++)
    lines.push([[i * step.x, 0, 0], [i * step.x, ny * step.y, 0]]);
  for (let j = 0; j <= ny; j++)
    lines.push([[0, j * step.y, 0], [nx * step.x, j * step.y, 0]]);
  for (let i = 0; i <= nx; i++)
    lines.push([[i * step.x, 0, 0], [i * step.x, 0, nz * step.z]]);
  for (let k = 0; k <= nz; k++)
    lines.push([[0, 0, k * step.z], [nx * step.x, 0, k * step.z]]);
  for (let j = 0; j <= ny; j++)
    lines.push([[0, j * step.y, 0], [0, j * step.y, nz * step.z]]);
  for (let k = 0; k <= nz; k++)
    lines.push([[0, 0, k * step.z], [0, ny * step.y, k * step.z]]);

  return (
    <group>
      {lines.map((p, i) => (
        <Line key={i} points={p} color={c} lineWidth={1} transparent opacity={0.30}/>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------- */
/*  AXIS LABELS + TICK MARKS                                              */
/* -------------------------------------------------------------------- */
function AxisLabels({ axes, nx, ny, nz, step, SIZE }) {
  const titleColor = "#eaffff";
  const tickColor  = "#eaffff";

  const truncate = (s, n) => (String(s).length > n ? String(s).slice(0, n-1) + '…' : String(s));

  return (
    <group>
      {/* Axis titles */}
      <Text position={[nx*step.x/2, -0.55, nz*step.z + 0.15]} fontSize={0.28} color="#7fe3d4"
            anchorX="center">{axes.x.label.toUpperCase()}</Text>
      <Text position={[-0.7, ny*step.y/2, nz*step.z + 0.15]} fontSize={0.28} color="#a5f3fc"
            rotation={[0, 0, Math.PI / 2]} anchorX="center">
        {axes.y.label.toUpperCase()}
      </Text>
      <Text position={[nx*step.x + 0.25, -0.55, nz*step.z/2]} fontSize={0.28} color="#f9a8d4"
            rotation={[0, -Math.PI / 2, 0]} anchorX="center">
        {axes.z.label.toUpperCase()}
      </Text>

      {/* X ticks — only show a subset if many */}
      {tickIndices(axes.x.values.length, 10).map(i => (
        <Text key={`x${i}`}
              position={[(i + 0.5) * step.x, -0.20, nz * step.z + 0.02]}
              fontSize={0.16} color={tickColor} anchorX="center">
          {truncate(axes.x.values[i], 10)}
        </Text>
      ))}
      {/* Y ticks */}
      {tickIndices(axes.y.values.length, 10).map(j => (
        <Text key={`y${j}`}
              position={[-0.08, (j + 0.5) * step.y, nz * step.z + 0.02]}
              fontSize={0.16} color={tickColor} anchorX="right">
          {truncate(axes.y.values[j], 12)}
        </Text>
      ))}
      {/* Z ticks */}
      {tickIndices(axes.z.values.length, 6).map(k => (
        <Text key={`z${k}`}
              position={[nx * step.x + 0.08, -0.20, (k + 0.5) * step.z]}
              fontSize={0.16} color={tickColor} anchorX="left">
          {truncate(axes.z.values[k], 14)}
        </Text>
      ))}
    </group>
  );
}

/** Pick a nicely-spaced subset of tick indices (avoids label overlap) */
function tickIndices(n, maxTicks = 10) {
  if (n <= maxTicks) return Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil(n / maxTicks);
  const arr = [];
  for (let i = 0; i < n; i += step) arr.push(i);
  if (arr[arr.length - 1] !== n - 1) arr.push(n - 1);
  return arr;
}

/* -------------------------------------------------------------------- */
/*  CUBE OUTLINE                                                          */
/* -------------------------------------------------------------------- */
function CubeFrame({ nx, ny, nz, step }) {
  const X = nx * step.x, Y = ny * step.y, Z = nz * step.z;
  const c = "#22d3ee";
  const corners = [
    [[0,0,0],[X,0,0]], [[0,Y,0],[X,Y,0]],
    [[0,0,Z],[X,0,Z]], [[0,Y,Z],[X,Y,Z]],
    [[0,0,0],[0,Y,0]], [[X,0,0],[X,Y,0]],
    [[0,0,Z],[0,Y,Z]], [[X,0,Z],[X,Y,Z]],
    [[0,0,0],[0,0,Z]], [[X,0,0],[X,0,Z]],
    [[0,Y,0],[0,Y,Z]], [[X,Y,0],[X,Y,Z]],
  ];
  return (
    <group>
      {corners.map((p, i) => (
        <Line key={i} points={p} color={c} lineWidth={2.2} transparent opacity={0.95}/>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------- */
/*  SLICE PLANE                                                           */
/* -------------------------------------------------------------------- */
function SlicePlane({ slice, nx, ny, nz, step }) {
  const X = nx * step.x, Y = ny * step.y, Z = nz * step.z;
  let position, args, rotation = [0, 0, 0];
  if (slice.dim === 'x') {
    const idx = (slice.index + 0.5) * step.x;
    position = [idx, Y/2, Z/2]; args = [Y, Z]; rotation = [0, Math.PI/2, 0];
  }
  if (slice.dim === 'y') {
    const idx = (slice.index + 0.5) * step.y;
    position = [X/2, idx, Z/2]; args = [X, Z]; rotation = [Math.PI/2, 0, 0];
  }
  if (slice.dim === 'z') {
    const idx = (slice.index + 0.5) * step.z;
    position = [X/2, Y/2, idx]; args = [X, Y]; rotation = [0, 0, 0];
  }
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={args}/>
      <meshStandardMaterial color="#f472b6" transparent opacity={0.22}
                            side={THREE.DoubleSide}
                            emissive="#ec4899" emissiveIntensity={0.6}/>
    </mesh>
  );
}

/* -------------------------------------------------------------------- */
/*  CELL FIELD                                                            */
/* -------------------------------------------------------------------- */
function Cells({ cells, slice, step, onHover, onSelect, selected }) {
  const prepared = useMemo(() => {
    if (!cells || cells.length === 0) return [];
    const vals = cells.map(c => c.metric || 0);
    const max = Math.max(1e-9, ...vals);
    const min = Math.min(...vals);
    const cnts = cells.map(c => c.observation_count || 0);
    const maxCnt = Math.max(1, ...cnts);
    return cells.map(c => {
      const t   = max === min ? 0.5 : (c.metric - min) / (max - min);
      const sizeFactor = 0.35 + 0.60 * (Math.log(1 + c.observation_count) / Math.log(1 + maxCnt));
      const color = colorForT(t);
      let dimmed = false;
      if (slice) {
        if (slice.dim === 'x' && c.x !== slice.index) dimmed = true;
        if (slice.dim === 'y' && c.y !== slice.index) dimmed = true;
        if (slice.dim === 'z' && c.z !== slice.index) dimmed = true;
      }
      return { ...c, sizeFactor, color, dimmed, t };
    });
  }, [cells, slice]);

  return (
    <group>
      {prepared.map((c, i) => (
        <CellMesh
          key={i}
          cell={c}
          step={step}
          onHover={onHover}
          onSelect={onSelect}
          isSelected={selected && selected.x === c.x && selected.y === c.y && selected.z === c.z}/>
      ))}
    </group>
  );
}

function CellMesh({ cell, step, onHover, onSelect, isSelected }) {
  const ref = useRef();
  const [hover, setHover] = useState(false);
  // We render a unit box then scale it in `useFrame` so voxels grow/shrink
  // when hovered / selected (nice tactile feel).
  const baseScale = [cell.sizeFactor * step.x * 0.9,
                     cell.sizeFactor * step.y * 0.9,
                     cell.sizeFactor * step.z * 0.9];

  useFrame((_, dt) => {
    if (!ref.current) return;
    const boost = isSelected ? 1.35 : hover ? 1.20 : 1.0;
    const goal  = [baseScale[0] * boost, baseScale[1] * boost, baseScale[2] * boost];
    const cur   = ref.current.scale;
    const k = Math.min(1, dt * 10);
    cur.x += (goal[0] - cur.x) * k;
    cur.y += (goal[1] - cur.y) * k;
    cur.z += (goal[2] - cur.z) * k;
  });

  const emissiveIntensity = cell.dimmed ? 0.05 : (isSelected ? 0.85 : hover ? 0.55 : 0.40);
  const opacity = cell.dimmed ? 0.10 : (isSelected || hover ? 0.98 : 0.90);

  return (
    <mesh
      ref={ref}
      position={[(cell.x + 0.5) * step.x, (cell.y + 0.5) * step.y, (cell.z + 0.5) * step.z]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); onHover?.(cell); }}
      onPointerOut ={() => { setHover(false); onHover?.(null); }}
      onClick      ={(e) => { e.stopPropagation(); onSelect?.(cell); }}>
      <boxGeometry args={[1, 1, 1]}/>
      <meshStandardMaterial
        color={cell.color}
        transparent
        opacity={opacity}
        emissive={cell.color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.30}
        metalness={0.15}/>
    </mesh>
  );
}

function colorForT(t) {
  // teal → aqua → violet → rose gradient, vibrant on light backdrop
  const stops = [
    [0.00, [14, 165, 183]],   // #0ea5b7 teal
    [0.35, [77, 208, 225]],   // aqua
    [0.65, [167, 139, 250]],  // violet
    [1.00, [244, 114, 182]],  // rose
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i+1][0]) { a = stops[i]; b = stops[i+1]; break; }
  }
  const u = (t - a[0]) / Math.max(0.001, (b[0] - a[0]));
  const r  = Math.round(a[1][0] + (b[1][0] - a[1][0]) * u);
  const g  = Math.round(a[1][1] + (b[1][1] - a[1][1]) * u);
  const bl = Math.round(a[1][2] + (b[1][2] - a[1][2]) * u);
  return `rgb(${r},${g},${bl})`;
}
