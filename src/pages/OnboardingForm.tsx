import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { AddressInput } from "@/components/AddressAutocomplete";
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";

const OnboardingForm = () => {
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get("contact_id");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    businessPhone: "",
    businessName: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    taxId: "",
    serviceAreas: "",
    servicesOffered: "",
    businessHours: "",
    aboutUs: "",
    specialThings: "",
    instagramLink: "",
    facebookLink: "",
    discounts: "",
    needLogo: "no",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 10MB.", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!form.businessPhone.trim()) newErrors.businessPhone = "Business phone is required";
    if (!form.businessName.trim()) newErrors.businessName = "Business name is required";
    if (!form.street.trim()) newErrors.street = "Street address is required";
    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.state) newErrors.state = "State is required";
    if (!form.zip.trim()) newErrors.zip = "ZIP code is required";
    if (!form.taxId.trim()) newErrors.taxId = "Tax ID / EIN is required";
    if (!form.serviceAreas.trim()) newErrors.serviceAreas = "Service areas are required";
    if (!form.servicesOffered.trim()) newErrors.servicesOffered = "Services offered are required";
    if (!form.businessHours.trim()) newErrors.businessHours = "Business hours are required";
    if (!form.agreeTerms) newErrors.agreeTerms = "You must agree to the terms";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: "Please fix the errors",
        description: "Some required fields are missing.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let logoUrl: string | null = null;

      // Upload logo to storage if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('onboarding-logos')
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('onboarding-logos')
            .getPublicUrl(fileName);
          logoUrl = urlData.publicUrl;
        }
      }

      const fullAddress = `${form.street}, ${form.city}, ${form.state} ${form.zip}`;
      const payload = {
        full_name: form.fullName,
        business_phone: form.businessPhone,
        business_name: form.businessName,
        street: form.street,
        city: form.city,
        state: form.state,
        zip: form.zip,
        full_address: fullAddress,
        tax_id: form.taxId,
        service_areas: form.serviceAreas,
        services_offered: form.servicesOffered,
        business_hours: form.businessHours,
        about_us: form.aboutUs,
        special_things: form.specialThings,
        instagram_link: form.instagramLink,
        facebook_link: form.facebookLink,
        discounts: form.discounts,
        need_logo: form.needLogo,
        contact_id: contactId,
        logo_url: logoUrl,
        logo_file_name: logoFile?.name || null,
      };

      const { data, error } = await supabase.functions.invoke("submit-onboarding-form", {
        body: payload,
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Submission failed");
      }

      setSubmitted(true);
      toast({ title: "Form submitted!", description: "We'll be in touch shortly." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      console.error("Onboarding submit error:", message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header showNav={false} />
        <main className="flex-1 px-4 pt-28 pb-12 flex items-center justify-center">
          <Card className="max-w-lg w-full text-center">
            <CardContent className="pt-10 pb-10 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">You're all set!</h2>
              <p className="text-muted-foreground">
                Thank you for submitting your information. Our team will review everything and reach out to you soon.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 px-4 pt-28 pb-12">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <img src="/lovable-uploads/junie-logo.png" alt="Junie" className="h-14 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-3">Client Onboarding Questionnaire</h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-4">
              Fill out the form below so we can get started building your website. The more details you provide, the
              better we can tailor everything to your business.
            </p>
            <div className="inline-block bg-primary/10 border border-primary/20 rounded-xl px-5 py-3">
              <p className="text-sm font-semibold text-primary">
                ⚠️ It's very important that you complete this form — we can't begin building your site until we have
                this information!
              </p>
            </div>
          </div>

          {/* TODO: Remove before production */}
          <div className="flex justify-center mb-4">
            <Button
              type="button"
              variant="outline"
              className="border-dashed border-destructive text-destructive"
              onClick={() => {
                setForm({
                  fullName: "John Smith",
                  businessPhone: "(555) 123-4567",
                  businessName: "Smith's Plumbing LLC",
                  street: "123 Main Street",
                  city: "Tampa",
                  state: "FL",
                  zip: "33601",
                  taxId: "12-3456789",
                  serviceAreas: "Tampa, St. Petersburg, Clearwater, Brandon, Riverview",
                  servicesOffered: "Residential plumbing, drain cleaning, water heater installation, pipe repair",
                  businessHours: "Mon-Fri 8am-6pm, Sat 9am-2pm, Sun Closed",
                  aboutUs: "Family-owned plumbing business serving the Tampa Bay area for over 15 years.",
                  specialThings: "Licensed & insured, 5-star rated on Google, same-day service available",
                  instagramLink: "https://instagram.com/smithsplumbing",
                  facebookLink: "https://facebook.com/smithsplumbing",
                  
                  discounts: "10% off for returning customers, $50 off water heater installation",
                  needLogo: "no",
                  agreeTerms: true,
                });
              }}
            >
              🧪 Fill with Test Data
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
              <CardContent className="pt-6 space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="John Smith"
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                  />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>

                {/* Business Cell Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="businessPhone">
                    Business Cell Phone <span className="text-destructive">*</span>{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      (or where you want to want to receive text notifications)
                    </span>
                  </Label>
                  <Input
                    id="businessPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={form.businessPhone}
                    onChange={(e) => updateField("businessPhone", e.target.value)}
                  />
                  {errors.businessPhone && <p className="text-sm text-destructive">{errors.businessPhone}</p>}
                </div>

                {/* Official Business Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">
                    Official Business Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="Smith's Plumbing LLC"
                    value={form.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                  />
                  {errors.businessName && <p className="text-sm text-destructive">{errors.businessName}</p>}
                </div>

                {/* Business Address - Address, City, State, Zip */}
                <AddressInput
                  value={{ street: form.street, city: form.city, state: form.state, zip: form.zip }}
                  onChange={(address) => {
                    updateField("street", address.street);
                    updateField("city", address.city);
                    updateField("state", address.state);
                    updateField("zip", address.zip);
                  }}
                  label="Business Address *"
                  required={true}
                  showValidation={Object.keys(errors).length > 0}
                  className="space-y-1.5"
                />

                {/* Tax ID / EIN */}
                <div className="space-y-1.5">
                  <Label htmlFor="taxId">
                    Business Tax ID or EIN <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="taxId"
                    placeholder="XX-XXXXXXX"
                    value={form.taxId}
                    onChange={(e) => updateField("taxId", e.target.value)}
                  />
                  {errors.taxId && <p className="text-sm text-destructive">{errors.taxId}</p>}
                </div>

                {/* Service Areas */}
                <div className="space-y-1.5">
                  <Label htmlFor="serviceAreas">
                    Service Areas <span className="text-destructive">*</span>{" "}
                    <span className="text-sm font-normal text-muted-foreground">(please include no more than 10)</span>
                  </Label>
                  <Textarea
                    id="serviceAreas"
                    placeholder="e.g. Palmetto, Bradenton, Sarasota, Tampa Bay area..."
                    value={form.serviceAreas}
                    onChange={(e) => updateField("serviceAreas", e.target.value)}
                  />
                  {errors.serviceAreas && <p className="text-sm text-destructive">{errors.serviceAreas}</p>}
                </div>

                {/* Services Offered */}
                <div className="space-y-1.5">
                  <Label htmlFor="servicesOffered">
                    Services Offered <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="servicesOffered"
                    placeholder="e.g. Residential plumbing, drain cleaning, water heater installation..."
                    value={form.servicesOffered}
                    onChange={(e) => updateField("servicesOffered", e.target.value)}
                  />
                  {errors.servicesOffered && <p className="text-sm text-destructive">{errors.servicesOffered}</p>}
                </div>

                {/* Business Hours */}
                <div className="space-y-1.5">
                  <Label htmlFor="businessHours">
                    Business Hours of Operation <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="businessHours"
                    placeholder="e.g. Mon-Fri 8am-6pm, Sat 9am-2pm, Sun Closed"
                    value={form.businessHours}
                    onChange={(e) => updateField("businessHours", e.target.value)}
                  />
                  {errors.businessHours && <p className="text-sm text-destructive">{errors.businessHours}</p>}
                </div>

                {/* About Us */}
                <div className="space-y-1.5">
                  <Label htmlFor="aboutUs">
                    About Us <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="aboutUs"
                    placeholder="Tell us about your business story, mission, and values..."
                    value={form.aboutUs}
                    onChange={(e) => updateField("aboutUs", e.target.value)}
                  />
                </div>

                {/* Special Things */}
                <div className="space-y-1.5">
                  <Label htmlFor="specialThings">
                    What Makes Your Business Special?{" "}
                    <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="specialThings"
                    placeholder="e.g. 15 years in business, fully licensed & insured, family-owned, 5-star rated..."
                    value={form.specialThings}
                    onChange={(e) => updateField("specialThings", e.target.value)}
                  />
                </div>

                {/* Instagram */}
                <div className="space-y-1.5">
                  <Label htmlFor="instagramLink">
                    Instagram Link <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="instagramLink"
                    placeholder="https://instagram.com/yourbusiness"
                    value={form.instagramLink}
                    onChange={(e) => updateField("instagramLink", e.target.value)}
                  />
                </div>

                {/* Facebook */}
                <div className="space-y-1.5">
                  <Label htmlFor="facebookLink">
                    Facebook Link <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="facebookLink"
                    placeholder="https://facebook.com/yourbusiness"
                    value={form.facebookLink}
                    onChange={(e) => updateField("facebookLink", e.target.value)}
                  />
                </div>

                {/* Discounts */}
                <div className="space-y-1.5">
                  <Label htmlFor="discounts">
                    Discounts for Return Customers{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      (we will use these to try to get repeat customers)
                    </span>
                  </Label>
                  <Textarea
                    id="discounts"
                    placeholder="e.g. $500 off your next service, 15% off your next maintenance request..."
                    value={form.discounts}
                    onChange={(e) => updateField("discounts", e.target.value)}
                  />
                </div>

                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label>
                    Upload Your Logo <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-24 w-auto rounded-lg border border-border object-contain bg-muted p-2"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:opacity-80 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
                    >
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload your logo</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG, or SVG (max 10MB)</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>

                {/* Need Logo */}
                <div className="space-y-2">
                  <Label>Do you need us to make you a logo?</Label>
                  <RadioGroup
                    value={form.needLogo}
                    onValueChange={(val) => updateField("needLogo", val)}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="needLogoYes" />
                      <Label htmlFor="needLogoYes" className="font-normal mb-0 cursor-pointer">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="needLogoNo" />
                      <Label htmlFor="needLogoNo" className="font-normal mb-0 cursor-pointer">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Terms & Submit */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeTerms"
                    checked={form.agreeTerms}
                    onCheckedChange={(checked) => updateField("agreeTerms", !!checked)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="agreeTerms" className="font-normal mb-0 cursor-pointer leading-relaxed text-sm">
                    I agree to the terms & conditions provided by the company. By providing my phone number, I agree to
                    receive text messages from the business. <span className="text-destructive">*</span>
                  </Label>
                </div>
                {errors.agreeTerms && <p className="text-sm text-destructive">{errors.agreeTerms}</p>}

                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OnboardingForm;
