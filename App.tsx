import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import RecorderScreen from './components/RecorderScreen';
import StoryDisplay from './components/StoryDisplay';
import FamilyTreeScreen from './components/FamilyTreeScreen';
import FamilyGatheringScreen from './components/FamilyGatheringScreen';
import FamilyGalleryScreen from './components/FamilyGalleryScreen';
import FamilyTimelineScreen from './components/FamilyTimelineScreen';
import FamilyVideoCall from './components/FamilyVideoCall';
import Header from './components/Header';
import { playClick } from './utils/SoundEffects';
import { GoogleGenAI, Type } from "@google/genai";

type Screen = 'landing' | 'recorder' | 'story' | 'family-tree' | 'family-gathering' | 'gallery' | 'timeline' | 'video-call';

export interface StoryData {
  title: string;
  date: string;
  transcript: string;
  author: string;
  imageUrl?: string | null;
  mediaType?: 'audio' | 'video'; // New: Track if story is audio or video
  mediaBase64?: string; // New: Store the raw media for playback
  mediaMimeType?: string; // New: Store mime type
  mentionedMemberIds?: string[];
  relatedAlbumId?: string;
  contextCards: {
    icon: string;
    title: string;
    content: string;
    sourceUrl?: string; // New: Link to source if grounded
  }[];
}

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  storiesCount: number;
  recipesCount: number;
  lessonsCount: number;
  customCategoryLabel?: string; // New: Allow overriding "Recipes" to "Projects", "Adventures", etc.
  featuredStories: string[];
  generation: 1 | 2 | 3;
  isLiving: boolean;
  birthDate?: string; // YYYY-MM-DD
  photoUrl?: string;
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  caption: string;
  date: string;
  isFavorite: boolean;
  storyId?: string; // Optional link to a specific story
}

export interface Album {
  id: string;
  title: string;
  date: string; // "Christmas 2023" or "Dec 25, 2023"
  coverUrl: string;
  memberIds: string[]; // Who is tagged in this album
  items: MediaItem[];
}

export interface GalleryActivity {
  id: number;
  user: string;
  action: string; // "added 5 photos to"
  target: string; // "Christmas 2023"
  time: string; // "2h ago"
  avatarChar: string;
}

export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD or YYYY
  year: number;
  title: string;
  type: 'birth' | 'wedding' | 'story' | 'photo' | 'historical' | 'milestone' | 'passing' | 'holiday';
  description?: string;
  memberIds?: string[];
  storyId?: string;
  albumId?: string;
  icon?: string; // Emoji
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  timestamp: string;
  likes: number;
  replies: Comment[];
  isAiGenerated?: boolean;
}

export const FAMILY_DATA: FamilyMember[] = [
  {
    id: 'g-margaret',
    name: 'Grandma Margaret',
    role: 'Grandmother',
    storiesCount: 4,
    recipesCount: 3,
    lessonsCount: 2,
    featuredStories: [
      "The Moon Landing Memory",
      "The Summer of 1945",
      "Meeting Grandpa at the Dance",
      "My Mother's Apple Pie Secret", // Recipe
      "Sunday Roast Tradition", // Recipe
      "How to Knit a Scarf", // Lesson
      "The Secret Ingredient in My Stew", // Recipe
      "Patience in Hard Times", // Lesson
      "Living Through the Blackout" // Story
    ],
    generation: 1,
    isLiving: false,
    birthDate: '1945-08-14',
    photoUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'g-robert',
    name: 'Grandpa Robert',
    role: 'Grandfather',
    storiesCount: 3,
    recipesCount: 4, // Custom Label: Projects
    lessonsCount: 3,
    customCategoryLabel: 'Projects', 
    featuredStories: [
      "Building Our First House", // Project
      "Fishing Trips in Oregon", // Story
      "Life in the Navy", // Lesson/Story
      "How I Proposed", // Story
      "Fixing the Old Tractor", // Project
      "The Best Way to Sharpen a Knife", // Lesson
      "Building the Treehouse", // Project
      "Woodworking Basics", // Project
      "Financial Advice for Young Men", // Lesson
      "How to Read a Map" // Lesson
    ],
    generation: 1,
    isLiving: true,
    birthDate: '1944-03-12',
    photoUrl: 'https://images.unsplash.com/photo-1457449940276-e8deed18bfff?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'm-jennifer',
    name: 'Mom Jennifer',
    role: 'Mother',
    storiesCount: 5,
    recipesCount: 2,
    lessonsCount: 3,
    featuredStories: [
      "My First Day of College",
      "The Christmas Blizzard",
      "Backpacking through Europe",
      "The Day You Were Born", // Story (New)
      "My First Job at the Library", // Story (New)
      "Making the Perfect Lasagna", // Recipe
      "Breakfast Pancake Tradition", // Recipe (New)
      "Balancing Work and Family", // Lesson
      "Gardening with Patience", // Lesson (New)
      "The Art of Negotiation" // Lesson (New)
    ],
    generation: 2,
    isLiving: true,
    birthDate: '1970-05-22',
    photoUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'd-michael',
    name: 'Dad Michael',
    role: 'Father',
    storiesCount: 3,
    recipesCount: 3,
    lessonsCount: 4,
    customCategoryLabel: 'Adventures', 
    featuredStories: [
      "Winning the Championship",
      "Learning to Drive with Grandpa",
      "Our Wedding Day",
      "Camping in Yellowstone", // Adventure
      "Solo Trip to Alaska", // Adventure
      "Getting Lost in Paris", // Adventure (New)
      "How to Change a Tire", // Lesson
      "How to Tie a Tie", // Lesson (New)
      "Basic Home Plumbing", // Lesson (New)
      "Respect is Earned" // Lesson (New)
    ],
    generation: 2,
    isLiving: true,
    birthDate: '1968-11-04',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'u-david',
    name: 'You (David)',
    role: 'Me',
    storiesCount: 1,
    recipesCount: 0,
    lessonsCount: 0,
    featuredStories: [
      "My First Job"
    ],
    generation: 3,
    isLiving: true,
    birthDate: '1995-02-15',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 's-emma',
    name: 'Sister Emma',
    role: 'Sister',
    storiesCount: 2,
    recipesCount: 1,
    lessonsCount: 0,
    customCategoryLabel: 'Hobbies',
    featuredStories: [
      "My Graduation",
      "Saving the Stray Cat",
      "Painting Watercolors" // Hobby
    ],
    generation: 3,
    isLiving: true,
    birthDate: '1998-09-30',
    photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400'
  }
];

