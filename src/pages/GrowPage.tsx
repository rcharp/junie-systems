import { useEffect, useRef, useState } from "react";
import { Check, Star, Clock, Shield, ArrowDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import junieLogo from "@/assets/junie-logo-main.png";

const googleReviews = [
  { name: "James Mitchell", date: "Mar 2026", text: "Junie Systems is a game-changer for anyone serious about growth. They don't just build websites — they build systems that actually drive leads. Their team is sharp and focuses on ROI." },
  { name: "Sarah K.", date: "Feb 2026", text: "I'm getting leads from the new website every single day. Ricky and the team really know what they're doing. Worth every penny." },
  { name: "David Henderson", date: "Feb 2026", text: "They built our company a beautiful website that actually converts visitors into paying customers. Our old site was terrible and we knew it. So glad we found Junie." },
  { name: "Marcus T.", date: "Jan 2026", text: "Amazing team to work with. They built us a great website and our online presence has completely transformed. Highly recommend." },
  { name: "Rachel Owens", date: "Jan 2026", text: "Very professional and knowledgeable. They understand contractors and what we need to succeed online. Our website showcases our work perfectly." },
  { name: "Tommy B.", date: "Dec 2025", text: "Worth every single penny. The website actually converts browsers into paying customers. Professional, reliable, and gets real results." },
  { name: "Linda Garcia", date: "Dec 2025", text: "Can't recommend them enough! Transparent about what they can do, doesn't make false promises, and over-delivers every time." },
  { name: "Kevin Park", date: "Nov 2025", text: "Great company. Would highly recommend them to everyone. Been using their system with great success for the past few months." },
  { name: "Jason W.", date: "Nov 2025", text: "Generated over 20 Google reviews in the first month alone. That landed us 2 new jobs right away. The system pays for itself." },
  { name: "Brittany Lane", date: "Oct 2025", text: "They have done an extraordinary job with our website and maintaining it. Helping with social media too. I would recommend them to anyone!" },
];

const GrowPage = () => {
  const [reviewIndex, setReviewIndex] = useState(0);
  const reviewsPerView = typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 3;
  const maxIndex = Math.max(0, googleReviews.length - reviewsPerView);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://api.juniesystems.com/js/form_embed.js";
    script.async = true;
    document.body.appendChild(script);

    const handleMessage = (e: MessageEvent) => {
      if (e.data.event === "calendly.event_scheduled") {
        (window as any).fbq?.("track", "Schedule", {}, { eventID: "cal-" + Date.now() });
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      document.body.removeChild(script);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const scrollToBook = () => {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  };

  const nextReview = () => setReviewIndex((i) => Math.min(i + 1, maxIndex));
  const prevReview = () => setReviewIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="min-h-screen bg-[hsl(220,25%,8%)] text-white flex flex-col">
      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="pt-12 pb-10 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-5">
            <div className="flex justify-center mb-6">
              <img src={junieLogo} alt="Junie Systems" className="h-20 w-20" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight italic">
              Contractors: Fill Your Calendar with Jobs{" "}
              <span className="not-italic text-primary">(Without Wasting Time Chasing Leads)</span>
            </h1>

            <p className="text-lg text-gray-400 italic max-w-2xl mx-auto">
              Tired of paying agencies that overpromise and underdeliver?
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              We don't run ads or charge retainers. We install a system that actually works.
            </p>
            <p className="text-base text-gray-300 max-w-2xl mx-auto font-medium">
              At Junie Systems, we help you get more leads, book more jobs, and collect more reviews — all without chasing.
            </p>

            <button
              onClick={scrollToBook}
              className="inline-flex items-center gap-2 bg-[hsl(60,100%,50%)] hover:bg-[hsl(60,100%,45%)] text-black font-bold text-lg px-10 py-4 rounded-lg shadow-lg transition-all hover:scale-105 w-full max-w-md mx-auto justify-center"
            >
              Book Your Free Demo Call
            </button>

            <p className="text-sm text-gray-500 max-w-xl mx-auto">
              No retainers. No wasted ad spend. No more guesswork. Just a system that runs your business smarter — while you focus on the work.
            </p>
          </div>

          {/* Video embed */}
          <div className="max-w-4xl mx-auto mt-10">
            <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                src="https://www.loom.com/embed/6f02553859a34f2caadf027269c72717?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&autoplay=0"
                frameBorder="0"
                allowFullScreen
                className="w-full h-full"
                title="Junie Systems Overview"
              />
            </div>
          </div>

          {/* CTA after video */}
          <div className="max-w-4xl mx-auto mt-8 text-center space-y-4">
            <p className="text-white font-semibold text-lg">👆 Watched the video? Here's your next step.</p>
            <button
              onClick={scrollToBook}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:opacity-90 transition-all hover:scale-105"
            >
              <Calendar className="w-5 h-5" />
              Get My Website →
            </button>
            <p className="text-sm text-gray-500">30 minutes · Zero obligation · Totally free</p>
            <div className="flex flex-col items-center gap-1 pt-2">
              <ArrowDown className="w-6 h-6 text-primary animate-bounce" />
            </div>
          </div>
        </section>

        {/* ── Pricing Strips ── */}
        <section className="border-y border-white/10 py-8 px-4 bg-[hsl(220,25%,10%)]">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">
              Complete Marketing System — <span className="text-primary text-base font-extrabold">$297/mo</span>
              <span className="font-normal ml-2">— no setup fees, no contracts</span>
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                "Professional website redesign (FREE)",
                "Chat widget auto-response automation",
                "Quote form auto-response automation",
                "Missed Call Text Back automation",
                "Google 5-star review automation",
                "Turn past customers into repeat clients",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-gray-200 text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── VIDEO TESTIMONIAL ── */}
        <section className="py-16 px-4 bg-[hsl(220,25%,8%)]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-4">
              Hear It Straight From <span className="text-primary">Our Clients</span>
            </h2>
            <p className="text-center text-gray-400 mb-10 max-w-2xl mx-auto">
              Real contractors sharing real results. No scripts, no fluff.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                "/videos/testimonial-travis.mp4",
                "/videos/testimonial-easton.mp4",
                "/videos/testimonial-3.mp4",
                "/videos/testimonial-2.mp4",
                "/videos/testimonial.mp4",
              ].map((src, i) => (
                <div key={i} className={`rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${i >= 3 ? "col-span-1" : ""}`}>
                  <video controls preload="auto" playsInline className="w-full aspect-[9/16] bg-black">
                    <source src={src} type="video/mp4" />
                  </video>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CALENDAR: Booking Section ── */}
        <section className="py-14 px-4 bg-[hsl(220,25%,10%)]" id="book">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              Step 2 of 2
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Pick a Time for Your <span className="text-primary">FREE Smart Website Demo Call</span>
            </h2>
            <p className="text-gray-400 text-lg">
              We'll review your current online presence, show you what's costing you jobs, and build a custom plan — on the house.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-gray-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> 30 minutes
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary" /> Zero obligation
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" /> 100% free
              </span>
            </div>
          </div>

          <iframe
            src="https://api.juniesystems.com/widget/booking/fBlaNQM6Ay3RD1FiID1Z"
            style={{
              width: "100%",
              maxWidth: "720px",
              margin: "0 auto",
              display: "block",
              border: "none",
              overflow: "hidden",
              minHeight: "680px",
            }}
            scrolling="no"
            id="fBlaNQM6Ay3RD1FiID1Z_grow"
            title="Junie Systems Demo Calendar"
          />

          <div className="text-center mt-6 space-y-1">
            <p className="text-sm text-gray-400 font-medium">🔒 Your info is private. We'll never spam you.</p>
            <p className="text-xs text-gray-600">Spots fill up fast — claim yours before they're gone.</p>
          </div>
        </section>

        {/* ── GOOGLE REVIEWS CAROUSEL ── */}
        <section className="py-16 px-4 bg-[hsl(220,25%,8%)]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">Customer Reviews for Junie Systems</p>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-4xl font-black text-white">5.00</span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500">{googleReviews.length} reviews</p>
            </div>

            {/* Carousel */}
            <div className="relative">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${reviewIndex * (100 / reviewsPerView)}%)` }}
                >
                  {googleReviews.map((r, i) => (
                    <div
                      key={i}
                      className="shrink-0 px-2"
                      style={{ width: `${100 / reviewsPerView}%` }}
                    >
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-full flex flex-col">
                        <div className="flex gap-0.5 mb-3">
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          ))}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed flex-1">{r.text}</p>
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {r.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{r.name}</p>
                            <p className="text-xs text-gray-500">{r.date}</p>
                          </div>
                          <img
                            src="https://www.google.com/favicon.ico"
                            alt="Google"
                            className="w-4 h-4 ml-auto"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nav buttons */}
              <button
                onClick={prevReview}
                disabled={reviewIndex === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextReview}
                disabled={reviewIndex >= maxIndex}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 mt-6">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setReviewIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === reviewIndex ? "bg-primary w-6" : "bg-white/20"}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <div className="py-6 px-4 border-t border-white/10 bg-[hsl(220,25%,6%)]">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <p className="text-xs text-gray-500">
              © 2026 Junie Systems · ricky@juniesystems.com · Palmetto, FL
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong className="text-gray-500">Earnings Disclaimer:</strong> Results may vary and testimonials
              are not claimed to represent typical results. All testimonials are real. These results are meant as a
              showcase of what the best, most motivated clients have achieved and should not be taken as average or
              typical results. You should perform your own due diligence and use your own best judgment prior to making
              any investment decision pertaining to your business.
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              This site is not a part of the YouTube, Google, Bing, or Facebook website; Google Inc, Microsoft Inc, or
              Meta Inc. Additionally, this site is NOT endorsed by YouTube, Google, Bing, or Facebook in any way.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GrowPage;
