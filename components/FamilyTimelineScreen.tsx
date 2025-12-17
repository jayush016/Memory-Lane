import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeftIcon, PlusIcon, FilterIcon, ClockIcon, 
  BabyIcon, RingIcon, GraduationCapIcon, BriefcaseIcon, 
  GlobeIcon, StarIcon, XIcon, PlayIcon, BookIcon, GridIcon,
  ZoomInIcon, MapPinIcon, PlaneIcon
} from './Icons';
import { 
  TimelineEvent, FAMILY_DATA, STORY_ARCHIVE, ALBUMS, FamilyMember 
} from '../App';
import { playClick, playSuccess } from '../utils/SoundEffects';

interface FamilyTimelineScreenProps {
  onBack: () => void;
  onPlayStory: (title: string, author: string) => void;
  onViewAlbum: (albumId: string) => void;
}

const HISTORICAL_EVENTS = [
  { year: 1945, title: "World War II Ends", type: 'historical', description: "The global conflict concludes, changing the world forever." },
  { year: 1969, title: "Moon Landing", type: 'historical', description: "Apollo 11 lands on the moon. 'One small step for man...'" },
  { year: 1989, title: "Berlin Wall Falls", type: 'historical', description: "Symbolic end of the Cold War era." },
  { year: 1963, title: "JFK Assassination", type: 'historical', description: "President John F. Kennedy is assassinated in Dallas." },
  { year: 2001, title: "September 11 Attacks", type: 'historical', description: "Major terrorist attacks in the US." },
  { year: 2020, title: "COVID-19 Pandemic", type: 'historical', description: "Global pandemic changes daily life worldwide." }
];

