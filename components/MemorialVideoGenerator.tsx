import React, { useState, useRef, useEffect } from 'react';
import { 
  WandIcon, XIcon, VideoCameraIcon, MusicIcon, 
  AlertTriangleIcon, CheckIcon, PlayIcon, DownloadIcon 
} from './Icons';
import { FamilyMember, MEDIA_ARCHIVE, STORY_ARCHIVE, MediaItem } from '../App';
import { GoogleGenAI, Modality } from "@google/genai";
import { playClick, playSuccess } from '../utils/SoundEffects';

interface MemorialVideoGeneratorProps {
  member: FamilyMember;
  onClose: () => void;
}

type Step = 'intro' | 'photo' | 'type' | 'generating-script' | 'review' | 'generating-video' | 'result';
type VideoType = 'Love Letter' | 'Life Wisdom' | 'Special Occasion' | 'Custom';

const VIDEO_TYPES: { type: VideoType; description: string; emoji: string }[] = [
  { type: 'Love Letter', description: 'A warm message of love to the family', emoji: '💝' },
  { type: 'Life Wisdom', description: 'Key lessons and values they held dear', emoji: '🌟' },
  { type: 'Special Occasion', description: 'Birthday or Anniversary wishes', emoji: '🎂' },
  { type: 'Custom', description: 'Write your own prompt for the message', emoji: '✍️' },
];

// Helper for PCM Audio Decoding (Gemini TTS returns raw PCM)
const decodePcmData = (
  base64Data: string, 
  audioContext: AudioContext
): AudioBuffer => {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Gemini TTS returns 24kHz, 16-bit Mono PCM
  const int16Data = new Int16Array(bytes.buffer);
  const buffer = audioContext.createBuffer(1, int16Data.length, 24000);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < int16Data.length; i++) {
     channelData[i] = int16Data[i] / 32768.0;
  }
  
  return buffer;
};

