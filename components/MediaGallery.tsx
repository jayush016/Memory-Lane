import React, { useState, useRef, useEffect } from 'react';
import { 
  CameraIcon, VideoIcon, UploadIcon, XIcon, HeartIcon, 
  TrashIcon, MaximizeIcon, ChevronLeftIcon, ChevronRightIcon,
  DownloadIcon, PlayIcon, FilterIcon
} from './Icons';
import { MediaItem, FamilyMember, MEDIA_ARCHIVE } from '../App';
import { playClick, playSuccess } from '../utils/SoundEffects';
import CommentsSection from './CommentsSection';

interface MediaGalleryProps {
  member: FamilyMember;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ member }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video' | 'favorite'>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load initial data for this member
    // In a real app this would fetch from backend. Here we use the mock archive or empty array.
    setItems(MEDIA_ARCHIVE[member.id] || []);
  }, [member.id]);

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'favorite') return item.isFavorite;
    return item.type === filter;
  });

  // --- Upload Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      playSuccess();
      const newItems: MediaItem[] = (Array.from(files) as File[]).map((file, i) => ({
        id: `new-${Date.now()}-${i}`,
        type: file.type.startsWith('video') ? 'video' : 'photo',
        url: URL.createObjectURL(file),
        caption: file.name.split('.')[0],
        date: new Date().toISOString().split('T')[0],
        isFavorite: false
      }));
      setItems(prev => [...newItems, ...prev]);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please allow permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        
        playClick(); // Shutter sound
        
        const newItem: MediaItem = {
          id: `cam-${Date.now()}`,
          type: 'photo',
          url: dataUrl,
          caption: 'Captured Moment',
          date: new Date().toISOString().split('T')[0],
          isFavorite: false
        };
        setItems(prev => [newItem, ...prev]);
        stopCamera();
      }
    }
  };

  // --- Gallery Interactions ---

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClick();
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  const deleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this memory?")) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleItemClick = (item: MediaItem) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelectedItems(newSelected);
    } else {
      setLightboxItem(item);
    }
  };

  const navigateLightbox = (dir: 'prev' | 'next') => {
    if (!lightboxItem) return;
    const currentIndex = filteredItems.findIndex(i => i.id === lightboxItem.id);
    if (currentIndex === -1) return;
    
    let nextIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= filteredItems.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = filteredItems.length - 1;
    
    setLightboxItem(filteredItems[nextIndex]);
  };

  return (
    <div className="flex flex-col h-full bg-[#FDF6E3]">
      
      {/* Upload & Controls Header */}
      <div className="p-4 bg-white/50 border-b border-warmBrown/10 flex flex-col gap-4">
        
        {/* Drop Zone / Upload Actions */}
        {!isCameraOpen ? (
          <div 
            className="border-2 border-dashed border-warmBrown/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/80 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              // Mock drop handling
              alert("Dropped items would be processed here!");
            }}
          >
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               multiple 
               accept="image/*,video/*" 
               onChange={handleFileUpload} 
             />
             <div className="bg-orange-100 p-3 rounded-full text-orange-600 group-hover:scale-110 transition-transform">
               <UploadIcon className="w-6 h-6" />
             </div>
             <div className="text-center">
               <p className="font-bold text-darkBrown">Drop photos or videos here</p>
               <div className="flex gap-4 mt-2 justify-center text-sm">
                 <button 
                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                   className="text-warmBrown hover:text-orange-600 underline"
                 >
                   Choose from device
                 </button>
                 <span className="text-warmBrown/40">|</span>
                 <button 
                   onClick={(e) => { e.stopPropagation(); startCamera(); }}
                   className="text-warmBrown hover:text-orange-600 flex items-center gap-1"
                 >
                   <CameraIcon className="w-4 h-4" /> Take Photo
                 </button>
               </div>
             </div>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
             <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
             <canvas ref={canvasRef} className="hidden" />
             <div className="absolute bottom-4 flex gap-4">
                <button onClick={stopCamera} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full backdrop-blur-md">Cancel</button>
                <button onClick={capturePhoto} className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg border-4 border-white/50">
                  <CameraIcon className="w-6 h-6" />
                </button>
             </div>
          </div>
        )}

        {/* Filters & Batch Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
             <button 
               onClick={() => setFilter('all')}
               className={`px-3 py-1 rounded-full text-sm font-bold border transition-colors ${filter === 'all' ? 'bg-darkBrown text-white border-darkBrown' : 'bg-transparent text-darkBrown border-darkBrown/20 hover:bg-warmBrown/10'}`}
             >
               All
             </button>
             <button 
               onClick={() => setFilter('photo')}
               className={`px-3 py-1 rounded-full text-sm font-bold border transition-colors ${filter === 'photo' ? 'bg-darkBrown text-white border-darkBrown' : 'bg-transparent text-darkBrown border-darkBrown/20 hover:bg-warmBrown/10'}`}
             >
               Photos
             </button>
             <button 
               onClick={() => setFilter('video')}
               className={`px-3 py-1 rounded-full text-sm font-bold border transition-colors ${filter === 'video' ? 'bg-darkBrown text-white border-darkBrown' : 'bg-transparent text-darkBrown border-darkBrown/20 hover:bg-warmBrown/10'}`}
             >
               Videos
             </button>
             <button 
               onClick={() => setFilter('favorite')}
               className={`px-3 py-1 rounded-full text-sm font-bold border transition-colors flex items-center gap-1 ${filter === 'favorite' ? 'bg-red-500 text-white border-red-500' : 'bg-transparent text-red-500 border-red-200 hover:bg-red-50'}`}
             >
               <HeartIcon className="w-3 h-3" filled={true} /> Favorites
             </button>
          </div>
          
          <button 
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedItems(new Set());
            }}
            className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${isSelectionMode ? 'bg-indigo-100 text-indigo-700' : 'text-warmBrown hover:bg-warmBrown/10'}`}
          >
            {isSelectionMode ? 'Cancel Select' : 'Select Multiple'}
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-warmBrown/50 space-y-4">
             <div className="w-24 h-24 border-4 border-dashed border-warmBrown/30 rounded-xl flex items-center justify-center">
                <CameraIcon className="w-12 h-12" />
             </div>
             <p className="font-serif italic text-lg">No memories here yet. Add the first one!</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {filteredItems.map(item => (
              <div 
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`
                  break-inside-avoid relative group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer bg-white
                  ${isSelectionMode && selectedItems.has(item.id) ? 'ring-4 ring-indigo-500' : ''}
                `}
              >
                {item.type === 'video' ? (
                   <div className="relative">
                      <video src={item.url} className="w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10">
                         <div className="bg-white/80 p-2 rounded-full backdrop-blur-sm">
                            <PlayIcon className="w-6 h-6 text-darkBrown" />
                         </div>
                      </div>
                   </div>
                ) : (
                   <img src={item.url} alt={item.caption} className="w-full object-cover" loading="lazy" />
                )}
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                   <p className="text-white text-sm font-bold truncate">{item.caption}</p>
                   <p className="text-white/80 text-xs">{item.date}</p>
                   
                   <div className="absolute top-2 right-2 flex gap-2">
                      <button onClick={(e) => toggleFavorite(item.id, e)} className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 backdrop-blur-md text-white">
                         <HeartIcon className="w-4 h-4" filled={item.isFavorite} />
                      </button>
                      <button onClick={(e) => deleteItem(item.id, e)} className="p-1.5 bg-white/20 rounded-full hover:bg-red-500/80 backdrop-blur-md text-white">
                         <TrashIcon className="w-4 h-4" />
                      </button>
                   </div>
                </div>

                {/* Selection Checkbox */}
                {isSelectionMode && (
                   <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${selectedItems.has(item.id) ? 'bg-indigo-500' : 'bg-black/40'}`}>
                      {selectedItems.has(item.id) && <div className="w-3 h-3 bg-white rounded-full" />}
                   </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Lightbox Modal */}
      {lightboxItem && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col md:flex-row animate-in fade-in duration-200 overflow-hidden">
           
           {/* Close Button */}
           <button 
             onClick={() => setLightboxItem(null)}
             className="absolute top-4 right-4 z-50 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10"
           >
             <XIcon className="w-8 h-8" />
           </button>

           {/* Main Content Area */}
           <div className="flex-1 flex flex-col items-center justify-center relative bg-black">
              <div className="absolute top-4 left-4 text-white z-40">
                 <h3 className="font-bold text-lg">{lightboxItem.caption}</h3>
                 <p className="text-white/60 text-sm">{lightboxItem.date}</p>
              </div>

              <div className="flex-1 w-full flex items-center justify-between px-4 relative">
                 <button onClick={() => navigateLightbox('prev')} className="absolute left-4 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-40">
                    <ChevronLeftIcon className="w-10 h-10" />
                 </button>
                 
                 <div className="relative w-full h-full flex items-center justify-center p-8">
                    {lightboxItem.type === 'video' ? (
                       <video src={lightboxItem.url} controls autoPlay className="max-h-full max-w-full rounded-lg shadow-2xl" />
                    ) : (
                       <img src={lightboxItem.url} alt={lightboxItem.caption} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
                    )}
                 </div>

                 <button onClick={() => navigateLightbox('next')} className="absolute right-4 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-40">
                    <ChevronRightIcon className="w-10 h-10" />
                 </button>
              </div>

              {/* Lightbox Footer Actions */}
              <div className="w-full p-4 flex justify-center gap-6 bg-black/50 backdrop-blur-sm">
                 <button 
                   onClick={(e) => toggleFavorite(lightboxItem.id, e)}
                   className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${lightboxItem.isFavorite ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                 >
                    <HeartIcon className="w-5 h-5" filled={lightboxItem.isFavorite} />
                    {lightboxItem.isFavorite ? 'Favorited' : 'Favorite'}
                 </button>
                 <button className="flex items-center gap-2 px-6 py-3 rounded-full font-bold bg-white/10 text-white hover:bg-white/20 transition-all">
                    <DownloadIcon className="w-5 h-5" /> Download
                 </button>
              </div>
           </div>

           {/* Comments Sidebar (Desktop) / Bottom Sheet (Mobile) */}
           <div className="w-full md:w-96 bg-[#FDF6E3] border-l border-warmBrown/20 flex flex-col h-1/2 md:h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                 <CommentsSection targetId={lightboxItem.id} contextTitle={lightboxItem.caption} />
              </div>
           </div>

        </div>
      )}
    </div>
  );
};

export default MediaGallery;