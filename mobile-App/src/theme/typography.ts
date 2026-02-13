import { TextStyle } from 'react-native';

export const fonts = {
  regular: 'OpenAISans-Regular',
  medium: 'OpenAISans-Medium',
  semibold: 'OpenAISans-Semibold',
  bold: 'OpenAISans-Bold',
  brand: 'OpenAISans-LightItalic',
} as const;

export const fontAssets = {
  [fonts.regular]: require('../../assets/fonts/OpenAISans-Regular.ttf'),
  [fonts.medium]: require('../../assets/fonts/OpenAISans-Medium.ttf'),
  [fonts.semibold]: require('../../assets/fonts/OpenAISans-Semibold.ttf'),
  [fonts.bold]: require('../../assets/fonts/OpenAISans-Bold.ttf'),
  [fonts.brand]: require('../../assets/fonts/OpenAISans-LightItalic.ttf'),
} as const;

export const typography: Record<string, TextStyle> = {
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  mono: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
};
