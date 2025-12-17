import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, SendIcon, UserIcon, UsersIcon, PaperclipIcon, XIcon, BookIcon, VideoIcon } from './Icons';
import { playClick } from '../utils/SoundEffects';
import { GoogleGenAI, Content, Modality } from "@google/genai";
import { STORY_ARCHIVE, FAMILY_DATA, FamilyMember } from '../App';

interface FamilyGatheringScreenProps {
  onBack: () => void;
  onVideoCall?: () => void;
}

interface QuotedStory {
  title: string;
  snippet: string;
  author: string;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  text: string;
  senderName?: string;
  isSystem?: boolean;
  quote?: QuotedStory;
}

const CONVERSATION_STARTERS = [
  "How did you meet your spouse?",
  "What was your favorite family vacation?",
  "What advice would you give me about work?",
  "What was the hardest time in your life?",
  "Tell me about a holiday tradition you loved."
];

const FamilyGatheringScreen: React.FC<FamilyGatheringScreenProps> = ({ onBack, onVideoCall }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingMembers, setTypingMembers] = useState<string[]>([]);
  
  // Attachment UI State
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [activeQuote, setActiveQuote] = useState<QuotedStory | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMembers, activeQuote]);

  // Initial greeting
  useEffect(() => {
    const greeting: ChatMessage = {
      id: Date.now(),
      role: 'model',
      text: "We're all here! It's so nice to be together. What would you like to ask the family?",
      senderName: "Family Gathering",
      isSystem: true
    };
    setMessages([greeting]);
  }, []);

  const attachStoryQuote = (title: string, author: string) => {
    const story = STORY_ARCHIVE[title];
    if (story) {
      setActiveQuote({
        title,
        author,
        snippet: story.transcript.substring(0, 100) + "..."
      });
      setShowAttachmentMenu(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if ((!text.trim() && !activeQuote) || isTyping) return;

    const currentQuote = activeQuote;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text: text.trim(),
      quote: currentQuote || undefined
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setActiveQuote(null);
    setIsTyping(true);
    setTypingMembers(["The family"]);

    try {
      // 1. Build Comprehensive Context
      let fullContext = "";
      FAMILY_DATA.forEach(member => {
        if (member.role === 'Me') return; // Exclude 'You' from responding
        
        fullContext += `\nFAMILY MEMBER: ${member.name} (${member.isLiving ? 'LIVING' : 'DECEASED'})\n`;
        fullContext += `ROLE: ${member.role}\n`;
        fullContext += `STORIES:\n`;
        
        member.featuredStories.forEach(title => {
           const story = STORY_ARCHIVE[title];
           if (story) {
             fullContext += `- Title: ${title}, Date: ${story.date}, Content: "${story.transcript}"\n`;
           }
        });
        fullContext += "---\n";
      });

      // Inject Quote Info specifically if present
      if (currentQuote) {
         const story = STORY_ARCHIVE[currentQuote.title];
         if (story) {
            fullContext += `\n[IMPORTANT: USER HAS REPLIED TO A SPECIFIC STORY]\nTITLE: "${currentQuote.title}" (by ${currentQuote.author})\nFULL CONTENT: "${story.transcript}"\n`;
            fullContext += `INSTRUCTION: The response MUST primarily address this attached story. Family members mentioned in it (or the author) should likely respond.\n`;
         }
      }

      // 2. Setup Gemini 3 Pro for superior reasoning and persona handling
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = "gemini-3-pro-preview";

      const systemInstruction = `You are simulating a warm, nostalgic family group chat with multiple family members.
      
      PARTICIPANTS (Context Bank):
      ${fullContext}

      INSTRUCTIONS:
      1. The user asks a question to the whole group.
      2. If a story is ATTACHED/QUOTED, the author of that story or people mentioned in it MUST respond to it.
      3. Choose 2-3 family members who have the MOST RELEVANT stories or wisdom to answer.
      4. Generate their responses as a script. 
      5. Deceased members speak from their memories (1st person). Living members speak based on their stories (3rd person perspective "Grandpa used to say..." OR general warm advice).
      6. Members should interact naturally (e.g., "That reminds me of what Margaret said...").
      7. Keep each response short (under 40 words).

      OUTPUT FORMAT:
      [Member Name]: [Message Content]
      [Member Name]: [Message Content]
      `;

      // Build history for context (exclude system messages from history)
      const history: Content[] = messages
        .filter(m => !m.isSystem)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.senderName ? `${m.senderName}: ${m.text}` : m.text }]
        }));

      const chat = ai.chats.create({
        model,
        config: { systemInstruction },
        history
      });

      const result = await chat.sendMessage({ message: text || "(User sent an attachment)" });
      const responseText = result.text || "";

      // 3. Parse and Animate Responses
      const lines = responseText.split('\n').filter(line => line.includes(':'));
      
      setTypingMembers([]); // Clear generic typing
      
      // Sequence the messages
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const name = line.substring(0, colonIndex).trim();
        const content = line.substring(colonIndex + 1).trim();

        // Show "Name is typing..."
        setTypingMembers([name]);
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000)); // Variable typing delay
        
        // Add message
        setMessages(prev => [...prev, {
          id: Date.now() + i,
          role: 'model',
          text: content,
          senderName: name
        }]);
      }
      
      setTypingMembers([]);
      setIsTyping(false);

    } catch (e) {
      console.error("Group Chat Error:", e);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'model',
        text: "We seem to be having trouble hearing you clearly. Could you say that again?",
        senderName: "System",
        isSystem: true
      }]);
      setIsTyping(false);
      setTypingMembers([]);
    }
  };

  const handleBack = () => {
    playClick();
    onBack();
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-indigo-900 text-white p-4 shadow-md z-20 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-serif font-bold text-xl flex items-center gap-2">
                <UsersIcon className="w-6 h-6" />
                Family Gathering
              </h1>
              <div className="flex -space-x-2 mt-1 overflow-hidden">
                {FAMILY_DATA.filter(m => m.role !== 'Me').slice(0, 5).map(m => (
                  <div key={m.id} className="w-6 h-6 rounded-full border-2 border-indigo-900 bg-cream flex items-center justify-center text-[8px] font-bold text-warmBrown overflow-hidden" title={m.name}>
                    {m.name.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
         </div>
         
         {onVideoCall && (
            <button 
               onClick={onVideoCall}
               className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full font-bold shadow-md transition-all text-xs uppercase tracking-wider border border-white/20"
            >
               <VideoIcon className="w-4 h-4" />
               Join Video Call
            </button>
         )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-32">
        {messages.map((msg) => {
          if (msg.isSystem) {
             return (
               <div key={msg.id} className="flex justify-center my-4">
                 <span className="bg-indigo-100 text-indigo-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                   {msg.text}
                 </span>
               </div>
             );
          }
          
          const isMe = msg.role === 'user';
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              {!isMe && (
                <div className="mr-3 flex flex-col items-center gap-1">
                   <div className="w-10 h-10 rounded-full bg-cream border-2 border-warmBrown/20 flex items-center justify-center text-warmBrown shadow-sm">
                      <span className="font-serif font-bold">{msg.senderName?.charAt(0)}</span>
                   </div>
                </div>
              )}
              
              <div className="flex flex-col max-w-[80%] md:max-w-[70%]">
                 {!isMe && <span className="text-xs text-gray-500 ml-1 mb-1 font-bold">{msg.senderName}</span>}
                 
                 {/* Render Quoted Snippet if exists */}
                 {msg.quote && (
                    <div className={`mb-1 p-2 rounded-lg border-l-4 border-indigo-400 text-left shadow-sm ${isMe ? 'bg-indigo-500 border-indigo-300' : 'bg-white border-indigo-300'}`}>
                       <div className={`flex items-center gap-1 text-[10px] uppercase font-bold mb-0.5 ${isMe ? 'text-indigo-100' : 'text-indigo-600'}`}>
                          <BookIcon className="w-3 h-3" />
                          {msg.quote.title}
                       </div>
                       <div className={`text-xs italic line-clamp-2 font-serif ${isMe ? 'text-indigo-100' : 'text-gray-500'}`}>
                         "{msg.quote.snippet}"
                       </div>
                    </div>
                 )}

                 <div className={`
                   p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed
                   ${isMe 
                     ? 'bg-indigo-600 text-white rounded-tr-none' 
                     : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none font-serif'}
                 `}>
                   {msg.text}
                 </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {typingMembers.length > 0 && (
          <div className="flex justify-start animate-in fade-in duration-200">
             <div className="mr-3 w-10"></div> {/* Spacer */}
             <div className="flex flex-col">
                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none inline-flex items-center gap-2 shadow-sm">
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-gray-400 mt-1 ml-1 animate-pulse">
                  {typingMembers.join(", ")} {typingMembers.length === 1 ? 'is' : 'are'} typing...
                </span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Modal */}
      {showAttachmentMenu && (
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-white rounded-t-3xl shadow-2xl z-40 flex flex-col animate-in slide-in-from-bottom duration-300 border-t border-gray-200">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl">
            <h3 className="font-bold text-gray-700">Attach a Story</h3>
            <button onClick={() => setShowAttachmentMenu(false)} className="p-1 hover:bg-gray-200 rounded-full"><XIcon className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {FAMILY_DATA.filter(m => m.role !== 'Me').map(member => (
               <div key={member.id}>
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">{member.name}</h4>
                  <div className="space-y-2">
                    {member.featuredStories.map((story, i) => (
                      <button 
                        key={i}
                        onClick={() => attachStoryQuote(story, member.name)}
                        className="w-full text-left p-3 rounded-lg bg-white border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all flex items-center justify-between"
                      >
                         <span className="text-sm font-serif font-bold text-gray-800">{story}</span>
                         <PaperclipIcon className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-30 flex flex-col">
         
         {/* WhatsApp-style Quote Preview */}
         {activeQuote && (
            <div className="mx-4 mt-3 p-3 bg-gray-50 border-l-4 border-indigo-400 rounded-r-lg flex justify-between items-center shadow-sm animate-in slide-in-from-bottom-2">
              <div className="flex-1 min-w-0 mr-2">
                 <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Replying to story</span>
                    <span className="text-[10px] text-gray-500 font-bold">• {activeQuote.author}</span>
                 </div>
                 <div className="font-serif font-bold text-sm text-gray-800 truncate">{activeQuote.title}</div>
                 <div className="text-xs text-gray-500 truncate font-serif italic">"{activeQuote.snippet}"</div>
              </div>
              <button 
                onClick={() => setActiveQuote(null)} 
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <XIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
         )}

         <div className="p-4 flex flex-col gap-3">
            {/* Conversation Starters (Only show if no text/quote) */}
            {!isTyping && messages.length < 3 && !activeQuote && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {CONVERSATION_STARTERS.map((starter, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleSendMessage(starter)}
                        className="whitespace-nowrap px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors flex-shrink-0"
                      >
                        {starter}
                      </button>
                  ))}
                </div>
            )}

            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
              className="flex gap-2 relative"
            >
              <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={activeQuote ? "Add a comment..." : "Ask the family a question..."}
                    className="w-full bg-gray-100 border-none rounded-full pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-800"
                  />
                  <button 
                      type="button"
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="Attach Story"
                  >
                      <PaperclipIcon className="w-5 h-5" />
                  </button>
              </div>
              <button 
                type="submit"
                disabled={(!inputText.trim() && !activeQuote) || isTyping}
                className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-colors"
              >
                <SendIcon className="w-5 h-5 ml-1" />
              </button>
            </form>
         </div>
      </div>

    </div>
  );
};

export default FamilyGatheringScreen;