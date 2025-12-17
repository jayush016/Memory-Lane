import React, { useState } from 'react';
import { UserIcon, HeartIcon, ReplyIcon, SendIcon, WandIcon } from './Icons';
import { FAMILY_DATA, COMMENTS_ARCHIVE, Comment, STORY_ARCHIVE } from '../App';
import { playClick } from '../utils/SoundEffects';
import { GoogleGenAI } from "@google/genai";

interface CommentsSectionProps {
  targetId: string;
  contextTitle?: string; // For AI generation
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ targetId, contextTitle }) => {
  const [comments, setComments] = useState<Comment[]>(COMMENTS_ARCHIVE[targetId] || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const getAuthor = (id: string) => FAMILY_DATA.find(m => m.id === id);

  const handleLike = (commentId: string, isReply = false, parentId?: string) => {
    playClick();
    setComments(prev => prev.map(c => {
      if (isReply && parentId && c.id === parentId) {
        return {
          ...c,
          replies: c.replies.map(r => r.id === commentId ? { ...r, likes: r.likes + 1 } : r)
        };
      }
      if (c.id === commentId) {
        return { ...c, likes: c.likes + 1 };
      }
      return c;
    }));
  };

  const handleAddComment = (text: string, parentId?: string) => {
    if (!text.trim()) return;
    playClick();

    const newComment: Comment = {
      id: `new-${Date.now()}`,
      authorId: 'u-david', // Hardcoded as "You" for demo
      text: text,
      timestamp: 'Just now',
      likes: 0,
      replies: []
    };

    if (parentId) {
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          return { ...c, replies: [...c.replies, newComment] };
        }
        return c;
      }));
      setReplyingTo(null);
    } else {
      setComments(prev => [...prev, newComment]);
    }
    setNewCommentText("");
  };

  const generateAiComment = async () => {
    const deceasedMembers = FAMILY_DATA.filter(m => !m.isLiving);
    if (deceasedMembers.length === 0) return;
    
    // Pick a random deceased member relevant to context if possible
    // For simplicity, pick Grandma Margaret or Grandpa if not living
    const aiAuthor = deceasedMembers.find(m => m.id === 'g-margaret') || deceasedMembers[0];
    
    setIsGeneratingAi(true);
    playClick();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Upgrade: Use Gemini 3 Pro for better personality simulation
      const model = "gemini-3-pro-preview";
      
      const storyContext = contextTitle ? STORY_ARCHIVE[contextTitle]?.transcript : "A photo/memory in the gallery.";
      
      // Build broader context of this person's other stories to ensure consistency
      let personaContext = "";
      aiAuthor.featuredStories.forEach(title => {
         if (STORY_ARCHIVE[title]) {
            personaContext += `MY MEMORY (${title}): ${STORY_ARCHIVE[title].transcript.substring(0, 100)}...\n`;
         }
      });

      const prompt = `Generate a short, loving comment (under 20 words) from the perspective of ${aiAuthor.name} (who is deceased).
      
      CONTEXT OF ITEM BEING COMMENTED ON: 
      "${storyContext}"
      
      YOUR PERSONALITY/MEMORIES (To ensure voice match):
      ${personaContext}

      Tone: Warm, nostalgic, possibly funny.
      Use 1 emoji.
      Return ONLY the comment text.`;

      const result = await ai.models.generateContent({
        model,
        contents: prompt
      });

      if (result.text) {
        const aiComment: Comment = {
          id: `ai-${Date.now()}`,
          authorId: aiAuthor.id,
          text: result.text.trim(),
          timestamp: 'Just now',
          likes: 0,
          replies: [],
          isAiGenerated: true
        };
        setComments(prev => [...prev, aiComment]);
      }
    } catch (e) {
      console.error("AI Comment Error", e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const CommentItem: React.FC<{ comment: Comment, isReply?: boolean, parentId?: string }> = ({ comment, isReply, parentId }) => {
    const author = getAuthor(comment.authorId);
    
    return (
      <div className={`flex gap-3 ${isReply ? 'mt-3 ml-12' : 'mt-4'}`}>
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-cream border-2 border-warmBrown/20 flex items-center justify-center text-warmBrown overflow-hidden">
             {author ? (
               <span className="font-bold font-serif">{author.name.charAt(0)}</span>
             ) : (
               <UserIcon className="w-6 h-6" />
             )}
          </div>
        </div>
        <div className="flex-1">
          <div className="bg-white/60 p-3 rounded-2xl rounded-tl-none border border-warmBrown/10 shadow-sm relative group">
             <div className="flex justify-between items-baseline mb-1">
                <span className="font-bold text-darkBrown text-sm">
                  {author?.name} 
                  {comment.isAiGenerated && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI Memory</span>}
                </span>
                <span className="text-xs text-warmBrown/60">{comment.timestamp}</span>
             </div>
             <p className="text-darkBrown text-sm leading-relaxed">{comment.text}</p>
             
             {/* Actions */}
             <div className="flex gap-4 mt-2">
                <button 
                  onClick={() => handleLike(comment.id, isReply, parentId)}
                  className="flex items-center gap-1 text-xs font-bold text-warmBrown hover:text-red-500 transition-colors"
                >
                   <HeartIcon className="w-3 h-3" /> {comment.likes > 0 ? comment.likes : 'Like'}
                </button>
                {!isReply && (
                  <button 
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="flex items-center gap-1 text-xs font-bold text-warmBrown hover:text-indigo-600 transition-colors"
                  >
                     <ReplyIcon className="w-3 h-3" /> Reply
                  </button>
                )}
             </div>
          </div>

          {/* Reply Input */}
          {replyingTo === comment.id && !isReply && (
             <div className="mt-3 ml-4 flex gap-2 animate-in fade-in slide-in-from-top-2">
                <input 
                  type="text" 
                  placeholder="Write a reply..." 
                  className="flex-1 bg-white border border-warmBrown/20 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-warmBrown"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddComment((e.target as HTMLInputElement).value, comment.id);
                    }
                  }}
                  autoFocus
                />
             </div>
          )}

          {/* Render Replies */}
          {comment.replies && comment.replies.length > 0 && (
             <div>
                {comment.replies.map(reply => (
                   <CommentItem key={reply.id} comment={reply} isReply={true} parentId={comment.id} />
                ))}
             </div>
          )}
        </div>
      </div>
    );
  };

  const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="w-full">
       <div className="flex items-center justify-between mb-4 border-b border-warmBrown/10 pb-2">
          <h3 className="font-serif font-bold text-darkBrown">
             💬 Comments ({totalComments})
          </h3>
       </div>

       <div className="space-y-2 mb-6">
          {comments.map(comment => (
             <CommentItem key={comment.id} comment={comment} />
          ))}
          
          {comments.length === 0 && (
             <p className="text-center text-warmBrown/50 text-sm italic py-4">Be the first to share a thought.</p>
          )}
       </div>

       {/* Main Input */}
       <div className="flex gap-2 items-start bg-white p-3 rounded-2xl shadow-sm border border-warmBrown/10 relative">
          <textarea 
             value={newCommentText}
             onChange={(e) => setNewCommentText(e.target.value)}
             placeholder="Write a comment..." 
             className="flex-1 bg-transparent resize-none outline-none text-sm text-darkBrown min-h-[40px]"
             rows={2}
          />
          <button 
             onClick={() => handleAddComment(newCommentText)}
             disabled={!newCommentText.trim()}
             className="p-2 bg-warmBrown text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
             <SendIcon className="w-4 h-4" />
          </button>
       </div>
       
       {/* AI Participation Button */}
       {contextTitle && (
         <div className="mt-3 flex justify-end">
            <button 
               onClick={generateAiComment}
               disabled={isGeneratingAi}
               className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-full transition-colors border border-indigo-100"
            >
               <WandIcon className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin' : ''}`} />
               {isGeneratingAi ? 'Consulting Memories...' : 'What might Grandma say?'}
            </button>
         </div>
       )}
    </div>
  );
};

export default CommentsSection;