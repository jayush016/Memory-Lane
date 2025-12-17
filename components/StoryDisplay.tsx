import React, { useState, useEffect, useRef } from 'react';
import { SaveIcon, RefreshIcon, CheckIcon, UserIcon, UsersIcon, GridIcon, PlayIcon, StopIcon, PauseIcon, VideoIcon } from './Icons';
import { StoryData, FAMILY_DATA } from '../App';
import { playClick, playSuccess } from '../utils/SoundEffects';
import CommentsSection from './CommentsSection';
import { GoogleGenAI, Modality } from "@google/genai";

interface StoryDisplayProps {
  storyData: StoryData;
  onRecordAnother: () => void;
  onSave: (story: StoryData) => void;
  isGenerating?: boolean;
  isGeneratingImage?: boolean;
  isGeneratingContext?: boolean;
  onRegenerateImage: () => void;
  onViewAlbum?: (albumId: string) => void;
}

const ContextCard: React.FC<{
  icon: string;
  title: string;
  content: string;
  sourceUrl?: string;
  delay: number;
}> = ({ icon, title, content, sourceUrl, delay }) => (
  <div 
    className="bg-[#F5F2EA] p-5 rounded-sm border-l-4 border-sepia shadow-md hover:shadow-lg transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center gap-3 mb-2 border-b border-darkBrown/10 pb-2">
      <span className="text-2xl filter drop-shadow-sm">{icon}</span>
      <h4 className="font-serif font-bold text-darkBrown text-lg leading-none">{title}</h4>
    </div>
    <p className="font-sans text-darkBrown/90 text-sm leading-relaxed font-medium">
      {content}
    </p>
    {sourceUrl && (
       <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline mt-2 block flex items-center gap-1">
         Source: Google Search
       </a>
    )}
  </div>
);

