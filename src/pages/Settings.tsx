import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import TrialBanner from "@/components/TrialBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building,
  Phone,
  Bot,
  Bell,
  User,
  Shield,
  Save,
  Plus,
  Trash2,
  Globe,
  Calendar,
  Zap,
  CheckCircle,
  XCircle,
  X,
  Settings as SettingsIcon,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WebhookInfo } from "@/components/WebhookInfo";
import NotificationSettings from "@/components/NotificationSettings";
import { WebsiteImporter } from "@/components/WebsiteImporter";
import { AddressInput } from "@/components/AddressAutocomplete";
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect";
import { getUserTimezone, getTimezoneFromAddress, getCommonTimezones } from "@/lib/timezone-utils";
import { handleRobustSignOut, cleanupAuthState } from "@/lib/auth-utils";
import { FeatureGate } from "@/components/FeatureGate";
import { useSubscription } from "@/hooks/useSubscription";
import { BillingSettings } from "@/components/BillingSettings";
import { CreditCard } from "lucide-react";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/phone-utils";

// Types
interface BusinessType {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
  display_order: number;
}

// Fixed: Removed servicesOffered and pricingStructure state variables

const Settings = () => {
  console.log("Settings component rendering...");
  const { user, loading, isAdmin, setSigningOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("business");
  const [showCalendarBanner, setShowCalendarBanner] = useState(false);
  const [calendarBannerType, setCalendarBannerType] = useState<"success" | "error">("success");
  const [calendarBannerMessage, setCalendarBannerMessage] = useState("");
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { featureAccess } = useSubscription();
  console.log("Settings state:", { user: user?.email, loading });

  // User Profile State
  const [userEmail, setUserEmail] = useState("");
  const [userFullName, setUserFullName] = useState("");
  const [userCompanyName, setUserCompanyName] = useState("");
  const [userTimezone, setUserTimezone] = useState("");
  const [authProvider, setAuthProvider] = useState<string>("");
  const [googleEmail, setGoogleEmail] = useState<string>("");
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string>("");

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // Business Info State
  const [businessSettingsId, setBusinessSettingsId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessTimezone, setBusinessTimezone] = useState("");
  const [businessTimezoneOffset, setBusinessTimezoneOffset] = useState("");
  const [businessHours, setBusinessHours] = useState([
    { id: 1, day: "monday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { id: 2, day: "tuesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { id: 3, day: "wednesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { id: 4, day: "thursday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { id: 5, day: "friday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
  ]);
  const [services, setServices] = useState<{ id?: string; name: string; price: string; description?: string }[]>([
    { name: "", price: "" },
  ]);

  const [addressData, setAddressData] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  // Call Settings State
  const [transferNumber, setTransferNumber] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [urgentKeywords, setUrgentKeywords] = useState("");
  const [autoForward, setAutoForward] = useState(false);
  const [assigningPhoneNumber, setAssigningPhoneNumber] = useState(false);

  // AI Settings State
  const [aiPersonality, setAiPersonality] = useState("professional");
  const [customGreeting, setCustomGreeting] = useState("");
  const [commonQuestionsAnswers, setCommonQuestionsAnswers] = useState<{ question: string; answer: string }[]>([
    { question: "", answer: "" },
  ]);
  const [appointmentBooking, setAppointmentBooking] = useState(false);
  const [leadCapture, setLeadCapture] = useState(true);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [descriptionUpdateTimeout, setDescriptionUpdateTimeout] = useState<NodeJS.Timeout | null>(null);

  // Account Deletion State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Settings State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [instantAlerts, setInstantAlerts] = useState(true);

  // Auto-save functionality
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Business Types State
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);

  // Validation error states for visual feedback
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({
    businessName: false,
    businessType: false,
    businessPhone: false,
    businessDescription: false,
    businessAddress: false,
    services: false,
    transferNumber: false,
  });

  // Refs for scrolling to error fields
  const businessNameRef = useRef<HTMLInputElement>(null);
  const businessTypeRef = useRef<HTMLButtonElement>(null);
  const businessPhoneRef = useRef<HTMLInputElement>(null);
  const businessDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const businessAddressRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);

  // Notifications state
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    // Load business types from database
    const loadBusinessTypes = async () => {
      const { data, error } = await supabase.from("business_types").select("*").eq("is_active", true);

      if (!error && data) {
        // Sort alphabetically by label
        const sortedData = [...data].sort((a, b) => a.label.localeCompare(b.label));
        setBusinessTypes(sortedData);
      }
    };

    loadBusinessTypes();

    if (!loading && !user) {
      navigate("/login");
    } else if (user) {
      loadUserSettings(user.id, user.email || "");
      fetchRecentActivity();
    }

    // Handle URL parameters for tab selection and calendar status
    const tab = searchParams.get("tab");
    const subTab = searchParams.get("subtab");
    const calendarStatus = searchParams.get("calendar_status");
    const errorMessage = searchParams.get("error");
    const onboardingComplete = searchParams.get("onboarding_complete");

    console.log("Settings URL params:", { tab, subTab });

    if (tab) {
      console.log("Setting activeTab to:", tab);
      setActiveTab(tab);
    }

    if (onboardingComplete === "true") {
      setShowOnboardingBanner(true);
      setActiveTab("business"); // Show business tab after onboarding

      // Clear URL parameter after processing
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("onboarding_complete");
      setSearchParams(newSearchParams, { replace: true });
    }

    if (calendarStatus) {
      setShowCalendarBanner(true);
      setCalendarBannerType(calendarStatus as "success" | "error");

      if (calendarStatus === "success") {
        setCalendarBannerMessage("Google Calendar connected successfully!");
      } else if (calendarStatus === "error") {
        setCalendarBannerMessage(errorMessage || "Failed to connect Google Calendar. Please try again.");
      }

      // Clear URL parameters after processing
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("calendar_status");
      newSearchParams.delete("error");
      if (!tab) newSearchParams.delete("tab");
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [loading, user, navigate, searchParams, setSearchParams]);

  const fetchRecentActivity = async () => {
    try {
      const { data: callMessages, error } = await supabase
        .from("call_messages")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentActivity(callMessages || []);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const loadUserSettings = async (userId: string, email: string) => {
    try {
      // Set email from parameter
      setUserEmail(email);

      // Get auth provider info and Google metadata
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      console.log("Full auth user data:", authUser);

      let detectedProvider = "";

      // Check all identities to see what auth methods are linked
      const identities = authUser?.identities || [];
      const hasEmailIdentity = identities.some((i) => i.provider === "email");
      const hasGoogleIdentity = identities.some((i) => i.provider === "google");

      // Set hasPassword based on email identity presence
      setHasPassword(hasEmailIdentity);

      if (authUser?.app_metadata?.provider) {
        console.log("Provider from app_metadata:", authUser.app_metadata.provider);
        detectedProvider = authUser.app_metadata.provider;
        setAuthProvider(detectedProvider);
      } else if (identities.length > 0) {
        detectedProvider = identities[0].provider;
        console.log("Provider from identities:", detectedProvider);
        setAuthProvider(detectedProvider);
      }

      console.log("Auth identities:", { hasEmailIdentity, hasGoogleIdentity, identities });

      // Extract Google profile data if provider is Google
      if (detectedProvider === "google") {
        console.log("Extracting Google data...");

        // Try to get data from identities first, then user_metadata
        const googleIdentity = authUser?.identities?.[0];
        const identityData = googleIdentity?.identity_data;
        const userMeta = authUser?.user_metadata;

        const googleEmail = identityData?.email || userMeta?.email || email;
        const googleAvatar =
          identityData?.avatar_url || identityData?.picture || userMeta?.avatar_url || userMeta?.picture || "";
        const googleFullName =
          identityData?.full_name || identityData?.name || userMeta?.full_name || userMeta?.name || "";

        console.log("Extracted Google data:", { googleEmail, googleAvatar, googleFullName });

        setGoogleEmail(googleEmail);
        setGoogleAvatarUrl(googleAvatar);

        // Auto-fill full name from Google if available
        if (googleFullName) {
          setUserFullName(googleFullName);
        }
      }

      // Load user profile data
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("full_name, company_name, timezone")
        .eq("id", userId)
        .maybeSingle();

      console.log("Profile data from DB:", profileData);

      if (profileData) {
        // Only override full name if it exists in the profile
        if (profileData.full_name) {
          setUserFullName(profileData.full_name);
        }
        setUserCompanyName(profileData.company_name || "");
        setUserTimezone(profileData.timezone || "");
      }

      // Load business settings
      const { data, error } = await supabase.from("business_settings").select("*").eq("user_id", userId).maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading settings:", error);
        return;
      }

      if (data) {
        setBusinessSettingsId(data.id);
        setBusinessName(data.business_name || "");
        setBusinessType(data.business_type || "");

        const loadedBusinessPhone = data.business_phone || "";
        setBusinessPhone(loadedBusinessPhone);

        // Clear validation error if loaded phone number is valid
        const businessPhoneDigits = loadedBusinessPhone.replace(/\D/g, "");
        if (businessPhoneDigits.length === 10) {
          setValidationErrors((prev) => ({ ...prev, businessPhone: false }));
        }

        setBusinessAddress(data.business_address || "");

        // Parse existing address
        if (data.business_address) {
          const parsedAddress = parseAddress(data.business_address);
          // If we have a state from Claude extraction, use that instead
          if (data.business_address_state_full) {
            // Convert full state name to abbreviation
            parsedAddress.state = convertStateNameToAbbreviation(data.business_address_state_full);
          }
          setAddressData(parsedAddress);
        } else if (data.business_address_state_full) {
          // If no full address but we have a state, set that
          setAddressData({
            street: "",
            city: "",
            state: convertStateNameToAbbreviation(data.business_address_state_full),
            zip: "",
          });
        }
        // Parse business hours
        if (data.business_hours) {
          try {
            const hoursData = JSON.parse(data.business_hours);
            if (Array.isArray(hoursData) && hoursData.length > 0) {
              // Ensure each hour entry has an id and proper structure
              const hoursWithIds = hoursData.map((hour, index) => ({
                id: hour.id || index + 1,
                day: hour.day || "monday",
                isOpen: hour.isOpen !== undefined ? hour.isOpen : true,
                openTime: hour.openTime || "09:00",
                closeTime: hour.closeTime || "17:00",
              }));
              setBusinessHours(hoursWithIds);
            } else {
              // No valid hours found, use M-F 9-5 default
              setBusinessHours([
                { id: 1, day: "monday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
                { id: 2, day: "tuesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
                { id: 3, day: "wednesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
                { id: 4, day: "thursday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
                { id: 5, day: "friday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
              ]);
            }
          } catch (e) {
            // Parsing failed, use M-F 9-5 default
            setBusinessHours([
              { id: 1, day: "monday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
              { id: 2, day: "tuesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
              { id: 3, day: "wednesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
              { id: 4, day: "thursday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
              { id: 5, day: "friday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
            ]);
          }
        } else {
          // No business hours in database, use M-F 9-5 default
          setBusinessHours([
            { id: 1, day: "monday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
            { id: 2, day: "tuesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
            { id: 3, day: "wednesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
            { id: 4, day: "thursday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
            { id: 5, day: "friday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
          ]);
        }
        setBusinessDescription(data.business_description || "");
        setBusinessWebsite(data.business_website || "");

        const loadedTransferNumber = data.transfer_number || "";
        setTransferNumber(loadedTransferNumber);

        // Clear validation error if loaded phone number is valid
        const transferDigits = loadedTransferNumber.replace(/\D/g, "");
        if (transferDigits.length === 10) {
          setValidationErrors((prev) => ({ ...prev, transferNumber: false }));
        }

        setTwilioPhoneNumber(data.twilio_phone_number || "");
        setUrgentKeywords(data.urgent_keywords || "");
        setAutoForward(data.auto_forward || false);

        setAiPersonality(data.ai_personality || "professional");
        setCustomGreeting(data.custom_greeting || "");

        // Parse common questions from old format or new format
        if (data.common_questions) {
          try {
            const parsed = JSON.parse(data.common_questions);
            if (Array.isArray(parsed)) {
              setCommonQuestionsAnswers(parsed.length > 0 ? parsed : [{ question: "", answer: "" }]);
            } else {
              // Old format - convert text to array
              setCommonQuestionsAnswers([{ question: "", answer: "" }]);
            }
          } catch {
            // If not JSON, treat as old format
            setCommonQuestionsAnswers([{ question: "", answer: "" }]);
          }
        }

        setAppointmentBooking(data.appointment_booking || false);
        setLeadCapture(data.lead_capture !== false);
        setEmailNotifications(data.email_notifications !== false);
        setSmsNotifications(data.sms_notifications || false);
        setPushNotifications(data.push_notifications !== false);
        setInstantAlerts(data.instant_alerts !== false);
        setBusinessTimezone(data.business_timezone || "");
        setBusinessTimezoneOffset(data.business_timezone_offset || "");

        // Load services from the new services table
        await loadServices(data.id);
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
    }
  };

  const handleAssignPhoneNumber = async () => {
    if (!businessSettingsId) {
      toast({
        title: "Error",
        description: "Business settings not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setAssigningPhoneNumber(true);
    try {
      // Extract area code from business phone
      let areaCode = "800"; // Default fallback
      if (businessPhone) {
        const phoneMatch = businessPhone.match(/\(?(\d{3})\)?/);
        if (phoneMatch && phoneMatch[1]) {
          areaCode = phoneMatch[1];
        }
      } else if (businessAddress) {
        // Try to extract ZIP code and convert to area code
        const zipMatch = businessAddress.match(/\b(\d{5})\b/);
        if (zipMatch && zipMatch[1]) {
          const zip = zipMatch[1];
          // Common mappings (simplified)
          if (zip.startsWith("1"))
            areaCode = "212"; // NY
          else if (zip.startsWith("2"))
            areaCode = "202"; // DC
          else if (zip.startsWith("3"))
            areaCode = "404"; // GA
          else if (zip.startsWith("4"))
            areaCode = "502"; // KY
          else if (zip.startsWith("6"))
            areaCode = "312"; // IL
          else if (zip.startsWith("7"))
            areaCode = "214"; // TX
          else if (zip.startsWith("8"))
            areaCode = "303"; // CO
          else if (zip.startsWith("9")) areaCode = "206"; // WA
        }
      }

      console.log("Requesting phone number with area code:", areaCode);

      const { data, error } = await supabase.functions.invoke("purchase-twilio-number", {
        body: {
          areaCode: areaCode,
          businessId: businessSettingsId,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.phoneNumber) {
        setTwilioPhoneNumber(data.phoneNumber);
        toast({
          title: "Phone number assigned!",
          description: `Your Junie phone number is ${data.phoneNumber}`,
        });
      } else {
        throw new Error("Failed to assign phone number");
      }
    } catch (error: any) {
      console.error("Error assigning phone number:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign phone number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssigningPhoneNumber(false);
    }
  };

  const loadServices = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error loading services:", error);
        return;
      }

      if (data && data.length > 0) {
        setServices(
          data.map((service) => ({
            id: service.id,
            name: service.name,
            price: service.price || "",
            description: service.description || "",
          })),
        );
      } else {
        setServices([{ name: "", price: "", description: "" }]);
      }
    } catch (error) {
      console.error("Error loading services:", error);
    }
  };

  const serviceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addService = () => {
    setServices([...services, { name: "", price: "", description: "" }]);
    // Focus on the new service input after state update
    setTimeout(() => {
      const newIndex = services.length;
      serviceInputRefs.current[newIndex]?.focus();
    }, 0);
  };

  const removeService = async (index: number) => {
    if (services.length > 1) {
      const serviceToRemove = services[index];

      // If service has an ID, delete from database
      if (serviceToRemove.id && businessSettingsId) {
        try {
          await supabase.from("services").delete().eq("id", serviceToRemove.id);
        } catch (error) {
          console.error("Error deleting service:", error);
        }
      }

      setServices(services.filter((_, i) => i !== index));
    }
  };

  const updateService = (index: number, field: "name" | "price" | "description", value: string) => {
    const newServices = [...services];

    // Validate price input to allow only numbers and decimal points
    if (field === "price") {
      const numericValue = value.replace(/[^\d.]/g, "");
      // Prevent multiple decimal points
      const parts = numericValue.split(".");
      if (parts.length > 2) {
        return; // Don't update if multiple decimal points
      }
      newServices[index][field] = numericValue;
    } else {
      newServices[index][field] = value;
    }

    setServices(newServices);
  };

  // Common Questions management functions
  const questionInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addQuestionAnswer = () => {
    setCommonQuestionsAnswers([...commonQuestionsAnswers, { question: "", answer: "" }]);
    setTimeout(() => {
      const newIndex = commonQuestionsAnswers.length;
      questionInputRefs.current[newIndex]?.focus();
    }, 0);
  };

  const removeQuestionAnswer = (index: number) => {
    if (commonQuestionsAnswers.length > 1) {
      setCommonQuestionsAnswers(commonQuestionsAnswers.filter((_, i) => i !== index));
    }
  };

  const updateQuestionAnswer = (index: number, field: "question" | "answer", value: string) => {
    const newQA = [...commonQuestionsAnswers];
    newQA[index][field] = value;
    setCommonQuestionsAnswers(newQA);
  };

  const generateBusinessDescription = async () => {
    if (!businessName || !businessType) {
      toast({
        title: "Missing Information",
        description: "Please fill in business name and type first to generate a description.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-business-description", {
        body: {
          businessName,
          businessType,
          services: services.filter((s) => s.name.trim()),
          address:
            addressData.street && addressData.city
              ? `${addressData.street}, ${addressData.city}, ${addressData.state}`
              : businessAddress,
          phone: businessPhone,
        },
      });

      if (error) {
        console.error("Error generating description:", error);
        throw new Error(error.message || "Failed to generate description");
      }

      if (data?.description) {
        setBusinessDescription(data.description);
        toast({
          title: "Description Generated!",
          description: "AI has generated a compelling business description for you.",
        });
      }
    } catch (error) {
      console.error("Error generating business description:", error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const autoUpdateDescription = async (newBusinessName: string) => {
    if (!newBusinessName || !businessType || !businessSettingsId) return;

    try {
      const { data, error } = await supabase.functions.invoke("generate-business-description", {
        body: {
          businessName: newBusinessName,
          businessType,
          services: services.filter((s) => s.name.trim()),
          address:
            addressData.street && addressData.city
              ? `${addressData.street}, ${addressData.city}, ${addressData.state}`
              : businessAddress,
          phone: businessPhone,
        },
      });

      if (data?.description && !error) {
        setBusinessDescription(data.description);
        toast({
          title: "Description Auto-Updated",
          description: "Business description updated with new business name.",
        });
      }
    } catch (error) {
      console.error("Auto-update description failed:", error);
    }
  };

  const updateBusinessHours = (id: number, field: keyof (typeof businessHours)[0], value: string | boolean) => {
    const newHours = businessHours.map((hour) => (hour.id === id ? { ...hour, [field]: value } : hour));
    setBusinessHours(newHours);
    debouncedAutoSave("Business");
  };

  const addBusinessHours = () => {
    const newId = Math.max(...businessHours.map((h) => h.id), 0) + 1;
    setBusinessHours([
      ...businessHours,
      {
        id: newId,
        day: "monday",
        isOpen: true,
        openTime: "09:00",
        closeTime: "17:00",
      },
    ]);
  };

  const removeBusinessHours = (id: number) => {
    if (businessHours.length > 1) {
      setBusinessHours(businessHours.filter((hour) => hour.id !== id));
    }
  };

  const validateTime = (openTime: string, closeTime: string): boolean => {
    const open = new Date(`2000-01-01T${openTime}:00`);
    const close = new Date(`2000-01-01T${closeTime}:00`);

    // Check if times are valid (between 00:00 and 23:59)
    if (openTime < "00:00" || openTime > "23:59" || closeTime < "00:00" || closeTime > "23:59") {
      return false;
    }

    // Check if close time is after open time (same day only)
    return close > open;
  };

  const getTimeValidationMessage = (openTime: string, closeTime: string): string | null => {
    if (!validateTime(openTime, closeTime)) {
      if (openTime >= closeTime) {
        return "Closing time must be after opening time (same-day hours only)";
      }
      return "Invalid time range";
    }
    return null;
  };

  const saveServices = async (businessId: string) => {
    try {
      // Delete existing services first
      await supabase.from("services").delete().eq("business_id", businessId);

      // Insert new services
      const servicesToSave = services
        .filter((service) => service.name.trim())
        .map((service, index) => ({
          business_id: businessId,
          name: service.name.trim(),
          price: service.price || null,
          description: service.description || null,
          display_order: index,
        }));

      if (servicesToSave.length > 0) {
        const { error } = await supabase.from("services").insert(servicesToSave);

        if (error) {
          console.error("Error saving services:", error);
          throw error;
        }
      }
    } catch (error) {
      console.error("Error saving services:", error);
      throw error;
    }
  };

  const dayNames = {
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
  };

  // Auto-save function with debouncing
  const debouncedAutoSave = useCallback(
    (section: string) => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      const timeout = setTimeout(async () => {
        if (!user) return;

        setIsAutoSaving(true);
        try {
          // Pass skipValidation=true for auto-save to prevent validation errors
          await saveSettingsInternal(section, true);
          toast({
            title: "Settings saved",
            description: "Your changes have been automatically saved.",
          });
        } catch (error) {
          console.error("Auto-save failed:", error);
          toast({
            title: "Auto-save failed",
            description: "There was an error saving your settings. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsAutoSaving(false);
        }
      }, 3000);

      setAutoSaveTimeout(timeout);
    },
    [autoSaveTimeout, user, toast],
  );

  const saveSettings = async (section: string) => {
    if (!user) return;

    setSaving(true);
    try {
      await saveSettingsInternal(section);
      toast({
        title: "Settings saved successfully!",
        description: `Your ${section.toLowerCase()} settings have been updated.`,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      // Only show generic error if it's not a validation error (validation errors show their own toasts)
      if (!(error instanceof Error && error.message.startsWith("Validation failed"))) {
        toast({
          title: "Error saving settings",
          description: "There was an error saving your settings. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const saveSettingsInternal = async (section: string, skipValidation = false) => {
    if (!user) return;

    // Handle Profile section separately as it updates user_profiles table
    if (section === "Profile") {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          full_name: userFullName,
          company_name: userCompanyName,
          timezone: userTimezone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Profile updated",
        description: "Your profile settings have been updated successfully.",
      });
      return;
    }

    let updateData: any = {};

    if (section === "Business") {
      // Always validate business name and phone number
      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      const businessPhoneTrimmed = businessPhone?.trim();
      const isValidPhone = !businessPhoneTrimmed || phoneRegex.test(businessPhoneTrimmed);
      
      if (!businessName?.trim()) {
        toast({
          title: "Validation Error",
          description: "Business name is required",
          variant: "destructive",
        });
        if (businessNameRef.current) {
          businessNameRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          businessNameRef.current.focus();
        }
        throw new Error("Business name is required");
      }
      
      if (!businessPhoneTrimmed || !isValidPhone) {
        toast({
          title: "Validation Error",
          description: businessPhoneTrimmed ? "Phone number format is invalid" : "Business phone is required",
          variant: "destructive",
        });
        if (businessPhoneRef.current) {
          businessPhoneRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          businessPhoneRef.current.focus();
        }
        throw new Error("Business phone is required");
      }

      // Skip validation for auto-save, only validate on manual save
      if (!skipValidation) {
        // Validate ALL fields at once and collect errors
        console.log("=== VALIDATION DEBUG ===");
        console.log("Raw businessType value:", JSON.stringify(businessType));
        console.log("businessType type:", typeof businessType);
        console.log("businessType length:", businessType?.length);
        console.log("Validating business fields:", { businessName, businessType, businessPhone, businessDescription });

        const requiredFields = {
          businessName: businessName?.trim(),
          businessType: businessType?.trim() || (!businessType ? "" : businessType),
          businessPhone: businessPhone?.trim(),
          businessDescription: businessDescription?.trim(),
        };

        console.log("Required fields after processing:", requiredFields);

        // Validate services
        const validServices = services.filter((s) => s.name.trim() !== "");
        const invalidServices = validServices.filter((s) => {
          const priceValue = s.price.trim();
          return !priceValue || isNaN(parseFloat(priceValue)) || parseFloat(priceValue) <= 0;
        });

        // Validate address fields
        console.log("=== ADDRESS VALIDATION DEBUG ===");
        console.log("addressData:", JSON.stringify(addressData));

        const missingAddressFields = [];
        if (!addressData.street?.trim()) missingAddressFields.push("street address");
        if (!addressData.city?.trim()) missingAddressFields.push("city");
        if (!addressData.state?.trim()) missingAddressFields.push("state");
        if (!addressData.zip?.trim()) missingAddressFields.push("ZIP code");

        console.log("Missing address fields:", missingAddressFields);

        // Validate ZIP code format (must be exactly 5 digits)
        const zipRegex = /^\d{5}$/;
        const isValidZip = addressData.zip?.trim() && zipRegex.test(addressData.zip.trim());

        console.log("ZIP validation:", { zip: addressData.zip, isValidZip });

        // Collect ALL validation errors
        const newValidationErrors = {
          businessName: !requiredFields.businessName || requiredFields.businessName === "",
          businessType: !requiredFields.businessType || requiredFields.businessType === "",
          businessPhone: !requiredFields.businessPhone || requiredFields.businessPhone === "" || !isValidPhone,
          businessDescription: !requiredFields.businessDescription || requiredFields.businessDescription === "",
          businessAddress: missingAddressFields.length > 0 || !isValidZip,
          services: invalidServices.length > 0 || validServices.length === 0,
        };

        // Build error messages for all issues
        const errorMessages: string[] = [];

        if (
          newValidationErrors.businessName ||
          newValidationErrors.businessType ||
          newValidationErrors.businessPhone ||
          newValidationErrors.businessDescription
        ) {
          const missingFields = [];
          if (newValidationErrors.businessName) missingFields.push("Business Name");
          if (newValidationErrors.businessType) missingFields.push("Business Type");
          if (newValidationErrors.businessPhone) {
            missingFields.push(
              requiredFields.businessPhone && !isValidPhone ? "Phone Number (invalid format)" : "Phone Number",
            );
          }
          if (newValidationErrors.businessDescription) missingFields.push("Business Description");
          errorMessages.push(`Missing/Invalid: ${missingFields.join(", ")}`);
        }

        if (newValidationErrors.businessAddress) {
          if (missingAddressFields.length > 0) {
            errorMessages.push(`Address: ${missingAddressFields.join(", ")}`);
          }
          if (!isValidZip && addressData.zip?.trim()) {
            errorMessages.push("ZIP code must be exactly 5 digits");
          }
        }

        if (newValidationErrors.services) {
          if (validServices.length === 0) {
            errorMessages.push("At least one service required");
          } else if (invalidServices.length > 0) {
            errorMessages.push(`${invalidServices.length} service(s) have invalid prices`);
          }
        }

        // If there are ANY errors, show them all and stop
        if (errorMessages.length > 0) {
          setValidationErrors(newValidationErrors);

          toast({
            title: "Validation Errors",
            description: errorMessages.join(" • "),
            variant: "destructive",
            duration: 5000,
          });

          // Scroll to first error field
          if (newValidationErrors.businessName && businessNameRef.current) {
            businessNameRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            businessNameRef.current.focus();
          } else if (newValidationErrors.businessType && businessTypeRef.current) {
            businessTypeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (newValidationErrors.businessPhone && businessPhoneRef.current) {
            businessPhoneRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            businessPhoneRef.current.focus();
          } else if (newValidationErrors.businessDescription && businessDescriptionRef.current) {
            businessDescriptionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            businessDescriptionRef.current.focus();
          } else if (newValidationErrors.businessAddress && businessAddressRef.current) {
            businessAddressRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (newValidationErrors.services && servicesRef.current) {
            servicesRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          }

          throw new Error("Validation failed: Multiple fields require attention");
        }

        console.log("VALIDATION PASSED");
      }

      // After validation passes, we can safely use validServices
      const finalValidServices = services.filter((s) => s.name.trim() !== "");

      // Combine address fields into a single address string
      const fullAddress = [addressData.street, addressData.city, addressData.state, addressData.zip]
        .filter(Boolean)
        .join(", ");

      // Clear validation errors if we reach here
      setValidationErrors({
        businessName: false,
        businessType: false,
        businessPhone: false,
        businessDescription: false,
        businessAddress: false,
        services: false,
      });

      // Auto-detect timezone if not set
      let timezone = businessTimezone;
      let timezoneOffset = businessTimezoneOffset;

      if (!timezone && fullAddress) {
        const detectedTz = getTimezoneFromAddress(fullAddress);
        timezone = detectedTz.timezone;
        timezoneOffset = detectedTz.offset;
        setBusinessTimezone(timezone);
        setBusinessTimezoneOffset(timezoneOffset);
      } else if (!timezone) {
        const userTz = getUserTimezone();
        timezone = userTz.timezone;
        timezoneOffset = userTz.offset;
        setBusinessTimezone(timezone);
        setBusinessTimezoneOffset(timezoneOffset);
      }

      updateData = {
        business_name: businessName,
        business_type: businessType,
        business_phone: normalizePhoneNumber(businessPhone),
        business_address: fullAddress,
        street_address: addressData.street,
        city: addressData.city,
        state: addressData.state,
        zip_code: addressData.zip,
        business_hours: JSON.stringify(businessHours),
        business_description: businessDescription,
        business_website: businessWebsite,
        business_timezone: timezone,
        business_timezone_offset: timezoneOffset,
        services_offered: JSON.stringify(finalValidServices),
        pricing_structure: finalValidServices.map((s) => `${s.name}: ${s.price}`).join(", "),
      };
    } else if (section === "Call") {
      // Validate transfer number
      const digitsOnly = transferNumber?.replace(/\D/g, "") || "";

      if (!transferNumber || !transferNumber.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Emergency Transfer Number is required",
        });
        setValidationErrors((prev) => ({ ...prev, transferNumber: true }));
        return;
      }

      if (digitsOnly.length !== 10) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Transfer number must be exactly 10 digits",
        });
        setValidationErrors((prev) => ({ ...prev, transferNumber: true }));
        return;
      }

      updateData = {
        transfer_number: normalizePhoneNumber(transferNumber),
        urgent_keywords: urgentKeywords,
        auto_forward: autoForward,
        common_questions: JSON.stringify(commonQuestionsAnswers.filter((qa) => qa.question.trim() || qa.answer.trim())),
      };
    } else if (section === "AI Assistant") {
      updateData = {
        ai_personality: aiPersonality,
        custom_greeting: customGreeting,
        appointment_booking: appointmentBooking,
        lead_capture: leadCapture,
      };
    } else if (section === "Notifications") {
      updateData = {
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications,
        push_notifications: pushNotifications,
        instant_alerts: instantAlerts,
      };
    }

    const { data, error } = await supabase
      .from("business_settings")
      .upsert(
        {
          user_id: user.id,
          ...updateData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Save services to the new services table if this is Business section
    if (section === "Business" && data?.id) {
      await saveServices(data.id);
      setBusinessSettingsId(data.id);
    }
  };

  const convertStateNameToAbbreviation = (stateName: string): string => {
    const stateMap: Record<string, string> = {
      Alabama: "AL",
      Alaska: "AK",
      Arizona: "AZ",
      Arkansas: "AR",
      California: "CA",
      Colorado: "CO",
      Connecticut: "CT",
      Delaware: "DE",
      Florida: "FL",
      Georgia: "GA",
      Hawaii: "HI",
      Idaho: "ID",
      Illinois: "IL",
      Indiana: "IN",
      Iowa: "IA",
      Kansas: "KS",
      Kentucky: "KY",
      Louisiana: "LA",
      Maine: "ME",
      Maryland: "MD",
      Massachusetts: "MA",
      Michigan: "MI",
      Minnesota: "MN",
      Mississippi: "MS",
      Missouri: "MO",
      Montana: "MT",
      Nebraska: "NE",
      Nevada: "NV",
      "New Hampshire": "NH",
      "New Jersey": "NJ",
      "New Mexico": "NM",
      "New York": "NY",
      "North Carolina": "NC",
      "North Dakota": "ND",
      Ohio: "OH",
      Oklahoma: "OK",
      Oregon: "OR",
      Pennsylvania: "PA",
      "Rhode Island": "RI",
      "South Carolina": "SC",
      "South Dakota": "SD",
      Tennessee: "TN",
      Texas: "TX",
      Utah: "UT",
      Vermont: "VT",
      Virginia: "VA",
      Washington: "WA",
      "West Virginia": "WV",
      Wisconsin: "WI",
      Wyoming: "WY",
      "District of Columbia": "DC",
    };

    // Return the abbreviation if found, otherwise return the original value (might already be abbreviated)
    return stateMap[stateName] || stateName;
  };

  const parseAddress = (addressString: string) => {
    if (!addressString) return { street: "", city: "", state: "", zip: "" };

    const parts = addressString.split(",").map((part) => part.trim());

    if (parts.length >= 3) {
      const street = parts[0] || "";
      const city = parts[1] || "";

      // Handle both 3-part and 4-part addresses
      if (parts.length === 3) {
        // Format: Street, City, State ZIP
        const stateZip = parts[2] || "";
        const stateZipMatch = stateZip.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
        const state = stateZipMatch ? stateZipMatch[1] : stateZip;
        const zip = stateZipMatch ? stateZipMatch[2] : "";
        return { street, city, state, zip };
      } else if (parts.length >= 4) {
        // Format: Street, City, State, ZIP (or USA/Country)
        const state = parts[2] || "";
        let zip = parts[3] || "";

        // If the 4th part is "USA" or not a valid zip, try to find zip in the 3rd part
        if (zip === "USA" || zip === "United States" || !/^\d{5}(-\d{4})?$/.test(zip)) {
          // Try to extract zip from state field
          const stateZipMatch = state.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
          if (stateZipMatch) {
            return { street, city, state: stateZipMatch[1], zip: stateZipMatch[2] };
          }
          // No valid zip found
          return { street, city, state, zip: "" };
        }

        return { street, city, state, zip };
      }
    }

    return { street: addressString, city: "", state: "", zip: "" };
  };

  const handleAddressSelect = (selectedAddress: string) => {
    setBusinessAddress(selectedAddress);

    // Auto-detect timezone when address changes (only if not manually set)
    if (!businessTimezone || businessTimezone === getUserTimezone().timezone) {
      const detectedTz = getTimezoneFromAddress(selectedAddress);
      setBusinessTimezone(detectedTz.timezone);
      setBusinessTimezoneOffset(detectedTz.offset);
    }
  };

  const handleWebsiteDataExtracted = async (extractedData: any) => {
    if (extractedData.business_name) setBusinessName(extractedData.business_name);
    if (extractedData.business_phone) setBusinessPhone(extractedData.business_phone);
    if (extractedData.business_address) {
      setBusinessAddress(extractedData.business_address);
      // Auto-detect timezone from address
      const detectedTz = getTimezoneFromAddress(extractedData.business_address);
      if (!businessTimezone) {
        setBusinessTimezone(detectedTz.timezone);
        setBusinessTimezoneOffset(detectedTz.offset);
      }
    }
    if (extractedData.business_description) setBusinessDescription(extractedData.business_description);
    if (extractedData.business_website) setBusinessWebsite(extractedData.business_website);

    // Always clear business type on import so user starts fresh
    setBusinessType("");

    if (extractedData.address) {
      setAddressData(extractedData.address);
    }
    if (extractedData.business_hours) {
      // Try to parse the hours into structured format
      setBusinessHours((prev) => [
        ...prev,
        {
          id: Math.max(...prev.map((h) => h.id), 0) + 1,
          day: "monday",
          isOpen: true,
          openTime: "09:00",
          closeTime: "17:00",
        },
      ]);
    }
    if (extractedData.services_offered) {
      const servicesText = extractedData.services_offered;
      const servicesList = servicesText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s);
      if (servicesList.length > 0) {
        setServices(servicesList.slice(0, 5).map((service) => ({ name: service, price: "" })));
      }
    }

    // Auto-generate description after import if we have enough data
    if (extractedData.business_name && extractedData.business_type) {
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke("generate-business-description", {
            body: {
              businessName: extractedData.business_name,
              businessType: extractedData.business_type,
              services: extractedData.services_offered
                ? extractedData.services_offered
                    .split(/[,\n]/)
                    .map((s) => s.trim())
                    .filter((s) => s)
                    .map((name) => ({ name }))
                : [],
              address: extractedData.business_address,
              phone: extractedData.business_phone,
            },
          });

          if (data?.description && !error) {
            setBusinessDescription(data.description);
            toast({
              title: "AI Description Generated",
              description: "A compelling business description has been auto-generated for you.",
            });
          }
        } catch (error) {
          console.error("Auto-generation failed:", error);
          // Silently fail - don't show error to user
        }
      }, 1000); // Small delay to let other data populate first
    }
  };

  const handleUpdatePassword = async () => {
    // Validation
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please enter and confirm your new password",
      });
      return;
    }

    // If user has password, require current password
    if (hasPassword && !currentPassword) {
      toast({
        variant: "destructive",
        title: "Current password required",
        description: "Please enter your current password",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "New password and confirmation must match",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters long",
      });
      return;
    }

    setUpdatingPassword(true);

    try {
      // If user already has a password, verify current password
      if (hasPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        });

        if (signInError) {
          toast({
            variant: "destructive",
            title: "Incorrect password",
            description: "Your current password is incorrect",
          });
          setUpdatingPassword(false);
          return;
        }
      }

      // Update/Set password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Update hasPassword state if this was first time setting password
      if (!hasPassword) {
        setHasPassword(true);
      }

      toast({
        title: hasPassword ? "Password updated" : "Password set successfully",
        description: hasPassword
          ? "Your password has been successfully updated"
          : "You can now sign in with email and password, in addition to Google",
      });
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${hasPassword ? "update" : "set"} password`,
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);

    try {
      // Initiate account deletion BEFORE signing out (while token is still valid)
      const { error: deleteError } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });

      if (deleteError) {
        throw deleteError;
      }

      // Set flag for account deletion banner
      sessionStorage.setItem("accountDeleted", "true");

      // After deletion is initiated, sign out
      setSigningOut(true);
      await handleRobustSignOut(supabase, setSigningOut);
    } catch (error: any) {
      console.error("Error during account deletion:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
      setShowDeleteDialog(false);
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-subtle overflow-x-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          {/* Mobile Layout */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Link to="/" className="flex items-center flex-shrink-0">
                <img src="/lovable-uploads/junie-logo.png" alt="Junie Logo" className="h-6 w-6 sm:h-8 sm:w-8" />
              </Link>
              <h1 className="text-sm sm:text-base font-bold text-primary truncate">Settings</h1>
            </div>

            <div className="flex items-center space-x-1">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/admin")}
                  className="text-primary hover:bg-primary/10 h-8 w-8"
                >
                  <Shield className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate("/dashboard")} className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bell className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 3).map((activity) => (
                      <DropdownMenuItem key={activity.id} className="cursor-pointer">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">
                            {activity.caller_name} - {activity.call_type}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.message.substring(0, 60)}...</p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      <p className="text-sm text-muted-foreground">No recent notifications</p>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await handleRobustSignOut(supabase, setSigningOut);
                  } catch (error: any) {
                    window.location.href = "/";
                  }
                }}
                className="h-8 w-8 p-0"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center">
                <img src="/lovable-uploads/junie-logo.png" alt="Junie Logo" className="h-8 w-8" />
              </Link>
              <h1 className="text-xl font-bold text-primary">Settings</h1>
            </div>

            <div className="flex items-center space-x-4">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="text-primary hover:bg-primary/10"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Bell className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 3).map((activity) => (
                      <DropdownMenuItem key={activity.id} className="cursor-pointer">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">
                            {activity.caller_name} - {activity.call_type}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.message.substring(0, 60)}...</p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      <p className="text-sm text-muted-foreground">No recent notifications</p>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await handleRobustSignOut(supabase, setSigningOut);
                  } catch (error: any) {
                    window.location.href = "/";
                  }
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Trial Banner - Show at the top */}
      {user && (
        <div className="container mx-auto px-4 pt-4">
          <TrialBanner />
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-full overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-muted-foreground mb-2">Account Settings</h2>
            <p className="text-muted-foreground">Configure your Junie assistant and account preferences.</p>
          </div>

          {/* Upgrade Dialog */}
          <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
                <AlertDialogDescription>
                  This feature is available on the Scale plan. Upgrade your plan to access this feature.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowUpgradeDialog(false);
                    navigate("/pricing");
                  }}
                >
                  View Plans
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Onboarding Success Banner */}
          {showOnboardingBanner && (
            <div className="p-4 rounded-lg border mb-6 bg-green-50 border-green-200 text-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">
                    Successfully signed up! Please review and complete your business information below.
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOnboardingBanner(false)}
                  className="h-6 w-6 p-0 hover:bg-green-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Calendar Connection Banner */}
          {showCalendarBanner && (
            <div
              className={`p-4 rounded-lg border mb-6 ${
                calendarBannerType === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {calendarBannerType === "success" ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span className="font-medium">{calendarBannerMessage}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowCalendarBanner(false)} className="h-6 w-6 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              // Check if user has access to Calendar tab
              if (value === "setup" && !featureAccess.appointmentScheduling) {
                setShowUpgradeDialog(true);
                return;
              }
              setActiveTab(value);
            }}
          >
            <TabsList className="grid w-full grid-cols-5 mb-6 p-1 h-auto">
              <TabsTrigger value="account" className="flex items-center gap-2 py-3.5">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-2 py-3.5">
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline">Business</span>
              </TabsTrigger>
              <TabsTrigger value="calls" className="flex items-center gap-2 py-3.5">
                <Bot className="w-4 h-4" />
                <span className="hidden sm:inline">AI Caller</span>
              </TabsTrigger>
              <TabsTrigger
                value="setup"
                className={`flex items-center gap-2 py-3.5 ${!featureAccess.appointmentScheduling ? "text-muted-foreground/50" : ""}`}
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Calendar {!featureAccess.appointmentScheduling && "(Pro)"}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 py-3.5">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>

            {/* Account (User Profile + Billing) */}
            <TabsContent value="account" className="space-y-6">
              <Tabs
                value={searchParams.get("subtab") || "profile"}
                onValueChange={(value) => {
                  const newSearchParams = new URLSearchParams(searchParams);
                  newSearchParams.set("subtab", value);
                  setSearchParams(newSearchParams, { replace: true });
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="billing">Plan and Billing</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center">
                          <User className="w-5 h-5 mr-2" />
                          User Profile
                        </CardTitle>
                        {/* <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/setup-guide")}
                          className="flex items-center gap-2 bg-gradient-primary hover:opacity-90 text-white border-none"
                        >
                          <Zap className="w-4 h-4" />
                          Setup Guide
                        </Button> */}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="userEmail">Email Address</Label>
                        <Input id="userEmail" type="email" value={userEmail} disabled className="bg-muted" />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed. Contact support if you need to update it.
                        </p>
                      </div>

                      {authProvider === "google" && (
                        <div className="space-y-2">
                          <Label>Connected Account</Label>
                          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            {googleAvatarUrl && (
                              <img
                                src={googleAvatarUrl}
                                alt="Google Profile"
                                className="w-10 h-10 rounded-full border-2 border-primary/20"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="bg-white flex items-center gap-1.5">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                      fill="#4285F4"
                                    />
                                    <path
                                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                      fill="#34A853"
                                    />
                                    <path
                                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                      fill="#FBBC05"
                                    />
                                    <path
                                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                      fill="#EA4335"
                                    />
                                  </svg>
                                  Google
                                </Badge>
                              </div>
                              <p className="text-sm font-medium truncate">{googleEmail}</p>
                              <p className="text-xs text-muted-foreground">Authenticated via Google</p>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (
                                  confirm(
                                    "Disconnect your Google account? This will also disconnect Google Calendar and sign you out.",
                                  )
                                ) {
                                  try {
                                    // Disconnect Google Calendar first
                                    const { error: calendarError } = await supabase
                                      .from("google_calendar_settings")
                                      .update({
                                        is_connected: false,
                                        expires_at: null,
                                        calendar_id: null,
                                      })
                                      .eq("user_id", user?.id);

                                    if (calendarError) {
                                      console.error("Error disconnecting calendar:", calendarError);
                                    }

                                    // Sign out and redirect
                                    await handleRobustSignOut(supabase);
                                  } catch (error) {
                                    console.error("Error disconnecting account:", error);
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description: "Failed to disconnect account",
                                    });
                                  }
                                }
                              }}
                            >
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="userFullName">Full Name</Label>
                          <Input
                            id="userFullName"
                            value={userFullName}
                            onChange={(e) => {
                              setUserFullName(e.target.value);
                              debouncedAutoSave("Profile");
                            }}
                            placeholder="Your full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="userCompanyName">Company Name</Label>
                          <Input
                            id="userCompanyName"
                            value={userCompanyName}
                            onChange={(e) => {
                              setUserCompanyName(e.target.value);
                              debouncedAutoSave("Profile");
                            }}
                            placeholder="Your company name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="userTimezone">Timezone</Label>
                        <Select
                          value={userTimezone}
                          onValueChange={(value) => {
                            setUserTimezone(value);
                            debouncedAutoSave("Profile");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCommonTimezones().map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Password Management - Available for all users */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        {hasPassword ? "Change Password" : "Set Password"}
                      </CardTitle>
                      {authProvider === "google" && !hasPassword && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Set a password to enable email/password login alongside Google sign-in
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {hasPassword && (
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <p className="text-xs text-muted-foreground">Must be at least 6 characters long</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>

                      <Button
                        onClick={handleUpdatePassword}
                        disabled={
                          updatingPassword || !newPassword || !confirmPassword || (hasPassword && !currentPassword)
                        }
                        className="w-full"
                      >
                        {updatingPassword
                          ? hasPassword
                            ? "Updating..."
                            : "Setting..."
                          : hasPassword
                            ? "Update Password"
                            : "Set Password"}
                      </Button>

                      {authProvider === "google" && !hasPassword && (
                        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                          💡 After setting a password, you'll be able to sign in using either Google OAuth or
                          email/password
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Danger Zone - Account Deletion */}
                  <Card className="border-destructive/50">
                    <CardHeader>
                      <CardTitle className="flex items-center text-destructive">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Danger Zone
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground">Delete Account</h3>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                          <li>Your Stripe subscription will be cancelled</li>
                          <li>All business settings and data will be deleted</li>
                          <li>Call logs and recordings will be permanently removed</li>
                          <li>This action is irreversible</li>
                        </ul>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        className="w-full sm:w-auto"
                        disabled={isAdmin}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                      {isAdmin && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Admin accounts cannot be deleted through the UI for security reasons.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="billing" className="space-y-6">
                  <BillingSettings />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Business Information */}
            <TabsContent value="business" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Business Information
                    </CardTitle>
                    {/* <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate("/setup-guide")}
                      className="flex items-center gap-2 bg-gradient-primary hover:opacity-90 text-white border-none"
                    >
                      <Zap className="w-4 h-4" />
                      Setup Guide
                    </Button> */}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <WebsiteImporter onDataExtracted={handleWebsiteDataExtracted} className="mb-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">
                        Business Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="businessName"
                        ref={businessNameRef}
                        value={businessName}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setBusinessName(newName);
                          debouncedAutoSave("Business");
                          // Auto-update description when business name changes (with debounce)
                          if (newName && businessType && businessSettingsId) {
                            if (descriptionUpdateTimeout) {
                              clearTimeout(descriptionUpdateTimeout);
                            }
                            const timeout = setTimeout(() => {
                              autoUpdateDescription(newName);
                            }, 2000);
                            setDescriptionUpdateTimeout(timeout);
                          }
                        }}
                        onBlur={() => {
                          if (businessName && businessType && businessSettingsId) {
                            // Clear any pending timeout
                            if (descriptionUpdateTimeout) {
                              clearTimeout(descriptionUpdateTimeout);
                              setDescriptionUpdateTimeout(null);
                            }
                            // Immediately update description on blur
                            autoUpdateDescription(businessName);
                          }
                        }}
                        placeholder="Your Business Name"
                        className={
                          validationErrors.businessName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">
                        Business Type <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={businessType}
                          onValueChange={(value) => {
                            console.log("Business type changed to:", value);
                            setBusinessType(value);
                            debouncedAutoSave("Business");
                          }}
                        >
                          <SelectTrigger
                            ref={businessTypeRef}
                            className={
                              validationErrors.businessType
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500 ring-red-500"
                                : ""
                            }
                          >
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            {businessTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {businessType && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setBusinessType("")}
                            className="px-3"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">
                      Business Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      ref={businessPhoneRef}
                      value={businessPhone}
                      maxLength={10}
                      onChange={(e) => {
                        // Allow only numbers, spaces, dashes, parentheses, and plus sign for phone formatting
                        const phoneValue = e.target.value.replace(/[^\d\s\-\(\)\+]/g, "");
                        setBusinessPhone(phoneValue);

                        // Only validate if user has entered something
                        const digitsOnly = phoneValue.replace(/\D/g, "");
                        if (phoneValue.length > 0 && digitsOnly.length !== 10) {
                          setValidationErrors((prev) => ({ ...prev, businessPhone: true }));
                        } else {
                          setValidationErrors((prev) => ({ ...prev, businessPhone: false }));
                        }

                        debouncedAutoSave("Business");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveSettings("Business");
                        }
                      }}
                      placeholder="10-digit phone number"
                      className={
                        validationErrors.businessPhone ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                      }
                    />
                    {validationErrors.businessPhone && businessPhone.length > 0 && (
                      <p className="text-sm text-red-500">Phone number must be exactly 10 digits</p>
                    )}
                  </div>

                  <div className="space-y-2" ref={businessAddressRef}>
                    <AddressInput
                      value={addressData}
                      onChange={(newAddressData) => {
                        setAddressData(newAddressData);
                        debouncedAutoSave("Business");
                      }}
                      onAddressComplete={handleAddressSelect}
                      label="Business Address *"
                      className={validationErrors.businessAddress ? "border-red-500" : ""}
                      required={true}
                      showValidation={!!validationErrors.businessAddress}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Business Hours</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addBusinessHours}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Hours
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {/* Mobile header - hidden on desktop */}
                      <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                        <div className="col-span-1 text-center">Open</div>
                        <div className="col-span-3">Day</div>
                        <div className="col-span-3">Opening</div>
                        <div className="col-span-3">Closing</div>
                        <div className="col-span-2 text-center">Remove</div>
                      </div>
                      {businessHours.map((hour) => {
                        const validationMessage = hour.isOpen
                          ? getTimeValidationMessage(hour.openTime, hour.closeTime)
                          : null;
                        return (
                          <div key={hour.id} className="space-y-2">
                            {/* Desktop Layout */}
                            <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-1 flex justify-center">
                                <Checkbox
                                  checked={hour.isOpen}
                                  onCheckedChange={(checked) => updateBusinessHours(hour.id, "isOpen", !!checked)}
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="col-span-3">
                                <Select
                                  value={hour.day}
                                  onValueChange={(value) => updateBusinessHours(hour.id, "day", value)}
                                  disabled={!hour.isOpen}
                                >
                                  <SelectTrigger className={`h-7 text-sm ${!hour.isOpen ? "opacity-50" : ""}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(dayNames).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-3">
                                <Input
                                  type="time"
                                  value={hour.openTime}
                                  onChange={(e) => updateBusinessHours(hour.id, "openTime", e.target.value)}
                                  disabled={!hour.isOpen}
                                  className={`h-7 text-sm w-full ${!hour.isOpen ? "opacity-50" : ""} ${validationMessage ? "border-destructive" : ""}`}
                                />
                              </div>
                              <div className="col-span-3">
                                <Input
                                  type="time"
                                  value={hour.closeTime}
                                  onChange={(e) => updateBusinessHours(hour.id, "closeTime", e.target.value)}
                                  disabled={!hour.isOpen}
                                  className={`h-7 text-sm w-full ${!hour.isOpen ? "opacity-50" : ""} ${validationMessage ? "border-destructive" : ""}`}
                                />
                              </div>
                              <div className="col-span-2 flex justify-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeBusinessHours(hour.id)}
                                  disabled={businessHours.length <= 1}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Mobile Layout */}
                            <div className="md:hidden border rounded-lg p-3 space-y-3 w-full overflow-hidden">
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Checkbox
                                    checked={hour.isOpen}
                                    onCheckedChange={(checked) => updateBusinessHours(hour.id, "isOpen", !!checked)}
                                    className="h-4 w-4 flex-shrink-0"
                                  />
                                  <Select
                                    value={hour.day}
                                    onValueChange={(value) => updateBusinessHours(hour.id, "day", value)}
                                    disabled={!hour.isOpen}
                                  >
                                    <SelectTrigger className={`h-9 min-w-0 ${!hour.isOpen ? "opacity-50" : ""}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(dayNames).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                          {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeBusinessHours(hour.id)}
                                  disabled={businessHours.length <= 1}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="space-y-3 w-full">
                                <div className="w-full max-w-[200px] mx-auto">
                                  <Label className="text-xs text-muted-foreground mb-1">Opening</Label>
                                  <Input
                                    type="time"
                                    value={hour.openTime}
                                    onChange={(e) => updateBusinessHours(hour.id, "openTime", e.target.value)}
                                    disabled={!hour.isOpen}
                                    className={`h-9 text-sm ${!hour.isOpen ? "opacity-50" : ""} ${validationMessage ? "border-destructive" : ""}`}
                                  />
                                </div>
                                <div className="w-full max-w-[200px] mx-auto">
                                  <Label className="text-xs text-muted-foreground mb-1">Closing</Label>
                                  <Input
                                    type="time"
                                    value={hour.closeTime}
                                    onChange={(e) => updateBusinessHours(hour.id, "closeTime", e.target.value)}
                                    disabled={!hour.isOpen}
                                    className={`h-9 text-sm ${!hour.isOpen ? "opacity-50" : ""} ${validationMessage ? "border-destructive" : ""}`}
                                  />
                                </div>
                              </div>
                            </div>

                            {validationMessage && (
                              <div className="text-sm text-destructive ml-1">{validationMessage}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add multiple time periods for days with split hours (e.g., lunch breaks). Times must be within the
                      same day (12:00 AM - 11:59 PM).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessDescription">
                      Business Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="businessDescription"
                      ref={businessDescriptionRef}
                      value={businessDescription}
                      onChange={(e) => {
                        setBusinessDescription(e.target.value);
                        debouncedAutoSave("Business");
                      }}
                      placeholder="Brief description of your business and services..."
                      rows={6}
                      className={
                        validationErrors.businessDescription
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : ""
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateBusinessDescription}
                      disabled={generatingDescription}
                      className="mt-2 text-sm bg-gradient-primary hover:opacity-90 text-white border-none"
                    >
                      <Zap className={`w-4 h-4 mr-2 ${generatingDescription ? "animate-pulse" : ""}`} />
                      {generatingDescription ? "Generating..." : "Generate with AI"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessWebsite">Business Website</Label>
                    <Input
                      id="businessWebsite"
                      value={businessWebsite}
                      onChange={(e) => {
                        setBusinessWebsite(e.target.value);
                        debouncedAutoSave("Business");
                      }}
                      placeholder="https://www.yourbusiness.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessTimezone">Business Timezone</Label>
                    <Select
                      value={businessTimezone}
                      onValueChange={(value) => {
                        const tz = getCommonTimezones().find((t) => t.value === value);
                        if (tz) {
                          setBusinessTimezone(tz.value);
                          setBusinessTimezoneOffset(tz.offset);
                          // Disabled auto-save - require manual save for validation
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your business timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCommonTimezones().map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {businessTimezone && (
                      <p className="text-sm text-muted-foreground">
                        Current timezone: {businessTimezone} ({businessTimezoneOffset})
                      </p>
                    )}
                  </div>

                  <div className="space-y-4" ref={servicesRef}>
                    <div className="flex items-center justify-between">
                      <Label>
                        Services & Pricing <span className="text-red-500">*</span>
                      </Label>
                      <Button type="button" variant="outline" size="sm" onClick={addService}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Service
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {services.map((service, index) => {
                        const hasNameButInvalidPrice =
                          service.name.trim() &&
                          (!service.price.trim() ||
                            isNaN(parseFloat(service.price.trim())) ||
                            parseFloat(service.price.trim()) <= 0);
                        const priceErrorClass =
                          validationErrors.services && hasNameButInvalidPrice
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "";

                        return (
                          <div key={index} className="space-y-3 p-4 border rounded-lg">
                            {/* Desktop Layout */}
                            <div className="hidden md:flex gap-2 items-start">
                              <div className="flex-1">
                                <Label htmlFor={`service-name-${index}`} className="text-sm font-medium">
                                  Service Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id={`service-name-${index}`}
                                  ref={(el) => (serviceInputRefs.current[index] = el)}
                                  placeholder="Service name (e.g., Consultation)"
                                  value={service.name}
                                  onChange={(e) => {
                                    updateService(index, "name", e.target.value);
                                    // Disabled auto-save - require manual save for validation
                                  }}
                                  className={
                                    service.name.trim() === "" && validationErrors.services ? "border-red-500" : ""
                                  }
                                />
                              </div>
                              <div className="w-32">
                                <Label htmlFor={`service-price-${index}`} className="text-sm font-medium">
                                  Price <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                                    $
                                  </span>
                                  <Input
                                    id={`service-price-${index}`}
                                    placeholder="0.00"
                                    value={service.price}
                                    onChange={(e) => {
                                      updateService(index, "price", e.target.value);
                                      // Disabled auto-save - require manual save for validation
                                    }}
                                    className={`pl-6 ${priceErrorClass}`}
                                  />
                                </div>
                              </div>
                              {services.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeService(index)}
                                  className="mt-6"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            {/* Mobile Layout */}
                            <div className="md:hidden space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <Label htmlFor={`service-name-mobile-${index}`} className="text-sm font-medium">
                                      Service Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id={`service-name-mobile-${index}`}
                                      ref={(el) => (serviceInputRefs.current[index] = el)}
                                      placeholder="Service name (e.g., Consultation)"
                                      value={service.name}
                                      onChange={(e) => {
                                        updateService(index, "name", e.target.value);
                                        debouncedAutoSave("Business");
                                      }}
                                      className={
                                        service.name.trim() === "" && validationErrors.services ? "border-red-500" : ""
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`service-price-mobile-${index}`} className="text-sm font-medium">
                                      Price <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                                        $
                                      </span>
                                      <Input
                                        id={`service-price-mobile-${index}`}
                                        placeholder="0.00"
                                        value={service.price}
                                        onChange={(e) => {
                                          updateService(index, "price", e.target.value);
                                          debouncedAutoSave("Business");
                                        }}
                                        className={`pl-6 ${priceErrorClass}`}
                                      />
                                    </div>
                                  </div>
                                </div>
                                {services.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeService(index)}
                                    className="mt-6"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label htmlFor={`service-description-${index}`} className="text-sm font-medium">
                                Description (Optional)
                              </Label>
                              {/* Textarea on mobile, Input on desktop */}
                              <Textarea
                                id={`service-description-${index}`}
                                placeholder="Brief description of the service"
                                value={service.description || ""}
                                onChange={(e) => {
                                  updateService(index, "description", e.target.value);
                                  debouncedAutoSave("Business");
                                }}
                                rows={2}
                                className="md:hidden resize-none"
                              />
                              <Input
                                id={`service-description-desktop-${index}`}
                                placeholder="Brief description of the service"
                                value={service.description || ""}
                                onChange={(e) => {
                                  updateService(index, "description", e.target.value);
                                  debouncedAutoSave("Business");
                                }}
                                className="hidden md:block"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add your services and their corresponding prices that can be shared with potential clients
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Click "Save" to save your changes</div>
                    <Button
                      onClick={() => saveSettings("Business")}
                      disabled={saving || isAutoSaving}
                      variant="outline"
                      size="sm"
                      className="bg-gradient-primary hover:opacity-90 text-white border-none"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Call Settings */}
            <TabsContent value="calls" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Bot className="w-5 h-5 mr-2" />
                      AI Caller Settings
                    </CardTitle>
                    {/* <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate("/setup-guide")}
                      className="flex items-center gap-2 bg-gradient-primary hover:opacity-90 text-white border-none"
                    >
                      <Zap className="w-4 h-4" />
                      Setup Guide
                    </Button> */}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Junie Phone Number (Read-only) */}
                  <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <Label htmlFor="twilioPhoneNumber" className="font-semibold">
                      Your Junie Phone Number
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="twilioPhoneNumber"
                        value={twilioPhoneNumber || "Not assigned yet"}
                        disabled
                        className="bg-muted cursor-not-allowed font-mono"
                      />
                      <Button
                        type="button"
                        onClick={handleAssignPhoneNumber}
                        disabled={!!twilioPhoneNumber || assigningPhoneNumber}
                        className="whitespace-nowrap"
                      >
                        {assigningPhoneNumber ? "Assigning..." : "Get Your Phone Number"}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This is your dedicated Junie AI phone number. Share this number with your customers to have calls
                      handled by your AI assistant.
                    </p>
                  </div>

                  <Separator />

                  <FeatureGate feature="callTransfers" showUpgradeMessage={true}>
                    <div className="space-y-2">
                      <Label htmlFor="transferNumber" className="font-semibold">
                        Call Transfer/SMS Notification Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="transferNumber"
                        type="tel"
                        value={formatPhoneNumber(transferNumber)}
                        placeholder="(555) 123-4567"
                        onChange={(e) => {
                          const normalized = normalizePhoneNumber(e.target.value);
                          setTransferNumber(normalized);

                          // Validate if user has entered something
                          if (normalized.length > 0 && normalized.length !== 10) {
                            setValidationErrors((prev) => ({ ...prev, transferNumber: true }));
                          } else {
                            setValidationErrors((prev) => ({ ...prev, transferNumber: false }));
                          }
                        }}
                        required
                        className={
                          validationErrors.transferNumber
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : ""
                        }
                      />
                      {validationErrors.transferNumber && transferNumber.length > 0 && (
                        <p className="text-sm text-red-500">Phone number must be exactly 10 digits</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        The phone number that you want urgent or emergency calls to be forwarded to, as well as SMS
                        notifications.
                      </p>
                    </div>
                  </FeatureGate>

                  <div className="space-y-2">
                    <Label htmlFor="urgentKeywords">Urgent Keywords</Label>
                    <Textarea
                      id="urgentKeywords"
                      value={urgentKeywords}
                      onChange={(e) => {
                        setUrgentKeywords(e.target.value);
                        debouncedAutoSave("Call");
                      }}
                      placeholder="emergency, urgent, asap, immediately"
                      rows={2}
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated keywords that trigger urgent call transfer
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-Forward Urgent Calls</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically forward calls containing urgent keywords
                        </p>
                      </div>
                      <Switch
                        checked={autoForward}
                        onCheckedChange={(checked) => {
                          setAutoForward(checked);
                          debouncedAutoSave("Call");
                        }}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Common Questions & Answers</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addQuestionAnswer}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Question
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Pre-program frequently asked questions and their answers for your AI assistant
                      </p>
                    </div>

                    <div className="space-y-3">
                      {commonQuestionsAnswers.map((qa, index) => (
                        <div key={index} className="space-y-3 p-4 border rounded-lg">
                          <div className="flex gap-2 items-start">
                            <div className="flex-1">
                              <Label htmlFor={`question-${index}`} className="text-sm font-medium">
                                Question
                              </Label>
                              <Input
                                id={`question-${index}`}
                                ref={(el) => (questionInputRefs.current[index] = el)}
                                placeholder="e.g., What services do you offer?"
                                value={qa.question}
                                onChange={(e) => {
                                  updateQuestionAnswer(index, "question", e.target.value);
                                  debouncedAutoSave("Call");
                                }}
                              />
                            </div>
                            {commonQuestionsAnswers.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestionAnswer(index)}
                                className="mt-6"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`answer-${index}`} className="text-sm font-medium">
                              Answer
                            </Label>
                            <Textarea
                              id={`answer-${index}`}
                              placeholder="e.g., We provide 24/7 AI answering services, appointment booking, lead capture, and customer service support."
                              value={qa.answer}
                              onChange={(e) => {
                                updateQuestionAnswer(index, "answer", e.target.value);
                                debouncedAutoSave("Call");
                              }}
                              rows={3}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {isAutoSaving ? "Auto-saving changes..." : "Changes are automatically saved"}
                    </div>
                    <Button
                      onClick={() => saveSettings("Calls")}
                      disabled={saving || isAutoSaving}
                      variant="outline"
                      size="sm"
                      className="bg-gradient-primary hover:opacity-90 text-white border-none"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Setup */}
            <TabsContent value="setup" className="space-y-6">
              <FeatureGate feature="appointmentScheduling">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Calendar Integration
                      </CardTitle>
                      {/* <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate("/setup-guide")}
                        className="flex items-center gap-2 bg-gradient-primary hover:opacity-90 text-white border-none"
                      >
                        <Zap className="w-4 h-4" />
                        Setup Guide
                      </Button> */}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Appointment Booking</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow AI to automatically schedule appointments directly on your calendar
                          </p>
                        </div>
                        <Switch
                          checked={appointmentBooking}
                          onCheckedChange={(checked) => {
                            setAppointmentBooking(checked);
                            debouncedAutoSave("Calendar");
                          }}
                        />
                      </div>
                    </div>

                    <Separator />

                    <GoogleCalendarConnect />
                  </CardContent>
                </Card>
              </FeatureGate>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications" className="space-y-6">
              <NotificationSettings />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>This will permanently delete your account and all associated data, including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your Stripe subscription (will be cancelled immediately)</li>
                <li>All business settings and configurations</li>
                <li>Call logs and recordings</li>
                <li>Appointments and calendar data</li>
                <li>All other personal data</li>
              </ul>
              <p className="font-semibold text-destructive">This action cannot be undone. Are you absolutely sure?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
