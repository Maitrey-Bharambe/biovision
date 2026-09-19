/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Bright biotech palette
        bg:      '#e5f5f7',   // page background
        surface: '#d0ecf1',   // card / hero panel
        surface2:'#f6fbfc',
        ink:     '#0a2540',   // primary text (deep navy)
        ink2:    '#123057',
        muted:   '#5b7594',
        border:  '#b8dfe6',
        teal:    '#0ea5b7',
        aqua:    '#4dd0e1',
        mint:    '#7fe3d4',
        deep:    '#0a2540',
        gold:    '#f4b942',
        rose:    '#e56b8f',
        // DNA nucleotide colours
        nucA: '#2f6df1',
        nucC: '#e0526d',
        nucG: '#1fb885',
        nucT: '#e0a021',

        // --- Back-compat aliases so the interior pages inherit the new
        // light theme without a per-file rewrite ------------------------
        panel:   '#ffffffb3',
        panel2:  '#ffffffd9',
        text:    '#0a2540',
        accent:  '#0ea5b7',
        accent2: '#4dd0e1',
        good:    '#0ea5b7',
        warn:    '#f4b942',
        bad:     '#e56b8f',
      },
      fontFamily: {
        display: ['"Space Grotesk"','Inter','system-ui','sans-serif'],
        sans:    ['Inter','system-ui','sans-serif'],
        mono:    ['ui-monospace','SFMono-Regular','Menlo','monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        card:   '0 6px 24px -8px rgba(10,37,64,0.10), 0 2px 6px rgba(10,37,64,0.04)',
        cardhi: '0 14px 40px -10px rgba(10,37,64,0.18)',
        inset:  'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      backgroundImage: {
        'radial-teal': 'radial-gradient(ellipse at 20% 20%, rgba(77,208,225,0.25), transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(127,227,212,0.18), transparent 60%)',
      },
    },
  },
  plugins: [],
};
