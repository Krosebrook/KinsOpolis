
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import { Citizen, CitizenThought, CityStats, BuildingType, Grid, AppSettings } from '../types';
import { generateCitizenThought } from '../services/geminiService';
import { BUILDINGS, GRID_SIZE } from '../constants';

interface Props {
    citizen: Citizen;
    grid: Grid;
    stats: CityStats;
    settings: AppSettings;
    onClose: () => void;
    aiEnabled: boolean;
}

const CitizenModal: React.FC<Props> = ({ citizen, grid, stats, settings, onClose, aiEnabled }) => {
    const [thought, setThought] = useState<CitizenThought | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchThought = async () => {
            if (!aiEnabled) {
                setThought({
                    name: "Citizen #" + Math.floor(Math.random() * 1000),
                    job: "Walking Enthusiast",
                    thought: "I love walking around this grid!",
                    mood: 'neutral'
                });
                setLoading(false);
                return;
            }

            // Find nearest building
            let nearest = "Empty Lot";
            let minDist = 999;
            
            // Simple check of 5x5 area around citizen
            const cx = Math.round(citizen.x);
            const cy = Math.round(citizen.y);
            
            for(let y = Math.max(0, cy-2); y <= Math.min(GRID_SIZE-1, cy+2); y++) {
                for(let x = Math.max(0, cx-2); x <= Math.min(GRID_SIZE-1, cx+2); x++) {
                    const tile = grid[y][x];
                    if (tile.buildingType !== BuildingType.None && tile.buildingType !== BuildingType.Road) {
                        const d = Math.sqrt(Math.pow(x-cx, 2) + Math.pow(y-cy, 2));
                        if (d < minDist) {
                            minDist = d;
                            nearest = BUILDINGS[tile.buildingType].name;
                        }
                    }
                }
            }

            const data = await generateCitizenThought(stats, nearest, settings.weather, settings.isNight);
            if (data) setThought(data);
            setLoading(false);
        };

        fetchThought();
    }, [citizen]);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm border-4 border-indigo-500 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-2 font-bold">✕</button>
                
                {loading ? (
                    <div className="py-8 text-center">
                        <div className="text-4xl mb-4 animate-bounce">🤔</div>
                        <div className="font-bold text-slate-500">Asking citizen...</div>
                    </div>
                ) : thought ? (
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-4xl mb-4 border-4 border-slate-200">
                            {thought.mood === 'happy' ? '😄' : thought.mood === 'angry' ? '😠' : '😐'}
                        </div>
                        
                        <h2 className="text-2xl font-black text-slate-800 leading-none mb-1">{thought.name}</h2>
                        <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">{thought.job}</div>
                        
                        <div className="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-100 relative">
                            {/* Speech Bubble Tail */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-50 border-t-2 border-l-2 border-indigo-100 transform rotate-45"></div>
                            <p className="text-slate-700 font-medium italic">"{thought.thought}"</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-slate-500">
                        Citizen was too shy to talk.
                    </div>
                )}
                
                <div className="mt-6 text-center text-xs text-slate-400 font-bold">
                    ID: {citizen.id}
                </div>
            </div>
        </div>
    );
}

export default CitizenModal;
