import React from 'react';
import { UserIcon } from './Icons';
import { FamilyMember } from '../App';
import { playClick } from '../utils/SoundEffects';

const PersonCard: React.FC<{ member: FamilyMember; onClick: (m: FamilyMember) => void }> = ({ member, onClick }) => {
  const handleClick = () => {
    playClick();
    onClick(member);
  };

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center group relative z-10 transition-transform duration-300 hover:-translate-y-3 hover:scale-105 focus:outline-none flex-shrink-0"
    >
      <div className={`
        w-24 h-24 md:w-32 md:h-32 rounded-full border-4 shadow-lg flex items-center justify-center mb-3 transition-all duration-300 relative overflow-hidden
        ${member.storiesCount > 0 
          ? 'bg-cream border-sepia group-hover:border-rosewood group-hover:shadow-xl' 
          : 'bg-gray-100 border-gray-300'}
      `}>
        {member.photoUrl ? (
          <img 
            src={member.photoUrl} 
            alt={member.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : member.storiesCount > 0 ? (
          <UserIcon className="w-12 h-12 md:w-16 md:h-16 text-sepia group-hover:text-rosewood transition-colors" />
        ) : (
           <UserIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
        )}

        {/* Status Indicator for Living Members */}
        {member.isLiving && member.storiesCount > 0 && (
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-sage border-2 border-white rounded-full shadow-sm z-20"></div>
        )}
      </div>
      
      {member.storiesCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-rosewood text-white text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full shadow-md border-2 border-white group-hover:scale-110 transition-transform z-30">
          {member.storiesCount}
        </div>
      )}

      <h3 className="font-serif font-bold text-lg md:text-xl text-darkBrown bg-white/80 px-3 py-1 rounded-lg backdrop-blur-sm group-hover:bg-white group-hover:shadow-sm transition-all whitespace-nowrap">
        {member.name}
      </h3>
    </button>
  );
};

export default PersonCard;