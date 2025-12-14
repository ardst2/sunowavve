
import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import { Play, Pause, Heart, Loader2, Trash2, Sparkles, Music, MoreHorizontal, FastForward, Repeat, UserPlus, Download, Video, Copy, X } from 'lucide-react';
import { updateSongInDb } from '../services/dbService';

interface SongListProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onDelete: (songId: string) => void;
  onLike: (songId: string, currentStatus: boolean) => void;
  viewMode?: 'grid' | 'list';
  // New props for context actions
  onExtend?: (song: Song) => void;
  onReuse?: (song: Song, mode: 'style' | 'remix') => void;
  onDownload?: (song: Song, type: 'audio' | 'video') => void;
  onCreatePersona?: (song: Song) => void;
}

// Visualizer Component
const PlayingIndicator = () => (
  <div className="flex gap-0.5 h-3 items-end justify-center">
    <div className="w-1 bg-[var(--accent)] animate-[music-bar_0.6s_ease-in-out_infinite] rounded-full"></div>
    <div className="w-1 bg-[var(--accent)] animate-[music-bar_0.8s_ease-in-out_infinite_0.1s] rounded-full"></div>
    <div className="w-1 bg-[var(--accent)] animate-[music-bar_0.5s_ease-in-out_infinite_0.2s] rounded-full"></div>
    <div className="w-1 bg-[var(--accent)] animate-[music-bar_0.7s_ease-in-out_infinite_0.3s] rounded-full"></div>
  </div>
);

