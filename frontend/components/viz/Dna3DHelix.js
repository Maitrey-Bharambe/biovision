'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Text, Billboard } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const NUC_COLOR = {
  A: '#2f6df1',    // adenine   — blue
  T: '#e0a021',    // thymine   — amber
  C: '#e0526d',    // cytosine  — rose
  G: '#1fb885',    // guanine   — green
};
const NUC_NAME = { A: 'Adenine', T: 'Thymine', C: 'Cytosine', G: 'Guanine' };
const COMPLEMENT = { A: 'T', T: 'A', C: 'G', G: 'C' };

const HELIX_RADIUS   = 1.4;
const PITCH          = 0.42;        // vertical distance per base pair
const TURN_RATE      = 0.60;        // radians per base pair (≈10.4 bp / turn)
const BACKBONE_RGB_A = '#5eddec';
const BACKBONE_RGB_B = '#8bf0da';


/* ===================================================================== *
 *  Public component                                                       *
 * ===================================================================== */
export function Dna3DHelix({
  sequence       = 'ATGCGTAGCTAGCTAGCGTAACGTTCCAAG',
  highlight      = null,         // position being edited
  altBase        = null,         // show this base on strand A at `highlight`
  autoRotate     = true,
  onPick,                        // (position) => void — user clicked a base
  height         = 420,
  showProtein    = true,
}) {
  // trim sequence to a manageable window around the highlight
  const [winStart, slicedSeq] = useMemo(() => {
    if (!sequence) return [0, 'ATGC'];
    const MAX = 36;
    if (sequence.length <= MAX) return [0, sequence];
    if (highlight === null)      return [0, sequence.slice(0, MAX)];
    const half = Math.floor(MAX / 2);
    const start = Math.min(Math.max(0, highlight - half), sequence.length - MAX);
    return [start, sequence.slice(start, start + MAX)];
  }, [sequence, highlight]);

  const localHighlight = highlight !== null ? highlight - winStart : null;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="relative rounded-2xl overflow-hidden border border-border/80"
           style={{ height, background: 'radial-gradient(ellipse at 50% 20%, #cfeef4 0%, #9bd6e0 40%, #0f3b55 100%)' }}>
        <Canvas camera={{ position: [0, 0.5, 9], fov: 42 }} dpr={[1, 1.75]}>
          <ambientLight intensity={0.95}/>
          <pointLight position={[6, 10, 10]} intensity={0.65}/>
          <pointLight position={[-5, -4, -5]} intensity={0.35} color="#7fe3d4"/>

          <HelixAssembly
            sequence={slicedSeq}
            winStart={winStart}
            localHighlight={localHighlight}
            altBase={altBase}
            onPick={onPick}
          />

          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={0.9}
            enablePan={false}
            minDistance={4}
            maxDistance={16}/>
        </Canvas>

        {/* Legend */}
        <div className="absolute top-3 left-3 flex gap-3 bg-white/80 backdrop-blur rounded-full px-3 py-1 border border-border/60 shadow-card text-[11px]">
          {['A','T','C','G'].map(b => (
            <span key={b} className="inline-flex items-center gap-1 text-ink">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: NUC_COLOR[b] }}/>
              {b}
            </span>
          ))}
        </div>

        {/* Position + rotation hint */}
        <div className="absolute top-3 right-3 text-[10px] bg-white/70 backdrop-blur px-2.5 py-1 rounded-full border border-border/60 text-ink">
          {highlight !== null ? `pos ${highlight}` : 'drag to rotate · scroll to zoom'}
        </div>

        {/* Direction tag */}
        <div className="absolute bottom-3 left-3 text-[10px] text-white/90 font-mono tracking-widest">
          5′ ↑  strand A &nbsp;·&nbsp;  3′ ↓ strand B
        </div>
      </div>

      {showProtein && (
        <ProteinStrip sequence={slicedSeq} winStart={winStart} highlight={localHighlight}/>
      )}
    </div>
  );
}


/* ===================================================================== *
 *  Helix geometry                                                          *
 * ===================================================================== */
