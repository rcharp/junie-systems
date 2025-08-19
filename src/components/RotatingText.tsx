import { useState, useEffect } from "react";

interface RotatingTextProps {
  words: string[];
  className?: string;
}

const RotatingText = ({ words, className = "" }: RotatingTextProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 2500); // Change word every 2.5 seconds

    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span className={`relative inline-block ${className}`}>
      <span 
        key={currentIndex}
        className="animate-slide-up"
        style={{
          animation: 'slide-up 0.8s ease-out'
        }}
      >
        {words[currentIndex]}
      </span>
    </span>
  );
};

export default RotatingText;