export const STORY_ARCHIVE: Record<string, { 
  date: string; 
  transcript: string; 
  mentionedMemberIds?: string[]; 
  relatedAlbumId?: string;
  mediaType?: 'audio' | 'video';
  mediaBase64?: string;
  mediaMimeType?: string;
}> = {
  // --- Grandma's Stories ---
  "The Moon Landing Memory": {
    date: "July 20, 1969",
    transcript: "I remember the summer of 1969 clearly. I was watching TV with my whole family in the living room. It was grainy black and white, but when Neil Armstrong stepped on the moon, the whole room went silent. My father, who was usually so stoic, had tears streaming down his face. He whispered, 'We did it.' I was only 12, but I understood that humanity had done something impossible.",
    mentionedMemberIds: []
  },
  "The Summer of 1945": {
    date: "August 14, 1945",
    transcript: "It was a hot summer day when we heard the news on the radio. The war was finally over. People ran into the streets of our small town, banging pots and pans. I had never seen my mother look so relieved, knowing my brother would be coming home soon. We danced in the street until the sun went down.",
    mentionedMemberIds: []
  },
  "Meeting Grandpa at the Dance": {
    date: "October 14, 1952",
    transcript: "It was the Fall Harvest Dance at the community center. I was wearing my favorite blue dress with the white collar. Robert—your grandpa—walked across the room. He was wearing a tie that was slightly crooked. He asked me to dance to 'Unforgettable' by Nat King Cole. He stepped on my toes twice, but he had such a kind smile that I didn't mind at all.",
    mentionedMemberIds: ['g-robert']
  },
  "My Mother's Apple Pie Secret": {
    date: "November 1948",
    transcript: "My mother was famous for her apple pies. Every Thanksgiving, the neighbors would ask for one. I was ten when she finally showed me the secret. It wasn't the apples—it was the spice blend. She used a pinch of cardamom along with the cinnamon. 'Just a whisper,' she would say. 'Enough to make them wonder why it tastes like magic.'",
    mentionedMemberIds: []
  },
  "Sunday Roast Tradition": {
    date: "1960s - Present",
    transcript: "Every Sunday at 2 PM, rain or shine. The key to the roast is searing it first in cast iron. Don't skip that step! And always let it rest for 20 minutes before carving. That's when we would go around the table and say one thing we were grateful for that week.",
    mentionedMemberIds: []
  },
  "How to Knit a Scarf": {
    date: "Winter 1975",
    transcript: "Knitting teaches you patience. You can't rush the yarn. Loop, swoop, and pull. If you drop a stitch, don't panic. Life is like that too—you can usually pick up where you left off if you just take a breath and look closely at the pattern.",
    mentionedMemberIds: []
  },
  "The Secret Ingredient in My Stew": {
    date: "October 1970",
    transcript: "Everyone asks why my beef stew is so rich. It's not just the broth. I add a small square of dark chocolate right at the end. It deepens the flavor without making it sweet. Your grandfather was skeptical the first time, but he licked the bowl clean!",
    mentionedMemberIds: ['g-robert']
  },
  "Patience in Hard Times": {
    date: "1980s Recession",
    transcript: "There were years when money was very tight. We clipped coupons and grew our own vegetables. I learned that you don't need expensive things to be happy. A warm meal and a loving family are the only true wealth. Everything else is just decoration.",
    mentionedMemberIds: []
  },
  "Living Through the Blackout": {
    date: "November 1965",
    transcript: "The great Northeast blackout! The lights just flickered and died. We lit candles and played cards for hours. Without the TV or radio distractions, we actually talked. I learned more about my parents that night than I had in years.",
    mentionedMemberIds: []
  },

  // --- Grandpa's Stories ---
  "Building Our First House": {
    date: "March 1955",
    transcript: "We bought a plot of land for $500. Can you imagine? I built most of that house with my own two hands on the weekends. Margaret would bring me lemonade and sandwiches. It wasn't perfect—the floor in the hallway had a slight slope—but it was ours. The day we hung the front door, we knew we had built a future.",
    mentionedMemberIds: ['g-margaret'],
    relatedAlbumId: 'album-house'
  },
  "Fishing Trips in Oregon": {
    date: "Summer 1960",
    transcript: "The Columbia River was cold that morning. The fog was so thick you could barely see the end of the boat. We sat there for four hours without a bite. Then, suddenly, my line went tight. It was a Chinook, bigger than any I'd ever seen. But the best part wasn't the fish; it was the quiet time sitting there with my own father, not saying a word but understanding everything.",
    mentionedMemberIds: [],
    relatedAlbumId: 'album-fishing'
  },
  "Life in the Navy": {
    date: "1951-1954",
    transcript: "I enlisted in '51. They shipped me out to San Diego first. The discipline was hard, but it taught me how to make a bed properly—something your grandmother appreciates to this day! I saw the ocean for the first time, vast and endless. It made me realize how small we are, and how important it is to protect what we have back home.",
    mentionedMemberIds: ['g-margaret']
  },
  "How I Proposed": {
    date: "February 14, 1953",
    transcript: "I had the ring in my pocket for three weeks. I was terrified I'd lose it. I took Margaret to that little Italian place on 4th Street. I was so nervous my hands were shaking. When I went to kneel, I knocked over the salt shaker. It rolled right off the table! We both laughed so hard, and that's when I knew it would be okay. I asked her right there amidst the spilled salt.",
    mentionedMemberIds: ['g-margaret']
  },
  "Fixing the Old Tractor": {
    date: "Summer 1972",
    transcript: "That old John Deere was stubborn. It broke down right in the middle of hay season. I didn't have money for a mechanic, so I got the manual. I took the carburetor apart piece by piece. It took me three days, but when that engine coughed to life, I felt like I could conquer the world. Never be afraid to get your hands dirty.",
    mentionedMemberIds: []
  },
  "The Best Way to Sharpen a Knife": {
    date: "1990",
    transcript: "Don't use those electric sharpeners; they eat the steel. Get a good whetstone. Soak it in water. Hold the blade at a 20-degree angle. It's a rhythm—shhhk, shhhk. Consistent pressure. A sharp knife is safer than a dull one, remember that.",
    mentionedMemberIds: []
  },
  "Building the Treehouse": {
    date: "Summer 1995",
    transcript: "Your dad wanted a treehouse, so we found the biggest oak in the yard. We used reclaimed wood from the old barn. I let him hammer the nails—he hit his thumb once or twice, but he learned. That treehouse stood for 20 years.",
    mentionedMemberIds: ['d-michael']
  },
  "Woodworking Basics": {
    date: "1980",
    transcript: "Measure twice, cut once. It's the oldest rule in the book for a reason. And always sand with the grain, never against it. If you rush the finish, you ruin the work.",
    mentionedMemberIds: []
  },
  "Financial Advice for Young Men": {
    date: "1965",
    transcript: "Pay yourself first. Put 10% of every paycheck into savings before you pay a single bill. It seems hard, but compound interest is the eighth wonder of the world. I drove an old truck so I could retire early.",
    mentionedMemberIds: []
  },
  "How to Read a Map": {
    date: "Summer 1985",
    transcript: "GPS is fine, but batteries die. A paper map never loses signal. Orient it North. Look for the contour lines—if they're close together, it's steep. Knowing where you are without a screen is a freedom most people don't have anymore.",
    mentionedMemberIds: []
  },

  // --- Mom's Stories ---
  "My First Day of College": {
    date: "September 1984",
    transcript: "I drove my beat-up Honda Civic all the way to the University of Washington. It was raining, of course. I hauled a trunk full of sweaters up three flights of stairs to my dorm. I didn't know a soul. But that first night, a girl down the hall offered me some popcorn. That was your Aunt Sarah. We've been best friends ever since.",
    mentionedMemberIds: []
  },
  "The Christmas Blizzard": {
    date: "December 25, 1989",
    transcript: "We were snowed in for three days. The power went out on Christmas Eve. We had to cook the turkey in the fireplace! We huddled under blankets, played board games by candlelight, and told stories. It was the coldest Christmas on record, but it remains the warmest memory I have of my childhood home.",
    mentionedMemberIds: ['d-michael'],
    relatedAlbumId: 'album-xmas89'
  },
  "Backpacking through Europe": {
    date: "June 1990",
    transcript: "I had a EuroRail pass and a backpack that weighed a ton. I slept on overnight trains to save money on hotels. In Florence, I got lost and ended up sharing pizza with a group of art students near the Duomo. The freedom of just waking up and deciding which country to visit next—I've never felt anything like it since.",
    mentionedMemberIds: []
  },
  "The Day You Were Born": {
    date: "February 15, 1995",
    transcript: "It was a Tuesday morning, and the forecast said rain, but it was sunny. We rushed to the hospital so fast Dad almost ran a red light! When the nurse finally handed you to me, all the chaos of the delivery room just faded away. You were so small, looking up with those wide, dark eyes. I knew right then that my life had completely changed forever.",
    mentionedMemberIds: ['u-david', 'd-michael']
  },
  "My First Job at the Library": {
    date: "Summer 1986",
    transcript: "I spent my summer stacking books at the local library. It smelled of old paper and dust, a smell I still love. The head librarian, Mrs. Gable, was terrifying about the Dewey Decimal System. But I learned to love the silence. It was there, hiding in the biographies section, that I decided I wanted to study history.",
    mentionedMemberIds: []
  },
  "Making the Perfect Lasagna": {
    date: "2005",
    transcript: "The secret is the béchamel sauce. Don't just use ricotta. Take the time to make a roux with butter and flour, then whisk in the milk with nutmeg. It makes the layers creamy and holds everything together.",
    mentionedMemberIds: []
  },
  "Breakfast Pancake Tradition": {
    date: "Saturdays 1998-2010",
    transcript: "You kids always woke up early on Saturdays. I'd drag myself out of bed and get the big cast iron skillet—the one Grandma Margaret gave me. The secret wasn't the mix; it was letting the batter sit for ten minutes so the baking powder could work. And we always added blueberries in the shape of a smiley face.",
    mentionedMemberIds: ['u-david', 's-emma']
  },
  "Balancing Work and Family": {
    date: "1998",
    transcript: "When I went back to work, I felt guilty leaving you kids. But I learned that quality matters more than quantity. When I was home, I was 100% home. No phone, no emails. Just us.",
    mentionedMemberIds: ['u-david', 's-emma']
  },
  "Gardening with Patience": {
    date: "Spring 2008",
    transcript: "I remember when you tried to pull the tulip shoot to make it grow faster. It just snapped. Gardening taught me that you can't force things to bloom. You prepare the soil, you water, you provide light, and then you wait. People are like that too. You have to give them space to grow in their own time.",
    mentionedMemberIds: ['s-emma']
  },
  "The Art of Negotiation": {
    date: "2002",
    transcript: "Toddlers are the toughest negotiators in the world. If you can convince a three-year-old to eat broccoli, you can handle any boardroom. The key is to make them think it was their idea. 'Do you want three pieces of broccoli or four?' suddenly gives them control, even though the outcome is the same.",
    mentionedMemberIds: ['u-david']
  },

  // --- Dad's Stories ---
  "Winning the Championship": {
    date: "November 1982",
    transcript: "State finals. We were down by two points with ten seconds left. Coach called a timeout and looked right at me. 'Mikey, take the shot.' My hands were sweating. We ran the play, I got the ball at the top of the key, and I just let it fly. The sound of the net snapping... the crowd erupting... I still dream about that sound.",
    mentionedMemberIds: []
  },
  "Learning to Drive with Grandpa": {
    date: "Summer 1980",
    transcript: "Grandpa Robert taught me in his old Ford truck. It had a stick shift that was stubborn as a mule. We were on a back road, and I stalled it on a hill. I was panicking, but Grandpa just chuckled. 'Easy does it, Michael. Feel the engine.' He had so much patience. That day he taught me more than just driving; he taught me how to stay calm.",
    mentionedMemberIds: ['g-robert']
  },
  "Our Wedding Day": {
    date: "June 20, 1992",
    transcript: "It was the hottest day of the year. The church didn't have air conditioning! But when I saw your mother walking down the aisle, the heat just vanished. She looked like an angel. I remember thinking, 'How did I get this lucky?' We danced to 'Unchained Melody' and I promised myself I'd make her laugh every single day.",
    mentionedMemberIds: ['m-jennifer'],
    relatedAlbumId: 'album-wedding'
  },
  "Camping in Yellowstone": {
    date: "July 2005",
    transcript: "We saw a bear! From a safe distance, of course. You kids were asleep in the back of the car, but your mom and I watched a grizzly cross the road right in front of us at dawn. It was majestic and terrifying.",
    mentionedMemberIds: ['m-jennifer']
  },
  "Solo Trip to Alaska": {
    date: "August 1991",
    transcript: "Before I met your mom, I rode my motorcycle to Alaska. The Alcan Highway was gravel back then. I got a flat tire in the middle of nowhere. A trucker stopped and helped me patch it. It taught me that people are generally good if you give them a chance.",
    mentionedMemberIds: []
  },
  "Getting Lost in Paris": {
    date: "June 1992",
    transcript: "On our honeymoon, I insisted I knew the way to the Eiffel Tower. I didn't. We ended up in a tiny neighborhood miles away. But we found this little bakery that wasn't in any guidebook and had the best croissants I've ever tasted. Sometimes the wrong turn leads to the best destination.",
    mentionedMemberIds: ['m-jennifer']
  },
  "How to Change a Tire": {
    date: "2010",
    transcript: "Loosen the lugs before you jack it up. That's the mistake everyone makes. Use the car's weight to break the seal. And never, ever put your body under the car while it's on the jack.",
    mentionedMemberIds: []
  },
  "How to Tie a Tie": {
    date: "May 2012",
    transcript: "I remember standing with you in the mirror before your prom. The Windsor knot is classic. Wide end over, around, up, and through. It's about symmetry. A man should know how to present himself. It's not about vanity; it's about respect for the occasion.",
    mentionedMemberIds: ['u-david']
  },
  "Basic Home Plumbing": {
    date: "2015",
    transcript: "Leaky faucets cost money. Always turn off the main water valve first—I learned that the hard way! Righty-tighty, lefty-loosey. And don't over-tighten the porcelain nuts, or they'll crack. Knowing how to fix your own house gives you a sense of ownership that paying a handyman never will.",
    mentionedMemberIds: []
  },
  "Respect is Earned": {
    date: "1985",
    transcript: "My high school coach, Coach Taylor, always said, 'Respect isn't given, it's earned.' You earn it by showing up early, leaving late, and doing the work when no one is watching. Character is what you do in the dark. I've tried to live by that my whole career.",
    mentionedMemberIds: []
  },

  // --- Other ---
  "My First Job": {
    date: "Summer 1998",
    transcript: "I was delivering newspapers at 5 AM. I had to wake up while it was still dark. I remember the smell of the fresh ink and the damp morning air. I saved every penny that summer to buy my first guitar. That job taught me that if you want something, you have to wake up early and go get it.",
    mentionedMemberIds: []
  },
  "My Graduation": {
    date: "June 2018",
    transcript: "Walking across that stage felt like crossing a finish line. I saw Mom and Dad in the stands, waving frantically. Dad was holding the camcorder like it was the 90s. I threw my cap so high I lost it in the crowd. It wasn't just about the diploma; it was about all the late nights and coffee that got me there.",
    mentionedMemberIds: ['m-jennifer', 'd-michael']
  },
  "Saving the Stray Cat": {
    date: "October 2010",
    transcript: "I found him under the porch during a thunderstorm. He was a tiny, soaking wet ball of orange fur. Mom said 'absolutely no pets,' but I dried him off with my favorite towel and hid him in my room. He purred so loud it gave us away. That was how we got Pumpkin. He's been part of the family for over a decade now.",
    mentionedMemberIds: ['m-jennifer']
  },
  "Painting Watercolors": {
    date: "Spring 2020",
    transcript: "I started painting birds during lockdown. I realized you don't have to paint every feather. You just paint the light and the shadow. It's relaxing, just watching the water move the pigment around the paper.",
    mentionedMemberIds: []
  }
};

