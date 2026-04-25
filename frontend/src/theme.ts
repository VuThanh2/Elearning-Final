import { alpha, createTheme } from '@mui/material/styles';

const colors = {
  academyGreen: '#006241',
  actionGreen: '#00754A',
  deepSlate: '#1E3932',
  upliftGreen: '#2b5148',
  mintWash: '#d4e9e2',
  achievementGold: '#cba258',
  goldLight: '#dfc49d',
  whiteCanvas: '#ffffff',
  neutralCool: '#f9f9f9',
  paperNeutral: '#f2f0eb',
  ceramic: '#edebe9',
  textBlack: 'rgba(0, 0, 0, 0.87)',
  textBlackSoft: 'rgba(0, 0, 0, 0.58)',
  textWhite: 'rgba(255, 255, 255, 1)',
  textWhiteSoft: 'rgba(255, 255, 255, 0.7)',
  errorRed: '#c82014',
  warningYellow: '#fbbc05',
};

const whisperShadow = '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)';
const navShadow = '0 1px 3px rgba(0,0,0,0.10), 0 2px 2px rgba(0,0,0,0.06)';
const floatingShadow = '0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.actionGreen,
      light: '#1e8b61',
      dark: colors.academyGreen,
      contrastText: colors.textWhite,
    },
    secondary: {
      main: colors.achievementGold,
      light: colors.goldLight,
      dark: '#a88645',
      contrastText: colors.deepSlate,
    },
    success: {
      main: colors.academyGreen,
      dark: colors.deepSlate,
      light: colors.mintWash,
    },
    error: {
      main: colors.errorRed,
    },
    warning: {
      main: colors.warningYellow,
    },
    info: {
      main: colors.upliftGreen,
      light: colors.mintWash,
      dark: colors.deepSlate,
    },
    background: {
      default: colors.paperNeutral,
      paper: colors.whiteCanvas,
    },
    text: {
      primary: colors.textBlack,
      secondary: colors.textBlackSoft,
    },
    divider: alpha(colors.deepSlate, 0.1),
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontFamily: 'Lora, Merriweather, Georgia, serif',
      fontSize: '3.6rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2.4rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: 0,
    },
    h4: {
      fontSize: '1.9rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: 0,
    },
    h5: {
      fontSize: '1.6rem',
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h6: {
      fontSize: '1.4rem',
      fontWeight: 600,
      lineHeight: 1.45,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.75,
    },
    body2: {
      fontSize: '0.95rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.95rem',
      fontWeight: 600,
      lineHeight: 1.5,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.82rem',
      lineHeight: 1.5,
    },
    overline: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: 0,
      fontWeight: 600,
      textTransform: 'uppercase',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--academy-green': colors.academyGreen,
          '--action-green': colors.actionGreen,
          '--deep-slate': colors.deepSlate,
          '--uplift-green': colors.upliftGreen,
          '--mint-wash': colors.mintWash,
          '--achievement-gold': colors.achievementGold,
          '--gold-light': colors.goldLight,
          '--white-canvas': colors.whiteCanvas,
          '--neutral-cool': colors.neutralCool,
          '--paper-neutral': colors.paperNeutral,
          '--ceramic': colors.ceramic,
          '--text-black': colors.textBlack,
          '--text-black-soft': colors.textBlackSoft,
          '--text-white': colors.textWhite,
          '--text-white-soft': colors.textWhiteSoft,
          '--space-1': '0.4rem',
          '--space-2': '0.8rem',
          '--space-3': '1.6rem',
          '--space-4': '2.4rem',
          '--space-5': '3.2rem',
          '--space-7': '4.8rem',
          '--space-9': '6.4rem',
          '--font-ui': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          '--font-serif': 'Lora, Merriweather, Georgia, serif',
          '--font-script': 'Kalam, "Comic Sans MS", cursive',
          '--font-data': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        'html, body, #root': {
          minHeight: '100%',
        },
        body: {
          backgroundColor: colors.paperNeutral,
          backgroundImage: `radial-gradient(circle at top right, ${alpha(colors.goldLight, 0.18)} 0, transparent 24%), radial-gradient(circle at bottom left, ${alpha(colors.mintWash, 0.55)} 0, transparent 28%)`,
          color: colors.textBlack,
          fontFamily: 'var(--font-ui)',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        a: {
          color: 'inherit',
          textDecoration: 'none',
        },
        '::selection': {
          backgroundColor: alpha(colors.actionGreen, 0.18),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: colors.whiteCanvas,
          border: `1px solid ${alpha(colors.deepSlate, 0.08)}`,
          boxShadow: whisperShadow,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: '12px 24px',
          fontWeight: 600,
          letterSpacing: 0,
          transition: 'transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
          '&:active': {
            transform: 'scale(0.95)',
          },
        },
        containedPrimary: {
          backgroundColor: colors.actionGreen,
          color: colors.textWhite,
          '&:hover': {
            backgroundColor: colors.academyGreen,
          },
        },
        outlinedPrimary: {
          borderWidth: 1.5,
          borderColor: colors.actionGreen,
          color: colors.actionGreen,
          '&:hover': {
            borderWidth: 1.5,
            backgroundColor: alpha(colors.actionGreen, 0.06),
          },
        },
        outlinedSecondary: {
          borderWidth: 1.5,
          borderColor: colors.achievementGold,
          color: colors.achievementGold,
          '&:hover': {
            borderWidth: 1.5,
            backgroundColor: alpha(colors.achievementGold, 0.08),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: navShadow,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundColor: alpha(colors.whiteCanvas, 0.72),
          '& fieldset': {
            borderColor: alpha(colors.deepSlate, 0.14),
          },
          '&:hover fieldset': {
            borderColor: alpha(colors.actionGreen, 0.35),
          },
          '&.Mui-focused fieldset': {
            borderColor: colors.actionGreen,
            borderWidth: 1.5,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: colors.ceramic,
        },
        bar: {
          borderRadius: 999,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: colors.actionGreen,
          color: colors.textWhite,
          boxShadow: floatingShadow,
          '&:hover': {
            backgroundColor: colors.academyGreen,
          },
        },
      },
    },
  },
});
