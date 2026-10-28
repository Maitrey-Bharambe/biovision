/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* === BioVision Intelligence palette ====================== */
        canvas:   '#F8F5EC',   // page background (warm cream)
        surface:  '#FFFEFA',   // card / panel
        surface2: '#FFFFFF',   // elevated surface
        ink:      '#171717',   // primary text
        sidebar:  '#171717',   // sidebar background
        muted:    '#77736C',   // secondary / muted text
        meta:     '#A09B91',   // metadata
        border:   '#DED9CD',   // subtle borders
        hairline: '#EFEAE0',   // very subtle divider

        /* Signature accent */
        accent:   '#7656E8',
        accent2:  '#5E3FD6',   // hover / pressed
        accentTint:'#EFEAFC',  // soft accent background

        /* Biological category colours */
        genomics:       '#F0B4D5',
        genomicsInk:    '#8D3B6A',
        transcript:     '#F4D96B',
        transcriptInk:  '#866900',
        proteomics:     '#A9C59A',
        proteomicsInk:  '#4B6B3F',
        imaging:        '#AFC8F0',
        imagingInk:     '#3E578A',

        /* Mutation / state colours (keep muted) */
        good:     '#4B8A5E',
        warn:     '#B88520',
        bad:      '#C14D5A',

        /* === Back-compat aliases for pages that still reference the
           previous palette (paper/accent/subtle/etc.).  Pointing them
           at semantically-equivalent new tokens keeps everything
           visually coherent without touching every component. ===== */
        paper:    '#F8F5EC',
        bg:       '#F8F5EC',
        panel:    '#FFFEFA',
        panel2:   '#FFFEFA',
        subtle:   '#F2EDE1',
        rule:     '#DED9CD',
        prose:    '#39352F',
        mutedbg:  '#F2EDE1',
        text:     '#171717',
        ink2:     '#171717',
        teal:     '#7656E8',
        aqua:     '#7656E8',
        mint:     '#4B8A5E',
        deep:     '#171717',
        gold:     '#B88520',
        rose:     '#C14D5A',
        /* Nucleotide (unchanged — biological categorical) */
        nucA:     '#3E578A',
        nucC:     '#C14D5A',
        nucG:     '#4B8A5E',
        nucT:     '#B88520',
      },
      fontFamily: {
        /* Inter = UI. Fraunces = editorial display. JetBrains Mono = numeric. */
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        serif:   ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        prose:   ['"Inter"', 'system-ui', 'sans-serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        none:    '0px',
        sm:      '6px',
        DEFAULT: '10px',
        md:      '10px',
        lg:      '14px',
        xl:      '18px',
        '2xl':   '22px',
        '3xl':   '28px',
        '4xl':   '32px',
        '5xl':   '40px',
        full:    '9999px',
      },
      boxShadow: {
        card:    '0 1px 2px rgba(23,23,23,0.04), 0 1px 1px rgba(23,23,23,0.04)',
        cardhi:  '0 8px 24px -12px rgba(23,23,23,0.14), 0 2px 6px rgba(23,23,23,0.05)',
        focus:   '0 0 0 3px rgba(118,86,232,0.22)',
        inset:   'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      backgroundImage: {
        'grain': 'radial-gradient(rgba(23,23,23,0.04) 1px, transparent 1px)',
      },
      letterSpacing: {
        'eyebrow': '0.16em',
      },
    },
  },
  plugins: [],
};
