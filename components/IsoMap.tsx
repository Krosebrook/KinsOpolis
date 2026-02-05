
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls, OrthographicCamera, Environment, Float, Sparkles, ContactShadows, MeshWobbleMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Grid, DecorationType, AppSettings, BuildingType } from '../types';
import { GRID_SIZE, DECORATIONS, BUILDINGS } from '../constants';
import ProceduralBuilding from './3d/ProceduralBuilding';
import WildlifeSystem from './3d/WildlifeSystem';

const boxGeo = new THREE.BoxGeometry(0.95, 0.2, 0.95);
const cylinderGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;

const Decoration = ({ type, color, isNight }: { type: DecorationType, color: string, isNight: boolean }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    
    if (type === DecorationType.Butterfly) {
      meshRef.current.position.y = 0.5 + Math.sin(t * 5) * 0.1;
      meshRef.current.rotation.y = t * 2;
    } else if (type === DecorationType.Cloud) {
      meshRef.current.position.y = 2 + Math.sin(t * 0.5) * 0.2;
      meshRef.current.rotation.z = Math.sin(t * 0.2) * 0.05;
    }
  });

  if (type === DecorationType.None) return null;

  return (
    <group ref={meshRef}>
      {type === DecorationType.Tree && (
        <group position={[0, 0, 0]}>
          <mesh geometry={cylinderGeo} castShadow receiveShadow position={[0, 0.25, 0]}>
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh castShadow position={[0, 0.6, 0]} scale={[0.4, 0.4, 0.4]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={color !== '#f8fafc' ? color : '#22c55e'} />
          </mesh>
          <mesh castShadow position={[0, 0.9, 0]} scale={[0.3, 0.3, 0.3]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={color !== '#f8fafc' ? color : '#4ade80'} />
          </mesh>
        </group>
      )}

      {type === DecorationType.Flower && (
         <group>
            {[0, 1, 2].map(i => {
                const angle = (i / 3) * Math.PI * 2;
                const r = 0.2;
                return (
                    <group key={i} position={[Math.cos(angle)*r, 0, Math.sin(angle)*r]} rotation={[0, angle, 0]}>
                         <mesh position={[0, 0.1, 0]} scale={[0.02, 0.2, 0.02]}>
                             <cylinderGeometry />
                             <meshStandardMaterial color="#166534" />
                         </mesh>
                         <mesh position={[0, 0.25, 0]} scale={0.08}>
                             <dodecahedronGeometry />
                             <meshStandardMaterial color={color !== '#f8fafc' ? color : (i===0?'#f472b6':i===1?'#60a5fa':'#fbbf24')} />
                         </mesh>
                    </group>
                )
            })}
         </group>
      )}

      {type === DecorationType.House && (
          <group position={[0, 0.3, 0]}>
              <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.5, 0.4, 0.5]} />
                  <meshStandardMaterial color={color !== '#f8fafc' ? color : '#fca5a5'} />
              </mesh>
              <mesh position={[0, 0.4, 0]} rotation={[0, Math.PI/4, 0]}>
                   <coneGeometry args={[0.45, 0.4, 4]} />
                   <meshStandardMaterial color="#be123c" />
              </mesh>
              {isNight && (
                  <pointLight position={[0, 0.2, 0.3]} distance={1} intensity={1} color="orange" />
              )}
          </group>
      )}

      {type === DecorationType.Pond && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
           <planeGeometry args={[0.8, 0.8, 8, 8]} />
           <MeshWobbleMaterial factor={0.5} speed={2} color="#60a5fa" transparent opacity={0.8} />
        </mesh>
      )}

      {type === DecorationType.Butterfly && (
         <group position={[0.3, 0, 0]}>
             <mesh>
                 <sphereGeometry args={[0.05]} />
                 <meshStandardMaterial color={color !== '#f8fafc' ? color : '#e879f9'} emissive={color} emissiveIntensity={0.5} />
             </mesh>
         </group>
      )}

      {type === DecorationType.Cloud && (
          <group scale={0.5}>
              <mesh position={[0, 0, 0]}>
                  <sphereGeometry args={[0.4, 8, 8]} />
                  <meshStandardMaterial color="white" transparent opacity={0.9} />
              </mesh>
              <mesh position={[0.4, 0.1, 0]}>
                  <sphereGeometry args={[0.3, 8, 8]} />
                  <meshStandardMaterial color="white" transparent opacity={0.9} />
              </mesh>
               <mesh position={[-0.4, 0.05, 0]}>
                  <sphereGeometry args={[0.35, 8, 8]} />
                  <meshStandardMaterial color="white" transparent opacity={0.9} />
              </mesh>
          </group>
      )}
    </group>
  );
};

