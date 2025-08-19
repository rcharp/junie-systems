import { useState, useEffect, useRef } from "react";

interface RotatingTextProps {
  words: string[];
  className?: string;
  baseSize?: string;
}

const RotatingText = ({ words, className = "", baseSize = "text-6xl lg:text-7xl" }: RotatingTextProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const currentWord = words[currentIndex];
  const article = currentWord === "appointment" ? "an" : "a";

  console.log("RotatingText rendering:", { currentWord, currentIndex, words });

  useEffect(() => {
    console.log("Setting up interval for word rotation");
    const interval = setInterval(() => {
      console.log("Changing word from index", currentIndex, "to", (currentIndex + 1) % words.length);
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, [words.length, currentIndex]);

  return (
    <span className={`font-bold leading-tight ${baseSize}`}>
      Never miss {article}{" "}
      <span className={`${className} border border-red-500`}>
        {currentWord}
      </span>{" "}
      <span className="text-foreground">again</span>
    </span>
  );
};

export default RotatingText;