---
name: Avista
description: Private villa brochure for a quiet forest estate by the Aegean.
colors:
  estate-cream: "#F4EFE7"
  garden-cream: "#EBE3D5"
  warm-ink: "#26221C"
  olive-ink: "#5C5347"
  brass: "#9C7E54"
  pine: "#2B362F"
  pine-text: "#ECE5D6"
typography:
  hero:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(3.1rem, 9.2vw, 8.6rem)"
    fontWeight: 330
    lineHeight: 0.94
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.7rem, 6.4vw, 5.6rem)"
    fontWeight: 340
    lineHeight: 0.96
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.1rem, 4.6vw, 3.9rem)"
    fontWeight: 340
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 350
    lineHeight: 1.65
  label:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "0.74rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.24em"
rounded:
  estate: "16px"
  pill: "999px"
spacing:
  gutter: "clamp(20px, 5vw, 84px)"
  section: "clamp(72px, 11vw, 168px)"
  section-tight: "clamp(54px, 7vw, 104px)"
  feature-gap: "clamp(34px, 5vw, 86px)"
components:
  button-link:
    textColor: "{colors.warm-ink}"
    typography: "{typography.label}"
    padding: "0"
  button-solid:
    backgroundColor: "{colors.warm-ink}"
    textColor: "{colors.estate-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "1.05em 1.9em"
  deep-section:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.pine-text}"
  image-card:
    backgroundColor: "{colors.garden-cream}"
    rounded: "{rounded.estate}"
---

# Design System: Avista

## 1. Overview

**Creative North Star: "The Private Forest Estate"**

Avista is a quiet, image-led estate system: pine shade, warm stone, sea air, garden privacy, and a pace that feels owned by the guests. The design should feel like entering a private family property, not browsing a booking marketplace. Space, photography, and a small number of carefully repeated details carry the brand.

The current system is built from warm creams, pine green, brass detail, large serif display type, and spare grotesque labels. It uses generous section spacing, strong full-bleed imagery, asymmetric villa feature blocks, and restrained linework to separate information without turning the page into a card grid.

This system rejects generic booking-engine layouts, loud beach-club energy, anonymous stock-travel imagery, crowded template icon sections, and corporate travel-funnel language. Every new surface should help the visitor understand place, privacy, house choice, and enquiry.

**Key Characteristics:**

- Image-led first impressions with forest, sea, terrace, pool, and garden detail.
- Warm cream and pine surfaces with brass used sparingly for orientation and refinement.
- High-contrast serif display type paired with quiet, tracked sans labels.
- Large breathing room, slow rhythm, and clear house-to-house comparison.
- Personal enquiry language, never transactional checkout language.

## 2. Colors

The palette is a restrained private-estate palette: warm neutral surfaces, dark pine sections, near-black text, and brass as a small detail color.

### Primary

- **Pine Estate**: The deep section and footer color. Use it for immersive dark bands, gallery sections, modal backdrops, and final grounding surfaces.
- **Warm Ink**: The main text color. Use for body copy, buttons, headings on light surfaces, and serious information.
- **Estate Brass**: The detail color. Use for villa numerals, rules, short labels, selection highlights, and rare brand ornament only.

### Neutral

- **Estate Cream**: The main page background. It carries the quiet private-estate mood and should remain calm behind text.
- **Garden Cream**: The alternate section surface. Use to separate major content bands without introducing a new color.
- **Olive Ink**: The muted body color. Use for secondary copy, stats labels, footer text, and supporting descriptions.
- **Pine Text**: The light text color for dark pine surfaces.

### Named Rules

**The Brass Rarity Rule.** Brass is a detail color, not a fill color. It should stay under 10% of any viewport and feel earned when it appears.

**The Forest Grounding Rule.** Dark pine is the only immersive color field. Use it for gallery, location, footer, and modal environments where the page should feel deeper and quieter.

**The Contrast Rule.** Warm Ink on Estate Cream is the default reading pair. Olive Ink on Estate Cream is acceptable for secondary copy with a measured contrast ratio; brass is not body copy on light surfaces.

## 3. Typography

**Display Font:** Cormorant Garamond, with Georgia fallback.
**Body Font:** Jost, with system-ui fallback.
**Label/Mono Font:** No mono font. Labels use Jost with tracking.

**Character:** The pairing reads like a private estate brochure: a soft serif for atmosphere and a plain sans for practical information. The serif can be expressive in hero and villa headings; the sans should stay quiet and useful.

### Hierarchy

- **Hero** (330, clamp(3.1rem, 9.2vw, 8.6rem), 0.94): Used only for full-bleed hero titles. Future work should test mobile overflow and avoid increasing this scale further.
- **Display** (340, clamp(2.7rem, 6.4vw, 5.6rem), 0.96): Used for large CTA statements and high-drama section moments.
- **Headline** (340, clamp(2.1rem, 4.6vw, 3.9rem), 1.04): Used for section headings, location headings, and villa detail page headings.
- **Villa Title** (340, clamp(2.3rem, 5vw, 4.2rem), 1.02): Used for the villa comparison blocks and detailed house features.
- **Lead** (360, clamp(1.5rem, 2.5vw, 2.15rem), 1.32): Used for introductory statements and house overview copy.
- **Body** (350, 1.0625rem, 1.65): Used for paragraphs. Keep line length near 46ch for supporting copy and below 75ch for longer text.
- **Label** (500, 0.72rem to 0.78rem, 0.16em to 0.32em tracking): Used for navigation, short section markers, buttons, and stat labels. Keep labels short.

