const OnboardingForm = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center text-foreground mb-8">Get Started</h1>
        <div className="bg-card rounded-2xl border border-border/30 p-8 shadow-sm">
          {/* Embed your form here */}
          <p className="text-muted-foreground text-center">Form embed placeholder</p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingForm;