const FamilyTimelineScreen: React.FC<FamilyTimelineScreenProps> = ({ onBack, onPlayStory, onViewAlbum }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  
  // Filters
  const [showHistorical, setShowHistorical] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'year' | 'decade'>('year');
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  
  // Data Aggregation
  useEffect(() => {
    const allEvents: TimelineEvent[] = [];

    // 1. Births from Profiles
    FAMILY_DATA.forEach(member => {
      if (member.birthDate) {
        allEvents.push({
          id: `birth-${member.id}`,
          date: member.birthDate,
          year: parseInt(member.birthDate.split('-')[0]),
          title: `${member.name} is born`,
          type: 'birth',
          description: "A new branch on the family tree.",
          memberIds: [member.id]
        });
      }
    });

    // 2. Stories
    Object.entries(STORY_ARCHIVE).forEach(([title, story]) => {
      // Try to parse year from story.date (simple parsing)
      let year = 0;
      const yearMatch = story.date.match(/\d{4}/);
      if (yearMatch) {
        year = parseInt(yearMatch[0]);
      } else {
        return; // Skip if no year found
      }
      
      // Find author
      const authorMember = FAMILY_DATA.find(f => f.featuredStories.includes(title));
      
      allEvents.push({
        id: `story-${title.replace(/\s+/g, '-')}`,
        date: story.date,
        year: year,
        title: title,
        type: 'story',
        description: `Story recorded by ${authorMember ? authorMember.name : 'Family Member'}`,
        storyId: title, // Title serves as ID in this app structure
        albumId: story.relatedAlbumId,
        memberIds: story.mentionedMemberIds || []
      });
    });

    // 3. Albums
    ALBUMS.forEach(album => {
      let year = 0;
      const yearMatch = album.date.match(/\d{4}/);
      if (yearMatch) year = parseInt(yearMatch[0]);
      
      // Check if this album is ALREADY linked to a story (to avoid duplicates if desirable, but showing both is fine)
      
      allEvents.push({
        id: `album-${album.id}`,
        date: album.date,
        year: year || 2024,
        title: album.title,
        type: 'photo',
        description: `${album.items.length} photos & videos`,
        albumId: album.id,
        memberIds: album.memberIds
      });
    });

    // 4. Historical Events
    HISTORICAL_EVENTS.forEach(hist => {
      allEvents.push({
        id: `hist-${hist.year}`,
        date: `${hist.year}`,
        year: hist.year,
        title: hist.title,
        type: 'historical',
        description: hist.description
      });
    });

    // Sort Descending
    allEvents.sort((a, b) => b.year - a.year);
    setEvents(allEvents);
  }, []);

  // Filter Logic
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (!showHistorical && event.type === 'historical') return false;
      if (selectedPerson) {
        // Keep historical events for context if historical is ON
        if (event.type === 'historical') return true;
        // Otherwise require member match
        if (!event.memberIds || !event.memberIds.includes(selectedPerson)) return false;
      }
      return true;
    });
  }, [events, showHistorical, selectedPerson]);

  // Group by Year
  const groupedEvents = useMemo(() => {
    const groups: Record<number, TimelineEvent[]> = {};
    filteredEvents.forEach(e => {
      const y = e.year || 0;
      if (!groups[y]) groups[y] = [];
      groups[y].push(e);
    });
    return groups;
  }, [filteredEvents]);

  const years = Object.keys(groupedEvents).map(Number).sort((a, b) => b - a);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'birth': return <BabyIcon className="w-5 h-5" />;
      case 'wedding': return <RingIcon className="w-5 h-5" />;
      case 'story': return <BookIcon className="w-5 h-5" />;
      case 'photo': return <GridIcon className="w-5 h-5" />;
      case 'historical': return <GlobeIcon className="w-5 h-5" />;
      case 'milestone': return <StarIcon className="w-5 h-5" />;
      case 'passing': return <BriefcaseIcon className="w-5 h-5" />; // Using briefcase as generic placeholder
      default: return <StarIcon className="w-5 h-5" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'birth': return 'bg-pink-100 text-pink-600 border-pink-200';
      case 'wedding': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'story': return 'bg-indigo-100 text-indigo-600 border-indigo-200';
      case 'photo': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'historical': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-green-100 text-green-600 border-green-200';
    }
  };

  // Add Event Form State
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventYear, setNewEventYear] = useState(new Date().getFullYear());
  const [newEventType, setNewEventType] = useState<TimelineEvent['type']>('milestone');

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle) return;
    
    playSuccess();
    const newEvent: TimelineEvent = {
      id: `manual-${Date.now()}`,
      title: newEventTitle,
      year: newEventYear,
      date: `${newEventYear}`,
      type: newEventType,
      description: "Added manually by you"
    };

    setEvents(prev => [newEvent, ...prev].sort((a,b) => b.year - a.year));
    setIsAddEventOpen(false);
    setNewEventTitle("");
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FDF6E3] overflow-hidden animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-4 border-b border-warmBrown/20 flex flex-col md:flex-row gap-4 items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-warmBrown/10 rounded-full transition-colors text-darkBrown">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="font-serif font-bold text-2xl text-darkBrown flex items-center gap-2">
             <ClockIcon className="w-6 h-6" /> Family Timeline
          </h1>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 no-scrollbar">
           {/* Person Filter */}
           <select 
              value={selectedPerson || ''} 
              onChange={(e) => setSelectedPerson(e.target.value || null)}
              className="bg-white border border-warmBrown/20 text-warmBrown text-sm rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-warmBrown"
           >
              <option value="">All Family</option>
              {FAMILY_DATA.map(m => (
                 <option key={m.id} value={m.id}>{m.name}</option>
              ))}
           </select>
           
           {/* Historical Toggle */}
           <button 
             onClick={() => setShowHistorical(!showHistorical)}
             className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${showHistorical ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-400 border-gray-200'}`}
           >
             <GlobeIcon className="w-4 h-4" /> {showHistorical ? 'World Events ON' : 'World Events OFF'}
           </button>

           {/* Zoom Toggle */}
           <button 
             onClick={() => setZoomLevel(zoomLevel === 'year' ? 'decade' : 'year')}
             className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold border border-warmBrown/20 bg-white text-warmBrown hover:bg-warmBrown/5"
           >
             <ZoomInIcon className="w-4 h-4" /> {zoomLevel === 'year' ? 'Year View' : 'Decade View'}
           </button>

           <button 
             onClick={() => setIsAddEventOpen(true)}
             className="ml-auto md:ml-2 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold bg-pink-500 text-white shadow-md hover:bg-pink-600"
           >
             <PlusIcon className="w-4 h-4" /> Add
           </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 md:p-8">
        
        {/* Central Vertical Line */}
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-warmBrown/20 transform -translate-x-1/2 z-0"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {years.map((year, yearIdx) => {
             // If Decade view, group collapsing logic could go here, for now we show year headers prominently
             return (
               <div key={year} className="mb-12 relative">
                 
                 {/* Year Label */}
                 <div className="flex items-center mb-6">
                    <div className="hidden md:block w-1/2 pr-8 text-right"></div>
                    <div className="absolute left-8 md:left-1/2 transform -translate-x-1/2 flex items-center justify-center bg-warmBrown text-cream font-serif font-bold text-lg px-4 py-1 rounded-full shadow-md border-2 border-white">
                       {year}
                    </div>
                    <div className="md:w-1/2 pl-8"></div>
                 </div>

                 {/* Events for this Year */}
                 <div className="space-y-6">
                   {groupedEvents[year].map((event, idx) => {
                      const isLeft = idx % 2 === 0; // Alternate sides on desktop
                      return (
                        <div 
                           key={event.id}
                           className={`flex flex-col md:flex-row items-center md:items-start ${isLeft ? '' : 'md:flex-row-reverse'} relative group`}
                        >
                           {/* Desktop Spacer */}
                           <div className="hidden md:block md:w-1/2"></div>
                           
                           {/* Node Dot */}
                           <div 
                              className={`
                                absolute left-8 md:left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-125
                                ${event.type === 'historical' ? 'bg-gray-400' : 'bg-warmBrown'}
                              `}
                           ></div>

                           {/* Content Card */}
                           <div className={`
                              w-full md:w-[45%] ml-16 md:ml-0 
                              ${isLeft ? 'md:mr-auto md:pr-8 md:text-right' : 'md:ml-auto md:pl-8 md:text-left'}
                           `}>
                              <button
                                onClick={() => { playClick(); setSelectedEvent(event); }}
                                className={`
                                   w-full p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all bg-white text-left
                                   ${getEventColor(event.type)}
                                   ${isLeft ? 'md:text-right' : 'md:text-left'}
                                `}
                              >
                                 <div className={`flex items-center gap-2 mb-1 ${isLeft ? 'md:flex-row-reverse' : ''}`}>
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1">
                                       {getEventIcon(event.type)} {event.type}
                                    </span>
                                    {event.type === 'historical' && (
                                       <span className="text-[10px] bg-black/10 px-2 rounded-full">World Event</span>
                                    )}
                                 </div>
                                 <h3 className="font-serif font-bold text-lg text-darkBrown leading-tight mb-1">{event.title}</h3>
                                 <p className="text-sm opacity-80 line-clamp-2">{event.description}</p>
                                 
                                 {/* Contextual Links */}
                                 <div className={`flex gap-2 mt-2 ${isLeft ? 'md:justify-end' : ''}`}>
                                    {event.storyId && <span className="text-[10px] font-bold flex items-center gap-1"><BookIcon className="w-3 h-3"/> Story</span>}
                                    {event.albumId && <span className="text-[10px] font-bold flex items-center gap-1"><GridIcon className="w-3 h-3"/> Photos</span>}
                                 </div>
                              </button>
                           </div>
                        </div>
                      );
                   })}
                 </div>

               </div>
             );
          })}
          
          {years.length === 0 && (
             <div className="text-center py-20 opacity-50">
                <ClockIcon className="w-16 h-16 mx-auto mb-4 text-warmBrown" />
                <p className="text-xl font-serif text-warmBrown">No events found for this filter.</p>
             </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
              
              <div className={`p-6 border-b-4 ${getEventColor(selectedEvent.type).split(' ')[2]}`}>
                 <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-full ${getEventColor(selectedEvent.type)} bg-opacity-20`}>
                       {getEventIcon(selectedEvent.type)}
                    </div>
                    <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-gray-100 rounded-full">
                       <XIcon className="w-6 h-6 text-gray-400" />
                    </button>
                 </div>
                 <h2 className="text-3xl font-serif font-bold text-darkBrown mt-4">{selectedEvent.title}</h2>
                 <p className="text-warmBrown font-bold uppercase tracking-widest text-sm mt-1">{selectedEvent.date}</p>
              </div>

              <div className="p-6 space-y-6">
                 <p className="text-lg text-gray-700 leading-relaxed">
                    {selectedEvent.description}
                 </p>

                 {/* Historical Context Extra */}
                 {selectedEvent.type === 'historical' && (
                    <div className="bg-gray-100 p-4 rounded-xl text-sm text-gray-600 italic border-l-2 border-gray-400">
                       "This event shaped the era in which the family lived."
                    </div>
                 )}

                 {/* Actions */}
                 <div className="grid grid-cols-1 gap-3">
                    {selectedEvent.storyId && (
                       <button 
                          onClick={() => { playClick(); onPlayStory(selectedEvent.title, "Family Member"); setSelectedEvent(null); }}
                          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                       >
                          <PlayIcon className="w-5 h-5" /> Listen to Story
                       </button>
                    )}
                    
                    {selectedEvent.albumId && (
                       <button 
                          onClick={() => { playClick(); onViewAlbum(selectedEvent.albumId!); setSelectedEvent(null); }}
                          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-orange-50 text-orange-700 font-bold hover:bg-orange-100 transition-colors"
                       >
                          <GridIcon className="w-5 h-5" /> View Photos ({ALBUMS.find(a => a.id === selectedEvent.albumId)?.items.length})
                       </button>
                    )}
                 </div>
              </div>

           </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddEventOpen && (
         <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif font-bold text-2xl text-darkBrown">Add Timeline Event</h3>
                  <button onClick={() => setIsAddEventOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><XIcon className="w-6 h-6" /></button>
               </div>
               <form onSubmit={handleAddEvent}>
                  <div className="space-y-4 mb-6">
                     <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Event Title</label>
                        <input 
                           type="text" 
                           value={newEventTitle}
                           onChange={(e) => setNewEventTitle(e.target.value)}
                           className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-serif text-lg"
                           placeholder="e.g. Moved to Chicago"
                           autoFocus
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Year</label>
                           <input 
                              type="number" 
                              value={newEventYear}
                              onChange={(e) => setNewEventYear(parseInt(e.target.value))}
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                           <select 
                              value={newEventType}
                              onChange={(e) => setNewEventType(e.target.value as any)}
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                           >
                              <option value="milestone">Milestone</option>
                              <option value="birth">Birth</option>
                              <option value="wedding">Wedding</option>
                              <option value="holiday">Holiday</option>
                              <option value="passing">Passing</option>
                           </select>
                        </div>
                     </div>
                  </div>
                  <button 
                     type="submit" 
                     className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-md transition-colors"
                  >
                     Add to Timeline
                  </button>
               </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default FamilyTimelineScreen;