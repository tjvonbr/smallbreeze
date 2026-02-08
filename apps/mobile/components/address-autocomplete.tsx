import Constants from 'expo-constants';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export interface ParsedAddress {
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: ParsedAddress) => void;
  onTextChange?: (text: string) => void;
  borderColor: string;
  labelColor: string;
  textColor: string;
  placeholderColor: string;
}

interface MapboxContextItem {
  id: string;
  text: string;
  short_code?: string;
}

interface MapboxFeature {
  place_name: string;
  text: string;
  address?: string;
  center: [number, number];
  context?: MapboxContextItem[];
}

const accessToken = Constants.expoConfig?.extra?.mapboxAccessToken ?? '';

function getContextValue(context: MapboxContextItem[] | undefined, prefix: string): string {
  if (!context) return '';
  const item = context.find((c) => c.id.startsWith(prefix));
  return item?.text ?? '';
}

function getContextShortCode(context: MapboxContextItem[] | undefined, prefix: string): string {
  if (!context) return '';
  const item = context.find((c) => c.id.startsWith(prefix));
  if (!item?.short_code) return item?.text ?? '';
  const code = item.short_code;
  const dashIndex = code.indexOf('-');
  return dashIndex >= 0 ? code.substring(dashIndex + 1).toUpperCase() : code.toUpperCase();
}

function extractZipFromPlaceName(placeName: string): string {
  const match = placeName.match(/\b(\d{5}(?:-\d{4})?)\b/);
  return match ? match[1] : '';
}

function parseFeature(feature: MapboxFeature): ParsedAddress {
  const houseNumber = feature.address ?? '';
  const street = feature.text ?? '';
  const streetAddress = houseNumber ? `${houseNumber} ${street}` : street;

  const zip =
    getContextValue(feature.context, 'postcode') ||
    extractZipFromPlaceName(feature.place_name);

  return {
    streetAddress,
    city: getContextValue(feature.context, 'place'),
    state: getContextShortCode(feature.context, 'region'),
    zip,
    country: getContextValue(feature.context, 'country'),
  };
}

export default function AddressAutocomplete({
  onAddressSelect,
  onTextChange,
  borderColor,
  labelColor,
  textColor,
  placeholderColor,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&country=us&autocomplete=true&types=address`;
      const response = await fetch(endpoint);
      const results = await response.json();
      setSuggestions(results?.features ?? []);
    } catch (error) {
      console.log('Error fetching suggestions:', error);
    }
  };

  const handleChangeText = (text: string) => {
    setInputValue(text);
    onTextChange?.(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 300);
  };

  const handleSelect = (feature: MapboxFeature) => {
    const parsed = parseFeature(feature);
    setInputValue(parsed.streetAddress);
    setSuggestions([]);
    onAddressSelect(parsed);
  };

  return (
    <View>
      <View style={[styles.inputContainer, { borderColor }]}>
        <Text style={[styles.label, { color: labelColor }]}>Street Address</Text>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={inputValue}
          onChangeText={handleChangeText}
          placeholder="Start typing an address..."
          placeholderTextColor={placeholderColor}
        />
      </View>
      {suggestions.length > 0 && (
        <View style={styles.suggestionList}>
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSelect(suggestion)}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>
                {suggestion.place_name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    fontSize: 17,
    padding: 0,
  },
  suggestionList: {
    marginTop: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
});