// Procedural roadside details like streetlights and barriers
const RoadsideDetails = ({ type, x, y, isNight }: { type: BuildingType, x: number, y: number, isNight?: boolean }) => {
  if (type !== BuildingType.Highway) return null;

  const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  const rotation = Math.floor(hash * 4) * (Math.PI / 2);

  if (hash > 0.7) return null;

  return (
    <group rotation={[0, rotation, 0]} position={[0, 0, 0]}>
      {/* Streetlight */}
      {hash < 0.15 && (
        <group position={[0.45, 0, 0]}>
           <mesh position={[0, 0.5, 0]} castShadow>
               <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
               <meshStandardMaterial color="#475569" />
           </mesh>
           <mesh position={[-0.2, 0.9, 0]} rotation={[0, 0, Math.PI/4]}>
               <boxGeometry args={[0.4, 0.05, 0.05]} />
               <meshStandardMaterial color="#475569" />
           </mesh>
           <mesh position={[-0.35, 0.8, 0]}>
               <sphereGeometry args={[0.1, 8, 8]} />
               <meshStandardMaterial color="#fcd34d" emissive="#fcd34d" emissiveIntensity={isNight ? 2 : 0.5} />
           </mesh>
           {isNight && <pointLight position={[-0.35, 0.7, 0]} distance={3} intensity={2} color="#fcd34d" />}
        </group>
      )}

      {/* Road Barrier */}
      {hash > 0.4 && hash < 0.7 && (
         <mesh position={[-0.45, 0.15, 0]} castShadow>
            <boxGeometry args={[0.1, 0.3, 0.8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
         </mesh>
      )}
    </group>
  );
};

const GroundSystem = ({ color, buildingType, onClick, onPointerOver, onPointerOut }: any) => {
    const isHighway = buildingType === BuildingType.Highway;
    const isRoad = buildingType === BuildingType.Road;
    const isPark = buildingType === BuildingType.Park;
    const isIndustrial = buildingType === BuildingType.Industrial;

    const materialColor = useMemo(() => {
        if (isHighway) return '#1e293b'; 
        if (isRoad) return '#334155'; 
        if (isIndustrial) return '#94a3b8';
        if (isPark) return '#dcfce7'; 
        return color;
    }, [color, isHighway, isRoad, isIndustrial, isPark]);

    return (
        <group onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
            <mesh receiveShadow castShadow geometry={boxGeo}>
                <meshStandardMaterial color={materialColor} roughness={1} />
            </mesh>
            
            {/* Highway Thicker Base */}
            {isHighway && (
                 <mesh position={[0, -0.15, 0]} receiveShadow>
                     <boxGeometry args={[1, 0.1, 1]} />
                     <meshStandardMaterial color="#0f172a" />
                 </mesh>
            )}

            {/* Road curbs/sidewalks */}
            {(isRoad || isHighway) && (
                <>
                     <mesh position={[0.48, 0.11, 0]} receiveShadow>
                         <boxGeometry args={[0.04, 0.02, 1]} />
                         <meshStandardMaterial color="#cbd5e1" />
                     </mesh>
                     <mesh position={[-0.48, 0.11, 0]} receiveShadow>
                         <boxGeometry args={[0.04, 0.02, 1]} />
                         <meshStandardMaterial color="#cbd5e1" />
                     </mesh>
                </>
            )}
        </group>
    );
};

const Tile = ({ x, y, color, decoration, buildingType, onClick, settings }: any) => {
  const handleClick = (e: THREE.Event) => {
    e.stopPropagation();
    if (typeof x === 'number' && typeof y === 'number') onClick(x, y);
  };

  return (
    <group position={[x - WORLD_OFFSET, 0, y - WORLD_OFFSET]}>
      <GroundSystem 
        color={color} 
        buildingType={buildingType} 
        onClick={handleClick}
        onPointerOver={(e: any) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      />
      
      <Decoration type={decoration} color={color} isNight={settings.isNight} />
      <RoadsideDetails type={buildingType} x={x} y={y} isNight={settings.isNight} />
      
      {buildingType !== BuildingType.None && (
        <ProceduralBuilding 
          type={buildingType} 
          baseColor={BUILDINGS[buildingType].color} 
          x={x} 
          y={y} 
          isNight={settings.isNight} 
        />
      )}
    </group>
  );
};

const IsoMap = ({ grid, onTileClick, settings }: { grid: Grid, onTileClick: (x: number, y: number) => void, settings: AppSettings }) => {
  const tiles = useMemo(() => {
    return grid.map((row, y) => 
      row.map((tile, x) => (
        <Tile key={`${x}-${y}`} {...tile} onClick={onTileClick} settings={settings} />
      ))
    );
  }, [grid, onTileClick, settings]);

  const shadowsEnabled = settings.shadowDetail !== 'low';
  const shadowMapSize = settings.shadowDetail === 'high' ? 2048 : 512;
  const bgColor = settings.isNight ? '#020617' : '#cffafe';
  
  return (
    <div className="w-full h-full transition-colors duration-1000" style={{ backgroundColor: bgColor }}>
      <Canvas 
        shadows={shadowsEnabled}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(bgColor));
        }}
      >
        <OrthographicCamera makeDefault zoom={40} position={[20, 20, 20]} near={0.1} far={1000} />
        <MapControls enableRotate={false} enableZoom={true} minZoom={20} maxZoom={100} />
        
        {settings.isNight ? (
            <>
                <ambientLight intensity={0.2} />
                <directionalLight 
                    position={[10, 20, 5]} 
                    intensity={0.5} 
                    color="#818cf8"
                    castShadow={shadowsEnabled}
                    shadow-mapSize={[shadowMapSize, shadowMapSize]}
                    shadow-camera-left={-20}
                    shadow-camera-right={20}
                    shadow-camera-top={20}
                    shadow-camera-bottom={-20}
                />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <fog attach="fog" args={['#020617', 20, 100]} />
            </>
        ) : (
            <>
                <ambientLight intensity={settings.highContrast ? 1.5 : 0.8} />
                <directionalLight 
                    position={[10, 20, 10]} 
                    intensity={1.5} 
                    castShadow={shadowsEnabled}
                    shadow-mapSize={[shadowMapSize, shadowMapSize]}
                    shadow-camera-left={-20}
                    shadow-camera-right={20}
                    shadow-camera-top={20}
                    shadow-camera-bottom={-20}
                />
                <Environment preset="city" />
            </>
        )}
        
        <group>{tiles}</group>
        <WildlifeSystem grid={grid} />
        
        {settings.weather !== 'sunny' && settings.weather !== 'rainbow' && settings.weather !== 'glitter' && (
            <WeatherSystem type={settings.weather as 'rain'|'snow'} />
        )}

        {settings.weather === 'glitter' && (
          <Sparkles count={400} scale={20} size={6} speed={0.4} color="#ffd700" raycast={() => null} />
        )}
        
        {/* Simple ground plane reflection/shadow catch */}
        <ContactShadows position={[0, -0.11, 0]} opacity={0.4} scale={30} blur={2} far={1} resolution={512} color="#000000" />
      </Canvas>
    </div>
  );
};

import WeatherSystem from './3d/WeatherSystem';
export default IsoMap;
