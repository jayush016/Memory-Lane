import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Content } from "@google/genai";
import { XIcon, SendIcon, PaperclipIcon, BookIcon, UtensilsIcon, LightbulbIcon, UserIcon } from './Icons';
import { STORY_ARCHIVE, FAMILY_DATA, FamilyMember } from '../App';
import { playClick } from '../utils/SoundEffects';

interface QuotedStory {
  title: string;
  snippet: string;
  type: StoryType;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  quote?: QuotedStory;
}

type StoryType = 'story' | 'recipe' | 'wisdom';

const getStoryType = (title: string): StoryType => {
  const lower = title.toLowerCase();
  if (lower.includes('pie') || lower.includes('recipe') || lower.includes('cook') || lower.includes('food')) return 'recipe';
  if (lower.includes('advice') || lower.includes('lesson') || lower.includes('learn') || lower.includes('job')) return 'wisdom';
  return 'story';
};

const getStoryColor = (type: StoryType) => {
  switch (type) {
    case 'recipe': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'wisdom': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

const getStoryIcon = (type: StoryType) => {
  switch (type) {
    case 'recipe': return <UtensilsIcon className="w-3 h-3 md:w-4 md:h-4" />;
    case 'wisdom': return <LightbulbIcon className="w-3 h-3 md:w-4 md:h-4" />;
    default: return <BookIcon className="w-3 h-3 md:w-4 md:h-4" />;
  }
};

const ChatModal: React.FC<{
  member: FamilyMember;
  onClose: () => void;
  initialTopic?: string;
}> = ({ member, onClose, initialTopic }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  
  const [activeQuote, setActiveQuote] = useState<QuotedStory | null>(null);
  const [activeStoryPreview, setActiveStoryPreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let greeting = "";
    if (initialTopic && !member.isLiving) {
       greeting = `I'd love to tell you about my memories regarding ${initialTopic.toLowerCase()}. What would you like to know?`;
       setTimeout(() => handleSendMessage(undefined, `Tell me about your ${initialTopic}`), 500);
    } else {
       greeting = member.isLiving 
        ? `Hi there! I can help you explore ${member.name}'s stories. What would you like to know about their memories?`
        : `Hello. It is lovely to connect. I am here to share the memories ${member.name} left behind. What would you like to ask?`;
    }
      
    setMessages([{ role: 'model', text: greeting }]);
  }, [member, initialTopic]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, activeQuote]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (val.endsWith('@')) {
      setShowTagMenu(true);
    } else if (!val.includes('@')) {
      setShowTagMenu(false);
    }
  };

  const attachStoryQuote = (title: string) => {
    const story = STORY_ARCHIVE[title];
    if (story) {
      setActiveQuote({
        title,
        snippet: story.transcript.substring(0, 100) + "...",
        type: getStoryType(title)
      });
      setShowTagMenu(false);
      inputRef.current?.focus();
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const textToSend = overrideText || inputText;
    
    if ((!textToSend.trim() && !activeQuote) || isTyping) return;

    if (!overrideText) {
      const currentQuote = activeQuote;
      setMessages(prev => [...prev, { 
        role: 'user', 
        text: textToSend.trim(),
        quote: currentQuote || undefined
      }]);
      setInputText("");
      setActiveQuote(null);
    }

    setIsTyping(true);
    setShowTagMenu(false);

    try {
      let memoriesContext = "";
      
      memoriesContext += "STORIES TOLD BY ME:\n";
      member.featuredStories.forEach(title => {
         const story = STORY_ARCHIVE[title];
         if(story) memoriesContext += `- TITLE: ${title}\n  CONTENT: "${story.transcript}"\n\n`;
      });

      memoriesContext += "STORIES ABOUT ME (BY OTHERS):\n";
      const storiesAboutThem = Object.entries(STORY_ARCHIVE).filter(([_, story]) => story.mentionedMemberIds?.includes(member.id));
      storiesAboutThem.forEach(([title, story]) => {
         const author = FAMILY_DATA.find(f => f.featuredStories.includes(title));
         memoriesContext += `- TITLE: ${title} (Told by ${author?.name || 'Unknown'})\n  CONTENT: "${story.transcript}"\n\n`;
      });

      if (activeQuote) {
         const story = STORY_ARCHIVE[activeQuote.title];
         if (story) {
            memoriesContext += `[USER IS REPLYING TO SPECIFIC STORY]\nTITLE: "${activeQuote.title}"\nFULL CONTENT: "${story.transcript}"\n\n`;
         }
      }

      const regex = /@([\w\s'-]+?)(?=\s|$|[.!?])/g;
      let match;
      while ((match = regex.exec(textToSend)) !== null) {
        const potentialTitle = match[1];
        if (member.featuredStories.includes(potentialTitle) || STORY_ARCHIVE[potentialTitle]) {
           const story = STORY_ARCHIVE[potentialTitle];
           if (story) memoriesContext += `[REFERENCED STORY: ${potentialTitle}]\nCONTENT: "${story.transcript}"\n\n`;
        }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Upgrade: Using Gemini 3 Pro for deeper persona understanding and context window
      const model = "gemini-3-pro-preview";
      
      let systemInstruction = "";

      if (member.isLiving) {
        systemInstruction = `You are an AI assistant helping a user explore the recorded life stories of ${member.name}, who is a LIVING family member.
        
        Context:
        ${memoriesContext}
        
        Rules:
        - Do NOT pretend to be ${member.name} directly. Do NOT use "I" to refer to them.
        - If the user attached/quoted a story, focus your answer specifically on that story's content.
        - Frame your responses as: "Based on that story..." or "${member.name} mentioned that..."
        - Keep responses conversational, warm, and concise (under 100 words).`;
      } else {
        systemInstruction = `You are embodying the preserved voice, memory, and personality of ${member.name}, who has passed away.
        
        Your Memories (and what others remember about you):
        ${memoriesContext}
        
        Rules:
        - Speak in the FIRST PERSON ("I remember...", "My husband and I...").
        - If asked about something not in your memories, gently say you don't recall that detail but pivot to a related memory you DO have.
        - If the user attached/quoted a story, react to it warmly.
        - Keep responses concise (under 100 words) and comforting.
        ${initialTopic ? `The user specifically wants to know about your experiences with: ${initialTopic}. Focus on that.` : ''}`;
      }

      const history: Content[] = messages
        .filter(m => m.text && !m.text.includes("...")) 
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }] 
        }));

      const chat = ai.chats.create({
        model: model,
        config: { systemInstruction },
        history: history
      });

      const result = await chat.sendMessage({ message: textToSend || "(User sent an attachment)" });
      
      if (result.text) {
        setMessages(prev => [...prev, { role: 'model', text: result.text }]);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Oh dear, the connection to the archives is a bit weak. Could you ask that again?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-darkBrown/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-cream w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex overflow-hidden relative border-4 border-warmBrown/30">
        
        {/* LEFT COLUMN: Sidebar */}
        <div className="hidden md:flex flex-col w-1/3 border-r border-warmBrown/20 bg-white/50">
          <div className="p-4 bg-warmBrown/10 border-b border-warmBrown/10">
            <h3 className="font-serif font-bold text-darkBrown flex items-center gap-2">
              <BookIcon className="w-5 h-5" />
              Available Stories
            </h3>
            <p className="text-xs text-warmBrown mt-1">Select to view or quote</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {member.featuredStories.map((story, idx) => {
              const type = getStoryType(story);
              const isPreviewing = activeStoryPreview === story;
              
              return (
                <div key={idx} className="group">
                  <button 
                    onClick={() => setActiveStoryPreview(isPreviewing ? null : story)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 shadow-sm
                      ${isPreviewing 
                        ? 'bg-white border-orange-400 ring-2 ring-orange-100' 
                        : 'bg-white border-warmBrown/10 hover:border-orange-300 hover:shadow-md'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${getStoryColor(type)}`}>
                         {type}
                       </span>
                       <span className="text-xs text-gray-400">{STORY_ARCHIVE[story]?.date}</span>
                    </div>
                    <div className="font-serif font-bold text-darkBrown">{story}</div>
                  </button>
                  
                  {/* Expanded Content Preview */}
                  {isPreviewing && (
                    <div className="mt-2 ml-2 p-3 bg-white border-l-2 border-orange-300 text-sm text-darkBrown/80 font-serif italic animate-in slide-in-from-top-2">
                      "{STORY_ARCHIVE[story]?.transcript.substring(0, 150)}..."
                      <button 
                        onClick={(e) => { e.stopPropagation(); attachStoryQuote(story); }}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-orange-100 text-orange-800 py-2 rounded-lg text-xs font-bold hover:bg-orange-200 transition-colors"
                      >
                         <PaperclipIcon className="w-3 h-3" />
                         Quote this Story
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Chat Area */}
        <div className="flex-1 flex flex-col relative bg-[#FDF6E3]">
          
          {/* Chat Header */}
          <div className={`
            p-4 flex items-center justify-between shadow-md z-10
            ${member.isLiving ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-warmBrown'}
          `}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-warmBrown border-2 border-white/50 relative">
                <UserIcon className="w-6 h-6" />
                {member.isLiving && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h3 className="font-serif font-bold text-white text-lg leading-none">
                  {member.name}
                </h3>
                <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1">
                   {member.isLiving ? (
                     <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online (Simulated)</span>
                   ) : (
                     <span className="italic">In Loving Memory</span>
                   )}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative pb-32">
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%238B7355' fill-opacity='0.2' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")` }}>
            </div>

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10`}>
                <div className={`max-w-[85%]`}>
                  {/* Render Quoted Snippet if exists */}
                  {msg.quote && (
                    <div className="mb-1 bg-white/50 p-2 rounded-lg border-l-4 border-orange-400 text-left shadow-sm">
                       <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-600 mb-0.5">
                          {getStoryIcon(msg.quote.type)}
                          {msg.quote.title}
                       </div>
                       <div className="text-xs italic text-darkBrown/70 line-clamp-2 font-serif">
                         "{msg.quote.snippet}"
                       </div>
                    </div>
                  )}

                  <div className={`
                    p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-orange-100 text-orange-900 rounded-tr-none border border-orange-200' 
                      : 'bg-white text-darkBrown rounded-tl-none border border-warmBrown/10 font-serif'}
                  `}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
               <div className="flex justify-start relative z-10">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-warmBrown/10 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-warmBrown/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-warmBrown/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-warmBrown/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Tag Dropdown Menu */}
          {showTagMenu && (
             <div className="absolute bottom-24 left-4 w-64 bg-white rounded-xl shadow-xl border border-warmBrown/20 overflow-hidden z-50 animate-in slide-in-from-bottom-2">
               <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500 border-b uppercase tracking-wider">
                 Quote a Story
               </div>
               <div className="max-h-48 overflow-y-auto">
                 {member.featuredStories.map((story, i) => (
                   <button 
                     key={i}
                     onClick={() => attachStoryQuote(story)}
                     className="w-full text-left px-4 py-2 hover:bg-orange-50 text-darkBrown text-sm flex items-center gap-2 truncate"
                   >
                     {getStoryIcon(getStoryType(story))}
                     {story}
                   </button>
                 ))}
               </div>
             </div>
          )}

          {/* Input Area Container */}
          <div className="bg-white border-t border-warmBrown/10">
            
            {/* WhatsApp-style Quote Preview Panel */}
            {activeQuote && (
              <div className="mx-4 mt-3 p-3 bg-gray-50 border-l-4 border-orange-400 rounded-r-lg flex justify-between items-center shadow-sm animate-in slide-in-from-bottom-2">
                <div className="flex-1 min-w-0 mr-2">
                   <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-orange-600 uppercase">Replying to story</span>
                      <span className={`text-[10px] px-1.5 rounded-full border ${getStoryColor(activeQuote.type)}`}>{activeQuote.type}</span>
                   </div>
                   <div className="font-serif font-bold text-sm text-darkBrown truncate">{activeQuote.title}</div>
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

            <form onSubmit={handleSendMessage} className="p-4 flex gap-2 relative">
              <div className="flex-1 relative">
                  <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder={activeQuote ? "Add your comment..." : "Message... type @ to quote a story"}
                      className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-10 py-3 focus:outline-none focus:border-warmBrown/50 focus:ring-1 focus:ring-warmBrown/50 text-darkBrown placeholder:text-gray-400"
                  />
                  <button 
                      type="button"
                      onClick={() => setShowTagMenu(!showTagMenu)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-warmBrown hover:bg-warmBrown/10 rounded-full transition-colors"
                      title="Attach Story Quote"
                  >
                      <PaperclipIcon className="w-5 h-5" />
                  </button>
              </div>
              <button 
                type="submit"
                disabled={(!inputText.trim() && !activeQuote) || isTyping}
                className="w-12 h-12 bg-warmBrown text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <SendIcon className="w-5 h-5 ml-0.5" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChatModal;