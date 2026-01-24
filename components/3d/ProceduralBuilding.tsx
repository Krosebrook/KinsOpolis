
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BuildingType } from '../../types';

// Shared Geometries
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const coneGeo = new THREE.ConeGeometry(1, 1, 4);
const sphereGeo = new THREE.SphereGeometry(1, 8, 8);
const prismGeo = new THREE.CylinderGeometry(0, 1, 1, 4, 1); // For slanted roofs

// Helper Components
const WindowBlock = React.memo(({ position, scale, isNight }: { position: [number, number, number], scale: [number, number, number], isNight?: boolean }) => (
  <mesh geometry={boxGeo} position={position} scale={scale}>
    <meshStandardMaterial 
        color={isNight ? "#fef3c7" : "#bfdbfe"} 
        emissive={isNight ? "#fef3c7" : "#bfdbfe"} 
        emissiveIntensity={isNight ? 1.0 : 0.2} 
        roughness={0.1} 
        metalness={0.8} 
    />
  </mesh>
));

const SmokeStack = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      <mesh geometry={cylinderGeo} castShadow receiveShadow position={[0, 0.5, 0]} scale={[0.2, 1, 0.2]}>
        <meshStandardMaterial color="#4b5563" />
      </mesh>
    </group>
);

interface BuildingMeshProps {
  type: BuildingType;
  baseColor: string;
  x: number;
  y: number;
  level?: number;
  opacity?: number;
  transparent?: boolean;
  isNight?: boolean;
}

const getHash = (x: number, y: number) => Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;

const ProceduralBuilding = React.memo(({ type, baseColor, x, y, level = 1, opacity = 1, transparent = false, isNight = false }: BuildingMeshProps) => {
  const hash = getHash(x, y);
  const variant = Math.floor(hash * 100); 
  const rotation = Math.floor(hash * 4) * (Math.PI / 2);
  const style = Math.floor(hash * 3); // 0, 1, or 2 for style variation
  
  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    c.offsetHSL(hash * 0.1 - 0.05, 0, hash * 0.2 - 0.1);
    return c;
  }, [baseColor, hash]);

  const mainMat = useMemo(() => new THREE.MeshStandardMaterial({ color, flatShading: true, opacity, transparent, roughness: 0.8 }), [color, opacity, transparent]);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), flatShading: true, opacity, transparent }), [color, opacity, transparent]);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5).offsetHSL(0,0,-0.1), flatShading: true, opacity, transparent }), [color, opacity, transparent]);

  const commonProps = { castShadow: true, receiveShadow: true };
  const yOffset = -0.3;

  return (
    <group rotation={[0, rotation, 0]} position={[0, yOffset, 0]}>
      {(() => {
        switch (type) {
          case BuildingType.Residential:
            if (level >= 3) {
                // Skyscraper Apartment
                return (
                    <>
                        <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 1.0, 0]} scale={[0.8, 2.0, 0.8]} />
                        <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 2.0, 0]} scale={[0.7, 0.1, 0.7]} />
                        <WindowBlock isNight={isNight} position={[0, 0.5, 0.41]} scale={[0.6, 0.3, 0.05]} />
                        <WindowBlock isNight={isNight} position={[0, 1.0, 0.41]} scale={[0.6, 0.3, 0.05]} />
                        <WindowBlock isNight={isNight} position={[0, 1.5, 0.41]} scale={[0.6, 0.3, 0.05]} />
                        {style === 1 && <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0.3, 1.0, 0.3]} scale={[0.2, 2.0, 0.2]} />}
                    </>
                );
            }
            if (level === 2) {
                // Townhouse / Mid-rise
                return (
                    <>
                      <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.6, 0]} scale={[0.7, 1.2, 0.7]} />
                      {style === 0 ? (
                          // Flat Roof
                          <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 1.25, 0]} scale={[0.75, 0.1, 0.75]} />
                      ) : (
                          // Slanted Roof
                          <mesh {...commonProps} material={roofMat} geometry={prismGeo} position={[0, 1.4, 0]} scale={[0.5, 0.4, 0.5]} rotation={[0, Math.PI/4, 0]} />
                      )}
                      
                      <WindowBlock isNight={isNight} position={[0, 0.8, 0.36]} scale={[0.4, 0.3, 0.05]} />
                      <WindowBlock isNight={isNight} position={[0, 0.3, 0.36]} scale={[0.4, 0.3, 0.05]} />
                    </>
                );
            }
            // Basic House
            return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                  {style === 0 && (
                      // Classic Pyramid Roof
                      <mesh {...commonProps} material={roofMat} geometry={coneGeo} position={[0, 0.75, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]} />
                  )}
                  {style === 1 && (
                      // A-Frame / Gabled
                      <mesh {...commonProps} material={roofMat} geometry={prismGeo} position={[0, 0.7, 0]} scale={[0.5, 0.4, 0.6]} rotation={[0, 0, Math.PI/2]} />
                  )}
                   {style === 2 && (
                      // Modern Flat
                      <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 0.65, 0]} scale={[0.8, 0.1, 0.7]} />
                  )}
                  <WindowBlock isNight={isNight} position={[0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                  <WindowBlock isNight={isNight} position={[-0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                  {style === 2 && <WindowBlock isNight={isNight} position={[0, 0.3, -0.31]} scale={[0.5, 0.2, 0.05]} />}
                </>
            );

          case BuildingType.Commercial:
            // ... (Simplified logic for brevity, reusing generic shapes)
            return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.5, 0]} scale={[0.9, 1.0, 0.9]} />
                  <WindowBlock isNight={isNight} position={[0, 0.5, 0.46]} scale={[0.8, 0.6, 0.05]} />
                </>
            );

          case BuildingType.Industrial:
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                  <SmokeStack position={[0.3, 0.4, 0.3]} />
                </>
              );

          case BuildingType.Park:
            return (
              <group position={[0, -yOffset - 0.29, 0]}> 
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <planeGeometry args={[0.9, 0.9]} />
                    <meshStandardMaterial color="#86efac" />
                </mesh>
                <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: '#166534' })} geometry={coneGeo} position={[0, 0.4, 0]} scale={[0.4, 0.5, 0.4]} />
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
