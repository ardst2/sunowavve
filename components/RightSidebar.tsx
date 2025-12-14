
import React, { useState, useEffect } from 'react';
import { Song } from '../types';
import { X, Share2, Download, MoreHorizontal, Copy, Music2, UserPlus, Check, Loader2, Edit2, Save, FastForward, Film, Tag } from 'lucide-react';
import { createPersona } from '../services/sunoService';
import { updateSongInDb } from '../services/dbService';

interface RightSidebarProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  onExtend?: (song: Song) => void;
  startInPersonaMode?: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ song, isOpen, onClose, onExtend, startInPersonaMode = false }) => {
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [personaName, setPersonaName] = useState('');
  const [personaDesc, setPersonaDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPersonaId, setCreatedPersonaId] = useState<string | null>(null);

  // Editing Title State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMode, setDownloadMode] = useState<'audio' | 'video' | null>(null);

  // Reset states when song changes or sidebar opens/closes
  useEffect(() => {
    if (song) {
        setEditedTitle(song.title);
        setIsEditingTitle(false);
        setDownloadMode(null);
    }
  }, [song]);

  useEffect(() => {
      if (isOpen && startInPersonaMode) {
          setIsCreatingPersona(true);
      } else if (!isOpen) {
          // Reset when closed
          setIsCreatingPersona(false);
          setCreatedPersonaId(null);
      }
  }, [isOpen, startInPersonaMode]);

  if (!isOpen) return null;

  const handleCreatePersona = async () => {
    if (!song || !song.taskId || !personaName || !personaDesc) return;
    setIsSubmitting(true);
    try {
      const pId = await createPersona({
        taskId: song.taskId,
        audioId: song.id,
        name: personaName,
        description: personaDesc
      });
      setCreatedPersonaId(pId);
    } catch (e) {
      alert("Failed to create persona: " + (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (type: 'audio' | 'video' = 'audio') => {
      const urlToDownload = type === 'video' ? song?.video_url : song?.audio_url;
      if (!urlToDownload) return;
      
      setIsDownloading(true);
      try {
          // Attempt 1: Fetch as blob (Forces correct filename and download behavior)
          const response = await fetch(urlToDownload);
          if (!response.ok) throw new Error("Network fetch failed");
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          // Clean filename
          const safeTitle = (song?.title || 'song').replace(/[^a-z0-9]/gi, '_').toLowerCase();
          a.download = `${safeTitle}.${type === 'video' ? 'mp4' : 'mp3'}`;
          
          document.body.appendChild(a);
          a.click();
          
          // Cleanup
          setTimeout(() => {
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
          }, 100);

      } catch (e) {
          console.warn(`Direct blob download failed, falling back to link click:`, e);
          
          // Attempt 2: Direct Link Click (Fallback)
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = urlToDownload;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.download = `${song?.title || 'media'}.${type === 'video' ? 'mp4' : 'mp3'}`;
          
          document.body.appendChild(a);
          a.click();
          
          setTimeout(() => {
             document.body.removeChild(a);
          }, 100);
      } finally {
          setIsDownloading(false);
          setDownloadMode(null);
      }
  };

  const handleSaveTitle = async () => {
      if (!song || !editedTitle.trim()) return;
      setIsSavingTitle(true);
      try {
          await updateSongInDb(song.id, { title: editedTitle });
          setIsEditingTitle(false);
      } catch (e) {
          console.error("Failed to update title", e);
      } finally {
          setIsSavingTitle(false);
      }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetForm = () => {
    setIsCreatingPersona(false);
    setCreatedPersonaId(null);
    setPersonaName('');
    setPersonaDesc('');
  };

  return (
    // Changed bg-[#050505] to bg-[#121212] for lighter gray
    <div className="w-full md:w-[360px] bg-[#121212] h-screen shrink-0 relative z-[90] md:z-30 overflow-hidden border-l border-white/5 md:rounded-l-[40px] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-500 font-sans flex flex-col">
        {/* IMMERSIVE BACKGROUND */}
        {song?.image_url && (
           <div 
             className="absolute inset-0 bg-cover bg-center z-0 opacity-30 blur-3xl scale-125 transition-all duration-1000"
             style={{ backgroundImage: `url(${song.image_url})` }}
           />
        )}
        {/* Adjusted gradient to match new base */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/90 to-[#121212] z-10"></div>

        {/* Content Container */}
        <div className="relative z-20 flex flex-col h-full w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Now Playing</span>
                <button onClick={() => { resetForm(); onClose(); }} className="p-2 bg-white/5 hover:bg-white/20 rounded-full transition-colors text-white">
                    <X size={16} />
                </button>
            </div>

            {!song ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
                    <Music2 size={36} className="opacity-20" />
                    <span className="text-xs font-semibold tracking-wide">Select a track</span>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-24 md:pb-10">
                    {/* Floating Cover */}
                    <div className="aspect-square w-full max-w-[300px] mx-auto rounded-[30px] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] mb-8 border border-white/10 relative group">
                         {song.image_url ? (
                            <img src={song.image_url} alt={song.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                         ) : (
                            <div className="w-full h-full bg-zinc-900 animate-pulse"></div>
                         )}
                         {/* Video Overlay Hint */}
                         {song.video_url && (
                            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5">
                                <Film size={12} className="text-white" />
                                <span className="text-[9px] font-bold text-white uppercase">Video Ready</span>
                            </div>
                         )}
                    </div>

                    {/* Metadata Block */}
                    <div className="mb-8 text-center">
                        {/* EDITABLE TITLE */}
                        <div className="relative group/title mb-2 min-h-[32px] flex items-center justify-center">
                            {isEditingTitle ? (
                                <div className="flex items-center gap-2 w-full justify-center">
                                    <input 
                                        type="text" 
                                        value={editedTitle} 
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-center font-bold text-lg text-white w-full max-w-[200px] focus:outline-none focus:ring-0 focus:border-[var(--accent)]"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                    />
                                    <button onClick={handleSaveTitle} className="p-1.5 bg-[var(--accent)] rounded-lg text-white hover:brightness-110">
                                        {isSavingTitle ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    </button>
                                    <button onClick={() => setIsEditingTitle(false)} className="p-1.5 bg-white/10 rounded-lg text-zinc-400 hover:text-white">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 group-hover/title:translate-x-3 transition-transform">
                                    <h2 className="text-xl font-bold text-white leading-none drop-shadow-xl truncate max-w-[250px]">{song.title || "Untitled"}</h2>
                                    <button 
                                        onClick={() => setIsEditingTitle(true)}
                                        className="opacity-0 group-hover/title:opacity-100 p-1.5 text-zinc-500 hover:text-white transition-all bg-white/5 rounded-full hover:bg-white/10"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-2 mb-6">
                            <span className="bg-white/10 backdrop-blur-md text-white/90 text-[9px] px-2.5 py-1 rounded-full font-bold border border-white/5 shadow-sm uppercase tracking-wider">
                                {song.model_name}
                            </span>
                            <span className="text-white/40 text-[10px] font-mono font-bold">
                                {new Date(song.createTime || Date.now()).toLocaleDateString()}
                            </span>
                        </div>

                        {/* PRIMARY ACTIONS GRID */}
                        <div className="grid grid-cols-4 gap-2">
                             
                             {/* DOWNLOAD BUTTON (Split Logic) */}
                             <div className="relative group">
                                <button 
                                    onClick={() => setDownloadMode(m => m ? null : 'audio')}
                                    disabled={isDownloading}
                                    className="w-full py-3 bg-white text-black font-bold rounded-[16px] text-[10px] hover:scale-105 transition-transform flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                                    title="Download"
                                >
                                    {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                </button>
                                
                                {downloadMode && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 flex flex-col gap-1">
                                        <button onClick={() => handleDownload('audio')} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white transition-colors text-left">
                                            <Music2 size={12} /> MP3 Audio
                                        </button>
                                        {song.video_url && (
                                            <button onClick={() => handleDownload('video')} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white transition-colors text-left">
                                                <Film size={12} /> MP4 Video
                                            </button>
                                        )}
                                    </div>
                                )}
                             </div>

                             {/* EXTEND BUTTON */}
                             <button 
                                onClick={() => onExtend && onExtend(song)}
                                className="py-3 bg-white/5 border border-white/10 rounded-[16px] text-white hover:bg-white/10 transition-colors flex items-center justify-center hover:border-white/30 hover:text-[var(--accent)] hover:border-[var(--accent)]" 
                                title="Extend Song"
                             >
                                 <FastForward size={16} />
                             </button>

                             {/* PERSONA BUTTON */}
                             <button 
                                onClick={() => setIsCreatingPersona(true)}
                                className="py-3 bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)] rounded-[16px] text-white hover:opacity-90 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] hover:scale-105" title="Create Persona">
                                 <UserPlus size={16} />
                             </button>

                             {/* MORE */}
                             <button className="py-3 bg-white/5 border border-white/10 rounded-[16px] text-white hover:bg-white/10 transition-colors flex items-center justify-center hover:border-white/30" title="More">
                                 <MoreHorizontal size={16} />
                             </button>
                        </div>
                    </div>

                    {/* Persona Form Modal Overlay */}
                    {isCreatingPersona && (
                      <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-md z-50 p-6 flex flex-col animate-in fade-in duration-300">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Create Persona</h3>
                            <button onClick={resetForm} className="text-zinc-500 hover:text-white"><X size={18} /></button>
                         </div>
                         
                         {createdPersonaId ? (
                           <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-300">
                              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-2 border border-green-500/30 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                                 <Check size={32} strokeWidth={3} />
                              </div>
                              <h4 className="text-white font-bold text-lg">Persona Created!</h4>
                              <p className="text-zinc-400 text-xs px-4">Use this ID to generate consistent style in future tracks.</p>
                              
                              <div className="w-full bg-white/5 p-4 rounded-xl border border-white/10 mt-4 relative group">
                                 <p className="font-mono text-[11px] text-[var(--accent)] break-all text-center">{createdPersonaId}</p>
                                 <button onClick={() => copyToClipboard(createdPersonaId)} className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-xl font-bold text-xs gap-2">
                                   <Copy size={14} /> Copy ID
                                 </button>
                              </div>

                              <button onClick={resetForm} className="mt-8 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest">Close</button>
                           </div>
                         ) : (
                           <div className="space-y-4">
                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Name</label>
                                <input 
                                  value={personaName}
                                  onChange={(e) => setPersonaName(e.target.value)}
                                  placeholder="e.g. Cyber Pop Diva" 
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-semibold placeholder-zinc-600 focus:border-white/20"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Description</label>
                                <textarea 
                                  value={personaDesc}
                                  onChange={(e) => setPersonaDesc(e.target.value)}
                                  placeholder="Describe the vocal style and character..." 
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all h-32 resize-none font-medium placeholder-zinc-600 leading-relaxed custom-scrollbar focus:border-white/20"
                                />
                              </div>
                              
                              <div className="pt-4">
                                <button 
                                  onClick={handleCreatePersona}
                                  disabled={isSubmitting || !personaName || !personaDesc}
                                  className="w-full bg-gradient-to-r from-[var(--grad-start)] to-[var(--grad-end)] text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                  {isSubmitting ? 'CREATING...' : 'CREATE PERSONA'}
                                </button>
                              </div>
                           </div>
                         )}
                      </div>
                    )}
                    
                    {/* ... rest of the component */}
                    {/* Tags Display */}
                    {song.tags && (
                       <div className="mb-8 text-center">
                          <div className="flex flex-wrap justify-center gap-1.5">
                              {song.tags.split(',').map((tag, i) => (
                                  <span key={i} className="text-[9px] text-white/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 font-bold hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors cursor-default">
                                      #{tag.trim()}
                                  </span>
                              ))}
                          </div>
                       </div>
                    )}

                    {/* Lyrics Card */}
                    <div className="bg-white/5 backdrop-blur-md rounded-[24px] p-6 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--grad-start)] to-[var(--grad-end)] opacity-30 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Prompt / Lyrics</h3>
                           <button className="text-white/30 hover:text-white transition-colors" title="Copy"><Copy size={14} /></button>
                        </div>
                        <div className="text-xs text-white/80 whitespace-pre-wrap font-mono leading-relaxed">
                            {song.prompt || "No prompt available."}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
