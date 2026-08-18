import React, { useState } from 'react';
import { Star, CheckCircle2, Heart } from 'lucide-react';

interface SatisfactionRatingProps {
  onSubmit: (rating: number, feedback: string) => void;
}

export const SatisfactionRating: React.FC<SatisfactionRatingProps> = ({ onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(rating, feedback);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div id="satisfaction-submitted" className="p-6 text-center space-y-3">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-slate-900 text-base">আপনার মতামত ও রেটিংয়ের জন্য ধন্যবাদ!</h4>
        <p className="text-xs text-slate-500">আপনার ফিডব্যাক আমাদের কাস্টমার সার্ভিস আরও উন্নত করতে সাহায্য করবে।</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} id="satisfaction-form" className="p-5 text-center space-y-4">
      <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto ring-4 ring-amber-50">
        <Heart className="w-5 h-5 fill-amber-500" />
      </div>

      <div>
        <h4 className="font-bold text-slate-900 text-sm">আমাদের সাপোর্ট আপনার কেমন লেগেছে?</h4>
        <p className="text-xs text-slate-500 mt-1">অনুগ্রহ করে আপনার অভিজ্ঞতা স্টার রেটিং দিয়ে জানান।</p>
      </div>

      {/* Star Selector */}
      <div className="flex justify-center items-center gap-1.5 my-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 text-amber-400 hover:scale-110 transition-transform focus:outline-none"
          >
            <Star
              className={`w-7 h-7 ${
                star <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Optional Feedback */}
      <textarea
        rows={2}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="কোনো বিশেষ মন্তব্য বা পরামর্শ থাকলে লিখুন... (ঐচ্ছিক)"
        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
      />

      <button
        type="submit"
        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow transition"
      >
        রিভিউ জমা দিন
      </button>
    </form>
  );
};
