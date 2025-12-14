import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { CreatePanel } from './components/CreatePanel';
import { SongList } from './components/SongList';
import { Player } from './components/Player';
import { RightSidebar } from './components/RightSidebar';
import { LyricsOverlay } from './components/LyricsOverlay';
import { ToastContainer, ToastMessage } from './components/ui/Toast';
import { Song } from './types';
import { X, Palette, Database, Sparkles, Droplets, Disc, Leaf, Filter, LayoutGrid, List } from 'lucide-react';
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

// --- HARMONIOUS THEME PALETTES (STRICTLY ANALOGOUS) ---
const THEMES = [
  { 
    id: 'nebula', 
    name: 'Nebula', 
    desc: 'Deep Indigo',
    icon: Sparkles,
    bgBase: '#0f172a', // Slate 900
    palette: ['#1e1b4b', '#6366f1', '#818cf8', '#a5b4fc', '#312e81'], 
  },
  { 
    id: 'magma', 
    name: 'Magma', 
    desc: 'Fire & Amber',
    icon: Disc,
    bgBase: '#1a0505',
    palette: ['#451a03', '#ea580c', '#f97316', '#fb923c', '#7c2d12'],
  },
  { 
    id: 'ocean', 
    name: 'Ocean', 
    desc: 'Azure & Cyan',
    icon: Droplets,
    bgBase: '#083344', // Cyan 950
    palette: ['#0c4a6e', '#0ea5e9', '#38bdf8', '#7dd3fc', '#0284c7'],
  },
  {
    id: 'forest',
    name: 'Forest',
    desc: 'Emerald & Teal',
    icon: Leaf,
    bgBase: '#022c22', // Emerald 950
    palette: ['#064e3b', '#10b981', '#34d399', '#6ee7b7', '#065f46'],
  }
];

