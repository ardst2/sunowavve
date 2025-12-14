
import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Maximize2, Minimize2, Mic2, Volume2, GripVertical, VolumeX, X } from 'lucide-react';
import { Song } from '../types';

interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onToggleLyrics: () => void;
  onLike: (id: string, isLiked: boolean) => void;
  isHidden?: boolean;
  onClosePlayer: () => void;
}

export const Player: React.FC<PlayerProps> = ({ currentSong, isPlaying, onPlayPause, onToggleLyrics, onLike, isHidden = false, onClosePlayer }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  
  // Audio State
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeOverlay, setShowVolumeOverlay] = useState(false);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // UI State
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Dragging Refs (Use Refs instead of State for 60fps performance)
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  // Resizing State
  const [playerWidth, setPlayerWidth] = useState(600); // Default Expanded Width
  const isResizing = useRef(false);
  
  // Position Ref (To avoid re-renders)
  // Initialize as null to detect first valid render
  const currentPos = useRef<{x: number, y: number} | null>(null);

  // --- INITIAL POSITIONING (Fix for Top Issue) ---
  // We use useLayoutEffect to calculate position BEFORE paint to prevent jumping
  useLayoutEffect(() => {
    if (playerRef.current) {
        // If position hasn't been initialized yet (is null), calculate center-bottom
        if (currentPos.current === null) {
            const width = isCollapsed ? 80 : playerWidth;
            const initialX = Math.max(0, (window.innerWidth - width) / 2);
            // Position ~120px from bottom
            const initialY = Math.max(0, window.innerHeight - 120);
            
            currentPos.current = { x: initialX, y: initialY };
            playerRef.current.style.transform = `translate(${initialX}px, ${initialY}px)`;
        } else {
            // Re-apply existing position to ensure it stays put during re-renders
            playerRef.current.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
        }
    }
  }, [currentSong, isHidden]); // Re-calc if re-appearing

  // Handle Audio Source
  useEffect(() => {
    if (currentSong && audioRef.current) {
      const src = currentSong.audio_url || currentSong.stream_audio_url || "";
      if (audioRef.current.src !== src && src !== "") {
        audioRef.current.src = src;
        setProgress(0);
        setDuration(0);
        if (isPlaying) audioRef.current.play().catch(e => console.error(e));
      }
    }
  }, [currentSong]);

  // Handle Play/Pause
  useEffect(() => {
    if (audioRef.current) isPlaying ? audioRef.current.play().catch(()=>{}) : audioRef.current.pause();
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const c = audioRef.current.currentTime;
      const d = audioRef.current.duration;
      if (Number.isFinite(c)) setProgress(c);
      if (Number.isFinite(d) && d > 0) setDuration(d);
    }
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || isNaN(time) || time < 0) return "0:00";
    return `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const t = Number(e.target.value);
      if (Number.isFinite(audioRef.current.duration)) {
        audioRef.current.currentTime = t;
        setProgress(t);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVol = parseFloat(e.target.value);
      setVolume(newVol);
      if(audioRef.current) audioRef.current.volume = newVol;
  };

  // --- DRAG LOGIC (Direct DOM Manipulation) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging if clicking interactable elements or resizing
    if ((e.target as HTMLElement).closest('button, input, .resizer-handle, .volume-slider')) return;
    
    // Safety check
    if (!currentPos.current) return;

    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - currentPos.current.x,
      y: e.clientY - currentPos.current.y
    };
    
    // Add class for cursor style
    document.body.style.cursor = 'grabbing';
  };

  // --- RESIZE LOGIC ---
  const handleResizeDown = (e: React.MouseEvent) => {
     e.stopPropagation();
     isResizing.current = true;
     document.body.style.cursor = 'ew-resize';
  };

  // --- VOLUME SCROLL LOGIC ---
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation(); // Stop page scrolling
    // Scroll Up = Volume Up (Negative DeltaY), Scroll Down = Volume Down
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    let newVol = Math.min(Math.max(volume + delta, 0), 1);
    setVolume(newVol);
    if(audioRef.current) audioRef.current.volume = newVol;

    // Show overlay
    setShowVolumeOverlay(true);
    if(volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    volumeTimeoutRef.current = setTimeout(() => setShowVolumeOverlay(false), 1500);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Dragging
      if (isDragging.current && playerRef.current) {
        e.preventDefault();
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        
        currentPos.current = { x: newX, y: newY };
        playerRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }

      // 2. Resizing
      if (isResizing.current && !isCollapsed) {
          e.preventDefault();
          const deltaX = e.movementX; 
          setPlayerWidth(prev => Math.min(Math.max(300, prev + deltaX), 1200));
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isResizing.current = false;
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isCollapsed]);

  const safeDuration = (Number.isFinite(duration) && duration > 0) ? duration : 100;
  const progressPercent = (Number.isFinite(progress) && duration > 0) ? (progress / duration) * 100 : 0;

  if (!currentSong) return null;

  // IF HIDDEN: Return ONLY audio element (to keep playing) but no UI
  if (isHidden) {
      return <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => onPlayPause()} />;
  }

  return (
    <>
        {/* Persistent Audio Tag (Never Unmounts) */}
        <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => onPlayPause()} />

        {/* Draggable Container */}
        <div 
            ref={playerRef}
            className="fixed z-[90] touch-none select-none"
            style={{ 
                top: 0, left: 0, // Explicitly anchor to top-left so transform works predictably
                width: isCollapsed ? '80px' : `${playerWidth}px`, 
                height: isCollapsed ? '80px' : 'auto',
                transition: isDragging.current || isResizing.current ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s',
            }}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
        >
            {/* VOLUME OVERLAY (Appears on Scroll) */}
            <div className={`absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 transition-opacity duration-300 pointer-events-none ${showVolumeOverlay ? 'opacity-100' : 'opacity-0'}`}>
                <Volume2 size={14} className="text-white" />
                <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent)]" style={{ width: `${volume * 100}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-white">{Math.round(volume * 100)}%</span>
            </div>

            {/* MAIN PLAYER CONTENT WRAPPER */}
            <div className={`w-full h-full glass-panel-heavy overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative transition-all duration-300 ${isCollapsed ? 'rounded-full border-2 border-white/20 cursor-pointer hover:scale-105 active:scale-95' : 'rounded-[28px] border border-white/10'}`}
                 onClick={() => isCollapsed && setIsCollapsed(false)} // CLICK TO EXPAND
                 title={isCollapsed ? "Click to Expand" : ""}
            >
                
                {/* --- BACKGROUND ART (Shared) --- */}
                 <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                    <img src={currentSong.image_url || "https://picsum.photos/200"} className={`w-full h-full object-cover blur-xl transition-transform duration-[20s] ${isPlaying ? 'scale-150' : 'scale-100'}`} alt="" />
                 </div>
                 <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>


                {/* === MINI MODE UI === */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                   {/* Spinning Art */}
                   <img 
                      src={currentSong.image_url || "https://picsum.photos/200"} 
                      alt="Art" 
                      className={`absolute inset-0 w-full h-full object-cover opacity-80 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
                   />
                   
                   {/* Overlay Controls */}
                   <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center group">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
                        className="text-white hover:scale-110 transition-transform p-2"
                      >
                         {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                      </button>
                      
                      {/* Close Button on Hover (Mini) */}
                      <button 
                         onClick={(e) => { e.stopPropagation(); onClosePlayer(); }}
                         className="absolute -top-2 -right-2 bg-red-500/80 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Hide Player"
                      >
                          <X size={14} />
                      </button>
                   </div>
                   
                   {/* Progress Ring */}
                   <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                     <circle cx="40" cy="40" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                     <circle 
                        cx="40" cy="40" r="38" fill="none" stroke="var(--accent)" strokeWidth="3" 
                        strokeDasharray="238" 
                        strokeDashoffset={238 - (238 * progressPercent) / 100}
                        className="transition-all duration-100" 
                     />
                   </svg>
                </div>


                {/* === EXPANDED MODE UI === */}
                <div className={`w-full h-full flex items-center justify-between px-4 py-2 relative z-10 transition-opacity duration-300 ${!isCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    
                    {/* LEFT: INFO */}
                    <div className="flex items-center gap-4 min-w-0 w-[25%]">
                        <div className="relative group shrink-0">
                             <img src={currentSong.image_url || "https://picsum.photos/200"} alt="Art" className={`w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10 ${isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''}`} />
                             <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"></div>
                        </div>
                        <div className="overflow-hidden flex flex-col justify-center">
                            <h4 className="text-white text-sm font-bold truncate pr-2 leading-tight drop-shadow-sm">{currentSong.title || "Untitled"}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-white/70 border border-white/5">{currentSong.model_name}</span>
                               {currentSong.type === 'cover' && <span className="text-[9px] font-extrabold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">COVER</span>}
                            </div>
                        </div>
                    </div>

                    {/* CENTER: CONTROLS */}
                    <div className="flex flex-col items-center justify-center flex-1 shrink-0 px-4 gap-1.5">
                        <div className="flex items-center gap-6">
                            <button onMouseDown={e => e.stopPropagation()} className="text-zinc-400 hover:text-white transition-colors hover:scale-110 active:scale-95"><SkipBack size={22} fill="currentColor" /></button>
                            <button onMouseDown={e => e.stopPropagation()} onClick={onPlayPause} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-110 active:scale-95 transition-all mx-1">
                              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <button onMouseDown={e => e.stopPropagation()} className="text-zinc-400 hover:text-white transition-colors hover:scale-110 active:scale-95"><SkipForward size={22} fill="currentColor" /></button>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full flex items-center gap-3">
                           <span className="text-[10px] font-bold text-zinc-400 font-mono w-9 text-right tabular-nums">{formatTime(progress)}</span>
                           <div onMouseDown={e => e.stopPropagation()} className="relative flex-1 h-1.5 bg-white/10 rounded-full group cursor-pointer overflow-hidden hover:h-2 transition-all">
                              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--grad-start)] to-[var(--grad-end)] rounded-full shadow-[0_0_10px_var(--accent)]" style={{ width: `${progressPercent}%` }} />
                              <input type="range" min={0} max={safeDuration} value={progress} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                           </div>
                           <span className="text-[10px] font-bold text-zinc-400 font-mono w-9 tabular-nums">{duration > 0 ? formatTime(duration) : '--:--'}</span>
                        </div>
                    </div>

                    {/* RIGHT: ACTIONS */}
                    <div className="flex items-center justify-end gap-3 w-[30%] border-l border-white/5 pl-4 relative">
                       {/* VOLUME SLIDER */}
                       <div className="flex items-center gap-2 group volume-slider">
                          <button onClick={() => setVolume(v => v === 0 ? 0.5 : 0)} className="text-zinc-400 hover:text-white">
                             {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                          </button>
                          <div className="w-16 h-1 bg-white/20 rounded-full relative group-hover:w-24 transition-all duration-300">
                             <div className="absolute inset-0 h-full bg-white rounded-full" style={{ width: `${volume * 100}%` }}></div>
                             <input 
                               type="range" 
                               min="0" max="1" step="0.01" 
                               value={volume} 
                               onChange={handleVolumeChange}
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                               onMouseDown={e => e.stopPropagation()}
                             />
                          </div>
                       </div>

                       <button 
                         onMouseDown={e => e.stopPropagation()} 
                         onClick={onToggleLyrics}
                         className="text-zinc-500 hover:text-white transition-colors hover:scale-110 p-1.5"
                         title="Lyrics"
                       >
                         <Mic2 size={18} />
                       </button>
                       
                       {/* CLOSE / HIDE PLAYER BUTTON */}
                       <button 
                         onMouseDown={e => e.stopPropagation()} 
                         onClick={onClosePlayer}
                         className="text-zinc-500 hover:text-white transition-colors hover:scale-110 bg-white/5 hover:bg-red-500/20 p-1.5 rounded-lg ml-2"
                         title="Hide Player (Music continues)"
                       >
                         <X size={18} />
                       </button>

                       {/* RESIZE GRIP */}
                       <div 
                          className="resizer-handle w-4 h-full absolute right-0 top-0 cursor-ew-resize flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          onMouseDown={handleResizeDown}
                       >
                          <GripVertical size={16} className="text-white/30" />
                       </div>
                    </div>
                </div>

            </div>
        </div>
    </>
  );
};