export const ALBUMS: Album[] = [
  {
    id: 'album-xmas89',
    title: 'Christmas 1989',
    date: 'Dec 25, 1989',
    coverUrl: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&q=80&w=800', // Family Opening Gifts
    memberIds: ['m-jennifer', 'd-michael', 's-emma', 'u-david'],
    items: [
       { id: 'x1', type: 'photo', url: 'https://images.unsplash.com/photo-1516723237220-4e3c3933220b?auto=format&fit=crop&q=80&w=800', caption: 'Kids in Snow', date: '1989-12-25', isFavorite: true },
       { id: 'x2', type: 'photo', url: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&q=80&w=800', caption: 'Opening presents', date: '1989-12-25', isFavorite: false },
       { id: 'x3', type: 'photo', url: 'https://images.unsplash.com/photo-1576723616867-8b09337ba760?auto=format&fit=crop&q=80&w=800', caption: 'Family Dinner', date: '1989-12-24', isFavorite: false },
       { id: 'x4', type: 'photo', url: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&q=80&w=800', caption: 'By the Tree', date: '1989-12-25', isFavorite: false },
    ]
  },
  {
    id: 'album-wedding',
    title: 'Mom & Dad Wedding',
    date: 'June 20, 1992',
    coverUrl: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=800', // Classic Wedding Couple
    memberIds: ['m-jennifer', 'd-michael', 'g-margaret', 'g-robert'],
    items: [
      { id: 'w1', type: 'photo', url: 'https://images.unsplash.com/photo-1522673607200-1645062cd958?auto=format&fit=crop&q=80&w=800', caption: 'The Ceremony Group', date: '1992-06-20', isFavorite: true },
      { id: 'w2', type: 'photo', url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800', caption: 'First Dance', date: '1992-06-20', isFavorite: true },
      { id: 'w3', type: 'photo', url: 'https://images.unsplash.com/photo-1507915977619-6ccfe8003ae6?auto=format&fit=crop&q=80&w=800', caption: 'Cutting the Cake', date: '1992-06-20', isFavorite: false },
      { id: 'w4', type: 'photo', url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=800', caption: 'Just Married', date: '1992-06-20', isFavorite: true }
    ]
  },
  {
    id: 'album-house',
    title: 'The Old House',
    date: '1955 - 1980',
    coverUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=400',
    memberIds: ['g-margaret', 'g-robert'],
    items: [
      { id: 'h1', type: 'photo', url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800', caption: 'Front Porch', date: '1960-05-12', isFavorite: false }
    ]
  },
  {
    id: 'album-fishing',
    title: 'Fishing in Oregon',
    date: 'Summer 1960',
    coverUrl: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?auto=format&fit=crop&q=80&w=800', // People fishing
    memberIds: ['g-robert'],
    items: [
       { id: 'f1', type: 'photo', url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=800', caption: 'Camping Trip', date: '1960-07-04', isFavorite: true },
       { id: 'f2', type: 'photo', url: 'https://images.unsplash.com/photo-1496664444929-8c75efb9546f?auto=format&fit=crop&q=80&w=800', caption: 'Father and Son', date: '1960-07-05', isFavorite: true },
       { id: 'f3', type: 'photo', url: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?auto=format&fit=crop&q=80&w=800', caption: 'Morning Fog', date: '1960-07-06', isFavorite: false }
    ]
  }
];

export const ACTIVITY_FEED: GalleryActivity[] = [
  { id: 1, user: 'Grandpa Robert', action: 'added 3 photos to', target: 'Fishing in Oregon', time: '2h ago', avatarChar: 'R' },
  { id: 2, user: 'Mom Jennifer', action: 'created album', target: 'Mom & Dad Wedding', time: '1d ago', avatarChar: 'J' },
  { id: 3, user: 'Dad Michael', action: 'added a video to', target: 'Christmas 1989', time: '2d ago', avatarChar: 'M' }
];

export const MEDIA_ARCHIVE: Record<string, MediaItem[]> = {
  'g-margaret': [
    {
      id: 'm1',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800', // Group of friends
      caption: 'Summer picnic 1968',
      date: '1968-07-15',
      isFavorite: true,
      storyId: 'The Moon Landing Memory'
    },
    {
      id: 'm2',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800',
      caption: 'The old garden',
      date: '1970-05-20',
      isFavorite: false
    }
  ],
  'g-robert': [
    {
      id: 'r1',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1503516459261-40c66117780a?auto=format&fit=crop&q=80&w=800', // Working on house/construction
      caption: 'Building the deck',
      date: '1955-08-10',
      isFavorite: true,
      storyId: 'Building Our First House'
    },
    { 
      id: 'f1', type: 'photo', url: 'https://images.unsplash.com/photo-1496664444929-8c75efb9546f?auto=format&fit=crop&q=80&w=800', caption: 'The Big Catch', date: '1960-07-04', isFavorite: true 
    }
  ],
  'm-jennifer': [
    {
       id: 'j1',
       type: 'photo',
       url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800',
       caption: 'College friends',
       date: '1984-10-12',
       isFavorite: true,
       storyId: 'My First Day of College'
    },
    { 
       id: 'w1', type: 'photo', url: 'https://images.unsplash.com/photo-1522673607200-1645062cd958?auto=format&fit=crop&q=80&w=800', caption: 'The Ceremony', date: '1992-06-20', isFavorite: true 
    }
  ],
  'd-michael': [
    { id: 'f2', type: 'photo', url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=800', caption: 'Camping by the River', date: '1960-07-05', isFavorite: true }
  ],
  's-emma': [],
  'u-david': []
};

export const COMMENTS_ARCHIVE: Record<string, Comment[]> = {
  "The Moon Landing Memory": [
    {
      id: "c1",
      authorId: "d-michael",
      text: "I remember you telling me this when I was a kid! Always loved this story.",
      timestamp: "2 months ago",
      likes: 3,
      replies: []
    }
  ],
  "Building Our First House": [
    {
        id: "c2",
        authorId: "m-jennifer",
        text: "That hallway slope is still there! It gives the house character.",
        timestamp: "1 year ago",
        likes: 5,
        replies: []
    }
  ]
};

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [activeStory, setActiveStory] = useState<StoryData>({
    title: "", author: "", date: "", transcript: "", contextCards: [], imageUrl: null, mentionedMemberIds: []
  });
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(FAMILY_DATA);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);

  const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

  const handleAddMember = (member: FamilyMember) => {
    setFamilyMembers(prev => [...prev, member]);
  };

  const handleUpdateMember = (updatedMember: FamilyMember) => {
    setFamilyMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
  };

  const generateContext = async (title: string, transcript: string, date: string): Promise<any[]> => {
    try {
      const ai = getAiClient();
      // Use Gemini 3 Pro for advanced reasoning and grounding capabilities
      const model = "gemini-3-pro-preview";
      
      const prompt = `Analyze this personal story and use Google Search to find EXACT historical data to create 4 educational context cards.
      
      Story Title: ${title}
      Date: ${date}
      Transcript: ${transcript}
      
      Task:
      1. Identify the specific year and location (if mentioned).
      2. Search for:
         - A specific major world event from that year/month.
         - The EXACT average cost of a common item (gas, bread, house) in that year.
         - A #1 song or movie from that specific time.
         - A cultural or technological milestone from that era.
      
      Return a JSON array of 4 objects with keys: "icon" (emoji), "title", "content", "sourceUrl" (URL from grounding if available).
      Example format:
      [
        { "icon": "📻", "title": "Top Song 1965", "content": "The #1 song was 'Help!' by The Beatles.", "sourceUrl": "http..." }
      ]
      IMPORTANT: Return ONLY the raw JSON array. No markdown formatting.
      `;

      // Note: We use googleSearch tool here. 
      // When using tools, we cannot strictly enforce responseSchema in the config in the same way.
      // We must rely on the prompt instructions and manual parsing.
      const result = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
              tools: [{ googleSearch: {} }]
          }
      });
      
      let text = result.text || "[]";
      
      // Clean up markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
         const data = JSON.parse(text);
         if (Array.isArray(data)) {
            return data;
         }
      } catch (parseError) {
         console.warn("Failed to parse context JSON", parseError);
      }
      
      // Fallback if parsing fails or empty
      return [
         { icon: "📅", title: "Historical Era", content: "This story takes place around " + date },
         { icon: "🔍", title: "Explore More", content: "Ask the chat to learn more about this time period." }
      ];

    } catch (e) {
      console.error("Gemini Context Error:", e);
      return [
        { icon: "⚠️", title: "Connection Issue", content: "Could not retrieve historical context at this time." }
      ];
    }
  };

  const generateIllustration = async (transcript: string): Promise<string | null> => {
    try {
      const ai = getAiClient();
      const model = "gemini-2.5-flash-image";
      
      const prompt = `Create a warm, nostalgic watercolor-style illustration of: ${transcript.substring(0, 500)}`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (e) {
      console.error("Gemini Image Error:", e);
      return null;
    }
  };

  const handleRecordingComplete = async (manualTitle: string, tags: string[], mediaBase64?: string, mediaType: 'audio' | 'video' = 'audio', mediaMimeType: string = 'audio/mp3') => {
    setIsGenerating(true);
    
    // Default fallback
    let finalTranscript = STORY_ARCHIVE["The Moon Landing Memory"].transcript;
    let finalTitle = manualTitle;

    // 1. Multimodal Analysis (Audio OR Video)
    if (mediaBase64) {
       try {
          const ai = getAiClient();
          // Use Gemini 3 Pro for advanced multimodal reasoning
          const model = "gemini-3-pro-preview"; 
          
          const result = await ai.models.generateContent({
             model,
             contents: {
               parts: [
                  { inlineData: { mimeType: mediaMimeType, data: mediaBase64 } },
                  { text: `
                     Please transcribe the story told in this ${mediaType} exactly. 
                     Then, if the user did NOT provide a title, suggest a short, nostalgic title (max 5 words).
                     Return JSON: { "transcript": "...", "suggestedTitle": "..." }
                  `}
               ]
             },
             config: {
                responseMimeType: "application/json",
                responseSchema: {
                   type: Type.OBJECT,
                   properties: {
                      transcript: { type: Type.STRING },
                      suggestedTitle: { type: Type.STRING }
                   },
                   required: ["transcript", "suggestedTitle"]
                }
             }
          });
          
          if (result.text) {
             const data = JSON.parse(result.text);
             finalTranscript = data.transcript;
             if (!finalTitle) finalTitle = data.suggestedTitle;
          }
       } catch (e) {
          console.error("Transcription Error", e);
          finalTranscript = "Error processing recording. Using fallback text.";
       }
    } else if (!finalTitle) {
       // Only if NO media and NO title (edge case)
       finalTitle = "A New Family Memory";
    }

    if (!finalTitle) finalTitle = "A New Family Memory";

    // 2. Setup the Story Object
    const baseStory: StoryData = {
      title: finalTitle,
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      author: "You (David)",
      transcript: finalTranscript,
      contextCards: [],
      imageUrl: null,
      mentionedMemberIds: tags || [],
      mediaType: mediaType,
      mediaBase64: mediaBase64,
      mediaMimeType: mediaMimeType
    };
    
    // Transition to display immediately
    setActiveStory(baseStory);
    setIsGenerating(false); // Hide full screen loader
    setCurrentScreen('story');
    
    // 3. Generate Context & Image (Parallel Background)
    setIsGeneratingImage(true);
    setIsGeneratingContext(true);

    const [cards, image] = await Promise.all([
      generateContext(baseStory.title, baseStory.transcript, baseStory.date),
      generateIllustration(baseStory.transcript)
    ]);

    setActiveStory(prev => ({ 
      ...prev, 
      contextCards: cards,
      imageUrl: image
    }));
    
    setIsGeneratingImage(false);
    setIsGeneratingContext(false);
  };

  const handleSaveStory = (story: StoryData) => {
     STORY_ARCHIVE[story.title] = {
        date: story.date,
        transcript: story.transcript,
        mentionedMemberIds: story.mentionedMemberIds,
        relatedAlbumId: story.relatedAlbumId,
        mediaType: story.mediaType,
        mediaBase64: story.mediaBase64,
        mediaMimeType: story.mediaMimeType
     };
     
     setFamilyMembers(prev => prev.map(m => {
        if (m.id === 'u-david') {
           return {
             ...m,
             storiesCount: m.storiesCount + 1,
             featuredStories: [story.title, ...m.featuredStories]
           };
        }
        return m;
     }));
     
     setCurrentScreen('landing');
  };

  const handlePlayStoryFromTree = async (title: string, author: string) => {
    const archivedStory = STORY_ARCHIVE[title];
    const transcript = archivedStory ? archivedStory.transcript : "Story transcript not available.";
    const date = archivedStory ? archivedStory.date : "Unknown Date";
    const mentionedMemberIds = archivedStory ? archivedStory.mentionedMemberIds : [];
    const relatedAlbumId = archivedStory ? archivedStory.relatedAlbumId : undefined;
    
    // Retrieve stored media data
    const mediaType = archivedStory?.mediaType || 'audio';
    const mediaBase64 = archivedStory?.mediaBase64;
    const mediaMimeType = archivedStory?.mediaMimeType;

    const baseStory: StoryData = {
        title,
        date,
        author,
        transcript,
        contextCards: [],
        imageUrl: null,
        mentionedMemberIds,
        relatedAlbumId,
        mediaType,
        mediaBase64,
        mediaMimeType
    };

    setActiveStory(baseStory);
    // Don't show full screen loader, show text immediately
    setIsGenerating(false);
    setCurrentScreen('story');

    setIsGeneratingImage(true);
    setIsGeneratingContext(true);

    const [cards, image] = await Promise.all([
      generateContext(baseStory.title, baseStory.transcript, baseStory.date),
      generateIllustration(baseStory.transcript)
    ]);

    setActiveStory(prev => ({ 
      ...prev, 
      contextCards: cards,
      imageUrl: image
    }));

    setIsGeneratingImage(false);
    setIsGeneratingContext(false);
  };

  const handleRegenerateImage = async () => {
    if (!activeStory.transcript) return;
    playClick();
    setIsGeneratingImage(true);
    const image = await generateIllustration(activeStory.transcript);
    setActiveStory(prev => ({ ...prev, imageUrl: image }));
    setIsGeneratingImage(false);
  };

  const navigateTo = (screen: Screen, albumId?: string) => {
    playClick();
    if (albumId) setActiveAlbumId(albumId);
    else setActiveAlbumId(null);
    setCurrentScreen(screen);
  }

  return (
    <div className="min-h-screen paper-texture text-darkBrown antialiased transition-colors duration-500 flex flex-col relative">
      <div className="fixed top-4 right-4 z-[60] pointer-events-none">
        <span className="bg-rosewood/10 text-rosewood text-xs font-bold px-3 py-1 rounded-full border border-rosewood/30 shadow-sm uppercase tracking-wider">
          Demo Mode
        </span>
      </div>

      {currentScreen !== 'landing' && (
        <Header 
          onHomeClick={() => navigateTo('landing')} 
          onGalleryClick={() => navigateTo('gallery')}
          onTimelineClick={() => navigateTo('timeline')}
        />
      )}

      {currentScreen === 'landing' && (
        <LandingPage 
          members={familyMembers}
          onAddMember={handleAddMember}
          onUpdateMember={handleUpdateMember}
          onShareClick={() => setCurrentScreen('recorder')}
          onExploreClick={() => setCurrentScreen('family-tree')}
          onGatheringClick={() => setCurrentScreen('family-gathering')}
          onGalleryClick={() => setCurrentScreen('gallery')}
          onTimelineClick={() => setCurrentScreen('timeline')}
          onPlayStory={handlePlayStoryFromTree}
        />
      )}
      
      {currentScreen === 'recorder' && (
        <RecorderScreen 
          onBack={() => setCurrentScreen('landing')} 
          onRecordingComplete={handleRecordingComplete}
        />
      )}

      {currentScreen === 'story' && (
        <StoryDisplay 
          storyData={activeStory}
          onRecordAnother={() => setCurrentScreen('recorder')}
          onSave={handleSaveStory}
          isGenerating={isGenerating}
          isGeneratingImage={isGeneratingImage}
          isGeneratingContext={isGeneratingContext}
          onRegenerateImage={handleRegenerateImage}
          onViewAlbum={(albumId) => navigateTo('gallery', albumId)}
        />
      )}

      {currentScreen === 'family-tree' && (
        <FamilyTreeScreen 
          onBack={() => setCurrentScreen('landing')}
          onPlayStory={handlePlayStoryFromTree}
          onUpdateMember={handleUpdateMember}
        />
      )}

      {currentScreen === 'family-gathering' && (
        <FamilyGatheringScreen 
          onBack={() => setCurrentScreen('landing')}
          onVideoCall={() => setCurrentScreen('video-call')}
        />
      )}

      {currentScreen === 'video-call' && (
         <FamilyVideoCall
            onEndCall={() => setCurrentScreen('family-gathering')}
         />
      )}

      {currentScreen === 'gallery' && (
         <FamilyGalleryScreen
            onBack={() => setCurrentScreen('landing')}
            initialAlbumId={activeAlbumId}
            onPlayStory={handlePlayStoryFromTree}
         />
      )}

      {currentScreen === 'timeline' && (
         <FamilyTimelineScreen
            onBack={() => setCurrentScreen('landing')}
            onPlayStory={handlePlayStoryFromTree}
            onViewAlbum={(albumId) => navigateTo('gallery', albumId)}
         />
      )}
    </div>
  );
};

export default App;