// Media contract shared by the front end and the (soon) Payload CMS.
//
// Today the data layer (src/data/placeholder.ts) feeds plain string asset paths.
// Payload will feed upload objects with `imageSizes`, intrinsic width/height and a
// blur placeholder. `resolveImage` normalizes BOTH into the attributes an
// <img>/<picture> needs, so the components are CMS-ready now: when the CMS starts
// sending `sizes`, srcset/responsive loading light up automatically with no
// component changes; today's strings degrade to a plain `src`.

export interface MediaSize {
  url?: string;
  src?: string;
  width?: number;
  height?: number;
}

export interface MediaObject {
  url?: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  // Payload returns sizes keyed by name; an array is also accepted.
  sizes?: Record<string, MediaSize | null | undefined> | MediaSize[];
}

export type MediaInput = string | MediaObject | null | undefined;

export interface ResolvedImage {
  src: string; // base / largest — used as the full image (e.g. data-full)
  thumbnail: string; // smallest available variant — used for grid tiles / carousel
  srcset?: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  alt: string;
}

function urlOf(x: MediaSize | MediaObject | null | undefined): string | undefined {
  if (!x) return undefined;
  return x.url ?? x.src ?? undefined;
}

export function resolveImage(input: MediaInput, fallbackAlt = ""): ResolvedImage | null {
  if (!input) return null;

  if (typeof input === "string") {
    return input ? { src: input, thumbnail: input, alt: fallbackAlt } : null;
  }

  const sizeList: MediaSize[] = Array.isArray(input.sizes)
    ? input.sizes
    : input.sizes
      ? (Object.values(input.sizes).filter(Boolean) as MediaSize[])
      : [];

  const withWidth = sizeList.filter((s) => urlOf(s) && s.width).sort((a, b) => a.width! - b.width!);

  const base = urlOf(input) ?? (withWidth.length ? urlOf(withWidth[withWidth.length - 1]) : undefined);
  if (!base) return null;

  const srcset = withWidth.length
    ? withWidth.map((s) => `${urlOf(s)} ${s.width}w`).join(", ")
    : undefined;

  return {
    src: base,
    thumbnail: withWidth.length ? urlOf(withWidth[0])! : base,
    srcset,
    width: input.width,
    height: input.height,
    blurDataURL: input.blurDataURL,
    alt: input.alt ?? fallbackAlt,
  };
}

// `sizes` hints per usage, so the browser downloads the right width once srcset exists.
export const SIZES = {
  hero: "100vw",
  full: "100vw",
  galleryGrid: "(max-width: 640px) 100vw, (max-width: 1040px) 50vw, 520px",
  card: "(max-width: 860px) 100vw, 33vw",
} as const;
