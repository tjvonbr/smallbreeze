/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#f25050';
const tintColorDark = '#f25050';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#f25050',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const FontFamily = {
  regular: 'LeagueSpartan_400Regular',
  medium: 'LeagueSpartan_500Medium',
  semiBold: 'LeagueSpartan_600SemiBold',
  bold: 'LeagueSpartan_700Bold',
  extraBold: 'LeagueSpartan_800ExtraBold',
} as const;
