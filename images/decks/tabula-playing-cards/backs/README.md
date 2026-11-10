# Victorian Arabesque playing-card backs

Place seven 1024×1536 WebP files in this directory, named:

- `sepia.webp`
- `green.webp`
- `burgundy.webp`
- `navy.webp`
- `purple.webp`
- `black.webp`
- `ivory.webp`

The `css/card-backs.css` and `css/deck-appearances.css` selectors use these files. No legacy SVG fallback is retained; if an image is unavailable the chosen background color is shown. The shared Worn weathering image is in `images/ui/worn-back-weathering.svg`. Keep all artwork 180-degree rotationally symmetric and do not include suit emblems.
