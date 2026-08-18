export type SentimentType = 'happy' | 'neutral' | 'frustrated';

export interface SentimentAnalysisResult {
  sentiment: SentimentType;
  score: number; // Score from -1 (extremely frustrated) to 1 (extremely happy)
  labelBn: string;
  labelEn: string;
  emoji: string;
  badgeClass: string;
  borderClass: string;
  dotColor: string;
  matchedKeywords: string[];
}

// Bengali & English Keyword Lists for Sentiment Analysis
const HAPPY_KEYWORDS = [
  // Bangla
  'ধন্যবাদ', 'থ্যাংকস', 'ভালো', 'খুব ভালো', 'গ্রেট', 'চমৎকার', 'সুন্দর', 'উপকারী', 
  'খুশি', 'অসাধারণ', 'থ্যাংক ইউ', 'মাশাআল্লাহ', 'আলহামদুলিল্লাহ', 'অনেক ধন্যবাদ', 
  'ভালো সার্ভিস', 'হেল্পফুল', 'দ্রুত', 'ধন্যবাদ স্যার', 'সাটিস্ফাইড', 'লাইক',
  // English
  'thanks', 'thank you', 'great', 'awesome', 'excellent', 'amazing', 'happy', 
  'good', 'wonderful', 'perfect', 'love', 'helpful', 'fast', 'super', 'best', 
  'appreciate', 'satisfied', 'nice', 'glad', 'brilliant'
];

const FRUSTRATED_KEYWORDS = [
  // Bangla
  'খারাপ', 'জঘন্য', 'বাজে', 'মেজাজ খারাপ', 'ফালতু', 'দেরি', 'লেট', 'সমস্যা', 
  'কাজ করছে না', 'কাজ করে না', 'ভুয়া', 'প্রতারণা', 'রিফান্ড', 'টাকা ফেরত', 
  'কমপ্লেন', 'অভিযোগ', 'বাজে সার্ভিস', 'বিরক্তিকর', 'স্লো', 'দুঃখজনক', 
  'ফালতু সার্ভিস', 'আজেবাজে', 'নষ্ট', 'স্ক্যাম', 'বিপদ', 'কেন', 'পারি নাই',
  // English
  'bad', 'worst', 'terrible', 'horrible', 'useless', 'slow', 'waste', 
  'frustrated', 'angry', 'disappointed', 'fail', 'failed', 'issue', 'problem', 
  'broken', 'not working', 'refund', 'scam', 'fake', 'annoying', 'hate', 
  'delay', 'delayed', 'complaint', 'error', 'wrong', 'fraud'
];

export function analyzeTextSentiment(text: string | undefined | null): SentimentAnalysisResult {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      sentiment: 'neutral',
      score: 0,
      labelBn: 'সাধারণ',
      labelEn: 'Neutral',
      emoji: '😐',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      borderClass: 'border-slate-300',
      dotColor: 'bg-slate-400',
      matchedKeywords: [],
    };
  }

  const lowerText = text.toLowerCase();
  const matchedHappy: string[] = [];
  const matchedFrustrated: string[] = [];

  for (const kw of HAPPY_KEYWORDS) {
    if (lowerText.includes(kw.toLowerCase())) {
      matchedHappy.push(kw);
    }
  }

  for (const kw of FRUSTRATED_KEYWORDS) {
    if (lowerText.includes(kw.toLowerCase())) {
      matchedFrustrated.push(kw);
    }
  }

  // Also check punctuation / emojis
  if (lowerText.includes('😊') || lowerText.includes('😃') || lowerText.includes('❤️') || lowerText.includes('👍') || lowerText.includes('😍')) {
    matchedHappy.push('emoji');
  }

  if (lowerText.includes('😠') || lowerText.includes('😡') || lowerText.includes('🤬') || lowerText.includes('👎') || lowerText.includes('!!')) {
    matchedFrustrated.push('emoji');
  }

  const happyScore = matchedHappy.length;
  const frustratedScore = matchedFrustrated.length;

  if (happyScore > frustratedScore) {
    const rawScore = Math.min(1, 0.4 + happyScore * 0.2);
    return {
      sentiment: 'happy',
      score: Number(rawScore.toFixed(2)),
      labelBn: 'সন্তুষ্ট (Happy)',
      labelEn: 'Happy',
      emoji: '😊',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderClass: 'border-emerald-300',
      dotColor: 'bg-emerald-500',
      matchedKeywords: matchedHappy,
    };
  }

  if (frustratedScore > happyScore) {
    const rawScore = Math.max(-1, -0.4 - frustratedScore * 0.2);
    return {
      sentiment: 'frustrated',
      score: Number(rawScore.toFixed(2)),
      labelBn: 'অসন্তুষ্ট (Frustrated)',
      labelEn: 'Frustrated',
      emoji: '😠',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      borderClass: 'border-rose-300',
      dotColor: 'bg-rose-500',
      matchedKeywords: matchedFrustrated,
    };
  }

  return {
    sentiment: 'neutral',
    score: 0,
    labelBn: 'সাধারণ (Neutral)',
    labelEn: 'Neutral',
    emoji: '😐',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    borderClass: 'border-slate-300',
    dotColor: 'bg-slate-400',
    matchedKeywords: [],
  };
}

/**
 * Calculates overall sentiment for a chat session based on customer messages.
 */
export function analyzeChatSessionSentiment(messages: any[], lastMessageFallback?: string): SentimentAnalysisResult {
  if (!messages || messages.length === 0) {
    return analyzeTextSentiment(lastMessageFallback);
  }

  // Filter only customer messages
  const customerMessages = messages.filter((m) => m && m.senderRole === 'customer' && m.content);

  if (customerMessages.length === 0) {
    return analyzeTextSentiment(lastMessageFallback);
  }

  // Weigh recent customer messages higher
  let totalScore = 0;
  let allMatched: string[] = [];

  customerMessages.forEach((msg, idx) => {
    const res = analyzeTextSentiment(msg.content);
    // Weight recent messages slightly more
    const weight = 1 + (idx / customerMessages.length) * 0.5;
    totalScore += res.score * weight;
    allMatched = [...allMatched, ...res.matchedKeywords];
  });

  const avgScore = totalScore / customerMessages.length;

  if (avgScore >= 0.25) {
    return {
      sentiment: 'happy',
      score: Number(Math.min(1, avgScore).toFixed(2)),
      labelBn: 'সন্তুষ্ট (Happy)',
      labelEn: 'Happy',
      emoji: '😊',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderClass: 'border-emerald-300',
      dotColor: 'bg-emerald-500',
      matchedKeywords: Array.from(new Set(allMatched)),
    };
  }

  if (avgScore <= -0.25) {
    return {
      sentiment: 'frustrated',
      score: Number(Math.max(-1, avgScore).toFixed(2)),
      labelBn: 'অসন্তুষ্ট (Frustrated)',
      labelEn: 'Frustrated',
      emoji: '😠',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      borderClass: 'border-rose-300',
      dotColor: 'bg-rose-500',
      matchedKeywords: Array.from(new Set(allMatched)),
    };
  }

  return {
    sentiment: 'neutral',
    score: Number(avgScore.toFixed(2)),
    labelBn: 'সাধারণ (Neutral)',
    labelEn: 'Neutral',
    emoji: '😐',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    borderClass: 'border-slate-300',
    dotColor: 'bg-slate-400',
    matchedKeywords: Array.from(new Set(allMatched)),
  };
}
