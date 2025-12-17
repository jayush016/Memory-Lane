import React, { useState } from 'react';
import { ArrowLeftIcon } from './Icons';
import { playClick } from '../utils/SoundEffects';
import { FAMILY_DATA, FamilyMember } from '../App';
import PersonCard from './PersonCard';
import DetailModal from './DetailModal';
import ChatModal from './ChatModal';

interface FamilyTreeScreenProps {
  onBack: () => void;
  onPlayStory: (storyTitle: string, authorName: string) => void;
  onUpdateMember?: (member: FamilyMember) => void;
}

const FamilyTreeScreen: React.FC<FamilyTreeScreenProps> = ({ onBack, onPlayStory, onUpdateMember }) => {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [chatMember, setChatMember] = useState<{ member: FamilyMember; topic?: string } | null>(null);

  const gen1 = FAMILY_DATA.filter(m => m.generation === 1);
  const gen2 = FAMILY_DATA.filter(m => m.generation === 2);
  const gen3 = FAMILY_DATA.filter(m => m.generation === 3);

  const handlePlay = (title: string, author: string) => {
    setSelectedMember(null); // Close modal
    onPlayStory(title, author);
  };

  const handleChat = (member: FamilyMember, topic?: string) => {
    // Close detail modal and open chat modal
    setSelectedMember(null);
    setChatMember({ member, topic });
  };

  const handleBack = () => {
    playClick();
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 md:p-8 animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* Navigation */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-8 z-10">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 px-6 py-3 bg-white/50 hover:bg-white/80 rounded-full text-warmBrown font-bold text-lg transition-colors border-2 border-warmBrown/20 shadow-sm hover:shadow-md"
        >
          <ArrowLeftIcon className="w-6 h-6" />
          <span>Back</span>
        </button>
        <h1 className="font-serif text-3xl font-bold text-darkBrown hidden md:block">The Family Tree</h1>
        <div className="w-24 hidden md:block"></div>
      </div>

      <main className="flex-1 w-full max-w-5xl relative flex flex-col justify-center py-12">
        
        {/* SVG Connector Lines Layer */}
        <div className="absolute inset-0 pointer-events-none hidden md:block">
          <svg className="w-full h-full" preserveAspectRatio="none">
             {/* Gen 1 Connection */}
             <path d="M40% 120 L 60% 120" stroke="#8B7355" strokeWidth="2" strokeDasharray="5,5" opacity="0.4" />
             
             {/* Gen 1 to Gen 2 Vertical */}
             <path d="M50% 120 L 50% 280" stroke="#8B7355" strokeWidth="2" opacity="0.4" />

             {/* Gen 2 Connection */}
             <path d="M40% 400 L 60% 400" stroke="#8B7355" strokeWidth="2" strokeDasharray="5,5" opacity="0.4" />
             
             {/* Gen 2 to Gen 3 Branching */}
             <path d="M50% 400 L 50% 550" stroke="#8B7355" strokeWidth="2" opacity="0.4" />
             <path d="M35% 640 L 50% 550 L 65% 640" stroke="#8B7355" strokeWidth="2" fill="none" opacity="0.4" />
          </svg>
        </div>

        {/* Generation 1: Grandparents */}
        <div className="flex justify-center gap-16 md:gap-32 mb-24 md:mb-32">
          {gen1.map(member => (
            <PersonCard key={member.id} member={member} onClick={setSelectedMember} />
          ))}
        </div>

        {/* Generation 2: Parents */}
        <div className="flex justify-center gap-16 md:gap-32 mb-24 md:mb-32">
          {gen2.map(member => (
            <PersonCard key={member.id} member={member} onClick={setSelectedMember} />
          ))}
        </div>

        {/* Generation 3: Children */}
        <div className="flex justify-center gap-12 md:gap-24">
          {gen3.map(member => (
            <PersonCard key={member.id} member={member} onClick={setSelectedMember} />
          ))}
        </div>

      </main>

      {/* Selected Member Detail Modal */}
      {selectedMember && (
        <DetailModal 
          member={selectedMember} 
          onClose={() => setSelectedMember(null)}
          onPlay={handlePlay}
          onChat={handleChat}
          onUpdateMember={onUpdateMember}
        />
      )}

      {/* Chat Interface Modal */}
      {chatMember && (
        <ChatModal 
          member={chatMember.member}
          initialTopic={chatMember.topic}
          onClose={() => setChatMember(null)}
        />
      )}

    </div>
  );
};

export default FamilyTreeScreen;