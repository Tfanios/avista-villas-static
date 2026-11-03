import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import { resolveImage, type MediaInput, type ResolvedImage } from "./media";

const localImages = import.meta.glob<{ default: ImageMetadata }>(
  "../../assets/**/*.{jpg,jpeg,png,webp,avif}"
);

async function generate({ src, width, height }: ResolvedImage) {
  const local = localImages[`../..${src}`];
  const input = local ? (await local()).default : src;
  const { width: sourceWidth, height: sourceHeight } =
    typeof input === "string" ? { width, height } : input;
  if (!sourceWidth || !sourceHeight) {
    return { src, full: src, thumbnail: src, srcset: undefined, width, height };
  }
  const largest = Math.min(sourceWidth, 2400);
  const widths = [...new Set([480, 800, 1200, 1600, 2400].filter(w => w < largest).concat(largest))];
  const variants = await Promise.all(widths.map(width => getImage({
    src: input,
    width,
    height: Math.round(width * sourceHeight / sourceWidth),
    format: "webp",
    quality: 80
  })));
  const atWidth = (target: number) => variants[widths.findIndex(w => w >= Math.min(target, largest))].src;
  return {
    src: atWidth(1200),
    full: atWidth(2400),
    thumbnail: atWidth(800),
    srcset: variants.map((image, i) => `${image.src} ${widths[i]}w`).join(", "),
    width: sourceWidth,
    height: sourceHeight
  };
}

// Link previews need JPEG, as many apps ignore WebP. EmDash's image endpoint does
// not crop, so keep the photo's own ratio and let each app crop it.
export async function socialImage(input: MediaInput) {
  const image = resolveImage(input);
  if (!image?.width || !image.height) return image ? { src: image.src } : null;
  const width = Math.min(image.width, 1200);
  const height = Math.round(width * image.height / image.width);
  const { src } = await getImage({ src: image.src, width, height, format: "jpeg", quality: 80 });
  return { src, width, height };
}

// Share transformations between page components and matching hero preloads.
const images = new Map<string, ReturnType<typeof generate>>();
export async function optimizeImage(input: MediaInput, fallbackAlt = "") {
  const image = resolveImage(input, fallbackAlt);
  if (!image) return null;
  if (!images.has(image.src)) {
    const generated = generate(image);
    images.set(image.src, generated);
    // This cache outlives the request on a Worker, so never keep a failure.
    generated.catch(() => images.delete(image.src));
  }
  return { ...await images.get(image.src)!, alt: image.alt };
}