### Named Rules

**The One Serif Voice Rule.** Cormorant Garamond owns atmosphere. Do not add another display serif, script, or decorative face.

**The Label Restraint Rule.** Tracked uppercase labels are part of the current system, but they must not become the only section grammar. Use them for navigation, buttons, and key orientation; avoid repeating them above every heading by reflex.

## 4. Elevation

The system is mostly flat and uses tonal layering, full-bleed photography, image cropping, and fine rules for depth. Shadows appear only around floating media and modals where real layering is needed.

### Shadow Vocabulary

- **Inset Photo Lift** (`box-shadow: 0 30px 60px -28px rgba(20,18,14,.5)`): Used for the small villa inset photo that overlaps the main image.
- **Gallery Card Lift** (`box-shadow: 0 34px 70px -34px rgba(0,0,0,.65)`): Used on gallery carousel images against dark pine.
- **Modal Image Lift** (`box-shadow: 0 40px 120px rgba(0,0,0,.6)`): Used for lightbox images and embedded video frames.
- **Nav Rule** (`box-shadow: 0 1px 0 var(--line-soft)`): Used only when the fixed nav becomes solid on scroll.

### Named Rules

**The Photo-Only Lift Rule.** Shadows belong to photography, media overlays, and modals. Do not put broad decorative shadows on text cards, buttons, or ordinary content blocks.

## 5. Components

### Buttons

- **Shape:** Text-link buttons are line-based and unboxed. Solid enquiry buttons are full pills.
- **Primary:** Inline uppercase label, wide tracking, and a thin extending line. Use Warm Ink on light surfaces and white on image surfaces.
- **Hover / Focus:** The line extends on hover; solid buttons invert fill and text. Focus states should be visible and preserve contrast.
- **Solid:** Use for enquiry and final CTAs only. Do not use solid pills for every link.

### Chips

- **Style:** Feature-point chips use a 1px soft line, pill shape, muted olive text, and compact horizontal padding.
- **State:** They are informational tags, not filters. Do not add selected states unless the page becomes interactive.

### Cards / Containers

- **Corner Style:** Media cards use the estate radius.
- **Background:** Light cards use Garden Cream or image content; dark gallery cards sit on Pine Estate.
- **Shadow Strategy:** Use the Photo-Only Lift Rule. Avoid bordered shadow cards for ordinary content.
- **Internal Padding:** Most text blocks are not boxed. If a new card is necessary, keep padding tied to the gutter scale rather than fixed decoration.

### Inputs / Fields

No native input system exists yet. Any future enquiry form should use Estate Cream or Garden Cream surfaces, Warm Ink text, 1px soft rules, estate radius, and a visible Warm Ink or Brass focus state. Placeholder text must meet WCAG AA contrast.

### Navigation

Navigation is fixed, centered around the Avista wordmark, and split into left and right link groups on desktop. It starts white over hero imagery and becomes a translucent Estate Cream bar with dark text after the hero scroll threshold. Mobile collapses the link groups and exposes a small Menu affordance.

### Villa Feature

The villa feature is the signature comparison pattern. It pairs a large cropped image, optional overlapping inset image, villa numeral, short tag, serif title, description, stats row, and line button. It should stay image-first and asymmetric; do not replace it with equal cards.

### Gallery Carousel

The gallery is a dark pine environment with staggered image heights and horizontal drag. Images vary in aspect ratio and vertical alignment to avoid a rigid grid. Hover may lift and scale the image, but motion should remain slow and photographic.

## 6. Do's and Don'ts

### Do:

- **Do** lead new pages with real villa, forest, garden, terrace, pool, or sea imagery.
- **Do** preserve the Estate Cream, Pine Estate, Warm Ink, and Brass relationship.
- **Do** use whitespace and full-width bands to create pace rather than adding more boxes.
- **Do** make the two-house choice clear whenever both villas appear on the same surface.
- **Do** keep enquiry language personal, specific, and calm.
- **Do** maintain WCAG AA contrast, visible focus states, descriptive alt text, and reduced-motion alternatives.

### Don't:

- **Don't** use generic booking-engine layouts that reduce the villas to inventory.
- **Don't** introduce loud beach-club aesthetics, neon vacation energy, or overproduced resort spectacle.
- **Don't** use anonymous stock-travel imagery or copy that could describe any villa in Greece.
- **Don't** build crowded card grids, template-like icon sections, or repeated small uppercase labels above every section.
- **Don't** use corporate travel-funnel language that makes enquiry feel transactional.
- **Don't** pair 1px borders with broad decorative shadows on cards or buttons.
- **Don't** add another display font or decorative illustration style.
