import { createTheme } from "@mui/material";

// ── MD3 Tonal Palette: Primary (seed #7C4DFF Deep Purple) ──
const mdPrimary = {
  0: "#000000",
  4: "#0e0022",
  6: "#12002b",
  10: "#1b0037",
  12: "#1f003e",
  17: "#290053",
  20: "#2f0062",
  22: "#34006a",
  24: "#390073",
  30: "#4a1d8a",
  40: "#6237a3",
  50: "#7b51be",
  60: "#956bda",
  70: "#b085f6",
  80: "#c7a7ff",
  87: "#d8c4ff",
  90: "#e4d5ff",
  92: "#eaddff",
  94: "#f0e7ff",
  95: "#f3edff",
  96: "#f6f0ff",
  98: "#fdf8ff",
  99: "#fffbff",
  100: "#ffffff",
};

// ── MD3 Tonal Palette: Neutral ──
const mdNeutral = {
  0: "#000000",
  4: "#0e0e13",
  6: "#131318",
  10: "#1b1b21",
  12: "#1f1f25",
  17: "#292930",
  20: "#2e2e35",
  22: "#33333b",
  24: "#38383f",
  30: "#4f4f56",
  40: "#67676e",
  50: "#808087",
  60: "#9a9aa1",
  70: "#b5b5bc",
  80: "#d1d1d8",
  87: "#e5e1e6",
  90: "#e5e1e6",
  92: "#ebe7ec",
  94: "#f1edf2",
  95: "#f4f0f5",
  96: "#f7f3f8",
  98: "#fdf8ff",
  99: "#fffbff",
  100: "#ffffff",
};

// ── MD3 Tonal Palette: Error ──
const mdError = {
  10: "#410002",
  20: "#690005",
  30: "#93000a",
  40: "#ba1a1a",
  80: "#ffb4ab",
  90: "#ffdad6",
};

// ── MD3 Surface Container tokens (for direct use in sx) ──
export const mdSurface = {
  dim: mdNeutral[6],
  default: mdNeutral[10],
  bright: mdNeutral[24],
  containerLowest: mdNeutral[4],
  containerLow: mdNeutral[10],
  container: mdNeutral[12],
  containerHigh: mdNeutral[17],
  containerHighest: mdNeutral[22],
};

