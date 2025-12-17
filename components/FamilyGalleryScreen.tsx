import React, { useState, useRef } from 'react';
import { 
  ArrowLeftIcon, PlusIcon, GridIcon, CalendarIcon, 
  UsersIcon, UploadIcon, CameraIcon, PlayIcon, 
  BookIcon, HeartIcon, XIcon, ImagePlusIcon,
  VideoIcon
} from './Icons';
import { ALBUMS, Album, MediaItem, ACTIVITY_FEED, FAMILY_DATA, STORY_ARCHIVE } from '../App';
import { playClick, playSuccess } from '../utils/SoundEffects';

interface FamilyGalleryScreenProps {
  onBack: () => void;
  initialAlbumId: string | null;
  onPlayStory: (title: string, author: string) => void;
}

const FamilyGalleryScreen: React.FC<FamilyGalleryScreenProps> = ({ onBack, initialAlbumId, onPlayStory }) => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(
    initialAlbumId ? ALBUMS.find(a => a.id === initialAlbumId) || null : null
  );
  const [albums, setAlbums] = useState<Album[]>(ALBUMS);
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  
  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleCreateAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) return;
    
    playSuccess();
    const newAlbum: Album = {
      id: `album-${Date.now()}`,
      title: newAlbumTitle,
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      coverUrl: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=800', // Default placeholder
      items: [],
      memberIds: []
    };
    
    setAlbums([newAlbum, ...albums]);
    setSelectedAlbum(newAlbum);
    setIsCreatingAlbum(false);
    setNewAlbumTitle("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAlbum) return;
    const files = e.target.files;
    
    if (files && files.length > 0) {
      playSuccess();
      const newItems: MediaItem[] = (Array.from(files) as File[]).map((file, i) => ({
        id: `new-${Date.now()}-${i}`,
        type: file.type.startsWith('video') ? 'video' : 'photo',
        url: URL.createObjectURL(file),
        caption: 'Uploaded just now',
        date: new Date().toISOString().split('T')[0],
        isFavorite: false
      }));
      
      const updatedAlbum = {
        ...selectedAlbum,
        items: [...newItems, ...selectedAlbum.items]
      };
      
      // Update in local state and list
      setSelectedAlbum(updatedAlbum);
      setAlbums(prev => prev.map(a => a.id === updatedAlbum.id ? updatedAlbum : a));
    }
  };

  // Find stories related to the selected album
  const relatedStories = selectedAlbum 
    ? Object.entries(STORY_ARCHIVE).filter(([_, story]) => story.relatedAlbumId === selectedAlbum.id)
    : [];

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FDF6E3] overflow-hidden animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-4 border-b border-warmBrown/20 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => selectedAlbum ? setSelectedAlbum(null) : onBack()} className="p-2 hover:bg-warmBrown/10 rounded-full transition-colors text-darkBrown">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="font-serif font-bold text-2xl text-darkBrown">
             {selectedAlbum ? selectedAlbum.title : "Shared Family Gallery"}
          </h1>
        </div>
        
        {!selectedAlbum && (
           <button 
             onClick={() => { playClick(); setIsCreatingAlbum(true); }}
             className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold shadow-md transition-colors text-sm"
           >
             <PlusIcon className="w-4 h-4" /> New Album
           </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
        
        {selectedAlbum ? (
          // --- ALBUM DETAIL VIEW ---
          <div className="max-w-6xl mx-auto animate-in slide-in-from-right duration-300">
             
             {/* Album Metadata */}
             <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="w-full md:w-64 aspect-square rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                   <img src={selectedAlbum.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 flex flex-col justify-end">
                   <h2 className="text-4xl md:text-5xl font-serif font-bold text-darkBrown mb-2">{selectedAlbum.title}</h2>
                   <div className="flex items-center gap-4 text-warmBrown mb-4">
                      <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> {selectedAlbum.date}</span>
                      <span className="flex items-center gap-1"><GridIcon className="w-4 h-4" /> {selectedAlbum.items.length} items</span>
                   </div>
                   
                   {/* Tagged Members */}
                   <div className="flex items-center gap-2 mb-6">
                      {selectedAlbum.memberIds.map(mid => {
                         const m = FAMILY_DATA.find(f => f.id === mid);
                         return m ? (
                           <div key={mid} className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-cream flex items-center justify-center text-[10px] font-bold text-warmBrown" title={m.name}>
                              {m.name.charAt(0)}
                           </div>
                         ) : null;
                      })}
                      <button className="w-8 h-8 rounded-full border-2 border-dashed border-warmBrown/30 flex items-center justify-center text-warmBrown/50 hover:bg-warmBrown/10 text-xs">+</button>
                   </div>

                   {/* Upload Action */}
                   <div className="flex gap-3">
                      <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="flex items-center gap-2 px-6 py-3 bg-darkBrown text-white rounded-full font-bold hover:bg-warmBrown transition-all shadow-md"
                      >
                         <UploadIcon className="w-5 h-5" /> Add Photos
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleFileUpload} />
                   </div>
                </div>
             </div>

             {/* Related Stories Section */}
             {relatedStories.length > 0 && (
                <div className="mb-8 bg-white/60 rounded-2xl p-6 border border-warmBrown/10">
                   <h3 className="font-serif font-bold text-xl text-darkBrown mb-4 flex items-center gap-2">
                      <BookIcon className="w-5 h-5" /> Related Stories
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {relatedStories.map(([title, story], idx) => {
                         const author = FAMILY_DATA.find(f => f.featuredStories.includes(title))?.name || "Unknown";
                         return (
                           <button 
                             key={idx}
                             onClick={() => { playClick(); onPlayStory(title, author); }}
                             className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-left group border border-transparent hover:border-orange-200"
                           >
                              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                 <PlayIcon className="w-5 h-5 ml-0.5" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-darkBrown group-hover:text-orange-700">{title}</h4>
                                 <p className="text-xs text-gray-500">Told by {author}</p>
                              </div>
                           </button>
                         );
                      })}
                   </div>
                </div>
             )}

             {/* Media Grid */}
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedAlbum.items.map((item) => (
                   <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                      {item.type === 'video' ? (
                         <div className="w-full h-full relative">
                            <video src={item.url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                               <PlayIcon className="w-8 h-8 text-white opacity-80" />
                            </div>
                         </div>
                      ) : (
                         <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                         <p className="text-white text-sm font-bold truncate">{item.caption}</p>
                         <p className="text-white/80 text-xs">{item.date}</p>
                      </div>
                   </div>
                ))}
                
                {/* Add Photo Card */}
                <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="aspect-square rounded-xl border-2 border-dashed border-warmBrown/30 flex flex-col items-center justify-center gap-2 text-warmBrown/50 hover:bg-white/50 hover:text-warmBrown transition-colors"
                >
                   <ImagePlusIcon className="w-8 h-8" />
                   <span className="font-bold text-sm">Add Media</span>
                </button>
             </div>

          </div>
        ) : (
          // --- ALBUM LIST VIEW ---
          <div className="max-w-6xl mx-auto">
             
             {/* Activity Feed */}
             <div className="mb-10">
                <h3 className="text-xs font-bold uppercase tracking-widest text-warmBrown mb-4 ml-1">Recent Activity</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                   {ACTIVITY_FEED.map((act) => (
                      <div key={act.id} className="min-w-[280px] bg-white p-4 rounded-xl shadow-sm border border-warmBrown/10 flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold font-serif">
                            {act.avatarChar}
                         </div>
                         <div>
                            <p className="text-sm text-darkBrown">
                               <span className="font-bold">{act.user}</span> {act.action}
                            </p>
                            <p className="text-xs font-bold text-pink-600 truncate max-w-[150px]">
                               {act.target}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">{act.time}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Albums Grid */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {albums.map((album) => (
                   <div 
                      key={album.id}
                      onClick={() => { playClick(); setSelectedAlbum(album); }}
                      className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border border-warmBrown/10"
                   >
                      <div className="aspect-[4/3] relative overflow-hidden">
                         <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                         <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-white font-serif font-bold text-2xl truncate shadow-sm">{album.title}</h3>
                            <p className="text-white/80 text-sm font-medium">{album.items.length} items</p>
                         </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                         <div className="flex -space-x-2">
                            {album.memberIds.slice(0, 4).map(mid => {
                               const m = FAMILY_DATA.find(f => f.id === mid);
                               return m ? (
                                  <div key={mid} className="w-8 h-8 rounded-full border-2 border-white bg-cream flex items-center justify-center text-[10px] font-bold text-warmBrown shadow-sm" title={m.name}>
                                     {m.name.charAt(0)}
                                  </div>
                               ) : null;
                            })}
                            {album.memberIds.length > 4 && (
                               <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm">
                                  +{album.memberIds.length - 4}
                               </div>
                            )}
                         </div>
                         <span className="text-xs text-gray-400 font-bold uppercase">{album.date}</span>
                      </div>
                   </div>
                ))}
             </div>

          </div>
        )}

      </div>

      {/* Create Album Modal */}
      {isCreatingAlbum && (
         <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif font-bold text-2xl text-darkBrown">New Album</h3>
                  <button onClick={() => setIsCreatingAlbum(false)} className="p-2 hover:bg-gray-100 rounded-full"><XIcon className="w-6 h-6" /></button>
               </div>
               <form onSubmit={handleCreateAlbum}>
                  <div className="space-y-4 mb-6">
                     <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Album Name</label>
                        <input 
                           type="text" 
                           value={newAlbumTitle}
                           onChange={(e) => setNewAlbumTitle(e.target.value)}
                           className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-serif text-lg"
                           placeholder="e.g. Summer Vacation 2024"
                           autoFocus
                        />
                     </div>
                  </div>
                  <button 
                     type="submit" 
                     className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-md transition-colors"
                  >
                     Create Album
                  </button>
               </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default FamilyGalleryScreen;