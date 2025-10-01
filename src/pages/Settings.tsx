import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Building, Phone, Bot, Bell, User, Shield, Save, Plus, Trash2, Globe, Calendar, Zap, CheckCircle, XCircle, X, Settings as SettingsIcon, LogOut, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { WebhookInfo } from "@/components/WebhookInfo";
import NotificationSettings from "@/components/NotificationSettings";
import { WebsiteImporter } from "@/components/WebsiteImporter";
import { AddressInput } from "@/components/AddressAutocomplete";
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect";
import { getUserTimezone, getTimezoneFromAddress, getCommonTimezones } from "@/lib/timezone-utils";
import { handleRobustSignOut } from "@/lib/auth-utils";
import { FeatureGate } from "@/components/FeatureGate";
import { useSubscription } from "@/hooks/useSubscription";
import { BillingSettings } from "@/components/BillingSettings";
import { CreditCard } from "lucide-react";

// Fixed: Removed servicesOffered and pricingStructure state variables

const Settings = () => {
  console.log("Settings component rendering...");
  const { user, loading, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("business");
  const [showCalendarBanner, setShowCalendarBanner] = useState(false);
  const [calendarBannerType, setCalendarBannerType] = useState<'success' | 'error'>('success');
  const [calendarBannerMessage, setCalendarBannerMessage] = useState('');
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const { featureAccess } = useSubscription();
  console.log("Settings state:", { user: user?.email, loading });

  // User Profile State
  const [userEmail, setUserEmail] = useState("");
  const [userFullName, setUserFullName] = useState("");
  const [userCompanyName, setUserCompanyName] = useState("");
  const [userTimezone, setUserTimezone] = useState("");

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
  const [services, setServices] = useState<{id?: string, name: string, price: string, description?: string}[]>([
    { name: "", price: "" }
  ]);

  const [addressData, setAddressData] = useState({
    street: '',
    city: '',
    state: '',
    zip: ''
  });

  // Call Settings State
  const [forwardingNumber, setForwardingNumber] = useState("");
  const [urgentKeywords, setUrgentKeywords] = useState("");
  const [autoForward, setAutoForward] = useState(false);
  
  

  // AI Settings State
  const [aiPersonality, setAiPersonality] = useState("professional");
  const [customGreeting, setCustomGreeting] = useState("");
  const [commonQuestionsAnswers, setCommonQuestionsAnswers] = useState<{question: string, answer: string}[]>([
    { question: "", answer: "" }
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

  // Validation error states for visual feedback
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({
    businessName: false,
    businessType: false,
    businessPhone: false,
    businessDescription: false,
    businessAddress: false,
    services: false
  });

  // Notifications state
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (user) {
      loadUserSettings(user.id, user.email || "");
      fetchRecentActivity();
    }
    
    // Handle URL parameters for tab selection and calendar status
    const tab = searchParams.get('tab');
    const calendarStatus = searchParams.get('calendar_status');
    const errorMessage = searchParams.get('error');
    const onboardingComplete = searchParams.get('onboarding_complete');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (onboardingComplete === 'true') {
      setShowOnboardingBanner(true);
      setActiveTab('business'); // Show business tab after onboarding
      
      // Clear URL parameter after processing
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('onboarding_complete');
      setSearchParams(newSearchParams, { replace: true });
    }
    
    if (calendarStatus) {
      setShowCalendarBanner(true);
      setCalendarBannerType(calendarStatus as 'success' | 'error');
      
      if (calendarStatus === 'success') {
        setCalendarBannerMessage('Google Calendar connected successfully!');
      } else if (calendarStatus === 'error') {
        setCalendarBannerMessage(errorMessage || 'Failed to connect Google Calendar. Please try again.');
      }
      
      // Clear URL parameters after processing
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('calendar_status');
      newSearchParams.delete('error');
      if (!tab) newSearchParams.delete('tab');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [loading, user, navigate, searchParams, setSearchParams]);

  const fetchRecentActivity = async () => {
    try {
      const { data: callMessages, error } = await supabase
        .from('call_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentActivity(callMessages || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const loadUserSettings = async (userId: string, email: string) => {
    try {
      // Set email from parameter
      setUserEmail(email);

      // Load user profile data
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name, company_name, timezone')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setUserFullName(profileData.full_name || "");
        setUserCompanyName(profileData.company_name || "");
        setUserTimezone(profileData.timezone || "");
      }

      // Load business settings
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setBusinessSettingsId(data.id);
        setBusinessName(data.business_name || "");
        setBusinessType(data.business_type || "");
        setBusinessPhone(data.business_phone || "");
        setBusinessAddress(data.business_address || "");

        // Parse existing address
        if (data.business_address) {
          const parsedAddress = parseAddress(data.business_address);
          setAddressData(parsedAddress);
        }
        // Parse business hours
        if (data.business_hours) {
          try {
            const hoursData = JSON.parse(data.business_hours);
            if (Array.isArray(hoursData) && hoursData.length > 0) {
              // Ensure each hour entry has an id and proper structure
              const hoursWithIds = hoursData.map((hour, index) => ({
                id: hour.id || index + 1,
                day: hour.day || 'monday',
                isOpen: hour.isOpen !== undefined ? hour.isOpen : true,
                openTime: hour.openTime || '09:00',
                closeTime: hour.closeTime || '17:00'
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
        setForwardingNumber(data.forwarding_number || "");
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
      console.error('Error loading user settings:', error);
    }
  };

  const loadServices = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading services:', error);
        return;
      }

      if (data && data.length > 0) {
        setServices(data.map(service => ({
          id: service.id,
          name: service.name,
          price: service.price || "",
          description: service.description || ""
        })));
      } else {
        setServices([{ name: "", price: "", description: "" }]);
      }
    } catch (error) {
      console.error('Error loading services:', error);
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
          await supabase
            .from('services')
            .delete()
            .eq('id', serviceToRemove.id);
        } catch (error) {
          console.error('Error deleting service:', error);
        }
      }
      
      setServices(services.filter((_, i) => i !== index));
    }
  };

  const updateService = (index: number, field: 'name' | 'price' | 'description', value: string) => {
    const newServices = [...services];
    
    // Validate price input to allow only numbers and decimal points
    if (field === 'price') {
      const numericValue = value.replace(/[^\d.]/g, '');
      // Prevent multiple decimal points
      const parts = numericValue.split('.');
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

  const updateQuestionAnswer = (index: number, field: 'question' | 'answer', value: string) => {
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
      const { data, error } = await supabase.functions.invoke('generate-business-description', {
        body: {
          businessName,
          businessType,
          services: services.filter(s => s.name.trim()),
          address: addressData.street && addressData.city ? 
            `${addressData.street}, ${addressData.city}, ${addressData.state}` : 
            businessAddress,
          phone: businessPhone
        }
      });

      if (error) {
        console.error('Error generating description:', error);
        throw new Error(error.message || 'Failed to generate description');
      }

      if (data?.description) {
        setBusinessDescription(data.description);
        toast({
          title: "Description Generated!",
          description: "AI has generated a compelling business description for you.",
        });
      }
    } catch (error) {
      console.error('Error generating business description:', error);
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
      const { data, error } = await supabase.functions.invoke('generate-business-description', {
        body: {
          businessName: newBusinessName,
          businessType,
          services: services.filter(s => s.name.trim()),
          address: addressData.street && addressData.city ? 
            `${addressData.street}, ${addressData.city}, ${addressData.state}` : 
            businessAddress,
          phone: businessPhone
        }
      });

      if (data?.description && !error) {
        setBusinessDescription(data.description);
        toast({
          title: "Description Auto-Updated",
          description: "Business description updated with new business name.",
        });
      }
    } catch (error) {
      console.error('Auto-update description failed:', error);
    }
  };

  const updateBusinessHours = (id: number, field: keyof typeof businessHours[0], value: string | boolean) => {
    const newHours = businessHours.map(hour => 
      hour.id === id ? { ...hour, [field]: value } : hour
    );
    setBusinessHours(newHours);
  };

  const addBusinessHours = () => {
    const newId = Math.max(...businessHours.map(h => h.id), 0) + 1;
    setBusinessHours([...businessHours, {
      id: newId,
      day: "monday",
      isOpen: true,
      openTime: "09:00",
      closeTime: "17:00"
    }]);
  };

  const removeBusinessHours = (id: number) => {
    if (businessHours.length > 1) {
      setBusinessHours(businessHours.filter(hour => hour.id !== id));
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
      await supabase
        .from('services')
        .delete()
        .eq('business_id', businessId);

      // Insert new services
      const servicesToSave = services
        .filter(service => service.name.trim())
        .map((service, index) => ({
          business_id: businessId,
          name: service.name.trim(),
          price: service.price || null,
          description: service.description || null,
          display_order: index
        }));

      if (servicesToSave.length > 0) {
        const { error } = await supabase
          .from('services')
          .insert(servicesToSave);

        if (error) {
          console.error('Error saving services:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error saving services:', error);
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
    saturday: "Saturday"
  };

  // Auto-save function with debouncing
  const debouncedAutoSave = useCallback((section: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    const timeout = setTimeout(async () => {
      if (!user) return;
      
      setIsAutoSaving(true);
      try {
        await saveSettingsInternal(section);
        toast({
          title: "Settings saved",
          description: "Your changes have been automatically saved.",
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
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
  }, [autoSaveTimeout, user, toast]);

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
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: "There was an error saving your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveSettingsInternal = async (section: string) => {
    if (!user) return;
    
    try {
      // Handle Profile section separately as it updates user_profiles table
      if (section === "Profile") {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            full_name: userFullName,
            company_name: userCompanyName,
            timezone: userTimezone,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

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
        // Validate required business fields BEFORE processing
        console.log("=== VALIDATION DEBUG ===");
        console.log("Raw businessType value:", JSON.stringify(businessType));
        console.log("businessType type:", typeof businessType);
        console.log("businessType length:", businessType?.length);
        console.log("Validating business fields:", { businessName, businessType, businessPhone, businessDescription });
        
        const requiredFields = {
          businessName: businessName?.trim(),
          businessType: businessType?.trim() || (!businessType ? "" : businessType), 
          businessPhone: businessPhone?.trim(),
          businessDescription: businessDescription?.trim()
        };
        
        console.log("Required fields after processing:", requiredFields);
        
        // Additional phone number validation
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        const isValidPhone = !requiredFields.businessPhone || phoneRegex.test(requiredFields.businessPhone);

        const newValidationErrors = {
          businessName: !requiredFields.businessName || requiredFields.businessName === "",
          businessType: !requiredFields.businessType || requiredFields.businessType === "",
          businessPhone: !requiredFields.businessPhone || requiredFields.businessPhone === "" || !isValidPhone,
          businessDescription: !requiredFields.businessDescription || requiredFields.businessDescription === "",
          businessAddress: false,
          services: false
        };

        const missingFields = Object.entries(requiredFields)
          .filter(([key, value]) => !value || value.length === 0)
          .map(([key]) => key);
          
        // Add phone validation error
        if (!isValidPhone && requiredFields.businessPhone) {
          missingFields.push('businessPhone');
        }

        if (missingFields.length > 0) {
          setValidationErrors(newValidationErrors);
          
          const fieldNames = missingFields.map(field => {
            switch(field) {
              case 'businessName': return 'Business Name';
              case 'businessType': return 'Business Type';
              case 'businessPhone': return requiredFields.businessPhone && !isValidPhone ? 'Phone Number (invalid format)' : 'Phone Number';
              case 'businessDescription': return 'Business Description';
              default: return field;
            }
          });
          
          toast({
            title: "Missing Required Fields",
            description: `Please fill in all required fields highlighted in red: ${fieldNames.join(', ')}`,
            variant: "destructive",
            duration: 5000,
          });
          setSaving(false);
          return;
        }

        // Validate services - each service must have both name and price
        const validServices = services.filter(s => s.name.trim() !== "");
        const invalidServices = validServices.filter(s => {
          const priceValue = s.price.trim();
          return !priceValue || isNaN(parseFloat(priceValue)) || parseFloat(priceValue) <= 0;
        });
        
        if (invalidServices.length > 0) {
          setValidationErrors(prev => ({...prev, services: true}));
          
          toast({
            title: "Service Pricing Required",
            description: `All services must have valid prices greater than 0. ${invalidServices.length} service(s) have invalid prices and are highlighted in red.`,
            variant: "destructive",
            duration: 5000,
          });
          setSaving(false);
          return;
        }

        if (validServices.length === 0) {
          setValidationErrors(prev => ({...prev, services: true}));
          
          toast({
            title: "Services Required",
            description: "Please add at least one service with pricing.",
            variant: "destructive",
            duration: 5000,
          });
          setSaving(false);
          return;
        }

        // Validate individual address fields
        const missingAddressFields = [];
        if (!addressData.street?.trim()) missingAddressFields.push('street address');
        if (!addressData.city?.trim()) missingAddressFields.push('city');
        if (!addressData.state?.trim()) missingAddressFields.push('state');
        if (!addressData.zip?.trim()) missingAddressFields.push('ZIP code');

        if (missingAddressFields.length > 0) {
          setValidationErrors(prev => ({...prev, businessAddress: true}));
          
          toast({
            title: "Address Required",
            description: `Please provide the following address fields: ${missingAddressFields.join(', ')}.`,
            variant: "destructive",
            duration: 5000,
          });
          setSaving(false);
          return;
        }

        // Combine address fields into a single address string
        const fullAddress = [
          addressData.street,
          addressData.city,
          addressData.state,
          addressData.zip
        ].filter(Boolean).join(', ');

        // Clear validation errors if we reach here
        setValidationErrors({
          businessName: false,
          businessType: false,
          businessPhone: false,
          businessDescription: false,
          businessAddress: false,
          services: false
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
          business_phone: businessPhone,
          business_address: fullAddress,
          business_hours: JSON.stringify(businessHours),
          business_description: businessDescription,
          business_website: businessWebsite,
          business_timezone: timezone,
          business_timezone_offset: timezoneOffset,
          services_offered: JSON.stringify(validServices),
          pricing_structure: validServices.map(s => `${s.name}: ${s.price}`).join(', ')
        };
      } else if (section === "Call") {
        updateData = {
          forwarding_number: forwardingNumber,
          urgent_keywords: urgentKeywords,
          auto_forward: autoForward,
          common_questions: JSON.stringify(commonQuestionsAnswers.filter(qa => qa.question.trim() || qa.answer.trim())),
        };
      } else if (section === "AI Assistant") {
        updateData = {
          ai_personality: aiPersonality,
          custom_greeting: customGreeting,
          appointment_booking: appointmentBooking,
          lead_capture: leadCapture
        };
      } else if (section === "Notifications") {
        updateData = {
          email_notifications: emailNotifications,
          sms_notifications: smsNotifications,
          push_notifications: pushNotifications,
          instant_alerts: instantAlerts
        };
      }

      const { data, error } = await supabase
        .from('business_settings')
        .upsert({
          user_id: user.id,
          ...updateData,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id' 
        })
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
      
      toast({
        title: "Settings saved",
        description: `Your ${section.toLowerCase()} settings have been updated successfully.`,
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const parseAddress = (addressString: string) => {
    if (!addressString) return { street: '', city: '', state: '', zip: '' };
    
    const parts = addressString.split(',').map(part => part.trim());
    
    if (parts.length >= 3) {
      const street = parts[0] || '';
      const city = parts[1] || '';
      
      // Handle both 3-part and 4-part addresses
      if (parts.length === 3) {
        // Format: Street, City, State ZIP
        const stateZip = parts[2] || '';
        const stateZipMatch = stateZip.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
        const state = stateZipMatch ? stateZipMatch[1] : stateZip;
        const zip = stateZipMatch ? stateZipMatch[2] : '';
        return { street, city, state, zip };
      } else if (parts.length >= 4) {
        // Format: Street, City, State, ZIP
        const state = parts[2] || '';
        const zip = parts[3] || '';
        return { street, city, state, zip };
      }
    }
    
    return { street: addressString, city: '', state: '', zip: '' };
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
      setBusinessHours(prev => [...prev, {
        id: Math.max(...prev.map(h => h.id), 0) + 1,
        day: "monday",
        isOpen: true,
        openTime: "09:00",
        closeTime: "17:00"
      }]);
    }
    if (extractedData.services_offered) {
      const servicesText = extractedData.services_offered;
      const servicesList = servicesText.split(/[,\n]/).map(s => s.trim()).filter(s => s);
      if (servicesList.length > 0) {
        setServices(servicesList.slice(0, 5).map(service => ({ name: service, price: "" })));
      }
    }

    // Auto-generate description after import if we have enough data
    if (extractedData.business_name && extractedData.business_type) {
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('generate-business-description', {
            body: {
              businessName: extractedData.business_name,
              businessType: extractedData.business_type,
              services: extractedData.services_offered ? 
                extractedData.services_offered.split(/[,\n]/).map(s => s.trim()).filter(s => s).map(name => ({ name })) : 
                [],
              address: extractedData.business_address,
              phone: extractedData.business_phone
            }
          });

          if (data?.description && !error) {
            setBusinessDescription(data.description);
            toast({
              title: "AI Description Generated",
              description: "A compelling business description has been auto-generated for you.",
            });
          }
        } catch (error) {
          console.error('Auto-generation failed:', error);
          // Silently fail - don't show error to user
        }
      }, 1000); // Small delay to let other data populate first
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        method: 'POST'
      });

      if (error) throw error;

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });

      // Sign out and redirect
      await handleRobustSignOut(supabase);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error deleting account",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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
                <img 
                  src="/lovable-uploads/junie-logo.png" 
                  alt="Junie Logo" 
                  className="h-6 w-6 sm:h-8 sm:w-8"
                />
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
                          <p className="text-sm font-medium">{activity.caller_name} - {activity.call_type}</p>
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
              <Button variant="ghost" onClick={async () => {
                try {
                  await handleRobustSignOut(supabase);
                } catch (error: any) {
                  window.location.href = '/';
                }
              }} className="h-8 w-8 p-0">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center">
                <img 
                  src="/lovable-uploads/junie-logo.png" 
                  alt="Junie Logo" 
                  className="h-8 w-8"
                />
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
                          <p className="text-sm font-medium">{activity.caller_name} - {activity.call_type}</p>
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
              <Button variant="ghost" onClick={async () => {
                try {
                  await handleRobustSignOut(supabase);
                } catch (error: any) {
                  window.location.href = '/';
                }
              }}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-full overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-muted-foreground mb-2">Account Settings</h2>
            <p className="text-muted-foreground">
              Configure your Junie assistant and account preferences.
            </p>
          </div>

          {/* Onboarding Success Banner */}
          {showOnboardingBanner && (
            <div className="p-4 rounded-lg border mb-6 bg-green-50 border-green-200 text-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Successfully signed up! Please review and complete your business information below.</span>
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
            <div className={`p-4 rounded-lg border mb-6 ${
              calendarBannerType === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {calendarBannerType === 'success' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span className="font-medium">{calendarBannerMessage}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalendarBanner(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Calls</span>
              </TabsTrigger>
              <TabsTrigger value="setup" className="flex items-center gap-2 py-3.5" disabled={!featureAccess.appointmentScheduling}>
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Calendar</span>
                {!featureAccess.appointmentScheduling && <Badge variant="outline" className="ml-1 text-[10px]">Scale</Badge>}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 py-3.5">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>

            {/* Account (User Profile + Billing) */}
            <TabsContent value="account" className="space-y-6">
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        User Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="userEmail">Email Address</Label>
                        <Input
                          id="userEmail"
                          type="email"
                          value={userEmail}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed. Contact support if you need to update it.
                        </p>
                      </div>

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
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate("/setup-guide")}
                      className="flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Setup Guide
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                <WebsiteImporter 
                  onDataExtracted={handleWebsiteDataExtracted}
                  autoSave={true}
                  className="mb-6"
                />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">
                        Business Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="businessName"
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
                        className={validationErrors.businessName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">
                        Business Type <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Select value={businessType} onValueChange={(value) => {
                          console.log("Business type changed to:", value);
                          setBusinessType(value);
                          debouncedAutoSave("Business");
                        }}>
                          <SelectTrigger className={validationErrors.businessType ? "border-red-500 focus:border-red-500 focus:ring-red-500 ring-red-500" : ""}>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="electric">Electric Services</SelectItem>
                            <SelectItem value="garage-door">Garage Door Services</SelectItem>
                            <SelectItem value="handyman">Handyman Services</SelectItem>
                            <SelectItem value="hvac">HVAC & Air Conditioning</SelectItem>
                            <SelectItem value="landscaping">Landscaping</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="pest-control">Pest Control</SelectItem>
                            <SelectItem value="plumbing">Plumbing</SelectItem>
                            <SelectItem value="pool-spa">Pool & Spa Services</SelectItem>
                            <SelectItem value="cleaning">Professional Cleaning</SelectItem>
                            <SelectItem value="roofing">Roofing</SelectItem>
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
                      value={businessPhone}
                      onChange={(e) => {
                        // Allow only numbers, spaces, dashes, parentheses, and plus sign for phone formatting
                        const phoneValue = e.target.value.replace(/[^\d\s\-\(\)\+]/g, '');
                        setBusinessPhone(phoneValue);
                        debouncedAutoSave("Business");
                      }}
                      placeholder="+1 (555) 123-4567"
                      className={validationErrors.businessPhone ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <AddressInput
                      value={addressData}
                      onChange={setAddressData}
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
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                        <div className="col-span-1 text-center">Open</div>
                        <div className="col-span-3">Day</div>
                        <div className="col-span-3">Opening</div>
                        <div className="col-span-3">Closing</div>
                        <div className="col-span-2 text-center">Remove</div>
                      </div>
                      {businessHours.map((hour) => {
                        const validationMessage = hour.isOpen ? getTimeValidationMessage(hour.openTime, hour.closeTime) : null;
                        return (
                          <div key={hour.id} className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-1 flex justify-center">
                                <Checkbox
                                  checked={hour.isOpen}
                                  onCheckedChange={(checked) => 
                                    updateBusinessHours(hour.id, 'isOpen', !!checked)
                                  }
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="col-span-3">
                                <Select
                                  value={hour.day}
                                  onValueChange={(value) => updateBusinessHours(hour.id, 'day', value)}
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
                                  onChange={(e) => updateBusinessHours(hour.id, 'openTime', e.target.value)}
                                  disabled={!hour.isOpen}
                                  className={`h-7 text-sm w-full ${!hour.isOpen ? "opacity-50" : ""} ${validationMessage ? "border-destructive" : ""}`}
                                />
                              </div>
                              <div className="col-span-3">
                                <Input
                                  type="time"
                                  value={hour.closeTime}
                                  onChange={(e) => updateBusinessHours(hour.id, 'closeTime', e.target.value)}
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
                            {validationMessage && (
                              <div className="col-span-12 text-sm text-destructive ml-1">
                                {validationMessage}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add multiple time periods for days with split hours (e.g., lunch breaks). Times must be within the same day (12:00 AM - 11:59 PM).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessDescription">
                      Business Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="businessDescription"
                      value={businessDescription}
                      onChange={(e) => {
                        setBusinessDescription(e.target.value);
                        debouncedAutoSave("Business");
                      }}
                      placeholder="Brief description of your business and services..."
                      rows={6}
                      className={validationErrors.businessDescription ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateBusinessDescription}
                      disabled={generatingDescription}
                      className="mt-2 text-sm bg-gradient-primary hover:opacity-90 text-white border-none"
                    >
                      <Zap className={`w-4 h-4 mr-2 ${generatingDescription ? 'animate-pulse' : ''}`} />
                      {generatingDescription ? 'Generating...' : 'Generate with AI'}
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
                        const tz = getCommonTimezones().find(t => t.value === value);
                        if (tz) {
                          setBusinessTimezone(tz.value);
                          setBusinessTimezoneOffset(tz.offset);
                          debouncedAutoSave("Business");
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

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>
                        Services & Pricing <span className="text-red-500">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addService}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Service
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {services.map((service, index) => {
                        const hasNameButInvalidPrice = service.name.trim() && (!service.price.trim() || isNaN(parseFloat(service.price.trim())) || parseFloat(service.price.trim()) <= 0);
                        const priceErrorClass = (validationErrors.services && hasNameButInvalidPrice) ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "";
                        
                        return (
                          <div key={index} className="space-y-3 p-4 border rounded-lg">
                            <div className="flex gap-2 items-start">
                              <div className="flex-1">
                                <Label htmlFor={`service-name-${index}`} className="text-sm font-medium">
                                  Service Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id={`service-name-${index}`}
                                  ref={(el) => serviceInputRefs.current[index] = el}
                                  placeholder="Service name (e.g., Consultation)"
                                  value={service.name}
                                  onChange={(e) => {
                                    updateService(index, 'name', e.target.value);
                                    debouncedAutoSave("Business");
                                  }}
                                  className={service.name.trim() === '' && validationErrors.services ? "border-red-500" : ""}
                                />
                              </div>
                              <div className="w-32">
                                <Label htmlFor={`service-price-${index}`} className="text-sm font-medium">
                                  Price <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                                  <Input
                                    id={`service-price-${index}`}
                                    placeholder="0.00"
                                    value={service.price}
                                  onChange={(e) => {
                                    updateService(index, 'price', e.target.value);
                                    debouncedAutoSave("Business");
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
                            <div>
                              <Label htmlFor={`service-description-${index}`} className="text-sm font-medium">
                                Description (Optional)
                              </Label>
                              <Input
                                id={`service-description-${index}`}
                                placeholder="Brief description of the service"
                                value={service.description || ""}
                                onChange={(e) => {
                                  updateService(index, 'description', e.target.value);
                                  debouncedAutoSave("Business");
                                }}
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
                    <div className="text-sm text-muted-foreground">
                      {isAutoSaving ? "Auto-saving changes..." : "Changes are automatically saved"}
                    </div>
                    <Button onClick={() => saveSettings("Business")} disabled={saving || isAutoSaving} variant="outline" size="sm" className="bg-gradient-primary hover:opacity-90 text-white border-none">
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Saving..." : "Save Now"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Call Settings */}
            <TabsContent value="calls" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Call Handling Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FeatureGate feature="callTransfers" showUpgradeMessage={true}>
                    <div className="space-y-2">
                      <Label htmlFor="forwardingNumber">Call Forwarding Number</Label>
                      <Input
                        id="forwardingNumber"
                        value={forwardingNumber}
                        onChange={(e) => {
                          setForwardingNumber(e.target.value);
                          debouncedAutoSave("Calls");
                        }}
                        placeholder="+1 (555) 987-6543"
                      />
                      <p className="text-sm text-muted-foreground">
                        Urgent calls will be forwarded to this number
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
                        debouncedAutoSave("Calls");
                      }}
                      placeholder="emergency, urgent, asap, immediately"
                      rows={2}
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated keywords that trigger urgent call forwarding
                    </p>
                  </div>


                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Common Questions & Answers</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addQuestionAnswer}
                        >
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
                                ref={(el) => questionInputRefs.current[index] = el}
                                placeholder="e.g., What services do you offer?"
                                value={qa.question}
                                onChange={(e) => {
                                  updateQuestionAnswer(index, 'question', e.target.value);
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
                                updateQuestionAnswer(index, 'answer', e.target.value);
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
                          debouncedAutoSave("Calls");
                        }}
                      />
                    </div>

                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {isAutoSaving ? "Auto-saving changes..." : "Changes are automatically saved"}
                    </div>
                    <Button onClick={() => saveSettings("Calls")} disabled={saving || isAutoSaving} variant="outline" size="sm" className="bg-gradient-primary hover:opacity-90 text-white border-none">
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Saving..." : "Save Now"}
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
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Calendar Integration
                    </CardTitle>
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
              <p className="font-semibold text-destructive">
                This action cannot be undone. Are you absolutely sure?
              </p>
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