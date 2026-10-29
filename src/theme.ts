// Forky design tokens — taken from the Forky logo (#FF6819) and the canvas design.
export const colors = {
  brand: '#FF6819', // logo orange — fills, CTAs (use ink text on top for contrast)
  brandDeep: '#E0560F', // icons on light surfaces
  brandText: '#B3440B', // orange text/links on white (passes 4.5:1)
  brandTint: '#FFE3D3',
  brandTintSoft: '#FFF1E8',

  ink: '#1C1A17',
  ink2: '#3D3830',
  muted: '#5E5850',
  line: '#E8E4DC',
  lineSoft: '#EEEAE2',
  sand: '#EAE5DB',
  bg: '#F7F6F2', // logo off-white
  surface: '#FFFFFF',

  green: '#2F7A52',
  blue: '#2E5E9E',
  yellow: '#F4B43C',
  plum: '#5B2E4F',
};

export const fonts = {
  display: 'Poppins_700Bold',
  displaySemi: 'Poppins_600SemiBold',
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  heavy: 'DMSans_800ExtraBold',
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#1C1A17',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  brandGlow: {
    shadowColor: '#E0560F',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
};
