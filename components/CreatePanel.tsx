
import React, { useState, useRef, useEffect } from 'react';
import { Switch } from './ui/Switch';
import { Sparkles, Upload, Mic, ChevronDown, Settings2, Check, Zap, Info, FileAudio, X, Loader2, AlertCircle, FastForward, User, Ban } from 'lucide-react';
import { MODELS, GENRES } from '../constants';
import { generateMusic, uploadAndCover, extendAudio } from '../services/sunoService';
import { uploadToTempHost } from '../services/uploadService';
import { Song } from '../types';

// Compact Slider
const CustomSlider = ({ label, value, onChange, max = 1, formatValue }: { label: string, value: number, onChange: (v: number) => void, max?: number, formatValue?: (v: number) => string }) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const updateValue = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newValue = (x / rect.width) * max;
    onChange(newValue);
  };

  const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); updateValue(e.clientX); };
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { if (isDragging) { e.preventDefault(); updateValue(e.clientX); } };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging]);

  const percentage = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center justify-between h-[56px] select-none hover:bg-white/10 transition-colors">
        <span className="text-xs font-bold text-zinc-300 w-20">{label}</span>
        <div ref={trackRef} className="flex-1 mx-3 relative h-6 flex items-center cursor-pointer" onMouseDown={handleMouseDown}>
            <div className="absolute inset-0 flex justify-between items-center px-0.5"><div className="w-full h-1 bg-white/10 rounded-full"></div></div>
            <div className="absolute h-1 bg-gradient-to-r from-[var(--accent)] to-white rounded-full" style={{ width: `${percentage}%` }} />
            <div className={`absolute h-4 w-4 bg-white rounded-full shadow-lg transition-transform ${isDragging ? 'scale-125' : ''}`} style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }} />
        </div>
        <span className="text-xs font-mono font-bold text-white w-10 text-right">{formatValue ? formatValue(value) : `${percentage}%`}</span>
    </div>
  );
};

interface CreatePanelProps {
  onGenerateStart: () => void;
  onGenerateSuccess: (taskId: string, model: string, type: 'original' | 'cover') => void;
  onGenerateError: (error: string) => void;
  credits: number;
  cost: number;
  extendedSong?: Song | null;
  onClearExtend?: () => void;
  // New props for pre-filling
  initialState?: {
    prompt?: string;
    style?: string;
    title?: string;
  } | null;
}

