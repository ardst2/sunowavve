
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { CreatePanel } from './components/CreatePanel';
import { SongList } from './components/SongList';
import { Player } from './components/Player';
import { RightSidebar } from './components/RightSidebar';
import { LyricsOverlay } from './components/LyricsOverlay';
import { ToastContainer, ToastMessage } from './components/ui/Toast';
import { Song, ApiProvider } from './types';
import { X, Palette, Database, Sparkles, Flame, Disc, Zap, Filter, LayoutGrid, List, Globe, Music2, Maximize2, Waves, Moon, Server } from 'lucide-react';
import { getTaskDetails } from './services/sunoService';
import { subscribeToSongs, saveSongToDb, updateSongInDb, isDbConfigured, deleteSongFromDb, cleanupTempSongs, toggleSongLike } from './services/dbService';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
}

// --- PREMIUM PALETTES (High Contrast, Beautiful Gradients) ---
const THEMES = [
  { 
    id: 'obsidian', 
    name: 'Obsidian', 
    desc: 'Suno Classic',
    icon: Moon,
    bgBase: '#000000', 
    // Classic Pink/Purple Suno Vibe
    gradient: 'linear-gradient(135deg, #ff0080, #7928ca)',
    accent: '#ff0080',
    glow: 'rgba(255, 0, 128, 0.4)'
  },
  { 
    id: 'sunset', 
    name: 'Horizon', 
    desc: 'Warm & Energy',
    icon: Flame,
    bgBase: '#020100',
    // Rich Orange to Purple
    gradient: 'linear-gradient(135deg, #FF4D4D, #F9CB28)',
    accent: '#FF4D4D',
    glow: 'rgba(255, 77, 77, 0.4)'
  },
  { 
    id: 'oceanic', 
    name: 'Deep Sea', 
    desc: 'Calm & Electric',
    icon: Waves,
    bgBase: '#000205',
    // Cyan to Blue
    gradient: 'linear-gradient(135deg, #00f260, #0575E6)',
    accent: '#00f260',
    glow: 'rgba(0, 242, 96, 0.4)'
  }
];

const COLLAPSED_WIDTH = 60; 
const EXPANDED_WIDTH = 220;
const COST_PER_GEN = 12;

const CREDITS_BY_PROVIDER: Record<ApiProvider, number> = { 
  'kie': 80, 
  'sunoapi.org': 50 
};

