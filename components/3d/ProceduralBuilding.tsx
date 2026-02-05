
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingType, ProceduralBuildingProps } from '../../types';

// Shared Geometries
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const coneGeo = new THREE.ConeGeometry(1, 1, 4);
const sphereGeo = new THREE.SphereGeometry(1, 8, 8);
const prismGeo = new THREE.CylinderGeometry(0, 1, 1, 4, 1); 

// --- Modular Components ---

const WindowBlock = React.memo(({ position, scale, isNight, color }: { position: [number, number, number], scale: [number, number, number], isNight?: boolean, color?: string }) => (
  <mesh geometry={boxGeo} position={position} scale={scale}>
    <meshStandardMaterial 
        color={color || (isNight ? "#fef3c7" : "#bfdbfe")} 
        emissive={isNight ? "#fef3c7" : (color ? "#000000" : "#bfdbfe")} 
        emissiveIntensity={isNight ? 1.5 : 0.1} 
        roughness={0.1} 
        metalness={0.8} 
    />
  </mesh>
));

const ACUnit = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position} scale={[0.2, 0.15, 0.2]}>
        <boxGeometry />
        <meshStandardMaterial color="#94a3b8" />
    </mesh>
);

const Skylight = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position} scale={[0.4, 0.05, 0.4]}>
        <boxGeometry />
        <meshStandardMaterial color="#bae6fd" metalness={0.5} roughness={0.1} />
    </mesh>
);

const Fence = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
        <mesh position={[0, 0.15, 0.45]} scale={[1, 0.3, 0.05]}>
            <boxGeometry />
            <meshStandardMaterial color="#b45309" />
        </mesh>
        <mesh position={[0, 0.15, -0.45]} scale={[1, 0.3, 0.05]}>
            <boxGeometry />
            <meshStandardMaterial color="#b45309" />
        </mesh>
        <mesh position={[0.45, 0.15, 0]} scale={[0.05, 0.3, 0.9]}>
            <boxGeometry />
            <meshStandardMaterial color="#b45309" />
        </mesh>
        <mesh position={[-0.45, 0.15, 0]} scale={[0.05, 0.3, 0.9]}>
            <boxGeometry />
            <meshStandardMaterial color="#b45309" />
        </mesh>
    </group>
);

const Billboard = ({ position, rotation, animated = false, color = "#fef08a", scale = [1, 1, 1] }: { position: [number, number, number], rotation?: [number, number, number], animated?: boolean, color?: string, scale?: [number, number, number] }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (animated && groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime;
        }
    });

    return (
        <group position={position} rotation={rotation ? new THREE.Euler(...rotation) : new THREE.Euler(0, 0, 0)} scale={scale}>
            <group ref={groupRef}>
                <mesh position={[0, 0.25, 0]} scale={[0.8, 0.4, 0.05]}>
                    <boxGeometry />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
                </mesh>
            </group>
            <mesh position={[0, -0.1, 0]} scale={[0.1, 0.3, 0.05]}>
                 <boxGeometry />
                 <meshStandardMaterial color="#64748b" />
            </mesh>
        </group>
    );
};

