import { useState, useEffect } from "react";

interface RotatingTextProps {
  words: string[];
  className?: string;
}

const RotatingText = ({ words, className = "" }: RotatingTextProps) => {
  // Initialize with "lead" (index 0) for non-JS fallback
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [words.length]);

  const currentWord = words[currentIndex];
  const article = "a"; // All words (lead, sale, call) use "a"

  return (
    <>
      <span className="text-6xl lg:text-7xl font-bold leading-tight">
        Never miss {article}{" "}
        <span className={className}>
          {currentWord}
        </span>{" "}
        <span className="text-foreground">again</span>
      </span>
      
      {/* Fallback for browsers without JavaScript */}
      <noscript>
        <span className="text-6xl lg:text-7xl font-bold leading-tight">
          Never miss a{" "}
          <span className={className}>lead</span>{" "}
          <span className="text-foreground">again</span>
        </span>
      </noscript>
    </>
  );
};

export default RotatingText;