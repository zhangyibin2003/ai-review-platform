'use client';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export default function StarRating({ rating, maxStars = 5, onChange, readonly = true }: StarRatingProps) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i + 1)}
          className={`text-lg ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform ${
            i < rating ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </span>
  );
}
