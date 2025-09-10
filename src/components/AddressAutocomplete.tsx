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
  label?: string;
  className?: string;
  required?: boolean;
  showValidation?: boolean;
}

export const AddressInput = ({ 
  value, 
  onChange, 
  label = "Business Address",
  className,
  required = false,
  showValidation = false
}: AddressInputProps) => {
  const US_STATES = [
    { value: 'Alabama', label: 'Alabama' },
    { value: 'Alaska', label: 'Alaska' },
    { value: 'Arizona', label: 'Arizona' },
    { value: 'Arkansas', label: 'Arkansas' },
    { value: 'California', label: 'California' },
    { value: 'Colorado', label: 'Colorado' },
    { value: 'Connecticut', label: 'Connecticut' },
    { value: 'Delaware', label: 'Delaware' },
    { value: 'Florida', label: 'Florida' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Hawaii', label: 'Hawaii' },
    { value: 'Idaho', label: 'Idaho' },
    { value: 'Illinois', label: 'Illinois' },
    { value: 'Indiana', label: 'Indiana' },
    { value: 'Iowa', label: 'Iowa' },
    { value: 'Kansas', label: 'Kansas' },
    { value: 'Kentucky', label: 'Kentucky' },
    { value: 'Louisiana', label: 'Louisiana' },
    { value: 'Maine', label: 'Maine' },
    { value: 'Maryland', label: 'Maryland' },
    { value: 'Massachusetts', label: 'Massachusetts' },
    { value: 'Michigan', label: 'Michigan' },
    { value: 'Minnesota', label: 'Minnesota' },
    { value: 'Mississippi', label: 'Mississippi' },
    { value: 'Missouri', label: 'Missouri' },
    { value: 'Montana', label: 'Montana' },
    { value: 'Nebraska', label: 'Nebraska' },
    { value: 'Nevada', label: 'Nevada' },
    { value: 'New Hampshire', label: 'New Hampshire' },
    { value: 'New Jersey', label: 'New Jersey' },
    { value: 'New Mexico', label: 'New Mexico' },
    { value: 'New York', label: 'New York' },
    { value: 'North Carolina', label: 'North Carolina' },
    { value: 'North Dakota', label: 'North Dakota' },
    { value: 'Ohio', label: 'Ohio' },
    { value: 'Oklahoma', label: 'Oklahoma' },
    { value: 'Oregon', label: 'Oregon' },
    { value: 'Pennsylvania', label: 'Pennsylvania' },
    { value: 'Rhode Island', label: 'Rhode Island' },
    { value: 'South Carolina', label: 'South Carolina' },
    { value: 'South Dakota', label: 'South Dakota' },
    { value: 'Tennessee', label: 'Tennessee' },
    { value: 'Texas', label: 'Texas' },
    { value: 'Utah', label: 'Utah' },
    { value: 'Vermont', label: 'Vermont' },
    { value: 'Virginia', label: 'Virginia' },
    { value: 'Washington', label: 'Washington' },
    { value: 'West Virginia', label: 'West Virginia' },
    { value: 'Wisconsin', label: 'Wisconsin' },
    { value: 'Wyoming', label: 'Wyoming' },
    { value: 'District of Columbia', label: 'District of Columbia' }
  ];

  const handleFieldChange = (field: keyof AddressData, fieldValue: string) => {
    // For zip code, only allow numeric characters and hyphens
    if (field === 'zip') {
      fieldValue = fieldValue.replace(/[^\d-]/g, '');
    }
    
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  const isFieldEmpty = (field: keyof AddressData) => {
    return required && showValidation && !value[field]?.trim();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
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
            placeholder="ZIP Code"
            maxLength={10}
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