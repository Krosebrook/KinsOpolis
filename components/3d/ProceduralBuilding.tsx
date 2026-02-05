
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

const Billboard = ({ position, rotation, animated = false }: { position: [number, number, number], rotation?: [number, number, number], animated?: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (animated && groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime;
        }
    });

    return (
        <group position={position} rotation={rotation ? new THREE.Euler(...rotation) : new THREE.Euler(0, 0, 0)}>
            <group ref={groupRef}>
                <mesh position={[0, 0.25, 0]} scale={[0.8, 0.4, 0.05]}>
                    <boxGeometry />
                    <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
                </mesh>
            </group>
            <mesh position={[0, -0.1, 0]} scale={[0.1, 0.3, 0.05]}>
                 <boxGeometry />
                 <meshStandardMaterial color="#64748b" />
            </mesh>
        </group>
    );
};

const AnimatedSmoke = ({ position }: { position: [number, number, number] }) => {
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
                    <meshBasicMaterial color="#cbd5e1" transparent opacity={0.5} />
                </mesh>
            ))}
        </group>
    );
};

const SmokeStack = ({ position, style }: { position: [number, number, number], style: number }) => (
    <group position={position}>
      {style === 0 ? (
          <mesh geometry={cylinderGeo} castShadow receiveShadow position={[0, 0.6, 0]} scale={[0.15, 1.2, 0.15]}>
            <meshStandardMaterial color="#7f1d1d" roughness={0.9} />
          </mesh>
      ) : style === 1 ? (
          <mesh geometry={cylinderGeo} castShadow receiveShadow position={[0, 0.6, 0]} scale={[0.1, 1.4, 0.1]}>
             <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
          </mesh>
      ) : (
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

const StorageTank = ({ position }: { position: [number, number, number] }) => (
    <mesh geometry={cylinderGeo} castShadow receiveShadow position={position} scale={[0.3, 0.6, 0.3]}>
        <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.3} />
    </mesh>
);

const RoadMarkings = ({ type }: { type: BuildingType }) => {
    if (type === BuildingType.Highway) {
        return (
            <group position={[0, 0.01, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.05, 0, 0]}>
                    <planeGeometry args={[0.05, 1]} />
                    <meshStandardMaterial color="#eab308" />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.05, 0, 0]}>
                    <planeGeometry args={[0.05, 1]} />
                    <meshStandardMaterial color="#eab308" />
                </mesh>
            </group>
        );
    }
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[0.1, 0.6]} />
            <meshStandardMaterial color="#e2e8f0" />
        </mesh>
    );
};