const AudioPlayer: React.FC<{ 
  audioBase64?: string; 
  mimeType?: string; 
  transcript?: string; 
  authorName?: string;
}> = ({ audioBase64, mimeType = 'audio/mp3', transcript, authorName }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [durationStr, setDurationStr] = useState("00:00");
  
  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  
  // HTML5 Audio Ref (for uploaded files)
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  // Timing Refs for Pause/Resume
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Determine Voice based on Family Role
  const getVoiceName = () => {
    // 1. Try to find member in data to check Role
    const member = FAMILY_DATA.find(m => m.name === authorName);
    if (member) {
       const role = member.role.toLowerCase();
       // Male roles
       if (['grandfather', 'father', 'brother', 'uncle', 'dad', 'grandpa', 'me'].some(r => role.includes(r))) {
         return 'Fenrir';
       }
       if (member.id === 'u-david') return 'Fenrir';
    }
    
    // 2. Fallback heuristic on name
    if (!authorName) return 'Kore';
    const lower = authorName.toLowerCase();
    if (lower.includes('grandpa') || lower.includes('dad') || lower.includes('uncle') || lower.includes('brother') || lower.includes('michael') || lower.includes('robert') || lower.includes('david')) {
      return 'Fenrir'; 
    }
    return 'Kore'; // Female/Neutral default
  };

  // Cleanup on unmount or prop change
  useEffect(() => {
    return () => {
      stopAll();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Reset when content changes
  useEffect(() => {
    stopAll();
    pausedAtRef.current = 0;
    startedAtRef.current = 0;
    bufferRef.current = null;
    
    if (audioBase64) {
       const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
       htmlAudioRef.current = audio;
       audio.onloadedmetadata = () => {
          if (isFinite(audio.duration)) setDurationStr(formatTime(audio.duration));
       };
       audio.onended = () => {
          setIsPlaying(false);
          setProgress(0);
       };
    }
  }, [audioBase64, mimeType, transcript, authorName]);

  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const stopAll = () => {
    // Stop Web Audio
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch(e) {}
      sourceRef.current = null;
    }
    // Stop HTML Audio
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      htmlAudioRef.current.currentTime = 0;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
    setProgress(0);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const generateAndPlayTTS = async () => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const voiceName = getVoiceName();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: transcript || "" }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      });

      const ttsBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (ttsBase64) {
         const ctx = initAudioContext();
         const binaryString = atob(ttsBase64);
         const len = binaryString.length;
         const bytes = new Uint8Array(len);
         for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
         }
         const int16Data = new Int16Array(bytes.buffer);
         
         // Gemini output is 24kHz
         const buffer = ctx.createBuffer(1, int16Data.length, 24000);
         const channelData = buffer.getChannelData(0);
         for (let i = 0; i < int16Data.length; i++) {
            channelData[i] = int16Data[i] / 32768.0;
         }
         
         bufferRef.current = buffer;
         setDurationStr(formatTime(buffer.duration));
         playBuffer(buffer, 0);
      }
    } catch (e) {
      console.error("TTS Error", e);
      alert("Unable to generate narration.");
    } finally {
      setIsLoading(false);
    }
  };

  const playBuffer = (buffer: AudioBuffer, offset: number) => {
     const ctx = initAudioContext();
     const source = ctx.createBufferSource();
     source.buffer = buffer;
     source.connect(ctx.destination);
     
     source.start(0, offset);
     sourceRef.current = source;
     startedAtRef.current = ctx.currentTime - offset;
     setIsPlaying(true);

     const animate = () => {
        const elapsed = ctx.currentTime - startedAtRef.current;
        if (elapsed >= buffer.duration) {
           setIsPlaying(false);
           setProgress(0);
           pausedAtRef.current = 0;
           return;
        }
        setProgress((elapsed / buffer.duration) * 100);
        animationFrameRef.current = requestAnimationFrame(animate);
     };
     animate();

     source.onended = () => {
        // Handled by animate loop mostly, but cleanup source
        // sourceRef.current = null;
     };
  };

  const handleToggle = async () => {
    if (isLoading) return;

    // Case 1: HTML Audio (Uploaded file)
    if (htmlAudioRef.current) {
       if (isPlaying) {
          htmlAudioRef.current.pause();
          setIsPlaying(false);
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
       } else {
          htmlAudioRef.current.play();
          setIsPlaying(true);
          const update = () => {
             if (htmlAudioRef.current) {
                setProgress((htmlAudioRef.current.currentTime / htmlAudioRef.current.duration) * 100);
                animationFrameRef.current = requestAnimationFrame(update);
             }
          };
          update();
       }
       return;
    }

    // Case 2: Web Audio (TTS)
    if (isPlaying) {
       // PAUSE LOGIC
       if (sourceRef.current && audioCtxRef.current) {
          sourceRef.current.stop();
          sourceRef.current = null;
          pausedAtRef.current += audioCtxRef.current.currentTime - startedAtRef.current;
          setIsPlaying(false);
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
       }
    } else {
       // PLAY/RESUME LOGIC
       if (bufferRef.current) {
          playBuffer(bufferRef.current, pausedAtRef.current);
       } else if (transcript) {
          await generateAndPlayTTS();
       }
    }
  };

  return (
    <div className="bg-white rounded-full p-3 shadow-md border border-sepia/20 flex items-center gap-4 w-full max-w-md">
       <button 
         onClick={handleToggle}
         disabled={isLoading}
         className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${isLoading ? 'bg-gray-300' : 'bg-rosewood hover:bg-darkBrown text-white'}`}
       >
         {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
         ) : isPlaying ? (
            <PauseIcon className="w-5 h-5" /> 
         ) : (
            <PlayIcon className="w-5 h-5 ml-0.5" />
         )}
       </button>
       
       <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="flex justify-between text-[10px] font-bold text-sepia/80 uppercase tracking-widest">
             <span>{isPlaying ? "Playing..." : (audioBase64 ? "Recorded Audio" : "Play Narration (AI)")}</span>
             <span>{durationStr}</span>
          </div>
          {/* Waveform Visual */}
          <div className="h-8 flex items-center gap-0.5 overflow-hidden relative">
             {Array.from({ length: 40 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 rounded-full transition-all duration-300 ${i/40 * 100 < progress ? 'bg-rosewood' : 'bg-sepia/20'}`}
                  style={{ 
                     height: isPlaying ? `${30 + Math.random() * 70}%` : `${30 + (Math.sin(i)*20)}%`,
                  }}
                />
             ))}
          </div>
       </div>
    </div>
  );
};