function HelixAssembly({ sequence, winStart, localHighlight, altBase, onPick }) {
  const N = sequence.length;
  const { backboneA, backboneB, rungs } = useMemo(() => {
    const a = [], b = [], r = [];
    const yOffset = -(N - 1) * PITCH / 2;
    for (let i = 0; i < N; i++) {
      const theta = i * TURN_RATE;
      const y  = yOffset + i * PITCH;
      const xa = Math.cos(theta) * HELIX_RADIUS;
      const za = Math.sin(theta) * HELIX_RADIUS;
      const xb = Math.cos(theta + Math.PI) * HELIX_RADIUS;
      const zb = Math.sin(theta + Math.PI) * HELIX_RADIUS;
      a.push([xa, y, za]);
      b.push([xb, y, zb]);
      r.push({
        start: [xa, y, za],
        end:   [xb, y, zb],
        y,
        i,
        baseA: sequence[i].toUpperCase(),
        baseB: COMPLEMENT[sequence[i].toUpperCase()] || 'A',
        isCodonStart: ((winStart + i) % 3) === 0,
      });
    }
    return { backboneA: a, backboneB: b, rungs: r };
  }, [sequence, winStart, N]);

  return (
    <group>
      {/* Smooth sugar-phosphate backbones (TubeGeometry over a Catmull-Rom curve) */}
      <BackboneTube points={backboneA} color={BACKBONE_RGB_A}/>
      <BackboneTube points={backboneB} color={BACKBONE_RGB_B}/>

      {/* Rungs + nucleotide beads */}
      {rungs.map((r) => (
        <BasePair
          key={r.i}
          r={r}
          globalIndex={winStart + r.i}
          isHighlight={localHighlight === r.i}
          altBase={localHighlight === r.i ? altBase : null}
          onPick={onPick}
        />
      ))}
    </group>
  );
}

function BackboneTube({ points, color }) {
  const geom = useMemo(() => {
    const vec = points.map(p => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(vec, false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, Math.max(32, points.length * 4), 0.09, 10, false);
  }, [points]);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.2}
                            emissive={color} emissiveIntensity={0.15}/>
    </mesh>
  );
}


/* ===================================================================== *
 *  One base pair = rung + 2 nucleotide beads (+ optional alt bead)        *
 * ===================================================================== */
function BasePair({ r, globalIndex, isHighlight, altBase, onPick }) {
  const [hover, setHover] = useState(false);
  const ref = useRef();

  // Pulse when highlighted
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (isHighlight) {
      const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.12;
      ref.current.scale.set(s, s, s);
    } else {
      ref.current.scale.set(1, 1, 1);
    }
  });

  const rungColor = isHighlight ? '#f472b6' : hover ? '#fbbf24' : '#aedef1';
  const rungWidth = isHighlight ? 4 : hover ? 2.4 : 1.6;

  const beadA_color = isHighlight && altBase && altBase !== r.baseA
    ? '#e2e8f0' : NUC_COLOR[r.baseA];
  const beadA_opacity = isHighlight && altBase && altBase !== r.baseA ? 0.3 : 1;

  return (
    <group>
      {/* rung */}
      <Line points={[r.start, r.end]} color={rungColor}
            lineWidth={rungWidth} transparent opacity={isHighlight ? 1 : 0.75}/>

      {/* strand A bead (reference base) */}
      <mesh
        ref={isHighlight ? ref : null}
        position={r.start}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => { e.stopPropagation(); onPick?.(globalIndex); }}>
        <sphereGeometry args={[0.19, 20, 20]}/>
        <meshStandardMaterial
          color={beadA_color}
          transparent opacity={beadA_opacity}
          roughness={0.3} metalness={0.2}
          emissive={beadA_color}
          emissiveIntensity={isHighlight ? 0.65 : hover ? 0.35 : 0.15}/>
      </mesh>

      {/* strand B bead (complement) */}
      <mesh position={r.end}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => { e.stopPropagation(); onPick?.(globalIndex); }}>
        <sphereGeometry args={[0.17, 20, 20]}/>
        <meshStandardMaterial
          color={NUC_COLOR[r.baseB]}
          roughness={0.3} metalness={0.2}
          emissive={NUC_COLOR[r.baseB]}
          emissiveIntensity={isHighlight ? 0.55 : hover ? 0.3 : 0.12}/>
      </mesh>

      {/* floating base label for selected / hovered */}
      {(isHighlight || hover) && (
        <Billboard position={[r.start[0] * 1.6, r.start[1] + 0.18, r.start[2] * 1.6]}>
          <Text fontSize={0.26} color={isHighlight ? '#ec4899' : '#0a2540'}
                anchorX="center" outlineWidth={0.012} outlineColor="#ffffff">
            {r.baseA}·{globalIndex}
          </Text>
        </Billboard>
      )}

      {/* alt-base ghost: shows the user's chosen edit at the highlighted rung */}
      {isHighlight && altBase && altBase !== r.baseA && (
        <mesh position={[r.start[0] * 1.35, r.start[1], r.start[2] * 1.35]}>
          <sphereGeometry args={[0.22, 20, 20]}/>
          <meshStandardMaterial
            color={NUC_COLOR[altBase] || '#ffffff'}
            emissive={NUC_COLOR[altBase] || '#ffffff'}
            emissiveIntensity={0.85}
            transparent opacity={0.85}/>
        </mesh>
      )}

      {/* codon tick marks every 3 bases on strand A */}
      {r.isCodonStart && (
        <mesh position={[r.start[0] * 1.18, r.start[1], r.start[2] * 1.18]}
              rotation={[0, 0, 0]}>
          <boxGeometry args={[0.05, 0.05, 0.05]}/>
          <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.6}/>
        </mesh>
      )}
    </group>
  );
}


/* ===================================================================== *
 *  Protein translation strip underneath the viewer                        *
 * ===================================================================== */
const CODONS = {
  TTT:'F',TTC:'F',TTA:'L',TTG:'L',CTT:'L',CTC:'L',CTA:'L',CTG:'L',
  ATT:'I',ATC:'I',ATA:'I',ATG:'M',GTT:'V',GTC:'V',GTA:'V',GTG:'V',
  TCT:'S',TCC:'S',TCA:'S',TCG:'S',CCT:'P',CCC:'P',CCA:'P',CCG:'P',
  ACT:'T',ACC:'T',ACA:'T',ACG:'T',GCT:'A',GCC:'A',GCA:'A',GCG:'A',
  TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',
  AAT:'N',AAC:'N',AAA:'K',AAG:'K',GAT:'D',GAC:'D',GAA:'E',GAG:'E',
  TGT:'C',TGC:'C',TGA:'*',TGG:'W',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
  AGT:'S',AGC:'S',AGA:'R',AGG:'R',GGT:'G',GGC:'G',GGA:'G',GGG:'G',
};
function ProteinStrip({ sequence, winStart, highlight }) {
  const codons = useMemo(() => {
    const out = [];
    const shift = winStart % 3;
    const trimmed = sequence.slice(shift ? 3 - shift : 0);
    for (let i = 0; i < Math.floor(trimmed.length / 3); i++) {
      const codon = trimmed.slice(i * 3, i * 3 + 3).toUpperCase();
      const aa = CODONS[codon] || '?';
      out.push({ codon, aa, start: (shift ? 3 - shift : 0) + i * 3 });
    }
    return out;
  }, [sequence, winStart]);

  return (
    <div className="rounded-2xl border border-border/80 bg-white/80 backdrop-blur p-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-muted">Codon translation strip</div>
        <div className="text-[10px] text-muted">A·T·C·G coloring · stop = *</div>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {codons.map((c, i) => {
          const containsHighlight = highlight !== null &&
                                     c.start <= highlight && highlight < c.start + 3;
          return (
            <div key={i} className={`shrink-0 rounded-md px-2 py-1 border text-center min-w-[46px] ${
              containsHighlight ? 'bg-rose/15 border-rose text-rose font-semibold' :
              'bg-white border-border/60 text-ink'}`}>
              <div className="font-mono text-xs tracking-wider">{c.codon}</div>
              <div className="text-[11px] font-display font-bold">{c.aa}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
