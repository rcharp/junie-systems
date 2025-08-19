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
  const article = currentWord === "appointment" ? "an" : "a";

  return (
    <>
      <div className="text-4xl lg:text-5xl font-bold leading-tight">
        <div>
          Never miss {article}{" "}
          <span className={className}>
            {currentWord}
          </span>
        </div>
        <div className="text-foreground">again</div>
      </div>
      
      {/* Fallback for browsers without JavaScript */}
      <noscript>
        <div className="text-4xl lg:text-5xl font-bold leading-tight">
          <div>
            Never miss a{" "}
            <span className={className}>lead</span>
          </div>
          <div className="text-foreground">again</div>
        </div>
      </noscript>
    </>
  );
};

export default RotatingText;