export const SongList: React.FC<SongListProps> = ({ 
  songs, currentSong, isPlaying, onPlay, onDelete, onLike, viewMode = 'grid',
  onExtend, onReuse, onDownload, onCreatePersona
}) => {
  const [isToggling, setIsToggling] = useState<string | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, song: Song | null }>({ x: 0, y: 0, song: null });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            setContextMenu({ x: 0, y: 0, song: null });
        }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', () => setContextMenu({ x: 0, y: 0, song: null }), true); // Close on scroll
    return () => {
        window.removeEventListener('click', handleClickOutside);
        window.removeEventListener('scroll', () => {}, true);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate position to keep within viewport
    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 200;
    const menuHeight = 350;

    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    setContextMenu({ x, y, song });
  };

  const toggleSongType = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation(); setIsToggling(song.id);
    try { await updateSongInDb(song.id, { type: song.type === 'cover' ? 'original' : 'cover' }); } 
    catch (err) { console.error(err); } finally { setIsToggling(null); }
  };

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh] text-zinc-500 gap-4">
         <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center bg-white/5">
            <Sparkles size={32} className="opacity-50" />
         </div>
         <p className="text-xs font-bold uppercase tracking-widest opacity-60">No Songs Created Yet</p>
      </div>
    );
  }

  return (
    <>
    {/* --- CONTEXT MENU PORTAL --- */}
    {contextMenu.song && (
        <div 
           ref={menuRef}
           className="fixed z-[9999] w-[220px] bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 py-1.5"
           style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            <div className="px-3 py-2 border-b border-white/5 mb-1 flex items-center gap-3 bg-white/5">
                 {contextMenu.song.image_url && <img src={contextMenu.song.image_url} className="w-8 h-8 rounded-md object-cover" alt="" />}
                 <div className="overflow-hidden">
                     <p className="text-xs font-bold text-white truncate">{contextMenu.song.title}</p>
                     <p className="text-[9px] font-mono text-zinc-400 truncate">{contextMenu.song.model_name}</p>
                 </div>
            </div>

            <button onClick={() => { onPlay(contextMenu.song!); setContextMenu({x:0,y:0,song:null}); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                {currentSong?.id === contextMenu.song.id && isPlaying ? <Pause size={14} /> : <Play size={14} />}
                {currentSong?.id === contextMenu.song.id && isPlaying ? "Pause" : "Play"}
            </button>
            
            <button onClick={() => { onExtend?.(contextMenu.song!); setContextMenu({x:0,y:0,song:null}); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                <FastForward size={14} /> Extend
            </button>

            <button onClick={() => { onReuse?.(contextMenu.song!, 'remix'); setContextMenu({x:0,y:0,song:null}); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                <Repeat size={14} /> Remix
            </button>

            <button onClick={() => { onReuse?.(contextMenu.song!, 'style'); setContextMenu({x:0,y:0,song:null}); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                <Copy size={14} /> Use Style
            </button>

            <div className="h-px bg-white/10 my-1 mx-2" />
            
            <button onClick={() => { onCreatePersona?.(contextMenu.song!); setContextMenu({x:0,y:0,song:null}); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-[var(--accent)] hover:bg-white/10 flex items-center gap-3 transition-colors">
                <UserPlus size={14} /> Make Persona
            </button>

            <div className="h-px bg-white/10 my-1 mx-2" />

            <button onClick={() => { onDownload?.(contextMenu.song!, 'audio'); setContextMenu({x:0,y:0,song:null}); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 flex items-center gap-3 transition-colors">
                <Download size={14} /> Download Audio
            </button>

            {contextMenu.song.video_url && (
                <button onClick={() => { onDownload?.(contextMenu.song!, 'video'); setContextMenu({x:0,y:0,song:null}); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 flex items-center gap-3 transition-colors">
                    <Video size={14} /> Download Video
                </button>
            )}

            <div className="h-px bg-white/10 my-1 mx-2" />
            
            <button onClick={() => { onDelete(contextMenu.song!.id); setContextMenu({x:0,y:0,song:null}); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors">
                <Trash2 size={14} /> Delete
            </button>
        </div>
    )}

    {viewMode === 'grid' ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 pb-32 animate-in fade-in duration-500">
        {songs.map((song) => {
          const isCurrent = currentSong?.id === song.id;
          const isPlayable = !!(song.audio_url || song.stream_audio_url);
          const isError = song.status === 'error';
          
          return (
            <div 
                key={song.id} 
                className="group flex flex-col hover:-translate-y-1 transition-transform duration-300"
                onContextMenu={(e) => handleContextMenu(e, song)}
            >
              <div 
                className={`
                  relative aspect-square rounded-[24px] overflow-hidden bg-white/5 shadow-lg mb-3
                  ${isCurrent ? 'ring-2 ring-[var(--accent)] shadow-[0_0_20px_var(--theme-glow)]' : 'group-hover:shadow-xl'}
                `}
              >
                {song.image_url ? (
                   <img src={song.image_url} alt={song.title} className={`w-full h-full object-cover transition-transform duration-700 ${isCurrent && isPlaying ? 'scale-110' : 'group-hover:scale-105'}`} loading="lazy" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      {isError ? <span className="text-[9px] text-red-500 font-bold uppercase">Failed</span> : <Loader2 size={24} className="animate-spin text-[var(--accent)]" />}
                   </div>
                )}
                
                {/* Overlay Logic */}
                <div 
                    className={`absolute inset-0 transition-all duration-300 flex items-center justify-center cursor-pointer
                    ${isCurrent ? 'bg-black/60 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}
                    onClick={() => isPlayable && onPlay(song)}
                >
                  {isPlayable && (
                    <div className="flex flex-col items-center gap-2">
                        {/* Play Button */}
                        <button className={`w-12 h-12 rounded-full flex items-center justify-center text-white border border-white/20 hover:scale-110 transition-transform hover:bg-white hover:text-black ${isCurrent ? 'bg-[var(--accent)] border-none text-white' : 'bg-white/10 backdrop-blur-md'}`}>
                        {isCurrent && isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                        </button>
                        
                        {/* Animation ONLY when playing this song */}
                        {isCurrent && isPlaying && <PlayingIndicator />}
                    </div>
                  )}
                  
                  {/* Context Menu Trigger Button (Visible on Hover for accessibility) */}
                  <button 
                     className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                     onClick={(e) => { e.stopPropagation(); handleContextMenu(e, song); }}
                  >
                      <MoreHorizontal size={14} />
                  </button>
                </div>

                <div className="absolute top-2 left-2">
                   <button onClick={(e) => toggleSongType(e, song)} disabled={isToggling === song.id} className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md border border-white/10 ${song.type === 'cover' ? 'bg-purple-500/80 text-white' : 'bg-black/40 text-zinc-300'}`}>
                       {isToggling === song.id ? '...' : (song.type === 'cover' ? 'COVER' : 'ORIGINAL')}
                   </button>
                </div>
              </div>
              
              <div className="px-1">
                <h3 className={`font-bold text-sm leading-tight mb-1 truncate ${isCurrent ? 'text-[var(--accent)]' : 'text-white'}`}>{song.title || "Untitled"}</h3>
                <p className="text-zinc-500 text-[10px] font-medium truncate mb-2">{song.tags || "Generating..."}</p>
                <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[10px] font-mono text-zinc-600">{song.duration ? `${Math.floor(song.duration/60)}:${Math.floor(song.duration%60).toString().padStart(2,'0')}` : ''}</span>
                   <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); onLike(song.id, !!song.isLiked); }} className={`p-1.5 rounded-full hover:bg-white/10 ${song.isLiked ? 'text-[var(--accent)]' : 'text-zinc-600 hover:text-white'}`}><Heart size={14} fill={song.isLiked ? "currentColor" : "none"} /></button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(song.id); }} className="text-zinc-600 hover:text-red-500 p-1.5 rounded-full hover:bg-white/10"><Trash2 size={14} /></button>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
    // --- LIST VIEW ---
    <div className="flex flex-col gap-2 pb-32 animate-in fade-in">
      {songs.map((song) => {
         const isCurrent = currentSong?.id === song.id;
         const isPlayable = !!(song.audio_url || song.stream_audio_url);
         
         return (
            <div 
                key={song.id} 
                className={`
                    group grid grid-cols-[auto_1fr_auto] gap-4 items-center p-2 pr-4 rounded-2xl transition-all border 
                    ${isCurrent ? 'bg-white/10 border-[var(--accent)]/50 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-transparent border-transparent hover:bg-white/5 border-b border-b-white/5'}
                `} 
                onDoubleClick={() => isPlayable && onPlay(song)}
                onContextMenu={(e) => handleContextMenu(e, song)}
            >
               {/* Image & Play Button Container */}
               <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-zinc-900 group-hover:shadow-lg transition-all">
                  {song.image_url ? (
                      <img src={song.image_url} alt="" className={`w-full h-full object-cover transition-transform duration-700 ${isCurrent && isPlaying ? 'scale-110' : 'group-hover:scale-105'}`} />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music size={16} className="text-zinc-700"/></div>
                  )}
                  
                  {/* List View Overlay */}
                  <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center transition-opacity ${isCurrent ? 'opacity-100 bg-black/60' : 'opacity-0 group-hover:opacity-100'}`}>
                     {isPlayable && (
                         <button onClick={() => onPlay(song)} className={`transform transition-transform active:scale-95 ${isCurrent ? 'text-[var(--accent)]' : 'text-white'}`}>
                             {isCurrent && isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                         </button>
                     )}
                     {isCurrent && isPlaying && (
                         <div className="absolute bottom-1">
                            <div className="flex gap-0.5 h-2 items-end">
                                <div className="w-0.5 bg-[var(--accent)] animate-[music-bar_0.6s_ease-in-out_infinite]"></div>
                                <div className="w-0.5 bg-[var(--accent)] animate-[music-bar_0.8s_ease-in-out_infinite_0.1s]"></div>
                                <div className="w-0.5 bg-[var(--accent)] animate-[music-bar_0.5s_ease-in-out_infinite_0.2s]"></div>
                            </div>
                         </div>
                     )}
                  </div>
               </div>

               {/* Text Info */}
               <div className="min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={`font-bold text-sm truncate ${isCurrent ? 'text-[var(--accent)]' : 'text-white'}`}>{song.title || "Untitled"}</h3>
                      {song.type === 'cover' && <span className="text-[8px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">COVER</span>}
                  </div>
                  <p className="text-zinc-500 text-xs truncate font-medium group-hover:text-zinc-400 transition-colors">{song.tags || "No tags"}</p>
               </div>

               {/* Actions */}
               <div className="flex items-center gap-4">
                   <span className="text-[10px] font-mono text-zinc-600 hidden sm:block">
                        {song.duration ? `${Math.floor(song.duration/60)}:${Math.floor(song.duration%60).toString().padStart(2,'0')}` : '--:--'}
                   </span>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={(e) => { e.stopPropagation(); onLike(song.id, !!song.isLiked); }} className={`p-2 rounded-full hover:bg-white/10 ${song.isLiked ? 'text-[var(--accent)]' : 'text-zinc-500 hover:text-white'}`}><Heart size={16} fill={song.isLiked ? "currentColor" : "none"} /></button>
                       <button onClick={(e) => { e.stopPropagation(); onDelete(song.id); }} className="p-2 rounded-full text-zinc-500 hover:text-red-500 hover:bg-white/10"><Trash2 size={16} /></button>
                       <button onClick={(e) => handleContextMenu(e, song)} className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/10"><MoreHorizontal size={16} /></button>
                   </div>
               </div>
            </div>
         );
      })}
    </div>
    )}
    </>
  );
};
