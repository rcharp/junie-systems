import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

interface AddressSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}

export const AddressAutocomplete = ({ 
  value, 
  onChange, 
  label, 
  placeholder = "Enter business address",
  id,
  className 
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Mock address suggestions for demo (in real app, you'd use Google Places API)
  const mockSuggestions = (query: string): AddressSuggestion[] => {
    if (query.length < 3) return [];
    
    const mockAddresses = [
      {
        place_id: '1',
        description: `${query} Main Street, Anytown, FL 12345`,
        structured_formatting: {
          main_text: `${query} Main Street`,
          secondary_text: 'Anytown, FL 12345'
        }
      },
      {
        place_id: '2', 
        description: `${query} Business Blvd, Suite 100, Anytown, FL 12345`,
        structured_formatting: {
          main_text: `${query} Business Blvd, Suite 100`,
          secondary_text: 'Anytown, FL 12345'
        }
      },
      {
        place_id: '3',
        description: `${query} Commerce Drive, Anytown, FL 12346`,
        structured_formatting: {
          main_text: `${query} Commerce Drive`,
          secondary_text: 'Anytown, FL 12346'
        }
      }
    ];
    
    return mockAddresses.filter(addr => 
      addr.description.toLowerCase().includes(query.toLowerCase())
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (inputValue.length >= 3) {
        setIsLoading(true);
        // Simulate API delay
        setTimeout(() => {
          const results = mockSuggestions(inputValue);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
          setIsLoading(false);
        }, 300);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
      )}
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">
              Searching addresses...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.place_id}
                className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium text-sm">
                  {suggestion.structured_formatting.main_text}
                </div>
                <div className="text-xs text-muted-foreground">
                  {suggestion.structured_formatting.secondary_text}
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground">
              No addresses found
            </div>
          )}
        </div>
      )}
    </div>
  );
};