const StoryDisplay: React.FC<StoryDisplayProps> = ({ 
  storyData, 
  onRecordAnother, 
  onSave, 
  isGenerating = false,
  isGeneratingImage = false,
  isGeneratingContext = false,
  onRegenerateImage,
  onViewAlbum
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(storyData.mentionedMemberIds || []));
  const [showAiArt, setShowAiArt] = useState(storyData.mediaType !== 'video'); 

  useEffect(() => {
    setSelectedTags(new Set(storyData.mentionedMemberIds || []));
    setShowAiArt(storyData.mediaType !== 'video');
  }, [storyData.mentionedMemberIds, storyData.mediaType]);

  const handleToggleTag = (id: string) => {
    playClick();
    const newTags = new Set(selectedTags);
    if (newTags.has(id)) {
      newTags.delete(id);
    } else {
      newTags.add(id);
    }
    setSelectedTags(newTags);
  };

  const handleSave = () => {
    playClick();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      playSuccess();
      const finalStory = {
         ...storyData,
         mentionedMemberIds: Array.from(selectedTags)
      };
      setTimeout(() => {
        onSave(finalStory);
      }, 1200);
    }, 1000);
  };

  const handleRecordAnother = () => {
    playClick();
    onRecordAnother();
  };

  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 border-8 border-sepia/20 border-t-rosewood rounded-full animate-spin mb-8"></div>
        <h2 className="text-3xl md:text-4xl font-serif text-sepia animate-pulse text-center">
          Consulting the archives...
        </h2>
        <p className="mt-4 text-sepia/60 font-medium">Gemini is analyzing history</p>
      </div>
    );
  }

  const taggableMembers = FAMILY_DATA.filter(m => m.role !== 'Me');
  const hasVideo = storyData.mediaType === 'video' && storyData.mediaBase64;

  return (
    <div className="relative flex-1 flex flex-col items-center p-4 md:p-8 animate-in slide-in-from-bottom-8 duration-700">
      
      {/* Floating Action Buttons */}
      <div className="absolute top-4 right-4 md:right-8 flex gap-3 z-30">
        <button 
            onClick={handleRecordAnother}
            className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-md text-sepia hover:bg-white hover:shadow-lg transition-all border border-sepia/20 group"
            title="Record Another Story"
            aria-label="Record Another Story"
        >
            <RefreshIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
        </button>
        <button 
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className={`
                p-3 rounded-full shadow-md transition-all border backdrop-blur-sm flex items-center justify-center
                ${isSaved 
                ? 'bg-sage text-white border-sage' 
                : 'bg-rosewood text-white border-rosewood hover:bg-darkBrown hover:shadow-lg'
                }
            `}
            title={isSaved ? "Saved!" : "Save Memory"}
            aria-label="Save Memory"
        >
            {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSaved ? (
                <CheckIcon className="w-5 h-5" />
            ) : (
                <SaveIcon className="w-5 h-5" />
            )}
        </button>
      </div>

      {/* Content Container */}
      <main className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
        
        {/* Left Column: Story Content */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
          
          {/* Main Visual Area (Video or AI Art) */}
          <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-2xl relative group bg-[#FDF6E3]">
              
              {!showAiArt && hasVideo ? (
                 <video 
                   src={`data:${storyData.mediaMimeType};base64,${storyData.mediaBase64}`} 
                   controls 
                   className="w-full h-full object-cover bg-black"
                 />
              ) : isGeneratingImage ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-sepia/5 backdrop-blur-sm z-10 animate-in fade-in">
                    <div className="w-12 h-12 border-4 border-sepia/30 border-t-sepia rounded-full animate-spin mb-3"></div>
                    <span className="text-sepia font-serif italic text-sm">Visualizing memory...</span>
                 </div>
              ) : storyData.imageUrl ? (
                 <img 
                    src={storyData.imageUrl} 
                    alt="Memory Illustration" 
                    className="w-full h-full object-cover animate-in fade-in duration-700"
                 />
              ) : (
                <div className="absolute inset-0">
                    <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                        <rect width="400" height="300" fill="#FDF6E3"/>
                        <circle cx="320" cy="60" r="40" fill="#D4A574" opacity="0.6"/>
                        <path d="M0 220 C 100 180, 200 240, 400 200 L 400 300 L 0 300 Z" fill="#8B7355" opacity="0.4"/>
                        <path d="M0 260 C 150 240, 250 280, 400 240 L 400 300 L 0 300 Z" fill="#5D4037" opacity="0.5"/>
                        <path d="M60 220 L 80 160 L 100 220" fill="#556B2F" opacity="0.7"/>
                    </svg>
                </div>
              )}

              {hasVideo && !isGeneratingImage && (
                 <div className="absolute top-4 left-4 z-20 flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/20">
                    <button 
                       onClick={() => setShowAiArt(false)}
                       className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${!showAiArt ? 'bg-white text-darkBrown shadow-sm' : 'text-white/80 hover:bg-white/10'}`}
                    >
                       <VideoIcon className="w-3 h-3" /> Video
                    </button>
                    <button 
                       onClick={() => setShowAiArt(true)}
                       className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${showAiArt ? 'bg-white text-darkBrown shadow-sm' : 'text-white/80 hover:bg-white/10'}`}
                    >
                       <span className="text-xs">🎨</span> AI Art
                    </button>
                 </div>
              )}

              {showAiArt && !isGeneratingImage && storyData.imageUrl && (
                <button 
                  onClick={onRegenerateImage}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur text-sepia p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-white focus:opacity-100"
                  title="Regenerate Image"
                  aria-label="Regenerate Image"
                >
                  <RefreshIcon className="w-5 h-5" />
                </button>
              )}

              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg z-20">
                <span className="text-rosewood text-xs uppercase font-bold tracking-wider block">Recorded By</span>
                <span className="text-darkBrown font-serif text-lg font-bold">{storyData.author}</span>
              </div>
          </div>

          {/* Transcript Card */}
          <div className="w-full bg-cream rounded-xl shadow-lg relative p-8 md:p-10 border border-sepia/20">
            <div className="absolute inset-0 rounded-xl opacity-50 pointer-events-none" 
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`
                }}>
            </div>
            
            <h3 className="font-serif text-3xl text-rosewood mb-2 relative z-10 italic">
              {storyData.title}
            </h3>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
               <p className="font-sans text-darkBrown/60 uppercase tracking-widest text-sm font-bold">
                  {storyData.date}
               </p>
               {!hasVideo && (
                  <AudioPlayer 
                     key={storyData.title + storyData.author} 
                     audioBase64={storyData.mediaBase64} 
                     mimeType={storyData.mediaMimeType} 
                     transcript={storyData.transcript} 
                     authorName={storyData.author}
                  />
               )}
            </div>
            
            <div className="prose prose-lg prose-stone max-w-none relative z-10 mb-8">
              <p className="font-serif text-xl md:text-2xl leading-relaxed text-darkBrown whitespace-pre-line">
                "{storyData.transcript}"
              </p>
            </div>

            {storyData.relatedAlbumId && onViewAlbum && (
               <button 
                 onClick={() => onViewAlbum(storyData.relatedAlbumId!)}
                 className="flex items-center gap-2 px-5 py-3 bg-rosewood/10 text-rosewood rounded-full font-bold shadow-sm hover:shadow-md hover:bg-rosewood/20 transition-all text-sm relative z-20 mb-8"
               >
                  <GridIcon className="w-5 h-5" />
                  See photos from this event
               </button>
            )}
          </div>
        </div>

        {/* Right Column: Context & Tagging */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 pt-4 lg:pt-0">
          <div className="bg-white/60 p-5 rounded-xl border border-sepia/20 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <UsersIcon className="w-5 h-5 text-sepia" />
                <h3 className="font-serif font-bold text-darkBrown">Who is this story about?</h3>
             </div>
             <p className="text-xs text-sepia/80 mb-3">Tap family members to tag them in this story.</p>
             <div className="flex flex-wrap gap-2">
                {taggableMembers.map(member => {
                   const isSelected = selectedTags.has(member.id);
                   return (
                     <button
                       key={member.id}
                       onClick={() => handleToggleTag(member.id)}
                       className={`
                         flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border
                         ${isSelected 
                           ? 'bg-deepBlue text-white border-deepBlue shadow-md' 
                           : 'bg-white text-gray-600 border-gray-200 hover:border-deepBlue/30'}
                       `}
                     >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${isSelected ? 'bg-white text-deepBlue' : 'bg-gray-100 text-gray-500'}`}>
                           {member.name.charAt(0)}
                        </div>
                        {member.name}
                        {isSelected && <CheckIcon className="w-3 h-3" />}
                     </button>
                   );
                })}
             </div>
          </div>

          <div className="flex items-center justify-between border-b-2 border-sepia/20 pb-4 mb-2 mt-4">
            <h3 className="font-serif text-2xl text-sepia italic">Historical Context</h3>
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm">
               <span className="text-sm">✨</span>
               <span className="text-[10px] font-bold tracking-wider text-slate-600 font-sans uppercase">Powered by Gemini</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {isGeneratingContext ? (
               <div className="animate-pulse space-y-4 w-full">
                  {[...Array(3)].map((_, i) => (
                     <div key={i} className="bg-sepia/5 p-5 rounded-sm border-l-4 border-sepia/20 h-32 flex flex-col gap-3">
                        <div className="h-6 w-3/4 bg-sepia/10 rounded"></div>
                        <div className="h-4 w-full bg-sepia/5 rounded"></div>
                        <div className="h-4 w-5/6 bg-sepia/5 rounded"></div>
                     </div>
                  ))}
               </div>
            ) : storyData.contextCards && storyData.contextCards.length > 0 ? (
              storyData.contextCards.map((card, index) => (
                <ContextCard 
                  key={index}
                  icon={card.icon}
                  title={card.title}
                  content={card.content}
                  sourceUrl={card.sourceUrl}
                  delay={200 * (index + 1)}
                />
              ))
            ) : (
               <div className="text-center p-8 text-sepia/50 italic border-2 border-dashed border-sepia/20 rounded-xl">
                 No context available
               </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t-2 border-sepia/10">
             <CommentsSection targetId={storyData.title} contextTitle={storyData.title} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoryDisplay;