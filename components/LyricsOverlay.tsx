import React from 'react';
import { Song } from '../types';
import { X, Mic2, Disc } from 'lucide-react';

interface LyricsOverlayProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LyricsOverlay: React.FC<LyricsOverlayProps> = ({ song, isOpen, onClose }) => {
  if (!isOpen || !song) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      {/* Backdrop with blur and darken */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={onClose}
      />

      {/* Main Card */}
      <div className="relative w-full max-w-2xl h-[80vh] glass-panel-heavy rounded-[40px] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(var(--accent-rgb),0.2)] ring-1 ring-white/10 transform transition-all animate-in zoom-in-95 duration-300">
         
         {/* Background Art Blur */}
         {song.image_url && (
            <div 
               className="absolute inset-0 opacity-20 pointer-events-none bg-cover bg-center blur-3xl scale-125 saturate-150"
               style={{ backgroundImage: `url(${song.image_url})` }}
            />
         )}

         {/* Header */}
         <div className="flex items-center justify-between p-6 shrink-0 relative z-10 border-b border-white/5 bg-black/20">
             <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white/10 shadow-inner ${song.image_url ? '' : 'border border-white/10'}`}>
                    {song.image_url ? (
                        <img src={song.image_url} className="w-full h-full object-cover rounded-full animate-[spin_10s_linear_infinite]" alt="" />
                    ) : (
                        <Disc size={20} className="animate-spin text-white/50" />
                    )}
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-white leading-tight">{song.title || "Untitled Track"}</h3>
                     <p className="text-sm font-bold text-[var(--accent)] opacity-80">{song.model_name}</p>
                 </div>
             </div>
             
             <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
             >
                <X size={20} />
             </button>
         </div>

         {/* Lyrics Content */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-8 sm:p-12 relative z-10 text-center">
             <div className="max-w-lg mx-auto">
                 {song.prompt ? (
                     <p className="whitespace-pre-wrap text-lg sm:text-2xl font-bold leading-relaxed text-white/90 font-sans tracking-wide drop-shadow-md">
                        {song.prompt}
                     </p>
                 ) : (
                     <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-4">
                        <Mic2 size={48} className="opacity-20" />
                        <p className="text-lg font-bold">No lyrics available for this track.</p>
                     </div>
                 )}
                 
                 {/* Footer decoration */}
                 <div className="mt-16 flex justify-center opacity-30">
                    <div className="w-2 h-2 rounded-full bg-white mx-1"></div>
                    <div className="w-2 h-2 rounded-full bg-white mx-1"></div>
                    <div className="w-2 h-2 rounded-full bg-white mx-1"></div>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};
