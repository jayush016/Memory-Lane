import React from 'react';
import { HomeIcon, GridIcon, ClockIcon } from './Icons';

interface HeaderProps {
  onHomeClick: () => void;
  onGalleryClick?: () => void;
  onTimelineClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHomeClick, onGalleryClick, onTimelineClick }) => {
  return (
    <header className="w-full bg-cream/90 backdrop-blur-md border-b border-sepia/20 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        {/* Small Leaf Icon */}
        <div className="text-rosewood opacity-90">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C7.5 2 4 6.5 4 10.5C4 14.5 9 19 12 22C15 19 20 14.5 20 10.5C20 6.5 16.5 2 12 2ZM12 4C15 4 17 6.5 17 9.5C17 11.5 15 14 12 17C9 14 7 11.5 7 9.5C7 6.5 9 4 12 4Z" fillOpacity="0.8"/>
            </svg>
        </div>
        <h1 className="font-serif font-bold text-xl text-deepBlue tracking-wide">Memory Lane</h1>
      </div>
      
      <div className="flex items-center gap-2">
         {onTimelineClick && (
            <button
               onClick={onTimelineClick}
               className="p-2 text-darkBrown hover:bg-sepia/10 rounded-full transition-colors flex items-center gap-2"
               aria-label="Family Timeline"
            >
               <ClockIcon className="w-6 h-6" />
            </button>
         )}
         {onGalleryClick && (
            <button
               onClick={onGalleryClick}
               className="p-2 text-darkBrown hover:bg-sepia/10 rounded-full transition-colors flex items-center gap-2"
               aria-label="Family Gallery"
            >
               <GridIcon className="w-6 h-6" />
            </button>
         )}
         <button 
           onClick={onHomeClick}
           className="p-2 text-darkBrown hover:bg-sepia/10 rounded-full transition-colors flex items-center gap-2"
           aria-label="Go to Home"
         >
           <span className="hidden md:block font-serif text-sm font-bold text-darkBrown">Home</span>
           <HomeIcon className="w-6 h-6" />
         </button>
      </div>
    </header>
  );
};

export default Header;