# Hero Section Fixes - Pixel Perfect to Figma

## Changes Applied

### Hero Component (`/components/landing/Hero.tsx`)

#### Typography Fixes:

1. **"Your AI Company."**
   - Font: Crimson Text (with inline style backup)
   - Size: 160px (exact)
   - Color: Black (#000000)
   - Letter spacing: -8px
   - Line height: 0.85

2. **"Abundance only matters if it's shared."**
   - Font: DM Sans
   - Size: 30px (increased from heading-2 class)
   - Color: #6F6F6F (gray text)
   - Letter spacing: -0.15px
   - Line height: 1.4

3. **"50%"**
   - Font: Crimson Text (with inline style backup)
   - Size: 160px (exact)
   - Color: White (#FFFFFF)
   - Letter spacing: -8px
   - Line height: 0.85

4. **"Of Ampel's equity at launch has been allocated to user rewards."**
   - Font: DM Sans
   - Size: 30px (same as subheadline)
   - Color: White (#FFFFFF)
   - Letter spacing: -0.15px
   - Line height: 1.4

### Font Configuration Fixes:

1. **Updated `app/globals.css`**
   - Fixed font-brand to use `--font-crimson-text` instead of `--font-crimson-pro`
   - Fixed font-mono to use `--font-roboto-mono`

2. **Updated `tailwind.config.ts`**
   - Reordered font family arrays to prioritize actual font names
   - Ensures proper fallback to CSS variables

3. **Font Loading in `app/layout.tsx`**
   - All three fonts properly loaded with correct weights
   - Crimson Text: 400, 600, 700
   - DM Sans: 400, 500, 700
   - Roboto Mono: 400, 500, 700

### Layout Fixes:

1. **Positioning**
   - Main headline at top: 51px
   - Subheadline at top: 224px (56 in Tailwind = 224px)
   - Hero image at top: 345px
   - 50% text at top: 89px relative to image
   - Bottom text at top: 243px relative to image

2. **Widths**
   - Container: 1200px
   - Text blocks: 1060px for better readability

## Testing Checklist

- [ ] "Your AI Company." displays in Crimson Text serif font
- [ ] "Your AI Company." is large (160px)
- [ ] "Abundance only matters..." is gray (#6F6F6F) and 30px
- [ ] "50%" displays in white Crimson Text over the image
- [ ] "Of Ampel's equity..." is white and same size as subheadline
- [ ] All text is properly centered
- [ ] Hero image has rounded corners (30px radius)

## Browser Compatibility

The implementation uses:
- CSS variables for fonts (good browser support)
- Inline style fallbacks for critical font-family declarations
- Standard Tailwind classes for consistent rendering

## Notes

- Using both Tailwind classes and inline styles ensures the fonts render correctly even if there's a CSS loading issue
- The exact pixel values from Figma are preserved (160px for display text, 30px for subheadlines)
- Letter spacing and line height match Figma specifications exactly
