/**
 * Google Material 3 Design Tokens for AkiNeuro V2.1.1
 * 
 * Medical & Neurorehabilitation Palette (Teal & Slate Tonal System)
 * Conforms to M3 Design Specifications:
 * - Color Roles (Primary, Secondary, Tertiary, Surface Containers, Error, Outline)
 * - Typography Hierarchy (Display, Headline, Title, Body, Label)
 * - Shape Scale (None to Full)
 * - Elevation Scale (Level 0 to Level 5)
 * - Spacing Scale (4px to 64px)
 * - State Layers (Hover 8%, Focus 12%, Pressed 12%, Dragged 16%)
 */

export const m3Colors = {
  // Light Theme Roles
  light: {
    primary: '#006A6B',
    onPrimary: '#FFFFFF',
    primaryContainer: '#6FF7F6',
    onPrimaryContainer: '#002020',
    inversePrimary: '#4CDADA',

    secondary: '#4A6363',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#CCE8E7',
    onSecondaryContainer: '#051F20',

    tertiary: '#4A607C',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#D2E4FF',
    onTertiaryContainer: '#041C35',

    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',

    background: '#FAFDFD',
    onBackground: '#191C1C',

    surface: '#FAFDFD',
    onSurface: '#191C1C',
    surfaceVariant: '#DAE5E4',
    onSurfaceVariant: '#3F4948',
    surfaceTint: '#006A6B',

    // Surface Container Hierarchy (M3 Spec)
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F4F7F7',
    surfaceContainer: '#EEF2F1',
    surfaceContainerHigh: '#E8ECEC',
    surfaceContainerHighest: '#E2E6E6',

    outline: '#6F7979',
    outlineVariant: '#BEC9C8',
    inverseSurface: '#2D3131',
    inverseOnSurface: '#EFF1F1',
    scrim: '#000000',
    shadow: '#000000',
  },

  // Dark Theme Roles (Prepared for Future Theme Switching)
  dark: {
    primary: '#4CDADA',
    onPrimary: '#003737',
    primaryContainer: '#004F50',
    onPrimaryContainer: '#6FF7F6',
    inversePrimary: '#006A6B',

    secondary: '#B0CCCB',
    onSecondary: '#1B3535',
    secondaryContainer: '#324B4B',
    onSecondaryContainer: '#CCE8E7',

    tertiary: '#B2C8E8',
    onTertiary: '#1C324B',
    tertiaryContainer: '#334863',
    onTertiaryContainer: '#D2E4FF',

    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',

    background: '#191C1C',
    onBackground: '#E0E3E2',

    surface: '#101414',
    onSurface: '#E0E3E2',
    surfaceVariant: '#3F4948',
    onSurfaceVariant: '#BEC9C8',
    surfaceTint: '#4CDADA',

    surfaceContainerLowest: '#0B0F0F',
    surfaceContainerLow: '#191C1C',
    surfaceContainer: '#1D2020',
    surfaceContainerHigh: '#272B2B',
    surfaceContainerHighest: '#323535',

    outline: '#899392',
    outlineVariant: '#3F4948',
    inverseSurface: '#E0E3E2',
    inverseOnSurface: '#2D3131',
    scrim: '#000000',
    shadow: '#000000',
  }
} as const;

export const m3Shape = {
  none: 'rounded-none',         // 0px
  extraSmall: 'rounded-xs',     // 4px
  small: 'rounded-sm',         // 8px
  medium: 'rounded-md',        // 12px
  large: 'rounded-xl',         // 16px
  extraLarge: 'rounded-3xl',   // 28px
  full: 'rounded-full',        // 9999px
} as const;

export const m3Elevation = {
  level0: 'shadow-none',
  level1: 'shadow-[0px_1px_3px_1px_rgba(0,0,0,0.12),0px_1px_2px_0px_rgba(0,0,0,0.24)]',
  level2: 'shadow-[0px_2px_6px_2px_rgba(0,0,0,0.12),0px_1px_2px_0px_rgba(0,0,0,0.24)]',
  level3: 'shadow-[0px_4px_8px_3px_rgba(0,0,0,0.12),0px_1px_3px_0px_rgba(0,0,0,0.24)]',
  level4: 'shadow-[0px_6px_10px_4px_rgba(0,0,0,0.12),0px_2px_3px_0px_rgba(0,0,0,0.24)]',
  level5: 'shadow-[0px_8px_12px_6px_rgba(0,0,0,0.12),0px_4px_4px_0px_rgba(0,0,0,0.24)]',
} as const;

export const m3Typography = {
  displayLarge: 'text-[57px] leading-[64px] font-normal tracking-[-0.25px]',
  displayMedium: 'text-[45px] leading-[52px] font-normal tracking-normal',
  displaySmall: 'text-[36px] leading-[44px] font-normal tracking-normal',

  headlineLarge: 'text-[32px] leading-[40px] font-bold tracking-normal',
  headlineMedium: 'text-[28px] leading-[36px] font-semibold tracking-normal',
  headlineSmall: 'text-[24px] leading-[32px] font-semibold tracking-normal',

  titleLarge: 'text-[22px] leading-[28px] font-semibold tracking-normal',
  titleMedium: 'text-[16px] leading-[24px] font-medium tracking-[0.15px]',
  titleSmall: 'text-[14px] leading-[20px] font-medium tracking-[0.1px]',

  bodyLarge: 'text-[16px] leading-[24px] font-normal tracking-[0.5px]',
  bodyMedium: 'text-[14px] leading-[20px] font-normal tracking-[0.25px]',
  bodySmall: 'text-[12px] leading-[16px] font-normal tracking-[0.4px]',

  labelLarge: 'text-[14px] leading-[20px] font-medium tracking-[0.1px]',
  labelMedium: 'text-[12px] leading-[16px] font-medium tracking-[0.5px]',
  labelSmall: 'text-[11px] leading-[16px] font-medium tracking-[0.5px]',
} as const;

export const m3Spacing = {
  space0: '0px',
  space1: '4px',
  space2: '8px',
  space3: '12px',
  space4: '16px',
  space5: '20px',
  space6: '24px',
  space8: '32px',
  space10: '40px',
  space12: '48px',
  space16: '64px',
} as const;
