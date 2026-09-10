import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ink-navy': '#0b3558',
        'signal-blue': '#006bff',
        'slate-gray': '#476788',
        'mist-gray': '#a6bbd1',
        cloud: '#f8f9fb',
        paper: '#ffffff',
        pebble: '#f0f3f8',
        hairline: '#d4e0ed',
        carbon: '#0a0a0a',
        'coral-magenta': '#e55cff',
        'sky-cyan': '#0099ff',
        'deep-cobalt': '#004eba',
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        gilroy: ['Gilroy', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'calendly': 'rgba(71, 103, 136, 0.04) 0px 4px 5px 0px, rgba(71, 103, 136, 0.03) 0px 4px 10px 0px, rgba(71, 103, 136, 0.05) 0px 10px 20px 0px',
        'calendly-lg': 'rgba(71, 103, 136, 0.04) 0px 4px 5px 0px, rgba(71, 103, 136, 0.03) 0px 8px 15px 0px, rgba(71, 103, 136, 0.08) 0px 30px 50px 0px',
        'calendly-btn': 'rgba(71, 103, 136, 0.04) 0px 4px 5px 0px, rgba(71, 103, 136, 0.03) 0px 8px 15px 0px, rgba(71, 103, 136, 0.06) 0px 15px 30px 0px',
      },
      borderRadius: {
        'cards': '24px',
        'product': '16px',
        'badges': '9999px',
        'inputs': '8px',
        'buttons': '8px',
      },
    },
  },
  plugins: [],
};
export default config;
