/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* === Newsprint palette ====================================== */
        paper:    '#F9F9F7',   // page background
        ink:      '#111111',   // primary text and borders
        rule:     '#111111',   // alias: structural lines
        muted:    '#737373',   // metadata / muted text (common usage: text-muted)
        mutedbg:  '#E5E5E0',   // muted BACKGROUND panel
        subtle:   '#F5F5F5',   // light neutral
        meta:     '#737373',   // metadata text (alias of muted)
        prose:    '#525252',   // secondary / body copy
        accent:   '#CC0000',   // primary accent — used sparingly

        /* === Categorical palette for scientific charts =========== */
        catA: '#CC0000',
        catB: '#1F4E79',
        catC: '#2E7D32',
        catD: '#AD6A1A',
        catE: '#6B3FA0',
        catF: '#0F766E',
        catG: '#C2410C',
        catH: '#525252',

        /* === DNA nucleotide colours (kept) ======================== */
        nucA: '#1F4E79',
        nucC: '#CC0000',
        nucG: '#2E7D32',
        nucT: '#AD6A1A',

        /* === Back-compat aliases =================================
           Existing pages reference bg/surface/surface2/text/panel/
           panel2/border/teal/aqua/mint/deep/gold/rose/ink2/good/
           warn/bad/accent2. Re-point them to the Newsprint ink/paper
           tokens so no page needs an inline rewrite, while still
           giving each role a plausible newsprint equivalent.      */
        bg:       '#F9F9F7',
        surface:  '#FFFFFF',
        surface2: '#F5F5F5',
        panel:    '#FFFFFF',
        panel2:   '#F5F5F5',
        text:     '#111111',
        ink2:     '#111111',
        border:   '#111111',
        teal:     '#111111',
        aqua:     '#525252',
        mint:     '#2E7D32',
        deep:     '#111111',
        gold:     '#AD6A1A',
        rose:     '#CC0000',
        good:     '#2E7D32',
        warn:     '#AD6A1A',
        bad:      '#CC0000',
        accent2:  '#525252',
      },
      fontFamily: {
        display: ['"Playfair Display"','ui-serif','Georgia','serif'],
        serif:   ['"Playfair Display"','ui-serif','Georgia','serif'],
        prose:   ['"Lora"','ui-serif','Georgia','serif'],
        sans:    ['"Inter"','system-ui','sans-serif'],
        mono:    ['"JetBrains Mono"','ui-monospace','SFMono-Regular','Menlo','monospace'],
      },
      borderRadius: {
        /* Newsprint is strict square geometry.                    */
        none: '0px',
        sm:   '0px',
        DEFAULT: '0px',
        md:   '0px',
        lg:   '0px',
        xl:   '0px',
        '2xl':'0px',
        '3xl':'0px',
        '4xl':'0px',
        '5xl':'0px',
        full: '9999px',  // kept only for dots / indicators
      },
      boxShadow: {
        /* Hard-offset editorial shadow — no soft blur.            */
        card:    '0 0 0 1px #111111',
        cardhi:  '4px 4px 0 0 #111111',
        inset:   'none',
      },
      backgroundImage: {
        /* Replaces the old aqua radial.                           */
        'newsprint-dot': 'radial-gradient(#1111111a 1px, transparent 1px)',
      },
      letterSpacing: {
        'eyebrow': '0.22em',
      },
    },
  },
  plugins: [],
};
