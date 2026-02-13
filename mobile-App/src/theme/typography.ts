import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  button: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  mono: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
};
