import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOffIcon, MicOffIcon, MicrophoneIcon, VideoIcon, VideoOffIcon, 
  UserPlusIcon, XIcon, WandIcon
} from './Icons';
import { FAMILY_DATA, FamilyMember, STORY_ARCHIVE } from '../App';
import { playClick, playSuccess } from '../utils/SoundEffects';
import { GoogleGenAI, Modality } from "@google/genai";

interface FamilyVideoCallProps {
  onEndCall: () => void;
}

interface Participant {
  id: string;
  name: string;
  type: 'local' | 'remote-living' | 'ai-deceased';
  isMuted: boolean;
  isSpeaking: boolean;
  avatarUrl?: string; 
  status: 'connecting' | 'connected';
}

// Hardcoded high-quality images for specific demo members to ensure they look "real"
const MEMBER_IMAGES: Record<string, string> = {
  'g-robert': 'https://images.unsplash.com/photo-1457449940276-e8deed18bfff?auto=format&fit=crop&q=80&w=800', // Elderly Man
  'g-margaret': 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=800', // Elderly Woman
  'm-jennifer': 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=400',
  'd-michael': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400',
  's-emma': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400',
  'u-david': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400' // You
};

const FamilyVideoCall: React.FC<FamilyVideoCallProps> = ({ onEndCall }) => {
  // Local Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  // Call State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [transcript, setTranscript] = useState(""); // Current user speech
  const [isListening, setIsListening] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Audio Context for TTS
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null); // Web Speech API

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize Local Video & Auto-Join Demo Members
  useEffect(() => {
    let stream: MediaStream | null = null;
    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        
        // Add Self
        setParticipants(prev => {
           if (prev.some(p => p.type === 'local')) return prev;
           return [...prev, {
             id: 'me',
             name: 'You',
             type: 'local',
             isMuted: false,
             isSpeaking: false,
             status: 'connected'
           }];
        });

      } catch (e) {
        console.error("Camera access failed or denied. Using fallback photo.", e);
        // Fallback for demo without camera
        setParticipants(prev => {
             if (prev.some(p => p.type === 'local')) return prev;
             return [...prev, {
               id: 'me',
               name: 'You',
               type: 'local',
               isMuted: false,
               isSpeaking: false,
               status: 'connected'
             }];
        });
      }
    };

    initCamera();
    
    // Init Audio Context for TTS playback
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    // AUTO-JOIN DEMO LOGIC
    // 1. Grandpa Robert (Living) joins after 0.5s
    const t1 = setTimeout(() => {
        const grandpa = FAMILY_DATA.find(m => m.id === 'g-robert');
        if (grandpa) addParticipantToCall(grandpa);
    }, 500);

    // 2. Grandma Margaret (AI) joins after 1.5s
    const t2 = setTimeout(() => {
        const grandma = FAMILY_DATA.find(m => m.id === 'g-margaret');
        if (grandma) addParticipantToCall(grandma);
    }, 2500);

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // CRITICAL FIX: Sync video stream to DOM element whenever it becomes available or changes.
  // This ensures that if the <video> tag mounts AFTER the stream is ready, it still gets the source.
  useEffect(() => {
    if (localStream && videoRef.current) {
        // Only re-assign if necessary to prevent flickering
        if (videoRef.current.srcObject !== localStream) {
            videoRef.current.srcObject = localStream;
            // Explicit play attempt to handle some browser autoplay policies
            videoRef.current.play().catch(e => console.warn("Video play interrupted", e));
        }
    }
  }, [localStream, participants, isCameraOff]);

  // Handle Mute/Camera Toggles
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
      localStream.getVideoTracks().forEach(track => track.enabled = !isCameraOff);
    }
  }, [isMuted, isCameraOff, localStream]);

  // Simulate "Connecting..." -> "Connected" for living members
  useEffect(() => {
    const connecting = participants.filter(p => p.type === 'remote-living' && p.status === 'connecting');
    if (connecting.length > 0) {
        const timers = connecting.map(p => {
            return setTimeout(() => {
                setParticipants(prev => prev.map(part => 
                    part.id === p.id ? { ...part, status: 'connected' } : part
                ));
                playSuccess(); // Sound effect when connected
            }, 1500); // 1.5s connection time
        });
        return () => timers.forEach(clearTimeout);
    }
  }, [participants]);

  // Handle Speech Recognition for interacting with AI
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Easier to handle turns
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
         setIsListening(false);
      };
      
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
        
        // If final result, send to AI
        if (event.results[current].isFinal) {
           handleUserSpeech(transcriptText);
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, [participants]); 

  const startListening = () => {
    setTranscript("");
    recognitionRef.current?.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const handleUserSpeech = async (text: string) => {
     // Identify AI participants
     const aiParticipants = participants.filter(p => p.type === 'ai-deceased');
     if (aiParticipants.length === 0) return;

     // Pick one to respond (or all?) - Simple logic: respond if addressed or random
     const responder = aiParticipants[0]; 
     const memberData = FAMILY_DATA.find(m => m.id === responder.id);
     if (!memberData) return;

     // Animate AI speaking state (loading)
     setParticipants(prev => prev.map(p => p.id === responder.id ? { ...p, isSpeaking: true } : p));
     
     try {
       const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
       
       // 1. Generate Response Text
       let context = `You are mimicking the deceased family member ${memberData.name} in a video call.`;
       memberData.featuredStories.forEach(title => {
          const s = STORY_ARCHIVE[title];
          if(s) context += `\nMemory: ${s.transcript}`;
       });
       
       const prompt = `${context}\n\nUser said: "${text}"\n\nReply as ${memberData.name}. Keep it conversational, short (1-2 sentences), and warm.`;
       
       const result = await ai.models.generateContent({
         model: "gemini-2.5-flash",
         contents: prompt
       });
       const responseText = result.text || "";

       // 2. Generate Audio (TTS)
       const ttsResult = await ai.models.generateContent({
         model: "gemini-2.5-flash-preview-tts",
         contents: [{ role: 'user', parts: [{ text: responseText }] }],
         config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
               voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            }
         }
       });

       const audioData = ttsResult.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

       if (audioData && audioContextRef.current) {
          // Decode raw PCM manually (browser decodeAudioData fails on raw PCM)
          const binaryString = atob(audioData);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const int16Data = new Int16Array(bytes.buffer);
          const audioBuffer = audioContextRef.current.createBuffer(1, int16Data.length, 24000);
          const channelData = audioBuffer.getChannelData(0);
          for (let i = 0; i < int16Data.length; i++) {
             channelData[i] = int16Data[i] / 32768.0;
          }
          
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current.destination);
          
          // Animation Sync
          setParticipants(prev => prev.map(p => p.id === responder.id ? { ...p, isSpeaking: true } : p));
          source.start();
          
          source.onended = () => {
             setParticipants(prev => prev.map(p => p.id === responder.id ? { ...p, isSpeaking: false } : p));
          };
       } else {
          // Fallback no audio
          setParticipants(prev => prev.map(p => p.id === responder.id ? { ...p, isSpeaking: false } : p));
       }

     } catch (e) {
       console.error("AI interaction failed", e);
       setParticipants(prev => prev.map(p => p.id === responder.id ? { ...p, isSpeaking: false } : p));
     }
  };

  const addParticipantToCall = (member: FamilyMember) => {
    // Only play sound if manual add (optional check, but playSuccess handles dedup well enough)
    const type = member.isLiving ? 'remote-living' : 'ai-deceased';
    const imageUrl = MEMBER_IMAGES[member.id] || member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}&background=random`;

    setParticipants(prev => {
      if (prev.some(p => p.id === member.id)) return prev;
      return [...prev, {
        id: member.id,
        name: member.name,
        type,
        isMuted: false,
        isSpeaking: false,
        status: member.isLiving ? 'connecting' : 'connected', // Living needs simulation, AI connects instantly
        avatarUrl: imageUrl
      }];
    });
  };

  const handleManualAdd = (member: FamilyMember) => {
    playClick();
    addParticipantToCall(member);
    setShowAddUser(false);
  };

  const renderParticipant = (p: Participant) => {
    // Local User
    if (p.type === 'local') {
      // Logic: Show video if we have a stream AND camera is not manually toggled off.
      // If camera is toggled off OR no stream, show fallback.
      const showVideo = localStream && !isCameraOff;
      
      // Fallback to the "You" photo if no camera
      const myPhotoUrl = MEMBER_IMAGES['u-david']; 

      return (
        <div key={p.id} className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video border-2 border-transparent shadow-lg group">
           {showVideo ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
           ) : (
              // Video Off / Camera Failed State
              <div className="w-full h-full relative">
                 <img src={myPhotoUrl} alt="You" className="w-full h-full object-cover opacity-80" />
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-black/50 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2">
                       <VideoOffIcon className="w-5 h-5 text-white" />
                       <span className="text-white font-bold text-sm">Camera Off</span>
                    </div>
                 </div>
              </div>
           )}
           <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm font-bold backdrop-blur-md">
             You {isMuted && '(Muted)'}
           </div>
        </div>
      );
    }

    // AI Deceased (Grandma)
    if (p.type === 'ai-deceased') {
       return (
        <div key={p.id} className={`relative bg-indigo-950 rounded-2xl overflow-hidden aspect-video border-4 transition-all duration-300 ${p.isSpeaking ? 'border-indigo-400 shadow-[0_0_30px_rgba(129,140,248,0.5)]' : 'border-transparent'}`}>
           <div className="w-full h-full relative group">
              {/* Ken Burns effect on image to simulate life */}
              <img 
                src={p.avatarUrl} 
                alt={p.name}
                className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear transform hover:scale-110 ${p.isSpeaking ? 'scale-105' : 'scale-100'}`}
                style={{ animation: 'breathe 10s ease-in-out infinite alternate' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 to-transparent"></div>
              
              {/* Speaking Visualizer Overlay */}
              {p.isSpeaking && (
                 <div className="absolute bottom-16 left-0 right-0 flex justify-center items-end gap-1 h-12">
                     <div className="w-2 bg-indigo-300 animate-[bounce_1s_infinite] h-8 opacity-80"></div>
                     <div className="w-2 bg-indigo-300 animate-[bounce_1.2s_infinite] h-12 opacity-80"></div>
                     <div className="w-2 bg-indigo-300 animate-[bounce_0.8s_infinite] h-6 opacity-80"></div>
                     <div className="w-2 bg-indigo-300 animate-[bounce_1.1s_infinite] h-10 opacity-80"></div>
                 </div>
              )}
           </div>

           <div className="absolute top-4 right-4 bg-indigo-500/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
              <WandIcon className="w-3 h-3" /> AI Memory
           </div>
           
           <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm font-bold backdrop-blur-md">
             {p.name}
           </div>
        </div>
       );
    }

    // Remote Living (Grandpa)
    return (
      <div key={p.id} className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video border-2 border-transparent shadow-md">
         {p.status === 'connecting' ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-900">
                <div className="w-24 h-24 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-3xl font-bold font-serif shadow-inner overflow-hidden">
                   {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce delay-75"></div>
                   <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce delay-150"></div>
                </div>
                <p className="text-white/60 text-sm">Connecting to {p.name}...</p>
            </div>
         ) : (
            // Connected State - Simulated Video Feed
            <div className="w-full h-full relative overflow-hidden group">
               <img 
                  src={p.avatarUrl}
                  alt={p.name}
                  className="w-full h-full object-cover animate-in fade-in duration-1000"
                  style={{ animation: 'breathe 8s ease-in-out infinite alternate-reverse' }}
               />
               <div className="absolute top-4 right-4 bg-green-500/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> Live
               </div>
            </div>
         )}
         
         <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm font-bold backdrop-blur-md">
             {p.name}
         </div>
      </div>
    );
  };

  const activeAi = participants.find(p => p.type === 'ai-deceased');

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 text-white flex flex-col">
       <style>{`
         @keyframes breathe {
           0% { transform: scale(1); }
           100% { transform: scale(1.05); }
         }
       `}</style>
       
       {/* Call Header */}
       <div className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
             <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse"></div>
             <span className="font-bold text-lg">Family Call</span>
             <span className="text-white/50 text-sm">| {participants.length} Participant{participants.length !== 1 && 's'}</span>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-full text-sm font-mono">
             {formatDuration(callDuration)}
          </div>
       </div>

       {/* Video Grid */}
       <div className={`flex-1 p-4 grid gap-4 overflow-y-auto ${participants.length <= 1 ? 'grid-cols-1' : participants.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
          {participants.map(renderParticipant)}
          
          {/* Add User Placeholder */}
          <button 
             onClick={() => setShowAddUser(true)}
             className="bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-gray-800 transition-colors group aspect-video"
          >
             <div className="w-16 h-16 rounded-full bg-gray-700 group-hover:bg-gray-600 flex items-center justify-center transition-colors">
                <UserPlusIcon className="w-8 h-8 text-white/70" />
             </div>
             <span className="text-sm font-bold text-white/70">Add Family</span>
          </button>
       </div>

       {/* Transcript Overlay (Subtitles) */}
       {(transcript || activeAi?.isSpeaking) && (
          <div className="absolute bottom-28 left-0 w-full flex justify-center px-4">
             <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl max-w-2xl text-center">
                <p className="text-lg font-medium">
                   {activeAi?.isSpeaking ? <span className="text-indigo-300 italic">Listening to {activeAi.name}...</span> : `"${transcript}"`}
                </p>
             </div>
          </div>
       )}

       {/* Controls Footer */}
       <div className="p-6 bg-black/40 backdrop-blur-md flex justify-center items-center gap-6">
          <button 
             onClick={() => setIsMuted(!isMuted)}
             className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
             {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
          </button>
          
          <button 
             onClick={() => setIsCameraOff(!isCameraOff)}
             className={`p-4 rounded-full transition-all ${isCameraOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
             {isCameraOff ? <VideoOffIcon className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </button>

          {/* AI Talk Trigger (Push to Talk) */}
          {activeAi && (
             <button
                onMouseDown={startListening}
                onMouseUp={stopListening}
                onTouchStart={startListening}
                onTouchEnd={stopListening}
                className={`p-6 rounded-full transition-all scale-110 shadow-lg border-4 ${isListening ? 'bg-indigo-600 border-indigo-400 animate-pulse' : 'bg-indigo-500 border-transparent hover:bg-indigo-400'}`}
             >
                <WandIcon className="w-8 h-8" />
             </button>
          )}

          <button 
             onClick={onEndCall}
             className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all px-8 flex items-center gap-2 font-bold"
          >
             <PhoneOffIcon className="w-6 h-6" />
             <span className="hidden md:inline">End Call</span>
          </button>
       </div>

       {/* Add User Modal */}
       {showAddUser && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
             <div className="bg-white text-gray-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                   <h3 className="font-serif font-bold text-xl">Invite to Call</h3>
                   <button onClick={() => setShowAddUser(false)}><XIcon className="w-6 h-6 text-gray-500" /></button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Living Family</h4>
                   <div className="grid grid-cols-1 gap-2 mb-6">
                      {FAMILY_DATA.filter(m => m.isLiving && m.role !== 'Me').map(m => (
                         <button 
                           key={m.id}
                           onClick={() => handleManualAdd(m)}
                           className="flex items-center gap-3 p-3 hover:bg-green-50 rounded-xl transition-colors border border-transparent hover:border-green-200"
                         >
                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                               {m.name.charAt(0)}
                            </div>
                            <div className="text-left">
                               <div className="font-bold">{m.name}</div>
                               <div className="text-xs text-gray-500">Available</div>
                            </div>
                            <VideoIcon className="w-5 h-5 text-green-600 ml-auto" />
                         </button>
                      ))}
                   </div>

                   <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <WandIcon className="w-3 h-3" /> Deceased (AI)
                   </h4>
                   <div className="grid grid-cols-1 gap-2">
                      {FAMILY_DATA.filter(m => !m.isLiving).map(m => (
                         <button 
                           key={m.id}
                           onClick={() => handleManualAdd(m)}
                           className="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-xl transition-colors border border-transparent hover:border-indigo-200"
                         >
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                               {m.name.charAt(0)}
                            </div>
                            <div className="text-left">
                               <div className="font-bold">{m.name}</div>
                               <div className="text-xs text-indigo-500 font-bold">AI Representation</div>
                            </div>
                            <UserPlusIcon className="w-5 h-5 text-indigo-600 ml-auto" />
                         </button>
                      ))}
                   </div>
                </div>
             </div>
          </div>
       )}

    </div>
  );
};

export default FamilyVideoCall;