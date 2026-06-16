module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#e7e0d6',
        surface: '#fbf9f8',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f5f3f3',
        'surface-container': '#f0eded',
        'surface-container-high': '#eae8e7',
        'surface-container-highest': '#e4e2e1',
        'surface-variant': '#e4e2e1',
        primary: '#994700',
        'primary-container': '#ff9753',
        'primary-fixed': '#ffdbc8',
        'primary-fixed-dim': '#ffb68b',
        'on-primary': '#ffffff',
        'on-primary-container': '#703200',
        'on-primary-fixed': '#321300',
        'on-primary-fixed-variant': '#743400',
        secondary: '#5d5f5f',
        'secondary-container': '#dfe0e0',
        'secondary-fixed': '#e2e2e2',
        'secondary-fixed-dim': '#c6c6c7',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#616363',
        'on-secondary-fixed': '#1a1c1c',
        'on-secondary-fixed-variant': '#454747',
        tertiary: '#5257a1',
        'tertiary-container': '#a6abfc',
        'tertiary-fixed': '#e0e0ff',
        'tertiary-fixed-dim': '#bfc2ff',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#373c85',
        'on-tertiary-fixed': '#0a0d5c',
        'on-tertiary-fixed-variant': '#3a3f88',
        'on-surface': '#1b1c1c',
        'on-surface-variant': '#504534',
        outline: '#837561',
        'outline-variant': '#d5c4ad',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        'inverse-surface': '#303030',
        'inverse-on-surface': '#f2f0f0',
        'inverse-primary': '#ffb68b',
        'surface-tint': '#994700',
        'surface-bright': '#fbf9f8',
        'surface-dim': '#dcd9d9'
      },
      spacing: {
        "margin-desktop": "40px",
        "container-max": "1440px",
        "margin-mobile": "16px",
        gutter: "24px"
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: []
}
