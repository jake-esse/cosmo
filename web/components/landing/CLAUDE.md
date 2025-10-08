# Landing Page Components

## Purpose
These components make up the public-facing landing page for Ampel, showcasing the company's mission of shared equity ownership in AI companies.

## Architecture
The landing page is built with modular React components using Next.js 14 and Tailwind CSS. Each section is a separate component for maintainability and reusability.

## Key Files
- `FloatingNav.tsx`: Sticky navigation that appears on scroll
- `MainNav.tsx`: Primary navigation with logo and sign-up CTA
- `Hero.tsx`: Hero section with main headline and 50% equity message
- `Benefits.tsx`: Grid of benefit cards explaining the company philosophy
- `HowItWorks.tsx`: Split layout with numbered steps and green feature card
- `Rewards.tsx`: Current equity rewards breakdown (100, 50, 25, 200 shares)
- `CTASection.tsx`: Call-to-action with mountain image
- `Footer.tsx`: Footer with navigation links and copyright
- `icons.tsx`: Reusable SVG icon components

## Design System
- **Fonts**: 
  - Crimson Text for headlines (serif)
  - DM Sans for body text (sans-serif)
  - Roboto Mono for captions (monospace)
- **Colors**:
  - Primary: #485C11 (dark green)
  - Secondary: #DFECC6 (light green)
  - Text: #6F6F6F (gray)
  - Stats: #929292 (light gray)
- **Spacing**: Based on Figma design specifications
- **Border Radius**: 30px for cards, 1000px for buttons

## Dependencies
- Next.js Image component for optimized images
- Tailwind CSS for styling
- Custom font configurations from Google Fonts

## Blockchain Readiness
While the landing page itself doesn't interact with blockchain, it sets expectations for the equity system that will eventually migrate to on-chain tokens.

## Future Considerations
- Mobile responsive design (currently desktop-only)
- Tablet layout variations
- Animation enhancements (fade-ins, parallax)
- A/B testing different CTAs
- Internationalization support

## Usage Examples
```tsx
// The landing page is rendered at the root route
// app/page.tsx
import { FloatingNav } from "@/components/landing/FloatingNav";
import { MainNav } from "@/components/landing/MainNav";
// ... other imports

export default function LandingPage() {
  return (
    <div className="bg-white min-h-screen">
      <FloatingNav />
      <MainNav />
      {/* ... */}
    </div>
  );
}
```

## Integration Points
- **Authentication**: Sign Up and Log In buttons route to `/signup` and `/login`
- **Smooth Scrolling**: Navigation links scroll to section anchors
- **Protected Routes**: After auth, users are redirected to `/dashboard`