// ── MD3 Shape tokens ──
const mdShape = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 28,
};

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: mdPrimary[80],
      light: mdPrimary[90],
      dark: mdPrimary[70],
      contrastText: mdPrimary[20],
    },
    secondary: {
      main: "#ccc2dc",
      light: "#e5ddf5",
      dark: "#9c8fad",
      contrastText: "#2d1553",
    },
    error: {
      main: mdError[80],
      light: mdError[90],
      dark: "#ff5449",
      contrastText: mdError[20],
    },
    warning: {
      main: "#ffb860",
      light: "#ffd08a",
      dark: "#c78a30",
    },
    success: {
      main: "#81c784",
      light: "#a5d6a7",
      dark: "#519657",
    },
    info: {
      main: "#8ec8f2",
      light: "#b3dffb",
      dark: "#5a9ec9",
    },
    background: {
      default: mdSurface.dim,
      paper: mdSurface.container,
    },
    text: {
      primary: mdNeutral[90],
      secondary: mdNeutral[70],
      disabled: mdNeutral[50],
    },
    divider: mdNeutral[22],
  },

  typography: {
    fontFamily:
      '"Roboto", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif',
    // MD3 type scale mapped onto MUI variants
    h5: {
      fontSize: "1.75rem",       // MD3 Headline Large
      fontWeight: 400,
      lineHeight: 1.25,
      letterSpacing: 0,
    },
    h6: {
      fontSize: "1.375rem",      // MD3 Headline Small → used as Title Large
      fontWeight: 400,
      lineHeight: 1.27,
      letterSpacing: 0,
    },
    subtitle1: {
      fontSize: "1rem",          // MD3 Title Medium
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: "0.009rem",
    },
    subtitle2: {
      fontSize: "0.875rem",      // MD3 Title Small
      fontWeight: 500,
      lineHeight: 1.43,
      letterSpacing: "0.006rem",
    },
    body1: {
      fontSize: "1rem",          // MD3 Body Large
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0.031rem",
    },
    body2: {
      fontSize: "0.875rem",      // MD3 Body Medium
      fontWeight: 400,
      lineHeight: 1.43,
      letterSpacing: "0.016rem",
    },
    caption: {
      fontSize: "0.75rem",       // MD3 Body Small
      fontWeight: 400,
      lineHeight: 1.33,
      letterSpacing: "0.025rem",
    },
    button: {
      fontSize: "0.875rem",      // MD3 Label Large
      fontWeight: 500,
      lineHeight: 1.43,
      letterSpacing: "0.006rem",
      textTransform: "none" as const,
    },
  },

  shape: {
    borderRadius: mdShape.md,
  },

  spacing: 8,

  components: {
    // ── Card: MD3 Elevated Card ──
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: mdShape.md,
          backgroundImage: "none",
          boxShadow: "none",
          outline: `1px solid ${mdNeutral[22]}`,
          transition: "outline-color 200ms ease, box-shadow 200ms ease",
        },
      },
    },

    // ── Button: MD3 Filled Button ──
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,       // MD3 fully rounded (pill)
          padding: "8px 24px",
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.875rem",
          boxShadow: "none",
        },
        sizeSmall: {
          borderRadius: 16,
          padding: "4px 16px",
          fontSize: "0.8125rem",
        },
        contained: {
          boxShadow: "none",
          "&.MuiButton-containedPrimary": {
            boxShadow: "none",
          },
          "&.MuiButton-containedError": {
            boxShadow: "none",
          },
        },
        outlined: {
          borderColor: mdNeutral[50],
        },
      },
    },

    // ── Chip: MD3 Assist Chip ──
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: mdShape.sm,
          fontWeight: 500,
          fontSize: "0.75rem",
          height: 28,
        },
        filled: {
          backgroundImage: "none",
        },
        sizeSmall: {
          height: 24,
          fontSize: "0.6875rem",
        },
      },
    },

    // ── Dialog: MD3 Dialog ──
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: mdShape.xl,
          backgroundImage: "none",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: "1.375rem",
          fontWeight: 400,
          padding: "24px 24px 16px",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px 24px",
          gap: 8,
        },
      },
    },

    // ── AppBar: MD3 Top App Bar ──
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
          elevation: 0,
          backgroundColor: mdSurface.container,
        },
      },
    },

    // ── Toolbar: MD3 density ──
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 56,
        },
        dense: {
          minHeight: 48,
        },
      },
    },

    // ── ToggleButton: MD3 Segmented Button ──
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          padding: "4px 16px",
          textTransform: "none",
          fontSize: "0.875rem",
          fontWeight: 500,
          border: `1px solid ${mdNeutral[50]}`,
          color: mdNeutral[90],
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          gap: 0,
        },
      },
    },

    // ── Slider: MD3 Slider ──
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 4,
          padding: "13px 0",
        },
        thumb: {
          height: 20,
          width: 20,
          borderRadius: "50%",
        },
        track: {
          height: 4,
          borderRadius: 2,
        },
        rail: {
          height: 4,
          borderRadius: 2,
        },
      },
    },

    // ── TextField: MD3 Outlined Text Field ──
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: mdShape.xs,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: mdNeutral[50],
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
        },
      },
    },

    // ── Checkbox: Custom overlay background ──
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 6,
        },
      },
    },

    // ── List: dense list for MD3 ──
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: mdShape.sm,
        },
      },
    },

    // ── Divider ──
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: mdNeutral[22],
        },
      },
    },

    // ── Alert ──
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: mdShape.sm,
        },
      },
    },

    // ── LinearProgress: MD3 Progress Indicator ──
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 4,
          borderRadius: 2,
          backgroundColor: mdNeutral[22],
        },
      },
    },
  },
});

export default theme;
