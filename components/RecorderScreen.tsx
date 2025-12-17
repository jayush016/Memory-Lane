import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, ArrowLeftIcon, StopIcon, LightbulbIcon, CheckIcon, XIcon, VideoIcon } from './Icons';
import { playClick, playSuccess } from '../utils/SoundEffects';
import { FAMILY_DATA } from '../App';
import { GoogleGenAI, Type } from "@google/genai";

interface RecorderScreenProps {
  onBack: () => void;
  onRecordingComplete: (title: string, tags: string[], mediaBase64?: string, mediaType?: 'audio' | 'video', mimeType?: string) => void;
}

const SUGGESTIONS = [
  "Tell us about your first job.",
  "Describe your wedding day.",
  "What was your childhood home like?",
  "Tell us about a time you were scared but brave.",
  "What's the best advice your parents gave you?",
  "Describe a meal your family always made together.",
  "What was school like when you were young?",
  "Tell us about your first car or bicycle.",
  "What was the happiest day of your life?",
  "What do you want your grandchildren to know?"
];

const RecorderScreen: React.FC<RecorderScreenProps> = ({ onBack, onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video'>('audio');
  const [timer, setTimer] = useState(0);
  
  // Metadata
  const [storyTitle, setStoryTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Start camera stream if in video mode and NOT recording yet
    const initCamera = async () => {
      if (recordingMode === 'video' && !isRecording) {
         try {
           const stream = await navigator.mediaDevices.getUserMedia({ 
             video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, 
             audio: false // We get audio when recording starts to avoid feedback? Or enable here.
           });
           streamRef.current = stream;
           if (videoPreviewRef.current) {
             videoPreviewRef.current.srcObject = stream;
           }
         } catch (e) {
           console.error("Camera preview failed", e);
         }
      } else if (recordingMode === 'audio' && streamRef.current) {
         // Stop camera if switching back to audio
         streamRef.current.getTracks().forEach(t => t.stop());
         streamRef.current = null;
      }
    };

    initCamera();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [recordingMode]);

  const startRecording = async () => {
    try {
      const constraints = {
         audio: true,
         video: recordingMode === 'video' ? { width: 640, height: 480, facingMode: "user" } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // If video mode, ensure preview is using the active recording stream (sync)
      if (recordingMode === 'video' && videoPreviewRef.current) {
         videoPreviewRef.current.srcObject = stream;
      }

      // Determine correct mime type
      let mimeType = recordingMode === 'video' ? 'video/webm' : 'audio/webm';
      if (MediaRecorder.isTypeSupported('video/mp4') && recordingMode === 'video') mimeType = 'video/mp4';
      if (MediaRecorder.isTypeSupported('audio/mp4') && recordingMode === 'audio') mimeType = 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          onRecordingComplete(storyTitle, Array.from(selectedTags), base64String, recordingMode, mimeType);
        };
        // Stop all tracks to release mic/cam
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start Timer
      timerRef.current = window.setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Microphone/Camera access is required to record.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      playSuccess();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleToggleRecord = () => {
    playClick();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleToggleTag = (memberId: string) => {
    playClick();
    const newTags = new Set(selectedTags);
    if (newTags.has(memberId)) {
      newTags.delete(memberId);
    } else {
      newTags.add(memberId);
    }
    setSelectedTags(newTags);
  };

  const handleBack = () => {
    playClick();
    onBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const taggableMembers = FAMILY_DATA.filter(m => m.role !== 'Me');

  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 md:p-8 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Navigation Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 z-10">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 px-6 py-3 bg-white/50 hover:bg-white/80 rounded-full text-sepia font-bold text-lg transition-colors border-2 border-sepia/20 shadow-sm"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-6 h-6" />
          <span>Back</span>
        </button>
        
        <button 
           onClick={() => setIsSuggestionsOpen(true)}
           className="flex items-center gap-2 px-6 py-3 bg-white/50 hover:bg-white/80 rounded-full text-deepBlue font-bold transition-colors shadow-sm border border-deepBlue/10"
        >
           <LightbulbIcon className="w-5 h-5" />
           <span>Inspiration</span>
        </button>
      </div>

      <main className="flex-1 w-full max-w-2xl flex flex-col gap-6">
        
        {/* 1. Title Input */}
        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-sepia/10">
           <label className="block text-xs font-bold uppercase text-sepia mb-2">Story Title (Optional)</label>
           <input 
              type="text" 
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              placeholder="e.g. My First Bicycle"
              className="w-full text-2xl md:text-3xl font-serif text-darkBrown placeholder:text-gray-300 border-none focus:ring-0 p-0 bg-transparent"
              disabled={isRecording}
           />
           <p className="text-xs text-gray-400 mt-2">Leave blank to let AI name it based on your recording.</p>
        </div>

        {/* 2. Tagging Section */}
        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-sepia/10">
           <label className="block text-xs font-bold uppercase text-sepia mb-3">Who is in this memory?</label>
           <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
              {taggableMembers.map(member => {
                 const isSelected = selectedTags.has(member.id);
                 return (
                   <button
                     key={member.id}
                     onClick={() => handleToggleTag(member.id)}
                     disabled={isRecording}
                     className={`
                       flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border
                       ${isSelected 
                         ? 'bg-deepBlue text-white border-deepBlue shadow-md' 
                         : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-deepBlue/30'}
                       ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}
                     `}
                   >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isSelected ? 'bg-white text-deepBlue' : 'bg-gray-200 text-gray-500'}`}>
                         {member.name.charAt(0)}
                      </div>
                      {member.name}
                      {isSelected && <CheckIcon className="w-4 h-4" />}
                   </button>
                 );
              })}
           </div>
        </div>

        {/* 3. Recording Area */}
        <div className="flex-1 bg-[#FDF6E3] rounded-3xl border-2 border-dashed border-sepia/20 flex flex-col items-center justify-center p-8 relative min-h-[400px] overflow-hidden">
           
           {/* Mode Switcher */}
           {!isRecording && (
              <div className="absolute top-6 flex bg-white/50 p-1 rounded-full border border-sepia/10 z-20">
                 <button 
                   onClick={() => { playClick(); setRecordingMode('audio'); }}
                   className={`px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${recordingMode === 'audio' ? 'bg-rosewood text-white shadow-md' : 'text-sepia hover:bg-white'}`}
                 >
                    <MicrophoneIcon className="w-4 h-4" /> Audio
                 </button>
                 <button 
                   onClick={() => { playClick(); setRecordingMode('video'); }}
                   className={`px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${recordingMode === 'video' ? 'bg-rosewood text-white shadow-md' : 'text-sepia hover:bg-white'}`}
                 >
                    <VideoIcon className="w-4 h-4" /> Video
                 </button>
              </div>
           )}

           {/* Video Preview Layer */}
           {recordingMode === 'video' && (
              <div className="absolute inset-0 z-0">
                 <video 
                   ref={videoPreviewRef} 
                   autoPlay 
                   muted 
                   playsInline 
                   className="w-full h-full object-cover opacity-80"
                 />
                 <div className="absolute inset-0 bg-sepia/10 backdrop-blur-[1px]"></div>
              </div>
           )}

           {/* Audio Visualizer (only if audio mode OR overlay on video) */}
           <div className={`h-24 flex items-end gap-2 mb-8 relative z-10 transition-opacity ${recordingMode === 'video' ? 'opacity-50' : 'opacity-100'}`}>
              {isRecording ? (
                 [...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className="w-3 md:w-4 bg-rosewood rounded-full shadow-sm"
                    style={{
                      height: '100%',
                      animation: `pulse 0.8s infinite ${i * 0.1}s ease-in-out alternate`,
                      transformOrigin: 'bottom'
                    }} 
                  />
                ))
              ) : (
                 <div className="text-sepia font-serif italic text-xl drop-shadow-sm bg-white/30 px-4 py-2 rounded-full backdrop-blur-sm">
                    {recordingMode === 'video' ? "Ready to film..." : "Ready to record..."}
                 </div>
              )}
           </div>
           
           <style>{`
              @keyframes pulse {
                0% { height: 20%; opacity: 0.5; }
                100% { height: 100%; opacity: 1; }
              }
           `}</style>

           {/* Timer */}
           <div className={`text-6xl font-mono font-bold text-darkBrown mb-12 transition-all relative z-10 drop-shadow-md ${isRecording ? 'opacity-100 scale-110' : 'opacity-30'}`}>
              {formatTime(timer)}
           </div>

           {/* Record Button */}
           <button
            onClick={handleToggleRecord}
            className={`
              relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center
              shadow-xl transition-all duration-300 border-8 z-20
              ${isRecording 
                ? 'bg-rosewood border-red-200 animate-pulse scale-110' 
                : 'bg-rosewood border-white/20 hover:scale-105 hover:shadow-2xl'
              }
            `}
            aria-label={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {isRecording && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-rosewood opacity-50 animate-ping"></span>
            )}
            
            <div className="text-white relative z-10">
              {isRecording ? (
                <StopIcon className="w-12 h-12 drop-shadow-md" />
              ) : recordingMode === 'video' ? (
                <VideoIcon className="w-12 h-12 drop-shadow-md" />
              ) : (
                <MicrophoneIcon className="w-12 h-12 drop-shadow-md" />
              )}
            </div>
          </button>
          
          <p className="mt-6 text-sepia font-medium relative z-10 bg-white/40 px-3 py-1 rounded-lg backdrop-blur-sm">
             {isRecording ? "Recording in progress..." : `Tap ${recordingMode} to start`}
          </p>

        </div>

      </main>

      {/* Suggestions Modal */}
      {isSuggestionsOpen && (
         <div className="absolute inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsSuggestionsOpen(false)}></div>
            <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right relative z-10 border-l border-sepia/20">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="font-serif font-bold text-2xl text-darkBrown flex items-center gap-2">
                     <LightbulbIcon className="w-6 h-6 text-sepia" /> Inspiration
                  </h3>
                  <button onClick={() => setIsSuggestionsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                     <XIcon className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="space-y-3">
                  {SUGGESTIONS.map((prompt, i) => (
                     <button 
                        key={i}
                        onClick={() => {
                           setStoryTitle(prompt); // Auto-fill title with prompt
                           setIsSuggestionsOpen(false);
                           playSuccess();
                        }}
                        className="w-full text-left p-4 rounded-2xl bg-[#F5F2EA] text-darkBrown border border-sepia/20 hover:bg-white hover:border-sepia/50 transition-all font-serif font-medium"
                     >
                        {prompt}
                     </button>
                  ))}
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default RecorderScreen;