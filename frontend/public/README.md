# Public assets

Drop the biotech background image (DNA helix + protein + cells) here as:

    frontend/public/hero-bg.jpg

The site's CSS already references `/hero-bg.jpg` — Next.js serves `public/`
at the site root, so no code change is needed once the file lands here.

The image will show behind every page, dimmed with a soft white wash so
the dashboard remains readable. If the file is missing the site falls back
to a radial-gradient aqua composition.