const AnimatedSmoke = ({ position, color = "#cbd5e1" }: { position: [number, number, number], color?: string }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.children.forEach((child, i) => {
            const t = state.clock.elapsedTime;
            const offset = i * 2;
            const item = child as THREE.Mesh;
            child.position.y = ((t + offset) % 3) * 0.5;
            child.scale.setScalar(0.1 + child.position.y * 0.3);
            if (item.material instanceof THREE.MeshBasicMaterial) {
                item.material.opacity = 1 - (child.position.y / 1.5);
            }
        });
    });

    return (
        <group position={position} ref={ref}>
            {[0, 1, 2].map(i => (
                <mesh key={i} position={[0, 0, 0]}>
                    <sphereGeometry args={[0.2, 8, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={0.5} />
                </mesh>
            ))}
        </group>
    );
};

const SmokeStack = ({ position, style, color = "#7f1d1d" }: { position: [number, number, number], style: number, color?: string }) => (
    <group position={position}>
      {style === 0 ? ( // Straight tall
          <mesh geometry={cylinderGeo} castShadow receiveShadow position={[0, 0.6, 0]} scale={[0.15, 1.2, 0.15]}>
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
      ) : style === 1 ? ( // Tapered conical
          <mesh castShadow receiveShadow position={[0, 0.6, 0]} scale={[0.2, 1.2, 0.2]}>
             <cylinderGeometry args={[0.5, 1, 1, 8]} />
             <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
          </mesh>
      ) : ( // Multiple thin pipes
          <group>
               <mesh geometry={cylinderGeo} position={[-0.1, 0.5, 0]} scale={[0.05, 1.0, 0.05]}>
                   <meshStandardMaterial color="#64748b" />
               </mesh>
               <mesh geometry={cylinderGeo} position={[0.1, 0.5, 0]} scale={[0.05, 1.0, 0.05]}>
                   <meshStandardMaterial color="#64748b" />
               </mesh>
               <mesh geometry={cylinderGeo} position={[0, 0.6, 0.1]} scale={[0.05, 1.2, 0.05]}>
                   <meshStandardMaterial color="#64748b" />
               </mesh>
          </group>
      )}
      <AnimatedSmoke position={[0, 1.2, 0]} />
    </group>
);

const StorageTank = ({ position, color = "#e2e8f0" }: { position: [number, number, number], color?: string }) => (
    <mesh geometry={cylinderGeo} castShadow receiveShadow position={position} scale={[0.3, 0.6, 0.3]}>
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
    </mesh>
);

const ProceduralBuilding: React.FC<ProceduralBuildingProps> = React.memo(({ type, baseColor, x, y, level = 1, opacity = 1, transparent = false, isNight = false }) => {
  const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  const variant = Math.floor(hash * 100); 
  const rotation = Math.floor(hash * 4) * (Math.PI / 2);
  const style = Math.floor(hash * 6); 
  
  // Exponential growth for height based on level for a more dramatic city skyline
  const heightMult = Math.pow(1.3, level - 1);
  const detailFactor = level;

  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    c.offsetHSL(hash * 0.1 - 0.05, 0, hash * 0.2 - 0.1);
    return c;
  }, [baseColor, hash]);

  const mainMat = useMemo(() => new THREE.MeshStandardMaterial({ color, flatShading: true, opacity, transparent, roughness: 0.8 }), [color, opacity, transparent]);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5).offsetHSL(0,0,-0.1), flatShading: true, opacity, transparent }), [color, opacity, transparent]);
  
  const commonProps = { castShadow: true, receiveShadow: true };
  const yOffset = -0.3;

  return (
    <group rotation={[0, rotation, 0]} position={[0, yOffset, 0]}>
      {(() => {
        switch (type) {
          case BuildingType.Road:
          case BuildingType.Highway:
            return null; 

          case BuildingType.Residential:
            return (
                <group>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.3 * heightMult, 0]} scale={[0.7, 0.6 * heightMult, 0.6]} />
                  
                  {/* Roof transforms with level: Pitched -> Flat -> Modern/Pointy */}
                  {level < 3 ? (
                    <mesh {...commonProps} material={roofMat} geometry={coneGeo} position={[0, (0.6 * heightMult) + 0.1, 0]} scale={[0.65, 0.4, 0.65]} rotation={[0, Math.PI/4, 0]} />
                  ) : level < 5 ? (
                    <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, (0.6 * heightMult) + 0.02, 0]} scale={[0.75, 0.05, 0.65]} />
                  ) : (
                    <group position={[0, (0.6 * heightMult) + 0.2, 0]}>
                         <mesh {...commonProps} material={roofMat} geometry={cylinderGeo} scale={[0.1, 0.8, 0.1]} />
                         <mesh material={new THREE.MeshStandardMaterial({color: '#fcd34d', emissive: '#fcd34d'})} geometry={sphereGeo} position={[0, 0.4, 0]} scale={0.05} />
                    </group>
                  )}
                  
                  {/* Window density increases with level */}
                  {Array.from({ length: level }).map((_, i) => (
                    <group key={i} position={[0, (i / level) * 0.5 * heightMult + 0.1, 0]}>
                        <WindowBlock isNight={isNight} position={[0.2, 0, 0.31]} scale={[0.15, 0.1, 0.05]} />
                        <WindowBlock isNight={isNight} position={[-0.2, 0, 0.31]} scale={[0.15, 0.1, 0.05]} />
                    </group>
                  ))}

                  {level > 3 && <ACUnit position={[0.2, 0.6 * heightMult + 0.05, 0.2]} />}
                  {variant % 5 === 0 && <Fence position={[0, 0, 0]} />}

                  <mesh position={[0, 0.15, 0.31]} scale={[0.15, 0.3, 0.02]}>
                      <boxGeometry />
                      <meshStandardMaterial color="#78350f" />
                  </mesh>
                </group>
            );

          case BuildingType.Commercial:
            return (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4 * heightMult, 0]} scale={[0.9, 0.8 * heightMult, 0.9]} />
                    
                    {/* Glass facade for modern commercial buildings */}
                    <WindowBlock isNight={isNight} position={[0, 0.4 * heightMult, 0.46]} scale={[0.8, 0.7 * heightMult, 0.05]} color={level > 3 ? "#93c5fd" : "#bfdbfe"} />
                    
                    {level > 1 && <Billboard position={[0, 0.8 * heightMult + 0.2, 0]} color={variant % 2 === 0 ? "#f43f5e" : "#8b5cf6"} animated={level > 3} />}
                    {level > 2 && <ACUnit position={[0.3, 0.8 * heightMult + 0.05, 0.3]} />}
                    {level > 4 && <Skylight position={[0, 0.8 * heightMult + 0.05, 0]} />}
                    
                    {/* Add base detail for luxury shops */}
                    {level >= 4 && (
                        <mesh position={[0, 0.1, 0.5]} scale={[0.95, 0.2, 0.1]}>
                            <boxGeometry />
                            <meshStandardMaterial color="#334155" />
                        </mesh>
                    )}
                </group>
            );

          case BuildingType.Industrial:
              return (
                <group>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.35 * heightMult, 0]} scale={[0.9, 0.7 * heightMult, 0.9]} />
                  <SmokeStack position={[0.3, 0.7 * heightMult, 0.3]} style={level % 3} color={level > 3 ? "#451a03" : "#7f1d1d"} />
                  
                  {level > 2 && <SmokeStack position={[-0.3, 0.7 * heightMult, -0.3]} style={(level + 1) % 3} color="#451a03" />}
                  {level > 3 && <StorageTank position={[0.25, 0.3, -0.2]} color="#94a3b8" />}
                  {level > 4 && (
                      <group position={[0, 0.7 * heightMult, 0]}>
                           <mesh position={[0, 0.1, 0]} scale={[0.4, 0.2, 0.4]}>
                               <cylinderGeometry />
                               <meshStandardMaterial color="#64748b" />
                           </mesh>
                           <AnimatedSmoke position={[0, 0.3, 0]} color="#94a3b8" />
                      </group>
                  )}
                </group>
              );

          case BuildingType.Park:
            return (
              <group position={[0, -yOffset - 0.29, 0]}> 
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <planeGeometry args={[0.9, 0.9]} />
                    <meshStandardMaterial color="#4ade80" />
                </mesh>
                <group scale={1 + (level - 1) * 0.3}>
                    {variant % 2 === 0 ? (
                        <group>
                            <mesh position={[0, 0.1, 0]} scale={[0.8, 0.2, 0.8]}>
                                <cylinderGeometry />
                                <meshStandardMaterial color="#e2e8f0" />
                            </mesh>
                            <mesh position={[0, 0.4, 0]} scale={[0.2, 0.6, 0.2]}>
                                 <cylinderGeometry />
                                 <meshStandardMaterial color="#60a5fa" transparent opacity={0.8} />
                            </mesh>
                        </group>
                    ) : (
                        <group>
                            <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: '#166534' })} geometry={coneGeo} position={[0, 0.4, 0]} scale={[0.4, 0.5, 0.4]} />
                            {level > 3 && (
                                <>
                                    <mesh position={[0.2, 0.2, 0.2]} scale={0.2} geometry={sphereGeo}><meshStandardMaterial color="#f87171" /></mesh>
                                    <mesh position={[-0.2, 0.2, -0.2]} scale={0.2} geometry={sphereGeo}><meshStandardMaterial color="#f87171" /></mesh>
                                </>
                            )}
                        </group>
                    )}
                </group>
              </group>
            );

          default:
            return (
                <group>
                     <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4 * heightMult, 0]} scale={[0.8, 0.8 * heightMult, 0.8]} />
                     {level > 2 && <WindowBlock isNight={isNight} position={[0, 0.5 * heightMult, 0.41]} scale={[0.6, 0.4, 0.05]} />}
                </group>
            );
        }
      })()}
    </group>
  );
});

export default ProceduralBuilding;
