import { useEffect, useRef } from "react";

const BookPage = () => {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.type = "text/javascript";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div ref={headerRef} className="text-center py-8 px-4 shrink-0">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
          Book a Free 30-Minute Call
        </h1>
        <p className="text-muted-foreground text-lg mt-2">
          Pick a time that works for you — no obligation, no pressure.
        </p>
      </div>

      <div
        className="calendly-inline-widget flex-1 w-full"
        data-url="https://calendly.com/rickycharpentier/30min"
        style={{ minWidth: "320px" }}
      />
    </div>
  );
};

export default BookPage;
