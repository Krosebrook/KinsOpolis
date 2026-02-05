
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-cyan-400/90 backdrop-blur-md">
      <div className="flex flex-col items-center animate-bounce">
        <div className="text-8xl mb-4 transform hover:scale-110 transition-transform">✨</div>
        <div className="bg-white px-8 py-4 rounded-[2rem] shadow-2xl border-4 border-cyan-200">
          <h2 className="text-2xl font-black text-slate-700 uppercase tracking-tighter text-center">
            {message}
          </h2>
        </div>
      </div>
      <div className="mt-8 flex gap-2">
        <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
        <div className="w-4 h-4 bg-white rounded-full animate-pulse delay-75"></div>
        <div className="w-4 h-4 bg-white rounded-full animate-pulse delay-150"></div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
