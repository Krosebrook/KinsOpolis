/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

interface StartScreenProps {
  onStart: (aiEnabled: boolean) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [aiEnabled, setAiEnabled] = useState(true);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 p-6 bg-black/40 backdrop-blur-sm transition-all">
      <div className="max-w-lg w-full bg-white p-8 rounded-[3rem] border-8 border-cyan-400 shadow-[0_20px_0_rgba(34,211,238,0.4)] relative overflow-hidden animate-fade-in">
        
        <div className="relative z-10 text-center">
            <h1 className="text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 drop-shadow-sm tracking-tighter">
              Super City
            </h1>
            <p className="text-slate-500 mb-8 text-xl font-bold uppercase tracking-widest">
              Builder 3000
            </p>

            <div className="bg-blue-50 p-6 rounded-3xl border-4 border-blue-100 mb-8 text-left hover:bg-blue-100 transition-colors">
              <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex flex-col">
                  <span className="font-black text-2xl text-slate-700 flex items-center gap-2">
                      🤖 Robot Helper
                  </span>
                  <span className="text-sm font-bold text-slate-400 mt-1">
                      Play with fun missions & news!
                  </span>
                  </div>
                  
                  <div className="relative flex-shrink-0 ml-4">
                  <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={aiEnabled}
                      onChange={(e) => setAiEnabled(e.target.checked)}
                  />
                  <div className="w-16 h-10 bg-slate-300 rounded-full peer peer-focus:ring-4 peer-focus:ring-cyan-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-8 after:w-8 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                  </div>
              </label>
            </div>

            <button 
              onClick={() => onStart(aiEnabled)}
              className="w-full py-5 bg-gradient-to-b from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-yellow-900 font-black rounded-2xl shadow-[0_8px_0_rgb(202,138,4)] active:shadow-none active:translate-y-2 transform transition-all text-2xl uppercase tracking-wide border-2 border-yellow-200"
            >
              Start Building! 🚀
            </button>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;