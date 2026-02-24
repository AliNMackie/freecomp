import React from 'react';

interface AdUnitProps {
    width: number;
    height: number;
    className?: string;
}

export const AdUnit: React.FC<AdUnitProps> = ({ width, height, className = '' }) => {
    return (
        <div
            className={`mx-auto flex flex-col items-center justify-center bg-slate-50 border border-slate-200 text-slate-400 overflow-hidden ${className}`}
            style={{ width: `${width}px`, height: `${height}px` }}
            aria-hidden="true"
        >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Advertisement</span>
            {/* 
        This is a reserved space for a future ad iframe. 
        Because the width/height are strictly defined in the inline style,
        injecting an iframe here later will NOT cause layout shift (CLS).
      */}
            <div className="w-full h-full text-xs flex items-center justify-center border-t border-dashed border-slate-200/50">
                Ad Slot ({width}x{height})
            </div>
        </div>
    );
};
