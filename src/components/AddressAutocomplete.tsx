import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const handleFieldChange = (field: keyof AddressData, fieldValue: string) => {
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
          
          <Input
            value={value.state}
            onChange={(e) => handleFieldChange('state', e.target.value)}
            placeholder="State"
            maxLength={50}
            className={cn(
              isFieldEmpty('state') && "border-destructive focus-visible:ring-destructive"
            )}
            required={required}
          />
          
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