const ProceduralBuilding: React.FC<ProceduralBuildingProps> = React.memo(({ type, baseColor, x, y, level = 1, opacity = 1, transparent = false, isNight = false }) => {
  const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  const variant = Math.floor(hash * 100); 
  const rotation = Math.floor(hash * 4) * (Math.PI / 2);
  const style = Math.floor(hash * 6); // More variety
  
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
            return (
                <group position={[0, -0.29, 0]}>
                    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[1, 1]} />
                        <meshStandardMaterial color="#475569" roughness={0.9} />
                    </mesh>
                    <RoadMarkings type={BuildingType.Road} />
                    {variant % 20 === 0 && (
                        <mesh position={[0.4, 0.2, 0]} scale={[0.1, 0.4, 0.1]}>
                            <boxGeometry />
                            <meshStandardMaterial color="#94a3b8" />
                        </mesh>
                    )}
                </group>
            );

          case BuildingType.Highway:
            return (
                <group position={[0, -0.28, 0]}>
                    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[1, 1]} />
                        <meshStandardMaterial color="#1e293b" roughness={0.9} />
                    </mesh>
                    <RoadMarkings type={BuildingType.Highway} />
                </group>
            );

          case BuildingType.Residential:
            return (
                <group>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                  
                  {/* Varied Roofs */}
                  {style === 0 && ( // Hipped Roof
                    <mesh {...commonProps} material={roofMat} geometry={coneGeo} position={[0, 0.75, 0]} scale={[0.65, 0.4, 0.65]} rotation={[0, Math.PI/4, 0]} />
                  )}
                  {style === 1 && ( // Gabled Roof
                    <mesh {...commonProps} material={roofMat} geometry={prismGeo} position={[0, 0.7, 0]} scale={[0.55, 0.4, 0.65]} rotation={[0, 0, Math.PI/2]} />
                  )}
                  {style === 2 && ( // Flat Roof with AC
                    <group position={[0, 0.6, 0]}>
                        <mesh {...commonProps} material={roofMat} scale={[0.7, 0.05, 0.6]}>
                            <boxGeometry />
                        </mesh>
                        <ACUnit position={[0.1, 0.1, 0.1]} />
                    </group>
                  )}
                  {style >= 3 && ( // Steep A-Frame
                    <mesh {...commonProps} material={roofMat} geometry={coneGeo} position={[0, 0.8, 0]} scale={[0.55, 0.6, 0.55]} rotation={[0, Math.PI/4, 0]} />
                  )}

                  {/* Varied Windows */}
                  {variant % 2 === 0 ? (
                    <>
                        <WindowBlock isNight={isNight} position={[0.2, 0.35, 0.31]} scale={[0.12, 0.15, 0.05]} />
                        <WindowBlock isNight={isNight} position={[-0.2, 0.35, 0.31]} scale={[0.12, 0.15, 0.05]} />
                    </>
                  ) : (
                    <WindowBlock isNight={isNight} position={[0, 0.4, 0.31]} scale={[0.4, 0.15, 0.05]} />
                  )}

                  {/* Fence or Yard */}
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
                    <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.5, 0]} scale={[0.9, 1.0, 0.9]} />
                    
                    {style === 0 && ( // Modern Glass Front
                        <>
                             <WindowBlock isNight={isNight} position={[0, 0.5, 0.46]} scale={[0.8, 0.7, 0.05]} color="#93c5fd" />
                             <mesh position={[0, 1.05, 0]} scale={[0.85, 0.1, 0.85]}>
                                <boxGeometry />
                                <meshStandardMaterial color="#334155" />
                             </mesh>
                             <ACUnit position={[0.2, 1.15, 0.2]} />
                        </>
                    )}

                    {style === 1 && ( // Boutique with Spinning Billboard
                        <>
                             <WindowBlock isNight={isNight} position={[-0.2, 0.5, 0.46]} scale={[0.3, 0.4, 0.05]} />
                             <mesh position={[0.2, 0.35, 0.46]} scale={[0.2, 0.5, 0.02]}>
                                 <boxGeometry />
                                 <meshStandardMaterial color="#78350f" />
                             </mesh>
                             <mesh position={[0, 0.7, 0.5]} rotation={[Math.PI/4, 0, 0]} scale={[0.9, 0.05, 0.3]}>
                                 <boxGeometry />
                                 <meshStandardMaterial color={variant % 2 === 0 ? "#ef4444" : "#10b981"} />
                             </mesh>
                             <Billboard position={[0, 1.5, 0]} animated={true} />
                        </>
                    )}

                    {style === 2 && ( // Mixed use (2 story)
                        <>
                            <WindowBlock isNight={isNight} position={[0, 0.3, 0.46]} scale={[0.8, 0.4, 0.05]} />
                            <WindowBlock isNight={isNight} position={[0.2, 0.8, 0.46]} scale={[0.2, 0.2, 0.05]} />
                            <WindowBlock isNight={isNight} position={[-0.2, 0.8, 0.46]} scale={[0.2, 0.2, 0.05]} />
                            <mesh position={[0, 1.1, 0]} scale={[0.5, 0.2, 0.05]} rotation={[0, 0, Math.PI/32]}>
                                <boxGeometry />
                                <meshStandardMaterial color="#fcd34d" />
                            </mesh>
                            <ACUnit position={[-0.2, 1.1, -0.2]} />
                        </>
                    )}

                    {style === 3 && ( // Office (Tall)
                        <>
                             <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.8, 0]} scale={[0.8, 0.6, 0.8]} />
                             <WindowBlock isNight={isNight} position={[0, 0.5, 0.46]} scale={[0.15, 0.8, 0.05]} />
                             <WindowBlock isNight={isNight} position={[0.25, 0.5, 0.46]} scale={[0.15, 0.8, 0.05]} />
                             <WindowBlock isNight={isNight} position={[-0.25, 0.5, 0.46]} scale={[0.15, 0.8, 0.05]} />
                             <Skylight position={[0, 1.15, 0]} />
                        </>
                    )}

                    {style === 4 && ( // Restaurant with Awning
                        <>
                             <WindowBlock isNight={isNight} position={[0, 0.3, 0.46]} scale={[0.8, 0.4, 0.05]} />
                             {/* Awning */}
                             <mesh position={[0, 0.6, 0.6]} rotation={[0.4, 0, 0]} scale={[0.9, 0.05, 0.4]}>
                                 <boxGeometry />
                                 <meshStandardMaterial color="#ef4444" />
                             </mesh>
                             <mesh position={[0, 0.61, 0.6]} rotation={[0.4, 0, 0]} scale={[0.92, 0.05, 0.41]}>
                                  <boxGeometry />
                                  <meshStandardMaterial color="#ffffff" wireframe /> 
                             </mesh>
                        </>
                    )}
                </group>
            );

          case BuildingType.Industrial:
              return (
                <group>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.9]} />
                  
                  {style === 0 && ( // SmokeStack
                      <SmokeStack position={[0.3, 0.4, 0.3]} style={0} />
                  )}

                  {style === 1 && ( // Tanks
                      <>
                        <StorageTank position={[-0.2, 0.3, -0.2]} />
                        <StorageTank position={[0.2, 0.3, 0.2]} />
                        <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI/2]} scale={[0.05, 0.6, 0.05]}>
                            <cylinderGeometry />
                            <meshStandardMaterial color="#64748b" />
                        </mesh>
                      </>
                  )}

                  {style === 2 && ( // Warehouse
                      <>
                        <mesh {...commonProps} material={roofMat} geometry={prismGeo} position={[0, 0.8, 0]} scale={[0.65, 0.3, 0.9]} rotation={[0, 0, Math.PI/2]} />
                         <ACUnit position={[0.2, 0.9, 0]} />
                         <ACUnit position={[-0.2, 0.9, 0]} />
                      </>
                  )}

                  {style === 3 && ( // Processing Plant
                      <>
                         <SmokeStack position={[-0.3, 0.4, -0.3]} style={2} />
                         <mesh position={[0, 0.6, 0.46]} scale={[0.8, 0.1, 0.1]}>
                             <boxGeometry />
                             <meshStandardMaterial color="#64748b" />
                         </mesh>
                         <WindowBlock isNight={isNight} position={[0, 0.3, 0.46]} scale={[0.4, 0.2, 0.05]} color="#475569" />
                      </>
                  )}

                  {style === 4 && ( // Tech Factory
                       <>
                          <Skylight position={[0, 0.81, 0]} />
                          <mesh position={[0.3, 0.4, 0.46]} scale={[0.2, 0.6, 0.05]}>
                               <boxGeometry />
                               <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
                          </mesh>
                       </>
                  )}
                  
                  {style !== 3 && <WindowBlock isNight={isNight} position={[0, 0.5, 0.46]} scale={[0.2, 0.2, 0.05]} color="#475569" />}
                </group>
              );

          case BuildingType.Park:
            return (
              <group position={[0, -yOffset - 0.29, 0]}> 
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <planeGeometry args={[0.9, 0.9]} />
                    <meshStandardMaterial color="#4ade80" />
                </mesh>
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
                    <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: '#166534' })} geometry={coneGeo} position={[0, 0.4, 0]} scale={[0.4, 0.5, 0.4]} />
                )}
              </group>
            );

          case BuildingType.Police:
             return (
                 <group>
                     <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.8, 0.8, 0.8]} />
                     <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#1e3a8a'})} geometry={boxGeo} position={[0, 0.85, 0]} scale={[0.6, 0.1, 0.6]} />
                     <mesh material={new THREE.MeshStandardMaterial({color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 2})} geometry={sphereGeo} position={[0.2, 0.95, 0]} scale={0.15} />
                     <mesh material={new THREE.MeshStandardMaterial({color: '#3b82f6', emissive: '#3b82f6', emissiveIntensity: 2})} geometry={sphereGeo} position={[-0.2, 0.95, 0]} scale={0.15} />
                 </group>
             );

          case BuildingType.School:
              return (
                  <group>
                      <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.3, 0]} scale={[0.9, 0.6, 0.7]} />
                      <mesh {...commonProps} material={roofMat} geometry={coneGeo} position={[0, 0.8, 0]} scale={[0.3, 0.4, 0.3]} />
                      <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#facc15'})} geometry={cylinderGeo} position={[0, 1.0, 0]} scale={[0.05, 0.2, 0.05]} />
                      <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#ef4444'})} geometry={boxGeo} position={[0, 1.15, 0]} scale={[0.2, 0.1, 0.05]} />
                  </group>
              );

          default:
            return null;
        }
      })()}
    </group>
  );
});

export default ProceduralBuilding;
