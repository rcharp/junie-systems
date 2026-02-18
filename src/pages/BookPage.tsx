import { useEffect } from "react";

const BookPage = () => {
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-16 px-4">
      <div className="w-full max-w-3xl text-center space-y-3 mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
          Book a Free 30-Minute Call
        </h1>
        <p className="text-muted-foreground text-lg">
          Pick a time that works for you — no obligation, no pressure.
        </p>
      </div>

      <div
        className="calendly-inline-widget w-full max-w-3xl"
        data-url="https://calendly.com/rickycharpentier/30min"
        style={{ minWidth: "320px", height: "700px" }}
      />
    </div>
  );
};

export default BookPage;
