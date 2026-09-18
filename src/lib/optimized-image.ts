import { getImage, inferRemoteSize } from "astro:assets";
import type { ImageMetadata } from "astro";
import { resolveImage, type MediaInput } from "./media";

const localImages = import.meta.glob<{ default: ImageMetadata }>(
  "../../assets/**/*.{jpg,jpeg,png,webp,avif}"
);

async function generate(src: string) {
  const local = localImages[`../..${src}`];
  const input = local ? (await local()).default : src;
  const dimensions = typeof input === "string" ? await inferRemoteSize(input) : input;
  const largest = Math.min(dimensions.width, 2400);
  const widths = [...new Set([480, 800, 1200, 1600, 2400].filter(w => w < largest).concat(largest))];
  const variants = await Promise.all(widths.map(width => getImage({
    src: input,
    width,
    height: Math.round(width * dimensions.height / dimensions.width),
    format: "webp",
    quality: 80
  })));
  const atWidth = (target: number) => variants[widths.findIndex(w => w >= Math.min(target, largest))].src;
  return {
    src: atWidth(1200),
    full: atWidth(2400),
    thumbnail: atWidth(800),
    srcset: variants.map((image, i) => `${image.src} ${widths[i]}w`).join(", "),
    width: dimensions.width,
    height: dimensions.height
  };
}

// Share transformations between page components and matching hero preloads.
const images = new Map<string, ReturnType<typeof generate>>();
export async function optimizeImage(input: MediaInput, fallbackAlt = "") {
  const image = resolveImage(input, fallbackAlt);
  if (!image) return null;
  if (!images.has(image.src)) images.set(image.src, generate(image.src));
  return { ...await images.get(image.src)!, alt: image.alt };
}
