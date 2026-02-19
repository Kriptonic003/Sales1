import React from 'react';

type LoaderType = 'spinner' | 'dots' | 'orbit' | 'bar' | 'combined';

interface DynamicLoaderProps {
  type?: LoaderType;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

export default function DynamicLoader({
  type = 'combined',
  size = 'md',
  message = 'Loading',
  fullScreen = false,
}: DynamicLoaderProps) {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  const spinnerSizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  const orbitSizeClass = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  }[size];

  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50'
    : 'flex justify-center items-center';

  const loaderContent = {
    spinner: (
      <div
        className={`${spinnerSizeClass} border-4 border-slate-300/30 border-t-cyan-400 rounded-full animate-spin`}
      ></div>
    ),
    dots: (
      <div className="flex gap-2">
        <div
          className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"
          style={{ animationDelay: '0s' }}
        ></div>
        <div
          className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"
          style={{ animationDelay: '0.2s' }}
        ></div>
        <div
          className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"
          style={{ animationDelay: '0.4s' }}
        ></div>
      </div>
    ),
    bar: (
      <div className="w-48 h-1 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 animate-gradient-shift"></div>
    ),
    orbit: (
      <div className={`${orbitSizeClass} relative`}>
        <div className="absolute inset-0 border-2 border-transparent border-t-cyan-400 rounded-full animate-orbit opacity-80"></div>
        <div
          className="absolute inset-2 border-2 border-transparent border-t-blue-400 rounded-full animate-orbit opacity-60"
          style={{ animationDuration: '1.5s' }}
        ></div>
        <div
          className="absolute inset-4 border-2 border-transparent border-t-cyan-300 rounded-full animate-orbit opacity-40"
          style={{ animationDuration: '1s' }}
        ></div>
      </div>
    ),
    combined: (
      <div className="flex flex-col items-center gap-6">
        <div
          className={`${spinnerSizeClass} border-4 border-slate-300/30 border-t-cyan-400 rounded-full animate-spin`}
        ></div>
        <div className="w-48 h-1 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 animate-gradient-shift"></div>
      </div>
    ),
  };

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        {loaderContent[type]}
        {message && (
          <p className="text-slate-300 font-medium text-sm tracking-wider animate-text-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
