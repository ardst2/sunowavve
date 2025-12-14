
import React from 'react';
import { Music, Library, Disc, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
  width: number;
  isCollapsed: boolean;
  onStartResize: () => void;
  toggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, onOpenSettings, width, isCollapsed, onStartResize, toggleCollapse
}) => {
  const navItems = [
    { id: 'create', icon: Music, label: 'Create' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'explore', icon: Disc, label: 'Explore' },
  ];

  return (
    <>
    <div 
      className="hidden xl:flex fixed left-5 top-5 bottom-5 z-50 flex-col transition-all duration-300 bg-[#0a0a0a] border border-white/5 rounded-[24px] overflow-hidden"
      style={{ width: `${width}px` }}
    >
      <div className={`flex items-center gap-3 mt-6 mb-8 h-10 transition-all ${isCollapsed ? 'justify-center px-0' : 'justify-between px-5'}`}>
        <div className={`flex items-center justify-center w-full`}>
            {isCollapsed ? (
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shadow-[0_0_15px_var(--theme-glow)]">
                    <span className="font-bold text-black text-lg">S</span>
                </div>
            ) : (
                <div className="flex items-baseline">
                    <span className="font-sans font-black text-xl tracking-tighter text-white">SUNO</span>
                    <span className="font-sans font-black text-xl italic text-[var(--accent)] ml-0.5" style={{ textShadow: '0 0 10px var(--theme-glow)' }}>WAVE</span>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 px-3 space-y-2 flex flex-col items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`
              w-full flex items-center gap-3 py-3 rounded-xl transition-all duration-200 group relative
              ${activeTab === item.id 
                ? 'text-white' 
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }
              ${isCollapsed ? 'justify-center px-0 w-10 h-10' : 'px-4'}
            `}
          >
            {activeTab === item.id && (
               <div className="absolute inset-0 bg-white/10 rounded-xl border border-white/5"></div>
            )}
            
            <div className={`relative z-10 ${activeTab === item.id ? 'text-white' : ''}`}>
               <item.icon size={20} strokeWidth={2.5} />
            </div>
            
            {!isCollapsed && (
              <span className={`font-bold text-[13px] tracking-wide relative z-10 ${activeTab === item.id ? 'text-white' : ''}`}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-3 mb-2">
        <button onClick={toggleCollapse} className="w-full flex items-center justify-center py-3 text-zinc-600 hover:text-white transition-colors">
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <button 
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-3 py-3 rounded-xl transition-colors text-zinc-500 hover:text-white hover:bg-white/5 ${isCollapsed ? 'justify-center px-0 w-10 h-10' : 'px-4'}`}
        >
          <Settings size={20} strokeWidth={2} />
          {!isCollapsed && <span className="font-bold text-[13px]">Settings</span>}
        </button>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-white/10 z-50" onMouseDown={onStartResize} />
    </div>

    <div className="xl:hidden fixed bottom-4 left-4 right-4 h-16 bg-[#0a0a0a] rounded-2xl border border-white/10 z-[80] flex items-center justify-around px-2 shadow-2xl">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${activeTab === item.id ? 'text-white' : 'text-zinc-600'}`}>
             <item.icon size={22} strokeWidth={2.5} className={activeTab === item.id ? "drop-shadow-[0_0_8px_var(--accent)]" : ""} />
          </button>
        ))}
        <button onClick={onOpenSettings} className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-zinc-600 hover:text-white"><Settings size={22} /></button>
    </div>
    </>
  );
};
