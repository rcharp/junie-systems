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
  const textRef = useRef<HTMLSpanElement>(null);

  const currentWord = words[currentIndex];
  const article = currentWord === "appointment" ? "an" : "a";

  // Check if text needs resizing to prevent wrapping
  useEffect(() => {
    if (textRef.current) {
      const element = textRef.current;
      const container = element.parentElement;
      
      if (container) {
        // Reset to base size first
        setTextSize(baseSize);
        
        // Check after a brief delay to allow rendering
        setTimeout(() => {
          const containerWidth = container.offsetWidth;
          const elementWidth = element.scrollWidth;
          
          if (elementWidth > containerWidth * 0.95) { // If close to wrapping
            setTextSize("text-4xl lg:text-5xl"); // Smaller size
          }
        }, 50);
      }
    }
  }, [currentWord, baseSize]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span ref={textRef} className={`font-bold leading-tight ${textSize}`}>
      Never miss {article}{" "}
      <span className={className}>
        {currentWord}
      </span>{" "}
      <span className="text-foreground">again</span>
    </span>
  );
};

export default RotatingText;