import React, { useState } from 'react';
import { MicrophoneIcon, TreeIcon, UsersIcon, GridIcon, ClockIcon, UserIcon, UserPlusIcon, XIcon, CheckIcon } from './Icons';
import { playClick, playSuccess } from '../utils/SoundEffects';
import { FamilyMember } from '../App';
import PersonCard from './PersonCard';
import DetailModal from './DetailModal';
import ChatModal from './ChatModal';

interface LandingPageProps {
  members: FamilyMember[];
  onAddMember: (member: FamilyMember) => void;
  onUpdateMember: (member: FamilyMember) => void;
  onShareClick: () => void;
  onExploreClick: () => void;
  onGatheringClick: () => void;
  onGalleryClick: () => void;
  onTimelineClick: () => void;
  onPlayStory: (storyTitle: string, authorName: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  members,
  onAddMember,
  onUpdateMember,
  onShareClick, 
  onExploreClick, 
  onGatheringClick, 
  onGalleryClick, 
  onTimelineClick,
  onPlayStory 
}) => {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [chatMember, setChatMember] = useState<{ member: FamilyMember; topic?: string } | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  
  // New Member Form State
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Relative");
  const [newIsLiving, setNewIsLiving] = useState(true);

  const handleClick = (action: () => void) => {
    playClick();
    action();
  };

  const handlePlay = (title: string, author: string) => {
    setSelectedMember(null);
    onPlayStory(title, author);
  };

  const handleChat = (member: FamilyMember, topic?: string) => {
    setSelectedMember(null);
    setChatMember({ member, topic });
  };

  const handleSubmitNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    playSuccess();
    const newMember: FamilyMember = {
       id: `new-${Date.now()}`,
       name: newName,
       role: newRole,
       isLiving: newIsLiving,
       storiesCount: 0,
       recipesCount: 0,
       lessonsCount: 0,
       featuredStories: [],
       generation: 2, // Defaulting to middle generation for simplicity
    };
    
    onAddMember(newMember);
    setShowAddMember(false);
    setNewName("");
    setNewRole("Relative");
    setNewIsLiving(true);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 md:p-8 overflow-hidden animate-in fade-in duration-500">
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-32 h-32 md:w-64 md:h-64 border-t-[16px] border-l-[16px] border-sepia/20 opacity-30 rounded-tl-[4rem] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 md:w-64 md:h-64 border-b-[16px] border-r-[16px] border-sepia/20 opacity-30 rounded-br-[4rem] pointer-events-none" />

      {/* Main Content Container */}
      <main className="max-w-6xl w-full flex flex-col items-center z-10 space-y-12 md:space-y-16 pb-12">
        
        {/* Header Section */}
        <header className="space-y-4 text-center mt-8">
          <div className="relative inline-block">
             <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-deepBlue opacity-30">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C7.5 2 4 6.5 4 10.5C4 14.5 9 19 12 22C15 19 20 14.5 20 10.5C20 6.5 16.5 2 12 2ZM12 4C15 4 17 6.5 17 9.5C17 11.5 15 14 12 17C9 14 7 11.5 7 9.5C7 6.5 9 4 12 4Z" fillOpacity="0.5"/>
                </svg>
             </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-deepBlue tracking-tight drop-shadow-sm">
              Memory Lane
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-darkBrown font-serif italic opacity-75">
            "Your stories deserve to live forever"
          </p>
        </header>

        {/* Share Memory Strip */}
        <button
          onClick={() => handleClick(onShareClick)}
          className="w-full max-w-4xl bg-white border-l-8 border-rosewood rounded-r-2xl p-6 shadow-md hover:shadow-xl hover:scale-[1.01] transition-all group flex items-center justify-between cursor-pointer relative overflow-hidden"
        >
           <div className="absolute inset-0 bg-rosewood/5 group-hover:bg-rosewood/10 transition-colors"></div>
           <div className="flex items-center gap-6 relative z-10">
              <div className="bg-rosewood text-white p-5 rounded-full shadow-md group-hover:bg-[#8A3A3C] transition-colors">
                 <MicrophoneIcon className="w-8 h-8" />
              </div>
              <div className="text-left">
                 <h2 className="text-2xl font-serif font-bold text-rosewood">Share a Memory</h2>
                 <p className="text-darkBrown/70 font-medium mt-1">Record a story for the archives today</p>
              </div>
           </div>
           <div className="hidden md:block pr-4 opacity-50 group-hover:opacity-100 transition-opacity relative z-10">
              <span className="text-4xl text-rosewood">➔</span>
           </div>
        </button>

        {/* Family Members Section */}
        <div className="w-full max-w-4xl">
           <div className="flex items-center justify-between mb-8 px-2 md:px-0">
              <h3 className="font-serif text-2xl font-bold text-deepBlue flex items-center gap-2">
                 <UserIcon className="w-6 h-6 text-sepia" /> The Family
              </h3>
              <button 
                 onClick={() => handleClick(onExploreClick)}
                 className="flex items-center gap-2 text-rosewood font-bold hover:text-darkBrown hover:bg-rosewood/10 px-3 py-1.5 rounded-full transition-all text-sm uppercase tracking-wide border border-rosewood/20 hover:border-rosewood/50 shadow-sm"
              >
                 <TreeIcon className="w-4 h-4" /> Explore Tree
              </button>
           </div>
           
           {/* Strict 3-Column Grid Layout */}
           <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 justify-items-center">
              {members.map(member => (
                 <div key={member.id} className="w-full flex justify-center transform transition-transform hover:z-20">
                    <PersonCard member={member} onClick={setSelectedMember} />
                 </div>
              ))}
              
              {/* Add Member Button Card */}
              <button 
                onClick={() => { playClick(); setShowAddMember(true); }}
                className="flex flex-col items-center justify-center w-full group relative z-10 hover:-translate-y-3 transition-transform duration-300"
              >
                 <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-dashed border-sepia/30 bg-white/50 flex items-center justify-center mb-3 group-hover:bg-white group-hover:border-rosewood/50 transition-colors">
                    <UserPlusIcon className="w-8 h-8 md:w-10 md:h-10 text-sepia/40 group-hover:text-rosewood" />
                 </div>
                 <h3 className="font-serif font-bold text-lg md:text-xl text-sepia/60 bg-white/40 px-3 py-1 rounded-lg backdrop-blur-sm group-hover:text-rosewood transition-colors">
                    Add Member
                 </h3>
              </button>
           </div>
        </div>

        {/* Bottom Feature Cards - Row */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-4">
          
          <button
            onClick={() => handleClick(onTimelineClick)}
            className="flex flex-col items-center justify-center p-6 bg-white border border-sepia/10 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="bg-sage/10 text-sage p-4 rounded-full mb-3 group-hover:bg-sage/20 transition-colors">
              <ClockIcon className="w-7 h-7" />
            </div>
            <span className="font-serif font-bold text-xl text-darkBrown">Timeline</span>
            <span className="text-xs text-sepia mt-1 uppercase tracking-wider font-bold">History in order</span>
          </button>

          <button
            onClick={() => handleClick(onGalleryClick)}
            className="flex flex-col items-center justify-center p-6 bg-white border border-sepia/10 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="bg-rosewood/10 text-rosewood p-4 rounded-full mb-3 group-hover:bg-rosewood/20 transition-colors">
              <GridIcon className="w-7 h-7" />
            </div>
            <span className="font-serif font-bold text-xl text-darkBrown">Gallery</span>
            <span className="text-xs text-sepia mt-1 uppercase tracking-wider font-bold">Photos & Videos</span>
          </button>

          <button
            onClick={() => handleClick(onGatheringClick)}
            className="flex flex-col items-center justify-center p-6 bg-white border border-sepia/10 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="bg-deepBlue/10 text-deepBlue p-4 rounded-full mb-3 group-hover:bg-deepBlue/20 transition-colors">
              <UsersIcon className="w-7 h-7" />
            </div>
            <span className="font-serif font-bold text-xl text-darkBrown">Gathering</span>
            <span className="text-xs text-sepia mt-1 uppercase tracking-wider font-bold">Family Chat</span>
          </button>

        </div>

        {/* Footer */}
        <div className="pt-4 opacity-50">
           <div className="h-px w-24 bg-sepia mx-auto mb-2"></div>
           <p className="text-xs font-sans font-bold tracking-widest text-sepia uppercase">
             Est. 2024
           </p>
        </div>

      </main>

      {/* Modals for Member Interaction */}
      {selectedMember && (
        <DetailModal 
          member={selectedMember} 
          onClose={() => setSelectedMember(null)}
          onPlay={handlePlay}
          onChat={handleChat}
          onUpdateMember={onUpdateMember}
        />
      )}

      {chatMember && (
        <ChatModal 
          member={chatMember.member}
          initialTopic={chatMember.topic}
          onClose={() => setChatMember(null)}
        />
      )}

      {/* Add Member Modal */}
      {showAddMember && (
         <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 relative">
               <button 
                  onClick={() => setShowAddMember(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-500"
               >
                  <XIcon className="w-6 h-6" />
               </button>
               
               <h3 className="font-serif font-bold text-2xl text-darkBrown mb-6 flex items-center gap-2">
                  <UserPlusIcon className="w-6 h-6 text-rosewood" /> Add Family Member
               </h3>
               
               <form onSubmit={handleSubmitNewMember} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Name</label>
                     <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosewood outline-none font-serif text-lg"
                        placeholder="e.g. Uncle Joe"
                        autoFocus
                     />
                  </div>
                  
                  <div>
                     <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Family Role</label>
                     <select 
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                     >
                        <option value="Relative">Relative</option>
                        <option value="Grandmother">Grandmother</option>
                        <option value="Grandfather">Grandfather</option>
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                        <option value="Aunt">Aunt</option>
                        <option value="Uncle">Uncle</option>
                        <option value="Sister">Sister</option>
                        <option value="Brother">Brother</option>
                        <option value="Cousin">Cousin</option>
                     </select>
                  </div>
                  
                  <div>
                     <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Status</label>
                     <div className="flex gap-4">
                        <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${newIsLiving ? 'bg-sage/10 border-sage/50 ring-1 ring-sage' : 'bg-white border-gray-200'}`}>
                           <input type="radio" className="hidden" checked={newIsLiving} onChange={() => setNewIsLiving(true)} />
                           <div className="flex items-center gap-2 justify-center">
                              <div className={`w-3 h-3 rounded-full ${newIsLiving ? 'bg-sage' : 'bg-gray-300'}`}></div>
                              <span className={`font-bold text-sm ${newIsLiving ? 'text-sage' : 'text-gray-500'}`}>Living</span>
                           </div>
                        </label>
                        <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${!newIsLiving ? 'bg-deepBlue/10 border-deepBlue/50 ring-1 ring-deepBlue' : 'bg-white border-gray-200'}`}>
                           <input type="radio" className="hidden" checked={!newIsLiving} onChange={() => setNewIsLiving(false)} />
                           <div className="flex items-center gap-2 justify-center">
                              <div className={`w-3 h-3 rounded-full ${!newIsLiving ? 'bg-deepBlue' : 'bg-gray-300'}`}></div>
                              <span className={`font-bold text-sm ${!newIsLiving ? 'text-deepBlue' : 'text-gray-500'}`}>Deceased</span>
                           </div>
                        </label>
                     </div>
                  </div>

                  <button 
                     type="submit" 
                     className="w-full py-4 bg-rosewood hover:bg-[#8A3A3C] text-white font-bold rounded-xl shadow-md transition-colors mt-2"
                  >
                     Add Member
                  </button>
               </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default LandingPage;