const COLLAPSED_WIDTH = 56; 
const EXPANDED_WIDTH = 220;
const COST_PER_GEN = 12;
const INITIAL_CREDITS = 50;

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
  const [showSettings, setShowSettings] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  
  // Extend State
  const [extendedSong, setExtendedSong] = useState<Song | null>(null);

  // Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Credentials
  const [apiKey, setApiKey] = useState(() => {
     return localStorage.getItem('suno_api_key') || '';
  });
  
  const [credits, setCredits] = useState(INITIAL_CREDITS);

  // Sync Ref with State
  useEffect(() => {
      songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
      localStorage.setItem('suno_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => { 
      if(apiKey) setCredits(INITIAL_CREDITS); 
  }, [apiKey]);
  
  // Theme State
  const [currentThemeId, setCurrentThemeId] = useState(localStorage.getItem('suno_theme_id') || 'nebula');

  const [sidebarWidth, setSidebarWidth] = useState(EXPANDED_WIDTH); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [createPanelWidth, setCreatePanelWidth] = useState(380);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  
  const [resizingTarget, setResizingTarget] = useState<'sidebar' | 'createPanel' | null>(null);
  const activePolls = useRef<Set<string>>(new Set());
  
  // CRITICAL FIX: Changed from 1024px to 1280px to match Sidebar.tsx 'xl' breakpoint.
  // This ensures the padding logic matches the visual visibility of the sidebar.
  const isLargeScreen = useMediaQuery('(min-width: 1280px)'); 

  // --- NOTIFICATION HANDLERS ---
  const addToast = (message: string, type: 'success'|'error'|'info' = 'info', title?: string) => {
    const id = Date.now().toString();
    const defaultTitle = type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info';
    setToasts(prev => [...prev, { id, type, message, title: title || defaultTitle }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- FIRESTORE SUBSCRIPTION ---
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
  
  // --- APPLY THEME ---
  useEffect(() => {
     const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
     const root = document.documentElement;
     
     const gradientString = `linear-gradient(135deg, ${theme.palette[1]}, ${theme.palette[2]}, ${theme.palette[3]})`;
     
     root.style.setProperty('--bg-main', theme.bgBase);
     root.style.setProperty('--accent', theme.palette[1]); 
     root.style.setProperty('--dynamic-gradient', gradientString);
     
     // Legacy vars
     root.style.setProperty('--grad-start', theme.palette[1]);
     root.style.setProperty('--grad-end', theme.palette[3]);

     localStorage.setItem('suno_theme_id', currentThemeId);
  }, [currentThemeId]);

  // --- RESIZING LOGIC ---
  const startResizingSidebar = useCallback(() => setResizingTarget('sidebar'), []);
  const startResizingCreatePanel = useCallback(() => setResizingTarget('createPanel'), []);
  const stopResizing = useCallback(() => setResizingTarget(null), []);

  const resize = useCallback((e: MouseEvent) => {
      if (!resizingTarget || !isLargeScreen) return;
      if (resizingTarget === 'sidebar') {
        const newWidth = e.clientX - 24; 
        if (newWidth < 80) { setIsSidebarCollapsed(true); setSidebarWidth(COLLAPSED_WIDTH); }
        else if (newWidth > 300) { setSidebarWidth(300); }
        else { setIsSidebarCollapsed(false); setSidebarWidth(newWidth); }
      } else if (resizingTarget === 'createPanel') {
        // Calculate based on sidebar offset
        const newWidth = e.clientX - sidebarWidth - 40; 
        if (newWidth > 300 && newWidth < 800) setCreatePanelWidth(newWidth);
      }
    }, [resizingTarget, sidebarWidth, isLargeScreen]);
  
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
  
  const handleGenerateError = (error: string) => {
    addToast(error, 'error', 'Failed');
  };

  const handleDeleteSong = async (songId: string) => {
     if (currentSong?.id === songId) {
         setIsPlaying(false);
         setCurrentSong(null);
     }
     try {
        await deleteSongFromDb(songId);
        addToast("Item deleted", "info");
     } catch(e) {
        addToast("Failed to delete item", "error");
     }
  };

  const handleToggleLike = async (songId: string, currentStatus: boolean) => {
    try {
        await toggleSongLike(songId, currentStatus);
    } catch (e) {
        addToast("Failed to update like status", "error");
    }
  };

  const handleExtend = (song: Song) => {
      setExtendedSong(song);
      setActiveTab('create');
      setShowRightSidebar(false); 
      addToast(`Extending: ${song.title}`, 'info');
  };

  useEffect(() => {
      const pendingTasks = new Set<string>();
      songs.forEach(s => {
          if ((s.status === 'queue' || s.status === 'submitted' || s.status === 'streaming') && s.taskId) pendingTasks.add(s.taskId);
      });
      pendingTasks.forEach(taskId => {
          if (!activePolls.current.has(taskId)) pollTask(taskId);
      });
  }, [songs]);

  const handlePlay = (song: Song) => {
    if (song.id.startsWith('temp-') || song.status === 'error') return;
    if (song.id !== currentSong?.id) setShowRightSidebar(true);
    if (currentSong?.id === song.id) setIsPlaying(!isPlaying);
    else { setCurrentSong(song); setIsPlaying(true); }
  };

  const handleSaveSettings = () => {
    setShowSettings(false);
    addToast("Settings saved successfully", "success");
  };

  const renderTextures = () => {
    switch(currentThemeId) {
      case 'nebula': return <div className="texture-film-grain"></div>;
      case 'magma': return <div className="texture-paper-grunge"></div>;
      case 'ocean': return <div className="texture-cyber-grid opacity-30"></div>;
      case 'forest': return <div className="texture-film-grain opacity-40"></div>;
      default: return <div className="texture-film-grain"></div>;
    }
  };

  const renderBackground = () => {
    const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
    return (
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute inset-0 transition-colors duration-1000 z-[-50]" style={{ backgroundColor: theme.bgBase }} />
         <div className="fixed inset-0 z-[-30]">
             <div className="mesh-blob animate-wander-1" style={{ top: '-10%', left: '-10%', width: '70vw', height: '70vw', backgroundColor: theme.palette[0] }} />
             <div className="mesh-blob animate-wander-2" style={{ bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', backgroundColor: theme.palette[4], animationDelay: '-5s' }} />
             <div className="mesh-blob animate-wander-3" style={{ top: '30%', left: '40%', width: '50vw', height: '50vw', backgroundColor: theme.palette[1], opacity: 0.6 }} />
             <div className="mesh-blob animate-wander-1" style={{ bottom: '20%', left: '10%', width: '35vw', height: '35vw', backgroundColor: theme.palette[2], animationDuration: '25s', animationDelay: '-10s' }} />
             <div className="mesh-blob animate-wander-3" style={{ top: '10%', right: '30%', width: '30vw', height: '30vw', backgroundColor: theme.palette[3], opacity: 0.7, mixBlendMode: 'screen' }} />
         </div>
         {renderTextures()}
         <div className="texture-vignette"></div>
      </div>
    );
  };

  const filteredSongs = songs.filter(song => {
      if (filter === 'all') return true;
      const type = song.type || 'original';
      return type === filter;
  });

  // --- CRITICAL LAYOUT CALCULATIONS ---
  const isCreateOpen = activeTab === 'create';
  
  // Sidebar Offset Calculation
  // IF Mobile/Tablet (<1280px): Offset is 0 (Sidebar hidden)
  // IF Desktop (>=1280px): Offset is Sidebar Width + Gap
  const sidebarOffset = isLargeScreen ? (isSidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth) + 40 : 0;
  
  // Create Panel Width logic
  // On mobile it uses 100% width, handled by the div class/style below
  const createPanelOffset = (isLargeScreen && isCreateOpen) ? createPanelWidth + 20 : 0;
  
  // Final Feed Padding (Only relevant for large screen scroll container)
  const mainContentPaddingLeft = sidebarOffset + createPanelOffset;

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

      {/* 
         --- MAIN CONTAINER ---
         CRITICAL FIX: paddingLeft is now explicitly controlled by `sidebarOffset`.
         It is 0 on mobile (<1280px), removing the gap.
      */}
      <div 
        className="flex-1 flex h-screen overflow-hidden transition-all duration-300 ease-in-out relative z-10"
        style={{ paddingLeft: `${sidebarOffset}px` }}
      >
        
        {/* --- CREATE PANEL --- 
            Mobile: Width 100%, Height Full, No margins, No rounding (Native app feel)
            Desktop: Resizable Width, Margins, Rounded (Card feel)
        */}
        <div 
           className={`
             glass-panel border-white/5 overflow-hidden relative flex-shrink-0 shadow-2xl transition-all duration-300
             ${activeTab === 'create' ? 'block' : 'hidden xl:block'}
             ${isLargeScreen ? 'my-6 rounded-[40px] ml-0 mr-4' : 'm-0 rounded-none w-full border-0'}
           `}
           style={{ 
             width: isLargeScreen ? `${createPanelWidth}px` : '100%', 
             height: isLargeScreen ? 'calc(100vh - 48px)' : '100%' 
           }}
        >
            <CreatePanel 
              onGenerateStart={handleGenerateStart}
              onGenerateSuccess={handleGenerateSuccess}
              onGenerateError={handleGenerateError}
              credits={credits}
              cost={COST_PER_GEN}
              extendedSong={extendedSong}
              onClearExtend={() => setExtendedSong(null)}
            />
           {/* Resize Handle (Desktop Only) */}
           {isLargeScreen && isCreateOpen && (
             <div 
               className="hidden xl:block absolute right-0 top-10 bottom-10 w-1.5 cursor-col-resize hover:bg-[var(--accent)] transition-colors z-20 rounded-full opacity-50 hover:opacity-100"
               onMouseDown={startResizingCreatePanel}
             />
           )}
        </div>

        {/* --- FEED --- 
            Mobile: Hidden when Creating.
            Padding Bottom: Added space for bottom nav on mobile.
        */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar relative ${isLargeScreen ? 'my-6 mr-6' : 'my-0 mr-0 pb-24'} ${!isLargeScreen && activeTab === 'create' ? 'hidden' : 'block'}`}>
           <div className={`mx-auto max-w-[1800px] ${isLargeScreen ? '' : 'p-4'}`}>
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6 sticky top-0 z-20 pt-2 pb-1 bg-gradient-to-b from-[#050505]/95 via-[#050505]/80 to-transparent xl:bg-transparent pointer-events-none">
                 <div className="flex items-center gap-3 py-2 backdrop-blur-md rounded-full px-5 border border-white/10 bg-black/10 shadow-lg shrink-0 pointer-events-auto">
                    <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                        {activeTab === 'library' ? 'Library' : 'Explore'}
                    </h2>
                    {activeTab === 'create' && <span className="px-3 py-1 rounded-full bg-white/10 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/70">Recent</span>}
                 </div>

                 <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar pointer-events-auto">
                     <div className="flex items-center bg-black/30 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg shrink-0">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}><LayoutGrid size={16} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}><List size={16} /></button>
                     </div>

                     <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg shrink-0">
                        <div className="px-2 text-zinc-500 border-r border-white/10 mr-1"><Filter size={14} /></div>
                        {['all', 'original', 'cover'].map((f) => (
                            <button
                              key={f}
                              onClick={() => setFilter(f as any)}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${filter === f ? 'gradient-bg text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                            >
                              {f}
                            </button>
                        ))}
                     </div>
                 </div>
              </div>
              
              <SongList 
                songs={filteredSongs} 
                currentSong={currentSong}
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onDelete={handleDeleteSong}
                onLike={handleToggleLike}
                viewMode={viewMode}
              />
           </div>
        </div>
        
        {/* Right Sidebar (Desktop Overlay) */}
        <div className={`${showRightSidebar ? 'block' : 'hidden'} xl:block transition-all`}>
           {showRightSidebar && (
              <RightSidebar 
                 song={currentSong} 
                 isOpen={showRightSidebar} 
                 onClose={() => setShowRightSidebar(false)} 
                 onExtend={handleExtend}
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
      />

      {/* Settings Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowSettings(false)}
        >
           <div 
             className="glass-panel-heavy rounded-[40px] w-full max-w-md p-6 relative shadow-2xl ring-1 ring-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar"
             onClick={(e) => e.stopPropagation()}
           >
              <button onClick={() => setShowSettings(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-white bg-white/5 p-1.5 rounded-full">
                <X size={18} />
              </button>
              <h2 className="text-lg font-bold mb-5 gradient-text">Configuration</h2>
              
              <div className="space-y-6">
                 <div>
                    <div className="flex items-center gap-2 mb-3">
                       <Palette size={16} className="text-[var(--accent)]" />
                       <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Visual Experience</label>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                       {THEMES.map(theme => {
                          const Icon = theme.icon;
                          const isActive = currentThemeId === theme.id;
                          return (
                            <button
                               key={theme.id}
                               onClick={() => setCurrentThemeId(theme.id)}
                               className={`group relative flex items-center gap-4 p-3 rounded-2xl transition-all border overflow-hidden ${isActive ? 'bg-white/10 border-[var(--accent)] shadow-[0_0_20px_rgba(var(--accent),0.2)]' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                            >
                               <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" 
                                    style={{ background: `linear-gradient(45deg, ${theme.palette[1]}, ${theme.palette[2]}, ${theme.palette[3]})` }}>
                               </div>

                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors relative z-10 ${isActive ? 'gradient-bg text-white shadow-lg' : 'bg-white/10 text-zinc-400 group-hover:text-white'}`}>
                                  <Icon size={20} />
                               </div>
                               <div className="flex flex-col items-start relative z-10">
                                  <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-zinc-300'}`}>{theme.name}</span>
                                  <span className="text-[10px] font-semibold text-zinc-500">{theme.desc}</span>
                               </div>
                            </button>
                          );
                       })}
                    </div>
                 </div>
                 <div className="w-full h-px bg-white/10" />
                 <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-2 ml-1 uppercase tracking-wider">Suno API Bearer Token</label>
                    <input 
                      type="password" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste Token..."
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-0 focus:border-white/10 transition-all text-xs font-mono shadow-inner text-white"
                    />
                 </div>
                 <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3">
                     <Database size={16} className="text-emerald-400" />
                     <span className="text-[10px] font-bold text-emerald-200">Database Connected</span>
                 </div>
                 <button 
                   onClick={handleSaveSettings}
                   className="w-full gradient-bg text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(var(--accent),0.3)] hover:shadow-[0_0_30px_rgba(var(--accent),0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                 >
                   Save Settings
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;