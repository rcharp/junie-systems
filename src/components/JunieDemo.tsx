import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const JunieDemo = () => {
  useEffect(() => {
    // Load the ElevenLabs widget script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        'script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]'
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <section className="py-16 sm:py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-10">
          <Badge variant="outline" className="text-primary">
            Live Demo
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold">
            <span className="text-muted-foreground">Try Junie </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              right now
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience how Junie handles calls. Click the button below to start a conversation 
            and see our AI receptionist in action.
          </p>
        </div>

        <div className="flex justify-center">
          {/* @ts-expect-error - ElevenLabs custom element */}
          <elevenlabs-convai agent-id="agent_1601k5fak9jsfrzsk06455d9f98j"></elevenlabs-convai>
        </div>
      </div>
    </section>
  );
};

export default JunieDemo;
