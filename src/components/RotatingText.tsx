import { useState, useEffect, useRef } from "react";

interface RotatingTextProps {
  words: string[];
  className?: string;
  baseSize?: string;
}

const RotatingText = ({ words, className = "", baseSize = "text-6xl lg:text-7xl" }: RotatingTextProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [textSize, setTextSize] = useState(baseSize);
  const textRef = useRef<HTMLDivElement>(null);

  const currentWord = words[currentIndex];
  const article = currentWord === "appointment" ? "an" : "a";

  useEffect(() => {
    // Check if text wraps and adjust size
    if (textRef.current) {
      const element = textRef.current;
      const lineHeight = parseInt(getComputedStyle(element).lineHeight);
      const height = element.offsetHeight;
      
      if (height > lineHeight * 1.2) { // Text is wrapping
        setTextSize("text-5xl lg:text-6xl");
      } else {
        setTextSize(baseSize);
      }
    }
  }, [currentWord, baseSize]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 300); // Half of animation duration
    }, 2500);

    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span className="inline-block">
      <span ref={textRef} className={`font-bold leading-tight ${textSize}`}>
        Never miss {article}{" "}
        <span className="relative inline-block overflow-hidden h-[1.2em] align-bottom">
          <span 
            className={`absolute inset-0 transition-transform duration-600 ease-in-out ${className} ${
              isAnimating ? '-translate-y-full' : 'translate-y-0'
            }`}
          >
            {currentWord}
          </span>
          <span 
            className={`absolute inset-0 transition-transform duration-600 ease-in-out ${className} ${
              isAnimating ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            {words[(currentIndex + 1) % words.length]}
          </span>
        </span>{" "}
        <span className="text-foreground">again</span>
      </span>
    </span>
  );
};

export default RotatingText;