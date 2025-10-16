import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressInputProps {
  value: AddressData;
  onChange: (value: AddressData) => void;
  onAddressComplete?: (fullAddress: string) => void;
  label?: string;
  className?: string;
  required?: boolean;
  showValidation?: boolean;
}

export const AddressInput = ({ 
  value, 
  onChange, 
  onAddressComplete,
  label = "Business Address",
  className,
  required = false,
  showValidation = false
}: AddressInputProps) => {
  const US_STATES = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' },
    { value: 'DC', label: 'District of Columbia' }
  ];

  const handleFieldChange = (field: keyof AddressData, fieldValue: string) => {
    // For zip code, only allow exactly 5 numeric digits
    if (field === 'zip') {
      fieldValue = fieldValue.replace(/\D/g, '').slice(0, 5);
    }
    
    const newValue = {
      ...value,
      [field]: fieldValue
    };
    
    onChange(newValue);
    
    // Call onAddressComplete if all required fields are filled
    if (onAddressComplete && newValue.street && newValue.city && newValue.state && newValue.zip) {
      const fullAddress = `${newValue.street}, ${newValue.city}, ${newValue.state} ${newValue.zip}`;
      onAddressComplete(fullAddress);
    }
  };

  const isFieldEmpty = (field: keyof AddressData) => {
    return required && showValidation && !value[field]?.trim();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <Label>
          {label.includes('*') ? (
            <>
              {label.replace(' *', '')} <span className="text-red-500">*</span>
            </>
          ) : (
            label
          )}
        </Label>
      )}
      
      <div className="space-y-3">
        <Input
          value={value.street}
          onChange={(e) => handleFieldChange('street', e.target.value)}
          placeholder="Street address"
          className={cn(
            isFieldEmpty('street') && "border-destructive focus-visible:ring-destructive"
          )}
          required={required}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={value.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            placeholder="City"
            className={cn(
              isFieldEmpty('city') && "border-destructive focus-visible:ring-destructive"
            )}
            required={required}
          />
          
          <Select
            value={value.state}
            onValueChange={(selectedState) => handleFieldChange('state', selectedState)}
            required={required}
          >
            <SelectTrigger 
              className={cn(
                "bg-background",
                isFieldEmpty('state') && "border-destructive focus:ring-destructive"
              )}
            >
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-background border border-border shadow-lg z-50">
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value} className="hover:bg-accent">
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            value={value.zip}
            onChange={(e) => handleFieldChange('zip', e.target.value)}
            placeholder="ZIP Code (5 digits)"
            maxLength={5}
            className={cn(
              isFieldEmpty('zip') && "border-destructive focus-visible:ring-destructive"
            )}
            required={required}
          />
        </div>
      </div>
    </div>
  );
};