const MemorialVideoGenerator: React.FC<MemorialVideoGeneratorProps> = ({ member, onClose }) => {
  const [step, setStep] = useState<Step>('intro');
  const [selectedPhoto, setSelectedPhoto] = useState<MediaItem | null>(null);
  const [videoType, setVideoType] = useState<VideoType | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [isConsentGiven, setIsConsentGiven] = useState(false);
  
  // We no longer generate a video URL, we simulate it
  const [generatedAudioBuffer, setGeneratedAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs for playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const availablePhotos = (MEDIA_ARCHIVE[member.id] || []).filter(m => m.type === 'photo');

  const handleConsent = () => {
    playClick();
    if (isConsentGiven) setStep('photo');
  };

  const handleSelectPhoto = (photo: MediaItem) => {
    playClick();
    setSelectedPhoto(photo);
    setStep('type');
  };

  const handleSelectType = (type: VideoType) => {
    playClick();
    setVideoType(type);
    setStep('generating-script');
    generateScript(type);
  };

  const generateScript = async (type: VideoType) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = "gemini-2.5-flash";

      // Gather stories context
      let context = "";
      member.featuredStories.forEach(title => {
        const story = STORY_ARCHIVE[title];
        if (story) context += `Title: ${title}\nContent: "${story.transcript}"\n\n`;
      });

      const prompt = `
        Based on [${member.name}]'s life stories below, generate a heartfelt script for a "${type}" video message.
        
        Stories:
        ${context}
        
        Rules:
        - First person ("I").
        - Warm, loving, authentic tone matching their stories.
        - Reference specific memories if relevant.
        - Keep it under 60 seconds (approx 80-100 words).
        - Do not include scene directions, just the spoken text.
        ${type === 'Custom' ? `Additional User Instruction: ${customPrompt}` : ''}
      `;

      const result = await ai.models.generateContent({
        model,
        contents: prompt
      });

      if (result.text) {
        setGeneratedScript(result.text);
        setStep('review');
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate script. Please try again.");
      setStep('type');
    }
  };

  const generateVideo = async () => {
    if (!selectedPhoto || !generatedScript) return;

    // Use "Simulated" video creation (Audio + CSS Animation) which is Free Tier friendly
    setStep('generating-video');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Generate Audio only
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: generatedScript }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } // 'Kore' is warm/neutral
          }
        }
      });

      // Process Audio
      const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64 && audioContextRef.current) {
         try {
            const buffer = decodePcmData(audioBase64, audioContextRef.current);
            setGeneratedAudioBuffer(buffer);
         } catch (audioErr) {
            console.error("Audio Decode Error", audioErr);
            throw new Error("Could not generate audio.");
         }
      } else {
         throw new Error("No audio returned from AI.");
      }

      playSuccess();
      setStep('result');

    } catch (e: any) {
      console.error("Generation Error:", e);
      alert("Error creating memorial: " + (e.message || "Unknown error"));
      setStep('review');
    }
  };

  const togglePlayback = () => {
    if (!audioContextRef.current) return;

    if (isPlaying) {
       sourceNodeRef.current?.stop();
       setIsPlaying(false);
    } else {
       // Start Audio
       if (generatedAudioBuffer) {
          const source = audioContextRef.current.createBufferSource();
          source.buffer = generatedAudioBuffer;
          source.connect(audioContextRef.current.destination);
          source.start();
          sourceNodeRef.current = source;
          
          setIsPlaying(true);

          source.onended = () => {
             setIsPlaying(false);
          };
       }
    }
  };

  // --- Render Steps ---

  const renderIntro = () => (
    <div className="flex flex-col items-center text-center space-y-6 max-w-lg mx-auto py-8">
       <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2">
          <WandIcon className="w-10 h-10" />
       </div>
       <h2 className="text-3xl font-serif font-bold text-darkBrown">Create a Memorial Video</h2>
       <p className="text-warmBrown text-lg leading-relaxed">
         Use AI to bring {member.name}'s stories to life. We will combine a favorite photo with a synthesized voice reading a script based on their memories.
       </p>
       
       <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex gap-3 text-left">
          <AlertTriangleIcon className="w-6 h-6 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-800">
             This feature uses Artificial Intelligence to simulate a voice and animate a photo. It is intended to honor their memory.
          </p>
       </div>

       <label className="flex items-center gap-3 cursor-pointer p-4 hover:bg-black/5 rounded-lg transition-colors w-full">
          <div className={`w-6 h-6 border-2 rounded flex items-center justify-center ${isConsentGiven ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400'}`}>
             {isConsentGiven && <CheckIcon className="w-4 h-4 text-white" />}
          </div>
          <input type="checkbox" className="hidden" checked={isConsentGiven} onChange={(e) => setIsConsentGiven(e.target.checked)} />
          <span className="text-darkBrown font-bold text-sm">I understand and wish to proceed</span>
       </label>

       <button 
          onClick={handleConsent}
          disabled={!isConsentGiven}
          className="w-full py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
       >
          Start Creation
       </button>
    </div>
  );

  const renderPhotoSelect = () => (
    <div className="flex flex-col h-full">
       <h3 className="text-2xl font-serif font-bold text-darkBrown mb-6 text-center">Choose a Photo</h3>
       {availablePhotos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-warmBrown/60">
             <p>No photos found in gallery.</p>
             <p className="text-sm">Please upload photos to the gallery first.</p>
          </div>
       ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto p-1">
             {availablePhotos.map(photo => (
                <button 
                   key={photo.id} 
                   onClick={() => handleSelectPhoto(photo)}
                   className="relative aspect-square rounded-xl overflow-hidden group border-2 border-transparent hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                   <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
             ))}
          </div>
       )}
    </div>
  );

  const renderTypeSelect = () => (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
       <h3 className="text-2xl font-serif font-bold text-darkBrown mb-6 text-center">What kind of message?</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VIDEO_TYPES.map((vt) => (
             <button
                key={vt.type}
                onClick={() => handleSelectType(vt.type)}
                className="flex flex-col items-center p-6 bg-white border-2 border-warmBrown/10 rounded-2xl hover:border-indigo-400 hover:shadow-lg transition-all text-center group"
             >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">{vt.emoji}</span>
                <span className="font-bold text-darkBrown text-lg mb-1">{vt.type}</span>
                <span className="text-sm text-warmBrown">{vt.description}</span>
             </button>
          ))}
       </div>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
       <h3 className="text-2xl font-serif font-bold text-darkBrown mb-2 text-center">Review Script</h3>
       <p className="text-center text-warmBrown text-sm mb-6">You can edit the text before generating the video.</p>
       
       <textarea
          value={generatedScript}
          onChange={(e) => setGeneratedScript(e.target.value)}
          className="flex-1 bg-white p-6 rounded-2xl border border-warmBrown/20 font-serif text-lg leading-relaxed text-darkBrown focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none shadow-inner mb-6"
       />
       
       <button
          onClick={generateVideo}
          className="w-full py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2"
       >
          <VideoCameraIcon className="w-6 h-6" />
          Generate Memorial (Free Mode)
       </button>
    </div>
  );

  const renderLoading = (text: string) => (
    <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in">
       <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          <WandIcon className="absolute inset-0 m-auto text-indigo-600 w-8 h-8 animate-pulse" />
       </div>
       <div className="text-center space-y-2">
          <h3 className="text-2xl font-serif font-bold text-darkBrown">{text}</h3>
          <p className="text-warmBrown">Simulating voice and memory...</p>
       </div>
    </div>
  );

  const renderResult = () => (
     <div className="flex flex-col h-full items-center justify-center max-w-3xl mx-auto w-full">
        <h3 className="text-2xl font-serif font-bold text-darkBrown mb-6">Memorial Video</h3>
        
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl mb-8 group">
           {selectedPhoto ? (
              <div className="w-full h-full relative overflow-hidden">
                 <img 
                   src={selectedPhoto.url} 
                   className={`
                     w-full h-full object-cover transition-transform ease-in-out
                     ${isPlaying ? 'scale-125 duration-[30000ms]' : 'scale-100 duration-1000'}
                   `}
                   style={{ transformOrigin: 'center center' }}
                   alt="Memorial"
                 />
                 <div className="absolute inset-0 bg-black/10"></div>
              </div>
           ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white/50">Image Error</div>
           )}
           
           {/* Overlay Controls */}
           <div className={`absolute inset-0 flex items-center justify-center transition-colors ${isPlaying ? 'bg-transparent pointer-events-none' : 'bg-black/20 group-hover:bg-black/40'}`}>
              {!isPlaying && (
                 <button 
                   onClick={togglePlayback}
                   className="w-20 h-20 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border-2 border-white/50 transition-transform hover:scale-105 pointer-events-auto"
                 >
                    <PlayIcon className="w-10 h-10 ml-1" />
                 </button>
              )}
           </div>
           
           {/* Playing Indicator */}
           {isPlaying && (
              <button 
                 onClick={togglePlayback}
                 className="absolute bottom-4 left-4 text-white/80 hover:text-white pointer-events-auto bg-black/40 p-2 rounded-full backdrop-blur-md"
              >
                 <span className="sr-only">Pause</span>
                 <div className="w-4 h-4 border-l-4 border-r-4 border-white h-4 ml-0.5"></div>
              </button>
           )}

           <div className="absolute bottom-4 right-4 text-white/50 text-[10px] uppercase font-bold tracking-widest bg-black/50 px-2 py-1 rounded">
              AI Generated Voice
           </div>
        </div>

        <div className="flex gap-4">
           <button onClick={onClose} className="px-6 py-3 text-warmBrown hover:underline">
              Close
           </button>
        </div>
     </div>
  );

  return (
    <div className="fixed inset-0 z-[80] bg-cream flex flex-col animate-in slide-in-from-bottom duration-500">
       
       {/* Header */}
       <div className="p-4 flex items-center justify-between border-b border-warmBrown/10 bg-white/50">
          <button onClick={onClose} className="p-2 hover:bg-warmBrown/10 rounded-full text-warmBrown">
             <XIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 text-sm font-bold text-warmBrown/60 uppercase tracking-widest">
             {step !== 'intro' && step !== 'result' && <span>Creating for {member.name}</span>}
          </div>
          <div className="w-10"></div> {/* Spacer */}
       </div>

       {/* Main Content */}
       <div className="flex-1 overflow-y-auto p-6 md:p-12">
          {step === 'intro' && renderIntro()}
          {step === 'photo' && renderPhotoSelect()}
          {step === 'type' && renderTypeSelect()}
          {step === 'generating-script' && renderLoading("Writing a heartfelt script...")}
          {step === 'review' && renderReview()}
          {step === 'generating-video' && renderLoading("Synthesizing voice...")}
          {step === 'result' && renderResult()}
       </div>

    </div>
  );
};

export default MemorialVideoGenerator;