export const CreatePanel: React.FC<CreatePanelProps> = ({ onGenerateStart, onGenerateSuccess, onGenerateError, credits, cost, extendedSong, onClearExtend, initialState }) => {
  const [mode, setMode] = useState<'create' | 'upload'>('create');
  const [customMode, setCustomMode] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
  
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [model, setModel] = useState<string>('V5');
  const [uploadUrl, setUploadUrl] = useState('');
  
  const [continueAt, setContinueAt] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Advanced Settings
  const [negativeTags, setNegativeTags] = useState('');
  const [vocalGender, setVocalGender] = useState<'Male'|'Female'|''>('');
  const [styleWeight, setStyleWeight] = useState<number>(0.5);
  const [weirdness, setWeirdness] = useState<number>(0.5);
  const [audioWeight, setAudioWeight] = useState<number>(0.5);
  const [personaId, setPersonaId] = useState('');
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Reuse/Remix State Injection
  useEffect(() => {
      if (initialState) {
          if (initialState.prompt) {
              setLyrics(initialState.prompt);
              setCustomMode(true);
          }
          if (initialState.style) {
              setStyle(initialState.style);
              setCustomMode(true);
          }
          if (initialState.title) setTitle(initialState.title);
      }
  }, [initialState]);

  useEffect(() => {
    if (extendedSong) {
      setMode('create');
      setCustomMode(true);
      setContinueAt(Math.floor(extendedSong.duration));
      setStyle(extendedSong.tags || '');
      setTitle(extendedSong.title ? `Part 2 - ${extendedSong.title}` : '');
    }
  }, [extendedSong]);

  useEffect(() => { if (mode === 'upload') setCustomMode(true); }, [mode]);

  const getMaxChars = (field: 'prompt'|'style'|'title') => {
    const isV5or45 = ['V5', 'V4_5', 'V4_5PLUS', 'V4_5ALL'].includes(model);
    if (field === 'prompt') return customMode || mode === 'upload' ? (isV5or45 ? 5000 : 3000) : 500;
    if (field === 'style') return isV5or45 ? 1000 : 200;
    if (field === 'title') return isV5or45 ? 100 : 80;
    return 0;
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || isNaN(time) || time < 0) return "0:00";
    return `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { setUploadError("Format not supported."); return; }
    setUploadError(''); setIsUploading(true); setUploadProgress(0);
    try {
       const url = await uploadToTempHost(file, (percent) => setUploadProgress(percent));
       setUploadUrl(url); setUploadedFileName(file.name);
    } catch (err) { setUploadError((err as Error).message || "Upload Failed"); } 
    finally { setIsUploading(false); }
  };

  const handleSubmit = async () => {
    if (credits < cost) { onGenerateError("Insufficient credits."); return; }
    if (mode === 'upload' && !uploadUrl) { onGenerateError("Please upload audio."); return; }

    setIsSubmitting(true); onGenerateStart();
    try {
      const commonParams = { 
          callBackUrl: 'https://sunowave.app/api/webhook', 
          model: model as any, 
          customMode: true, 
          tags: style, 
          title: title || undefined 
      };
      
      let taskId;

      if (extendedSong) {
         taskId = await extendAudio({ 
             ...commonParams, 
             audioId: extendedSong.id, 
             continueAt: continueAt, 
             prompt: lyrics 
         });
      } else if (mode === 'upload') {
         taskId = await uploadAndCover({ 
             ...commonParams, 
             uploadUrl, 
             prompt: lyrics, 
             instrumental, 
             style, 
             styleWeight: showAdvanced ? styleWeight : undefined, 
             weirdnessConstraint: showAdvanced ? weirdness : undefined, 
             audioWeight: showAdvanced ? audioWeight : undefined,
             negativeTags: showAdvanced ? negativeTags : undefined,
             personaId: showAdvanced ? personaId : undefined
         } as any);
      } else {
         taskId = await generateMusic({ 
             ...commonParams, 
             customMode, 
             instrumental, 
             prompt: customMode ? lyrics : description, 
             lyrics: customMode ? lyrics : undefined, 
             style, 
             styleWeight: showAdvanced ? styleWeight : undefined, 
             weirdnessConstraint: showAdvanced ? weirdness : undefined, 
             negativeTags: showAdvanced ? negativeTags : undefined, 
             vocalGender: (vocalGender === 'Male' ? 'm' : vocalGender === 'Female' ? 'f' : undefined) as any,
             personaId: showAdvanced ? personaId : undefined
         });
      }
      onGenerateSuccess(taskId, model, mode === 'upload' ? 'cover' : 'original');
      if (extendedSong && onClearExtend) onClearExtend();
    } catch (err: any) { onGenerateError(err.message); } 
    finally { setIsSubmitting(false); }
  };

  const inputClass = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder-zinc-600 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all resize-none";
  const labelClass = "text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block";
  const hasEnoughCredits = credits >= cost;

  return (
    <div className="flex flex-col h-full w-full font-sans relative">
       
       {/* --- COMPACT HEADER --- */}
       <div className="shrink-0 px-5 pt-6 pb-2">
         <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {extendedSong ? <FastForward size={20} className="text-[var(--accent)]" /> : <Sparkles size={20} className="text-[var(--accent)]" />}
                {extendedSong ? 'Extend Song' : 'Create'}
             </h2>
             {extendedSong && <button onClick={onClearExtend}><X size={16} className="text-zinc-500 hover:text-white" /></button>}
         </div>

         {!extendedSong && (
             <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 w-full">
                {['create', 'upload'].map((m) => (
                    <button 
                      key={m}
                      onClick={() => setMode(m as any)}
                      className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all ${mode === m ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {m === 'create' ? 'Generate' : 'Cover'}
                    </button>
                ))}
             </div>
         )}
       </div>

       {/* --- SCROLL CONTENT --- */}
       <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5 pb-36">
         
         {/* Custom Mode Switch */}
         {mode === 'create' && !extendedSong && (
           <div className="flex items-center justify-between py-1">
             <div className="flex flex-col">
                  <span className={`text-sm font-bold ${customMode ? 'text-white' : 'text-zinc-400'}`}>Custom Mode</span>
             </div>
             <Switch checked={customMode} onChange={setCustomMode} />
           </div>
         )}
         
         {extendedSong && (
             <div className="bg-[var(--accent)]/10 p-3 rounded-2xl border border-[var(--accent)]/20">
                 <label className={labelClass} style={{color:'var(--accent)'}}>Continue From: {formatTime(continueAt)}</label>
                 <input type="range" min={0} max={extendedSong.duration} value={continueAt} onChange={(e) => setContinueAt(Number(e.target.value))} className="w-full accent-[var(--accent)] h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer mt-2" />
             </div>
         )}

         {mode === 'upload' && (
             <div>
                <label className={labelClass}>Upload Audio</label>
                {!uploadUrl && !isUploading ? (
                    <div onClick={() => fileInputRef.current?.click()} className={`border border-dashed border-white/20 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-white/40 transition-all ${uploadError ? 'border-red-500' : ''}`}>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="audio/*"/>
                        <Upload size={20} className="text-zinc-500 mb-2" />
                        <span className="text-[10px] font-bold text-zinc-400">Click to Upload</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-3 overflow-hidden">
                           {isUploading ? <Loader2 size={16} className="animate-spin text-[var(--accent)]" /> : <FileAudio size={16} className="text-[var(--accent)]" />}
                           <span className="text-xs font-bold truncate">{isUploading ? `Uploading ${uploadProgress}%` : uploadedFileName}</span>
                        </div>
                        <button onClick={() => { setUploadUrl(''); setUploadedFileName(''); }}><X size={14} /></button>
                    </div>
                )}
             </div>
         )}

         <div className="space-y-4">
            {(customMode || extendedSong || mode === 'upload') ? (
               <>
                 <div>
                   <div className="flex justify-between items-center mb-1"><label className={labelClass}>Lyrics</label></div>
                   <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} maxLength={getMaxChars('prompt')} placeholder="Enter lyrics..." className={`${inputClass} h-32`} />
                   <button type="button" className="text-[10px] text-[var(--accent)] font-bold flex items-center gap-1 mt-2 hover:underline" onClick={() => setLyrics("[Verse 1]\nNeon lights...")}><Sparkles size={10} /> Auto-Write</button>
                 </div>
                 
                 <div>
                   <label className={labelClass}>Style of Music</label>
                   <textarea value={style} onChange={(e) => setStyle(e.target.value)} maxLength={getMaxChars('style')} placeholder="Cyberpunk, Synthwave..." className={`${inputClass} h-16`} />
                   <div className="flex flex-wrap gap-1.5 mt-2">{GENRES.slice(0, 4).map(g => (<button key={g} type="button" onClick={() => setStyle(p => p ? `${p}, ${g}` : g)} className="text-[9px] font-bold bg-white/5 hover:bg-[var(--accent)] hover:text-white text-zinc-400 px-2.5 py-1 rounded-full border border-white/5 transition-all">{g}</button>))}</div>
                 </div>

                 <div>
                   <label className={labelClass}>Title</label>
                   <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={getMaxChars('title')} placeholder="Song Title" className={inputClass} />
                 </div>
               </>
            ) : (
               <div>
                 <label className={labelClass}>Song Description</label>
                 <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="A song about..." className={`${inputClass} h-32`} />
               </div>
            )}

            <div className="flex items-center justify-between py-1">
               <div className="flex items-center gap-2"><Mic size={16} className="text-zinc-400" /><span className="text-xs font-bold text-zinc-300">Instrumental</span></div>
               <Switch checked={instrumental} onChange={setInstrumental} />
            </div>

            <div className="relative">
              {isModelOpen && <div className="fixed inset-0 z-10" onClick={() => setIsModelOpen(false)}></div>}
              <button type="button" onClick={() => setIsModelOpen(!isModelOpen)} className="w-full bg-black/20 px-4 py-3 rounded-xl flex items-center justify-between border border-white/10 hover:border-white/20 transition-all relative z-20">
                 <span className="text-xs font-bold text-white flex gap-2 items-center">Model: <span className="text-[var(--accent)]">{MODELS.find(m => m.id === model)?.name}</span></span>
                 <ChevronDown size={14} className={`transition-transform ${isModelOpen ? 'rotate-180' : ''}`} />
              </button>
              {isModelOpen && (
                 <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden">
                    {MODELS.map(m => (<button key={m.id} type="button" onClick={() => { setModel(m.id); setIsModelOpen(false); }} className={`w-full p-3 text-left hover:bg-white/5 text-xs font-bold ${model === m.id ? 'text-[var(--accent)]' : 'text-zinc-300'}`}>{m.name}</button>))}
                 </div>
              )}
            </div>

            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors w-full py-2">
                Advanced <ChevronDown size={10} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
            
            {showAdvanced && (
               <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                  <CustomSlider label="Weirdness" value={weirdness} onChange={setWeirdness} />
                  {/* --- NEW: STYLE WEIGHT SLIDER --- */}
                  <CustomSlider label="Style Strength" value={styleWeight} onChange={setStyleWeight} />

                  {mode === 'upload' && <CustomSlider label="Audio Wgt" value={audioWeight} onChange={setAudioWeight} />}
                  
                  {/* --- NEGATIVE TAGS (EXCLUDE STYLES) --- */}
                  <div>
                      <div className="flex items-center gap-2 mb-1.5">
                          <Ban size={12} className="text-zinc-400" />
                          <label className={labelClass + " mb-0"}>Exclude Styles</label>
                      </div>
                      <input 
                         type="text" 
                         value={negativeTags} 
                         onChange={(e) => setNegativeTags(e.target.value)}
                         placeholder="e.g. Drums, male vocals, acoustic..."
                         className={inputClass}
                      />
                  </div>

                  {/* --- PERSONA ID --- */}
                  <div>
                      <div className="flex items-center gap-2 mb-1.5">
                          <User size={12} className="text-zinc-400" />
                          <label className={labelClass + " mb-0"}>Persona ID</label>
                      </div>
                      <div className="relative">
                          <input 
                             type="text" 
                             value={personaId} 
                             onChange={(e) => setPersonaId(e.target.value)}
                             placeholder="Paste Persona ID..."
                             className={`${inputClass} font-mono text-xs pr-8`}
                          />
                          {personaId && (
                             <button onClick={() => setPersonaId('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                                 <X size={14} />
                             </button>
                          )}
                      </div>
                  </div>

                  <div className="pb-4">
                      <label className={labelClass}>Vocal Gender</label>
                      <div className="flex bg-black/20 rounded-lg p-0.5">
                          {['', 'Male', 'Female'].map((g) => (
                             <button key={g} onClick={() => setVocalGender(g as any)} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${vocalGender === g ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}>{g || 'Any'}</button>
                          ))}
                      </div>
                  </div>
               </div>
            )}
         </div>
       </div>

       {/* --- GRADIENT ACTION BUTTON --- */}
       <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent z-40">
          <button 
             onClick={handleSubmit} 
             disabled={isSubmitting || !hasEnoughCredits} 
             className="w-full h-12 rounded-xl relative overflow-hidden group shadow-[0_0_20px_var(--theme-glow)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
          >
             <div className="absolute inset-0 transition-opacity bg-[image:var(--gradient-main)]"></div>
             <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="relative flex items-center justify-center gap-2 h-full text-white font-black text-sm uppercase tracking-widest">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (extendedSong ? <FastForward size={18} className="fill-white" /> : <Zap size={18} className="fill-white" />)}
                <span>{isSubmitting ? 'WORKING...' : (extendedSong ? 'EXTEND' : 'GENERATE')}</span>
             </div>
          </button>
          <div className="text-center mt-2 text-[10px] font-bold text-zinc-500">
             {cost} Credits • Balance: {credits}
          </div>
       </div>
    </div>
  );
};
