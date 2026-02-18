import { useEffect } from "react";

const BookPage = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://api.juniesystems.com/js/form_embed.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-3xl text-center space-y-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
          Book a Free Call
        </h1>
        <p className="text-muted-foreground text-lg">
          Pick a time that works for you — it's free and takes 30 minutes.
        </p>
      </div>

      <div className="w-full max-w-3xl">
        <iframe
          src="https://api.juniesystems.com/widget/booking/fBlaNQM6Ay3RD1FiID1Z"
          style={{ width: "100%", border: "none", overflow: "hidden", minHeight: "700px" }}
          scrolling="no"
          id="fBlaNQM6Ay3RD1FiID1Z_book_page"
          title="Book a Call"
        />
      </div>
    </div>
  );
};

export default BookPage;
