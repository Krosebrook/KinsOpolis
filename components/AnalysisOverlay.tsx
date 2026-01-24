
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { LensMode, CityStats, Grid, CityAnalysis } from '../types';
import { generateCityReview } from '../services/analytics';

interface Props {
    lensMode: LensMode;
    setLensMode: (mode: LensMode) => void;
    stats: CityStats;
    grid: Grid;
    aiEnabled: boolean;
}

const AnalysisOverlay: React.FC<Props> = ({ lensMode, setLensMode, stats, grid, aiEnabled }) => {
    const [analysis, setAnalysis] = useState<CityAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleReview = async () => {
        if(!aiEnabled) return;
        setLoading(true);
        const result = await generateCityReview(stats, grid);
        setAnalysis(result);
        setLoading(false);
    };

    return (
        <div className="absolute top-24 right-4 md:right-8 flex flex-col items-end gap-4 pointer-events-auto">
            {/* Toolbar */}
            <div className="bg-white/90 backdrop-blur rounded-2xl p-2 border-4 border-slate-300 shadow-xl flex flex-col gap-2">
                <span className="text-xs font-black text-slate-500 text-center uppercase">Data Lenses</span>
                
                <button 
                    onClick={() => setLensMode(LensMode.None)}
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all ${lensMode === LensMode.None ? 'bg-slate-800 text-white shadow-lg scale-105' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                >
                    Standard
                </button>
                <button 
                    onClick={() => setLensMode(LensMode.LandValue)}
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all ${lensMode === LensMode.LandValue ? 'bg-green-600 text-white shadow-lg scale-105' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                >
                    Land Value 🌳
                </button>
                <button 
                    onClick={() => setLensMode(LensMode.Population)}
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all ${lensMode === LensMode.Population ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                >
                    Density 🏠
                </button>

                <div className="h-0.5 bg-slate-200 my-1"></div>

                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="px-3 py-2 rounded-xl font-black text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-2 border-indigo-200"
                >
                    {isOpen ? 'Close Report' : 'City Report 📊'}
                </button>
            </div>

            {/* Report Card Modal */}
            {isOpen && (
                <div className="bg-white rounded-3xl p-6 border-8 border-indigo-500 shadow-2xl w-80 animate-fade-in relative overflow-hidden">
                    <h3 className="text-2xl font-black text-indigo-900 mb-4 uppercase italic">Mayor's Report</h3>
                    
                    <div className="space-y-4">
                        <div className="bg-slate-100 p-4 rounded-2xl">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-slate-500 font-bold text-sm">Rating</span>
                                <span className={`text-5xl font-black ${!analysis ? 'text-slate-300' : 'text-indigo-600'}`}>
                                    {analysis?.grade || '?'}
                                </span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full bg-indigo-500 transition-all duration-1000 ${loading ? 'w-full animate-pulse' : 'w-0'}`}></div>
                            </div>
                        </div>

                        {analysis ? (
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 leading-tight mb-2">"{analysis.title}"</h4>
                                <p className="text-sm text-slate-600 font-medium bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                    💡 {analysis.advice}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                {aiEnabled ? (
                                    <button 
                                        onClick={handleReview}
                                        disabled={loading}
                                        className="bg-indigo-600 text-white font-black py-3 px-6 rounded-xl hover:bg-indigo-500 active:scale-95 transition-all shadow-lg w-full"
                                    >
                                        {loading ? 'Analyzing...' : 'Generate Review ✨'}
                                    </button>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Enable Robot Helper to get reviews!</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisOverlay;
