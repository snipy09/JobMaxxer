import React from 'react';

export const TopBar: React.FC = () => {
  return (
    <header className="h-12 border-b border-slate-200 bg-white px-5 flex items-center justify-between z-10 select-none">
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm tracking-tight text-slate-900 font-sans">
          JobMaxxer
        </span>
      </div>
    </header>
  );
};