function App() {
  const [activeTab, setActiveTab] = useState('create');
  
  // --- STATE ---
  const [songs, setSongs] = useState<Song[]>([]);
  const songsRef = useRef<Song[]>([]); 
  
  const [filter, setFilter] = useState<'all' | 'original' | 'cover'>('all'); 
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); 

  const [isDbReady, setIsDbReady] = useState(false);
  
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(true);

  const [showSettings, setShowSettings] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  
  const [extendedSong, setExtendedSong] = useState<Song | null>(null);
  const [reuseParams, setReuseParams] = useState<{ prompt?: string, style?: string, title?: string } | null>(null);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Credentials & Provider
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('suno_api_key') || '');
  const [apiProvider, setApiProvider] = useState<ApiProvider>(() => (localStorage.getItem('suno_provider') as ApiProvider) || 'kie');
  
  const [credits, setCredits] = useState(() => {
    const savedProvider = (localStorage.getItem('suno_provider') as ApiProvider) || 'kie';
    return CREDITS_BY_PROVIDER[savedProvider] || 80;
  });
  
  // Right Sidebar Persona Mode Flag
  const [startInPersonaMode, setStartInPersonaMode] = useState(false);

  // Sync Provider & Credits
  useEffect(() => {
    localStorage.setItem('suno_provider', apiProvider);
    setCredits(CREDITS_BY_PROVIDER[apiProvider]);
  }, [apiProvider]);

  useEffect(() => { songsRef.current = songs; }, [songs]);
  useEffect(() => { localStorage.setItem('suno_api_key', apiKey); }, [apiKey]);
  
  const [currentThemeId, setCurrentThemeId] = useState(localStorage.getItem('suno_theme_id') || 'obsidian');

  const [sidebarWidth, setSidebarWidth] = useState(EXPANDED_WIDTH); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [createPanelWidth, setCreatePanelWidth] = useState(360); // Compact width
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  
  const [resizingTarget, setResizingTarget] = useState<'sidebar' | 'createPanel' | null>(null);
  const activePolls = useRef<Set<string>>(new Set());
  
  const isLargeScreen = useMediaQuery('(min-width: 1280px)'); 

  const addToast = (message: string, type: 'success'|'error'|'info' = 'info', title?: string) => {
    const id = Date.now().toString();
    const defaultTitle = type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info';
    setToasts(prev => [...prev, { id, type, message, title: title || defaultTitle }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const unsubscribe = subscribeToSongs((updatedSongs) => {
      setSongs(updatedSongs);
      if (currentSong) {
         const found = updatedSongs.find(s => s.id === currentSong.id);
         if (found) setCurrentSong(found); 
      }
      setIsDbReady(true);
    });
    setIsDbReady(isDbConfigured());
    return () => unsubscribe();
  }, [currentSong?.id]); 
  
  // --- THEME ENGINE ---
  useEffect(() => {
     const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
     const root = document.documentElement;
     
     root.style.setProperty('--bg-main', theme.bgBase);
     root.style.setProperty('--accent', theme.accent); 
     root.style.setProperty('--gradient-main', theme.gradient);
     root.style.setProperty('--theme-glow', theme.glow);

     localStorage.setItem('suno_theme_id', currentThemeId);
  }, [currentThemeId]);

  // --- RESIZING LOGIC ---
  const startResizingSidebar = useCallback(() => setResizingTarget('sidebar'), []);
  const startResizingCreatePanel = useCallback(() => setResizingTarget('createPanel'), []);
  const stopResizing = useCallback(() => setResizingTarget(null), []);

  const resize = useCallback((e: MouseEvent) => {
      if (!resizingTarget || !isLargeScreen) return;
      if (resizingTarget === 'sidebar') {
        const newWidth = e.clientX - 20; 
        if (newWidth < 70) { setIsSidebarCollapsed(true); setSidebarWidth(COLLAPSED_WIDTH); }
        else if (newWidth > 280) { setSidebarWidth(280); }
        else { setIsSidebarCollapsed(false); setSidebarWidth(newWidth); }
      } else if (resizingTarget === 'createPanel') {
        const currentSidebarWidth = isSidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth;
        const offset = currentSidebarWidth + 24;
        const newWidth = e.clientX - offset;
        // Allowed width range: 300px to 800px
        if (newWidth > 300 && newWidth < 800) setCreatePanelWidth(newWidth);
      }
    }, [resizingTarget, sidebarWidth, isSidebarCollapsed, isLargeScreen]);
  
  const toggleSidebar = () => {
    if (isSidebarCollapsed) { setIsSidebarCollapsed(false); setSidebarWidth(EXPANDED_WIDTH); } 
    else { setIsSidebarCollapsed(true); setSidebarWidth(COLLAPSED_WIDTH); }
  };

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // --- POLLING LOGIC ---
  const pollTask = async (taskId: string) => {
    if (!taskId) return;
    if (activePolls.current.has(taskId)) {}
    activePolls.current.add(taskId);
    let attempts = 0;
    const maxAttempts = 60;
    const intervalId = setInterval(async () => {
        attempts++;
        try {
          const result = await getTaskDetails(taskId);
          if (result && result.length > 0) {
              
              let hasError = false;
              for (const apiSong of result) {
                  const status = apiSong.audio_url ? 'complete' : apiSong.stream_audio_url ? 'streaming' : apiSong.status;
                  const existingSong = songsRef.current.find(s => s.id === apiSong.id) || 
                                       songsRef.current.find(s => s.taskId === taskId && s.id.startsWith('temp-'));
                  
                  await saveSongToDb({ 
                    ...apiSong, 
                    status: status as any, 
                    taskId: taskId,
                    type: existingSong?.type || 'original' 
                  });
                  if (status === 'error') hasError = true;
              }

              if (hasError) addToast("Generation failed", "error");
              await cleanupTempSongs(taskId);
              const allFinished = result.every(s => s.audio_url || s.status === 'error' || s.status === 'complete');
              if (allFinished) { clearInterval(intervalId); activePolls.current.delete(taskId); }
          }
        } catch (e) { console.error("Polling error", e); }
        if (attempts >= maxAttempts) { clearInterval(intervalId); activePolls.current.delete(taskId); }
    }, 10000); 
    return intervalId;
  };

  const handleGenerateStart = () => { if (credits >= COST_PER_GEN) setCredits(prev => prev - COST_PER_GEN); };
  
  const handleGenerateSuccess = async (taskId: string, modelName: string = 'V5', type: 'original' | 'cover' = 'original') => {
     addToast("Task submitted successfully", "success", "Generating...");
     const pendingSongBase: Song = {
        id: "", title: "Generating...", image_url: "", audio_url: "", duration: 0, 
        tags: "Queued", prompt: "Waiting for Suno...", model_name: modelName, 
        createTime: new Date().toISOString(), status: 'queue', taskId: taskId, type: type 
     };
     const tempId1 = `temp-${Date.now()}-1`;
     const tempId2 = `temp-${Date.now()}-2`;
     await saveSongToDb({ ...pendingSongBase, id: tempId1, title: "Generating v1..." });
     await saveSongToDb({ ...pendingSongBase, id: tempId2, title: "Generating v2..." });
     pollTask(taskId);
     if (!isLargeScreen) setActiveTab('explore');
  };
  
  const handleGenerateError = (error: string) => { addToast(error, 'error', 'Failed'); };

  const handleDeleteSong = async (songId: string) => {
     if (currentSong?.id === songId) { setIsPlaying(false); setCurrentSong(null); }
     try { await deleteSongFromDb(songId); addToast("Item deleted", "info"); } catch(e) { addToast("Failed to delete item", "error"); }
  };

  const handleToggleLike = async (songId: string, currentStatus: boolean) => {
    try { await toggleSongLike(songId, currentStatus); } catch (e) { addToast("Failed to update like status", "error"); }
  };

  const handleExtend = (song: Song) => {
      setExtendedSong(song);
      setReuseParams(null);
      setActiveTab('create');
      setShowRightSidebar(false); 
      addToast(`Extending: ${song.title}`, 'info');
  };

  // --- NEW HANDLERS FOR CONTEXT MENU ---
  const handleReuse = (song: Song, mode: 'style' | 'remix') => {
      setExtendedSong(null);
      if (mode === 'remix') {
          setReuseParams({ prompt: song.prompt, style: song.tags, title: `Remix of ${song.title}` });
          addToast("Prompt & Style copied!", "success");
      } else {
          setReuseParams({ style: song.tags });
          addToast("Style copied!", "success");
      }
      setActiveTab('create');
  };
  
  const handleOpenPersona = (song: Song) => {
      setCurrentSong(song);
      setStartInPersonaMode(true);
      setShowRightSidebar(true);
  };

  const handleDownloadMedia = async (song: Song, type: 'audio' | 'video') => {
      const url = type === 'video' ? song.video_url : song.audio_url;
      if (!url) { addToast("Media not available", "error"); return; }
      
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = `${song.title || 'song'}.${type === 'video' ? 'mp4' : 'mp3'}`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);
      addToast("Download started", "success");
  };

  useEffect(() => {
      const pendingTasks = new Set<string>();
      songs.forEach(s => { if ((s.status === 'queue' || s.status === 'submitted' || s.status === 'streaming') && s.taskId) pendingTasks.add(s.taskId); });
      pendingTasks.forEach(taskId => { if (!activePolls.current.has(taskId)) pollTask(taskId); });
  }, [songs]);

  const handlePlay = (song: Song) => {
    if (song.id.startsWith('temp-') || song.status === 'error') return;
    setIsPlayerVisible(true);
    if (song.id !== currentSong?.id) setShowRightSidebar(true);
    if (currentSong?.id === song.id) setIsPlaying(!isPlaying);
    else { setCurrentSong(song); setIsPlaying(true); }
  };

  const handleSaveSettings = () => {
    setShowSettings(false);
    addToast("Settings saved successfully", "success");
  };

  const renderBackground = () => {
    const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
    return (
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute inset-0 transition-colors duration-700 z-[-50]" style={{ backgroundColor: theme.bgBase }} />
         {/* Beautiful subtle gradient orbs - removed chaos */}
         <div className="fixed inset-0 z-[-30] opacity-30">
             <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px]" style={{ background: theme.gradient }}></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[100px]" style={{ background: theme.gradient, opacity: 0.5 }}></div>
         </div>
      </div>
    );
  };

  const filteredSongs = songs.filter(song => {
      if (filter === 'all') return true;
      const type = song.type || 'original';
      return type === filter;
  });

  const isCreateOpen = activeTab === 'create';
  // Precise spacing for floating effect
  const sidebarOffset = isLargeScreen ? (isSidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth) + 24 : 0;
  
  return (
    <div dir="ltr" className={`flex flex-col h-dvh w-full text-white font-sans selection:bg-[var(--accent)]/30 ${resizingTarget ? 'cursor-col-resize select-none' : ''} overflow-hidden fixed inset-0`}>
      
      {renderBackground()}

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setShowSettings(true)}
        width={sidebarWidth}
        isCollapsed={isSidebarCollapsed}
        onStartResize={startResizingSidebar}
        toggleCollapse={toggleSidebar}
      />

      <div 
        className="flex-1 flex h-screen overflow-hidden transition-all duration-300 ease-out relative z-10"
        style={{ paddingLeft: `${sidebarOffset}px` }}
      >
        
        {/* --- CREATE PANEL (FLOATING & ROUNDED) --- */}
        <div 
           className={`
             relative flex-shrink-0 transition-all duration-500 ease-in-out
             ${activeTab === 'create' ? 'translate-x-0 opacity-100' : 'hidden xl:block xl:-translate-x-full xl:opacity-0 xl:w-0'}
             ${isLargeScreen ? 'py-4 pr-2' : 'w-full'}
           `}
           style={{ 
             width: isLargeScreen ? `${createPanelWidth}px` : '100%', 
             height: isLargeScreen ? '100vh' : '100%',
             transform: isLargeScreen && !isCreateOpen ? 'translateX(-100%)' : 'none'
           }}
        >
            <div className={`h-full w-full overflow-hidden flex flex-col ${isLargeScreen ? 'rounded-[32px] glass-panel-heavy shadow-2xl border border-white/5' : ''}`}>
                <CreatePanel 
                  onGenerateStart={handleGenerateStart}
                  onGenerateSuccess={handleGenerateSuccess}
                  onGenerateError={handleGenerateError}
                  credits={credits}
                  cost={COST_PER_GEN}
                  extendedSong={extendedSong}
                  onClearExtend={() => setExtendedSong(null)}
                  initialState={reuseParams}
                />
            </div>

           {isLargeScreen && isCreateOpen && (
             <div 
               className="hidden xl:flex absolute -right-5 top-0 bottom-0 w-8 cursor-col-resize z-50 items-center justify-center group/handle"
               onMouseDown={startResizingCreatePanel}
             >
                 <div className="w-1.5 h-16 rounded-full bg-white/10 group-hover/handle:bg-[var(--accent)] transition-colors opacity-50 group-hover/handle:opacity-100 shadow-lg" />
             </div>
           )}
        </div>

        {/* --- MAIN FEED --- */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar relative ${isLargeScreen ? 'p-4' : 'pb-24'}`}>
           <div className="mx-auto max-w-[1600px] h-full flex flex-col">
              
              {/* COMPACT HEADER */}
              <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-6 mt-2 px-2 shrink-0">
                 <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                        {activeTab === 'library' ? 'Library' : 'Explore'}
                    </h2>
                 </div>

                 <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-sm">
                     <div className="flex items-center">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid size={16} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'list' ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}><List size={16} /></button>
                     </div>
                     <div className="w-px h-4 bg-white/10"></div>
                     <div className="flex items-center">
                        {['all', 'original', 'cover'].map((f) => (
                            <button
                              key={f}
                              onClick={() => setFilter(f as any)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${filter === f ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                            >
                              {f}
                            </button>
                        ))}
                     </div>
                 </div>
              </div>
              
              <div className="flex-1">
                <SongList 
                  songs={filteredSongs} 
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                  onDelete={handleDeleteSong}
                  onLike={handleToggleLike}
                  viewMode={viewMode}
                  onExtend={handleExtend}
                  onReuse={handleReuse}
                  onDownload={handleDownloadMedia}
                  onCreatePersona={handleOpenPersona}
                />
              </div>
           </div>
        </div>
        
        {/* Right Sidebar */}
        <div className={`${showRightSidebar ? 'block' : 'hidden'} xl:block transition-all`}>
           {showRightSidebar && (
              <RightSidebar 
                 song={currentSong} 
                 isOpen={showRightSidebar} 
                 onClose={() => { setShowRightSidebar(false); setStartInPersonaMode(false); }} 
                 onExtend={handleExtend}
                 startInPersonaMode={startInPersonaMode}
              />
           )}
        </div>

      </div>

      <LyricsOverlay 
         song={currentSong}
         isOpen={showLyrics}
         onClose={() => setShowLyrics(false)}
      />

      <Player 
        currentSong={currentSong}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onToggleLyrics={() => setShowLyrics(!showLyrics)}
        onLike={handleToggleLike}
        isHidden={!isPlayerVisible}
        onClosePlayer={() => setIsPlayerVisible(false)}
      />

      {/* FLOATING RESTORE PLAYER */}
      {!isPlayerVisible && currentSong && (
          <button 
             onClick={() => setIsPlayerVisible(true)}
             className="fixed bottom-8 right-8 z-[100] w-14 h-14 rounded-full bg-[var(--accent)] shadow-[0_0_30px_var(--theme-glow)] flex items-center justify-center text-black hover:scale-110 transition-transform animate-in zoom-in duration-300 group ring-2 ring-white/20"
          >
             {isPlaying ? (
                <div className="flex gap-1 h-4 items-end pb-1">
                    <div className="w-1 bg-black animate-[music-bar_0.6s_ease-in-out_infinite]"></div>
                    <div className="w-1 bg-black animate-[music-bar_0.8s_ease-in-out_infinite_0.2s]"></div>
                    <div className="w-1 bg-black animate-[music-bar_0.5s_ease-in-out_infinite_0.4s]"></div>
                </div>
             ) : (
                <Music2 size={24} className="text-black" />
             )}
          </button>
      )}

      {/* COMPACT SETTINGS MODAL */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowSettings(false)}
        >
           <div 
             className="glass-panel-heavy rounded-[32px] w-full max-w-md p-6 relative shadow-[0_0_60px_rgba(0,0,0,0.5)] ring-1 ring-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar"
             onClick={(e) => e.stopPropagation()}
           >
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-white/5 p-2 rounded-full hover:bg-white/20 transition-colors">
                <X size={18} />
              </button>
              <h2 className="text-xl font-bold mb-6 text-white">Settings</h2>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Theme</label>
                    <div className="grid grid-cols-1 gap-2">
                       {THEMES.map(theme => {
                          const Icon = theme.icon;
                          const isActive = currentThemeId === theme.id;
                          return (
                            <button
                               key={theme.id}
                               onClick={() => setCurrentThemeId(theme.id)}
                               className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${isActive ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                            >
                               <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors" 
                                    style={{ background: isActive ? theme.gradient : 'rgba(255,255,255,0.05)', color: isActive ? '#fff' : '#888' }}>
                                  <Icon size={20} />
                               </div>
                               <div className="flex flex-col items-start">
                                  <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-zinc-400'}`}>{theme.name}</span>
                                  <span className="text-[10px] text-zinc-600">{theme.desc}</span>
                               </div>
                            </button>
                          );
                       })}
                    </div>
                 </div>
                 
                 <div className="w-full h-px bg-white/10" />
                 
                 {/* --- RESTORED API PROVIDER SELECTION --- */}
                 <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Server size={12} /> API Provider
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setApiProvider('kie')}
                            className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${apiProvider === 'kie' ? 'bg-white/10 border-[var(--accent)] text-white shadow-[0_0_15px_var(--theme-glow)]' : 'bg-white/5 border-transparent text-zinc-500 hover:bg-white/10 hover:text-white'}`}
                        >
                            <span className="text-sm font-bold">KIE.ai</span>
                            <span className="text-[9px] opacity-60 font-mono mt-1">Recommended</span>
                        </button>
                        <button 
                            onClick={() => setApiProvider('sunoapi.org')}
                            className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${apiProvider === 'sunoapi.org' ? 'bg-white/10 border-[var(--accent)] text-white shadow-[0_0_15px_var(--theme-glow)]' : 'bg-white/5 border-transparent text-zinc-500 hover:bg-white/10 hover:text-white'}`}
                        >
                            <span className="text-sm font-bold">SunoAPI</span>
                            <span className="text-[9px] opacity-60 font-mono mt-1">Legacy</span>
                        </button>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">API Token</label>
                    <input 
                      type="password" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste your key..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-all text-xs font-mono text-white placeholder-zinc-700"
                    />
                 </div>
                 
                 <div className="bg-emerald-900/20 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3">
                     <Database size={16} className="text-emerald-400" />
                     <span className="text-xs font-bold text-emerald-200">Database Active</span>
                 </div>
                 
                 <button 
                   onClick={handleSaveSettings}
                   className="w-full bg-white text-black font-bold py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform text-xs uppercase tracking-widest"
                 >
                   Save
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
