// src/theme.ts
// This file defines the custom Chakra UI theme, including the pastel color palette
// and base styles for components like Button and Input, ensuring a consistent
// and visually appealing user interface across the application.

import { extendTheme } from '@chakra-ui/react';

const colors = {
  // Primary brand colors (greens) for backgrounds, subtle accents
  brand: {
    50: '#F0FDF4', // Very light green for primary background
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#116932',
    800: '#124A28',
    900: '#042713',
    950: '#03190C',
  },
  // Accent colors (pinks) for interactive elements, highlights
  accent: {
    50: '#FDF2F8', // Very light pink for accents
    100: '#FCE7F3',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#EC4899',
    600: '#DB2777',
    700: '#A41752',
    800: '#6D0E34',
    900: '#45061F',
    950: '#2C0514',
  },
  // Text colors for readability
  text: {
    dark: '#1A202C', // Dark gray for main text (Chakra's gray.800)
    light: '#4A5568', // Lighter gray for secondary text (Chakra's gray.600)
  },
  // Standard Chakra UI colors for feedback (e.g., errors, info)
  red: {
    50: '#FFF5F5', 100: '#FED7D7', 200: '#FEB2B2', 300: '#FC8181', 400: '#F56565',
    500: '#E53E3E', 600: '#C53030', 700: '#9B2C2C', 800: '#822727', 900: '#63171B',
  },
  blue: {
    50: '#EBF8FF', 100: '#BEE3F8', 200: '#90CDF4', 300: '#63B3ED', 400: '#4299E1',
    500: '#3182CE', 600: '#2B6CB0', 700: '#2C5282', 800: '#2A4365', 900: '#1A365D',
  },
  green: { // Adding a green for success messages, using brand colors
    50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC', 400: '#4ADE80',
    500: '#22C55E', 600: '#16A34A', 700: '#116932', 800: '#124A28', 900: '#042713',
  },
  yellow: { // Adding yellow for warnings
    50: '#FFFFF0', 100: '#FEFCBF', 200: '#FAF089', 300: '#F6E05E', 400: '#ECC94B',
    500: '#D69E2E', 600: '#B7791F', 700: '#975A16', 800: '#744210', 900: '#5F370E',
  }
};

const theme = extendTheme({
  colors,
  styles: {
    global: {
      body: {
        bg: 'brand.50', // Set a very light pastel background for the whole app
        color: 'text.dark', // Default text color
        fontFamily: 'Inter, sans-serif', // Using Inter font as recommended
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'normal', // Sober look
        borderRadius: 'md', // Rounded corners
      },
      variants: {
        solid: {
          bg: 'accent.100', // Pastel accent for buttons
          color: 'text.dark',
          _hover: {
            bg: 'accent.200', // Slightly darker pastel on hover
          },
          _active: {
            bg: 'accent.300', // Even darker on active
          },
        },
        outline: {
          borderColor: 'brand.200',
          color: 'text.dark',
          _hover: {
            bg: 'brand.100',
          },
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          borderColor: 'brand.200', // Subtle border
          borderRadius: 'md', // Rounded corners
          _focus: {
            borderColor: 'brand.300',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)',
          },
        },
      },
    },
    Textarea: {
      baseStyle: {
        field: {
          borderColor: 'brand.200',
          borderRadius: 'md',
          _focus: {
            borderColor: 'brand.300',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)',
          },
        },
      },
    },
    Select: {
      baseStyle: {
        field: {
          borderColor: 'brand.200',
          borderRadius: 'md',
          _focus: {
            borderColor: 'brand.300',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)',
          },
        },
      },
    },
    // Card component for consistent styling of content blocks
    Card: {
      baseStyle: {
        container: {
          bg: 'whiteAlpha.700', // Slightly transparent white for cards
          borderRadius: 'lg', // More rounded corners for cards
          boxShadow: 'md', // Subtle shadow
          p: 6, // Default padding
        },
      },
    },
  },
});

export default theme;
