import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productAutocompleteService } from '../../services/productAutocompleteService';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface ProductTypeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onProductSelected?: (product: string) => void;
  placeholder?: string;
  style?: any;
  showSuggestions?: boolean;
  maxSuggestions?: number;
}

const ProductTypeInput: React.FC<ProductTypeInputProps> = ({
  value,
  onChangeText,
  onProductSelected,
  placeholder = "Enter product type",
  style,
  showSuggestions = true,
  maxSuggestions = 8,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Load initial suggestions when component mounts
  useEffect(() => {
    loadSuggestions('');
  }, []);

  const loadSuggestions = async (input: string) => {
    if (!showSuggestions) return;

    setIsLoading(true);
    try {
      const newSuggestions = await productAutocompleteService.getSuggestions(input);
      setSuggestions(newSuggestions.slice(0, maxSuggestions));
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = async (text: string) => {
    onChangeText(text);
    
    if (text.trim().length === 0) {
      setShowSuggestionsList(false);
      await loadSuggestions('');
    } else {
      setShowSuggestionsList(true);
      await loadSuggestions(text);
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestionsList(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding to allow onPress to fire
    setTimeout(() => {
      setShowSuggestionsList(false);
    }, 150);
  };

  const handleSuggestionPress = async (suggestion: string) => {
    onChangeText(suggestion);
    setShowSuggestionsList(false);
    
    // Store the selected product
    await productAutocompleteService.addProduct(suggestion);
    
    if (onProductSelected) {
      onProductSelected(suggestion);
    }
    
    // Hide keyboard
    Keyboard.dismiss();
  };

  const handleSubmit = async () => {
    if (value.trim().length > 0) {
      // Store the submitted product
      await productAutocompleteService.addProduct(value.trim());
      
      if (onProductSelected) {
        onProductSelected(value.trim());
      }
    }
    
    setShowSuggestionsList(false);
    Keyboard.dismiss();
  };

  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons 
        name="history" 
        size={16} 
        color={colors.text.secondary} 
        style={styles.suggestionIcon}
      />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons 
            name="package-variant" 
            size={18} 
            color={value ? colors.primary : colors.text.light} 
            style={styles.inputIcon}
          />
          <TextInput
            ref={inputRef}
            style={[styles.input, showSuggestionsList && styles.inputFocused]}
            value={value}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor={colors.text.light}
            returnKeyType="done"
            autoCorrect={false}
            autoCapitalize="words"
          />
          {isLoading && (
            <MaterialCommunityIcons 
              name="loading" 
              size={18} 
              color={colors.text.light} 
              style={styles.loadingIcon}
            />
          )}
          {value && !isLoading && (
            <TouchableOpacity
              onPress={() => {
                onChangeText('');
                inputRef.current?.focus();
              }}
              style={styles.clearButton}
            >
              <MaterialCommunityIcons 
                name="close-circle" 
                size={18} 
                color={colors.text.light} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSuggestionsList && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item, index) => `${item}-${index}`}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.text.light + '40',
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  inputFocused: {
    borderColor: colors.primary + '60',
    borderWidth: 1.5,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingIcon: {
    marginLeft: spacing.xs,
  },
  clearButton: {
    marginLeft: spacing.xs,
    padding: spacing.xs,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.text.light + '40',
    borderRadius: 12,
    maxHeight: 200,
    zIndex: 1001,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '15',
    backgroundColor: colors.white,
  },
  suggestionIcon: {
    marginRight: spacing.sm,
  },
  suggestionText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    flex: 1,
  },
});

export default ProductTypeInput;
