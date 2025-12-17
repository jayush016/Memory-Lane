import React, { useState, useRef, useMemo } from 'react';
import { XIcon, PlayIcon, BookIcon, ChatBubbleIcon, PhoneIcon, WandIcon, UsersIcon, LightbulbIcon, CameraIcon, CheckIcon, UserIcon, UtensilsIcon } from './Icons';
import { STORY_ARCHIVE, FAMILY_DATA, FamilyMember } from '../App';
import { playClick } from '../utils/SoundEffects';
import MediaGallery from './MediaGallery'; 
import MemorialVideoGenerator from './MemorialVideoGenerator';

const DetailModal: React.FC<{ 
  member: FamilyMember; 
  onClose: () => void;
  onPlay: (title: string, author: string) => void;
  onChat: (member: FamilyMember, topic?: string) => void;
  onUpdateMember?: (member: FamilyMember) => void;
}> = ({ member, onClose, onPlay, onChat, onUpdateMember }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'gallery' | 'mentions'>('profile');
  const [selectedCategory, setSelectedCategory] = useState<'stories' | 'custom' | 'lessons'>('stories');
  
  const [showMemorialGenerator, setShowMemorialGenerator] = useState(false);
  const [requestTopic, setRequestTopic] = useState("");
  const [requestedTopics, setRequestedTopics] = useState<Set<string>>(new Set());
  
  // Profile Photo Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter stories where this member is mentioned
  const storiesAboutThem = Object.entries(STORY_ARCHIVE)
    .filter(([_, data]) => data.mentionedMemberIds?.includes(member.id))
    .map(([title, data]) => {
      // Find author name
      const author = FAMILY_DATA.find(f => f.featuredStories.includes(title));
      return {
        title,
        ...data,
        authorName: author ? author.name : "Unknown Family Member"
      };
    });

  // Categorize Featured Stories
  const categorizedStories = useMemo(() => {
     const customLabel = (member.customCategoryLabel || 'Recipes').toLowerCase();
     const isProjectOrAdventure = customLabel.includes('project') || customLabel.includes('adventure') || customLabel.includes('hobby');

     return member.featuredStories.reduce((acc, title) => {
        const lower = title.toLowerCase();
        
        // Custom Category Logic (Recipes OR Projects)
        let isCustom = false;
        if (isProjectOrAdventure) {
           if (lower.includes('build') || lower.includes('fish') || lower.includes('win') || lower.includes('champ') || lower.includes('travel') || lower.includes('backpack') || lower.includes('house')) isCustom = true;
        } else {
           // Default Recipe Logic
           if (lower.includes('pie') || lower.includes('recipe') || lower.includes('cook') || lower.includes('food') || lower.includes('dinner')) isCustom = true;
        }

        // Lesson Logic
        let isLesson = false;
        if (lower.includes('advice') || lower.includes('lesson') || lower.includes('learn') || lower.includes('job') || lower.includes('navy') || lower.includes('war') || lower.includes('college')) isLesson = true;

        if (isCustom) acc.custom.push(title);
        else if (isLesson) acc.lessons.push(title);
        else acc.stories.push(title); // Default fallback

        return acc;
     }, { stories: [] as string[], custom: [] as string[], lessons: [] as string[] });
  }, [member]);

  const activeStoriesList = categorizedStories[selectedCategory];
  const customLabel = member.customCategoryLabel || "Recipes";

  const handleMessageDirectly = () => {
    playClick();
    alert(`Opening messaging app to text ${member.name}...`);
  };

  const handleCreateMemorial = () => {
    playClick();
    setShowMemorialGenerator(true);
  };

  const handleTopicRequest = () => {
    if (!requestTopic.trim()) return;
    playClick();
    if (member.isLiving) {
       // Simulate request sent
       setRequestedTopics(prev => new Set(prev).add(requestTopic));
       setRequestTopic("");
       // In a real app we'd show a success toast
    } else {
       // Open chat with topic
       onChat(member, requestTopic);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateMember) {
       const reader = new FileReader();
       reader.onload = () => {
          const updatedMember = { ...member, photoUrl: reader.result as string };
          onUpdateMember(updatedMember);
          playClick();
       };
       reader.readAsDataURL(file);
    }
  };

  if (showMemorialGenerator) {
    return (
      <MemorialVideoGenerator 
        member={member} 
        onClose={() => setShowMemorialGenerator(false)} 
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkBrown/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#FDF6E3] w-full max-w-lg md:max-w-2xl lg:max-w-4xl rounded-3xl shadow-2xl relative overflow-hidden border border-warmBrown/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Texture Overlay */}
         <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%238B7355' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")` }}>
         </div>

        {/* Modal Header / Tabs */}
        <div className="flex items-center justify-between p-4 border-b border-warmBrown/20 bg-white/50 backdrop-blur-md relative z-20">
           <div className="flex gap-2 md:gap-4 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`text-sm md:text-lg font-serif font-bold px-3 md:px-4 py-2 rounded-full transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-warmBrown text-white shadow-md' : 'text-warmBrown hover:bg-warmBrown/10'}`}
              >
                Profile
              </button>
              <button 
                onClick={() => setActiveTab('mentions')}
                className={`text-sm md:text-lg font-serif font-bold px-3 md:px-4 py-2 rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'mentions' ? 'bg-warmBrown text-white shadow-md' : 'text-warmBrown hover:bg-warmBrown/10'}`}
              >
                <UsersIcon className="w-5 h-5" />
                Stories About Them
              </button>
              <button 
                onClick={() => setActiveTab('gallery')}
                className={`text-sm md:text-lg font-serif font-bold px-3 md:px-4 py-2 rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'gallery' ? 'bg-warmBrown text-white shadow-md' : 'text-warmBrown hover:bg-warmBrown/10'}`}
              >
                <CameraIcon className="w-5 h-5" />
                Gallery
              </button>
           </div>
           <button 
            onClick={() => { playClick(); onClose(); }}
            className="p-2 text-warmBrown hover:bg-warmBrown/10 rounded-full transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <XIcon className="w-8 h-8" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          
          {activeTab === 'profile' && (
            <div className="p-6 md:p-8">
              <div className="flex flex-col items-center mb-6">
                {/* Profile Picture with Upload Overlay */}
                <div className="relative group/avatar cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-warmBrown/10 border-4 border-warmBrown flex items-center justify-center mb-4 text-warmBrown shadow-inner overflow-hidden relative">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-12 h-12" />
                    )}
                    
                    {/* Hover Overlay for Upload */}
                    <div 
                       onClick={() => fileInputRef.current?.click()}
                       className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                    >
                       <CameraIcon className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                  </div>
                  
                  {/* Hidden File Input */}
                  <input 
                     type="file" 
                     ref={fileInputRef}
                     className="hidden" 
                     accept="image/*"
                     onChange={handlePhotoUpload}
                  />

                  {member.isLiving && (
                      <div className="absolute bottom-4 right-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-cream shadow-sm pointer-events-none">
                        Active
                      </div>
                  )}
                </div>
                
                <h2 className="font-serif text-3xl font-bold text-darkBrown text-center">{member.name}</h2>
                <span className="text-warmBrown font-medium uppercase tracking-widest text-sm mt-1 mb-4">{member.role}</span>
                
                {/* Minimized Action Buttons */}
                <div className="flex items-center justify-center gap-6 mt-2">
                    {member.featuredStories.length > 0 && member.role !== 'Me' && (
                       <button onClick={() => { playClick(); onChat(member); }} className="flex flex-col items-center gap-1 group" title="Chat with Stories">
                          <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shadow-md group-hover:bg-teal-600 group-hover:text-white transition-all transform group-hover:scale-105">
                             <ChatBubbleIcon className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide group-hover:text-teal-800">Chat</span>
                       </button>
                    )}
                    
                    {member.isLiving && member.role !== 'Me' && (
                       <button onClick={handleMessageDirectly} className="flex flex-col items-center gap-1 group" title="Message Directly">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-md group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:scale-105">
                             <PhoneIcon className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide group-hover:text-emerald-800">Call</span>
                       </button>
                    )}

                    {!member.isLiving && (
                       <button onClick={handleCreateMemorial} className="flex flex-col items-center gap-1 group" title="Create Memorial">
                          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-md group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:scale-105">
                             <WandIcon className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide group-hover:text-indigo-800">Memorial</span>
                       </button>
                    )}
                </div>
              </div>

              {/* Interactive Category Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-6 bg-white/50 p-2 rounded-2xl border border-warmBrown/10 shadow-sm max-w-lg mx-auto">
                
                <button 
                  onClick={() => { playClick(); setSelectedCategory('stories'); }}
                  className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${selectedCategory === 'stories' ? 'bg-white shadow-md text-darkBrown' : 'hover:bg-white/50 text-warmBrown'}`}
                >
                  <div className="text-xl font-bold">{member.storiesCount}</div>
                  <div className="text-[10px] uppercase tracking-wider font-bold">Stories</div>
                </button>

                <button 
                  onClick={() => { playClick(); setSelectedCategory('custom'); }}
                  className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${selectedCategory === 'custom' ? 'bg-white shadow-md text-darkBrown' : 'hover:bg-white/50 text-warmBrown'}`}
                >
                  <div className="text-xl font-bold">{member.recipesCount}</div>
                  <div className="text-[10px] uppercase tracking-wider font-bold">{customLabel}</div>
                </button>

                <button 
                  onClick={() => { playClick(); setSelectedCategory('lessons'); }}
                  className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${selectedCategory === 'lessons' ? 'bg-white shadow-md text-darkBrown' : 'hover:bg-white/50 text-warmBrown'}`}
                >
                  <div className="text-xl font-bold">{member.lessonsCount}</div>
                  <div className="text-[10px] uppercase tracking-wider font-bold">Lessons</div>
                </button>

              </div>

              <div className="space-y-4 max-w-lg mx-auto mb-8 animate-in slide-in-from-bottom-2 duration-300">
                <h3 className="font-serif text-xl text-darkBrown flex items-center gap-2 px-1">
                  {selectedCategory === 'stories' && <BookIcon className="w-5 h-5 text-sepia" />}
                  {selectedCategory === 'custom' && (member.customCategoryLabel ? <LightbulbIcon className="w-5 h-5 text-sepia" /> : <UtensilsIcon className="w-5 h-5 text-sepia" />)}
                  {selectedCategory === 'lessons' && <LightbulbIcon className="w-5 h-5 text-sepia" />}
                  
                  <span>
                     {selectedCategory === 'stories' && "Recorded Memories"}
                     {selectedCategory === 'custom' && `${customLabel} & Skills`}
                     {selectedCategory === 'lessons' && "Life Lessons"}
                  </span>
                </h3>
                
                <div className="space-y-3">
                  {activeStoriesList.length > 0 ? (
                    activeStoriesList.map((story, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => { playClick(); onPlay(story, member.name); }}
                        className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-warmBrown/10 hover:border-orange-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 group cursor-pointer text-left"
                      >
                        <span className="text-darkBrown font-serif text-lg font-medium truncate pr-4">{story}</span>
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0 shadow-sm">
                          <PlayIcon className="w-5 h-5 ml-0.5" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center bg-warmBrown/5 rounded-xl border border-dashed border-warmBrown/20 flex flex-col items-center gap-2">
                      <span className="text-2xl">📭</span>
                      <p className="text-warmBrown/60 italic text-sm">
                         No {selectedCategory === 'custom' ? customLabel.toLowerCase() : selectedCategory} recorded yet.
                      </p>
                      <p className="text-[10px] text-warmBrown/40">
                         Ask {member.name.split(' ')[0]} to share one!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Learn From / Request Topic */}
              <div className="bg-white/60 p-5 rounded-2xl border border-warmBrown/20 shadow-sm max-w-lg mx-auto">
                <h3 className="font-serif text-lg text-darkBrown flex items-center gap-2 mb-3">
                    <LightbulbIcon className="w-5 h-5 text-amber-500" />
                    <span>Request a Story / Ask about a Topic</span>
                </h3>
                <div className="flex gap-2">
                    <input 
                       type="text" 
                       value={requestTopic}
                       onChange={(e) => setRequestTopic(e.target.value)}
                       placeholder={member.isLiving ? "e.g. How did you buy your first house?" : "Ask about a specific memory..."}
                       className="flex-1 px-4 py-3 rounded-xl border border-warmBrown/20 focus:outline-none focus:ring-2 focus:ring-warmBrown/50 text-darkBrown bg-white text-sm"
                    />
                    <button 
                       onClick={handleTopicRequest}
                       disabled={!requestTopic.trim()}
                       className="px-6 py-2 bg-warmBrown text-white rounded-xl font-bold text-sm hover:bg-darkBrown transition-colors disabled:opacity-50 shadow-sm"
                    >
                       {member.isLiving ? 'Request' : 'Ask'}
                    </button>
                </div>
                {member.isLiving && requestedTopics.size > 0 && (
                   <div className="mt-3 flex flex-wrap gap-2">
                      {Array.from(requestedTopics).map((t, i) => (
                         <span key={i} className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1 animate-in fade-in">
                            Requested: {t} <CheckIcon className="w-3 h-3" />
                         </span>
                      ))}
                   </div>
                )}
                {member.isLiving && (
                    <p className="text-[10px] text-warmBrown/60 mt-2 italic text-center">
                       This will send a notification to {member.name.split(' ')[0]} to record a story about this.
                    </p>
                )}
              </div>

            </div>
          )}

          {activeTab === 'mentions' && (
             <div className="p-6 md:p-8">
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-8">
                     <h3 className="font-serif text-2xl font-bold text-darkBrown mb-2">Stories About {member.name.split(' ')[0]}</h3>
                     <p className="text-warmBrown">Memories shared by other family members</p>
                  </div>

                  <div className="space-y-4">
                    {storiesAboutThem.length > 0 ? (
                      storiesAboutThem.map((story, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-warmBrown/20 shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                Told By {story.authorName}
                              </span>
                              <span className="text-xs text-gray-400">{story.date}</span>
                           </div>
                           <h4 className="font-serif font-bold text-lg text-darkBrown mb-2">{story.title}</h4>
                           <p className="text-sm text-gray-600 font-serif italic line-clamp-3 mb-3">"{story.transcript}"</p>
                           <button 
                             onClick={() => { playClick(); onPlay(story.title, story.authorName); }}
                             className="text-sm font-bold text-warmBrown hover:text-orange-600 flex items-center gap-1"
                           >
                             <PlayIcon className="w-4 h-4" /> Listen to full story
                           </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center bg-white/50 rounded-xl border-2 border-dashed border-warmBrown/20">
                        <UsersIcon className="w-12 h-12 text-warmBrown/30 mb-2" />
                        <p className="text-warmBrown/60 italic">No stories linked to {member.name} yet.</p>
                        <p className="text-xs text-warmBrown/40 mt-1">Tag them when recording a new story!</p>
                      </div>
                    )}
                  </div>
                </div>
             </div>
          )}

          {activeTab === 'gallery' && (
            <div className="h-full">
              <MediaGallery member={member} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DetailModal;