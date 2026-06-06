const configuredPayloadUrl = import.meta.env.PAYLOAD_URL?.trim();

function getPayloadUrl(): string {
  if (!configuredPayloadUrl) {
    throw new Error("PAYLOAD_URL is not configured");
  }

  let url: URL;

  try {
    url = new URL(configuredPayloadUrl);
  } catch {
    throw new Error("PAYLOAD_URL must be an absolute URL, for example https://cms.example.com");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("PAYLOAD_URL must use http:// or https://");
  }

  return url.toString().replace(/\/$/, "");
}

async function payloadFetch<T>(path: string): Promise<T> {
  const url = `${getPayloadUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to reach Payload CMS at ${new URL(url).origin}: ${message}`);
  }

  if (!response.ok) {
    throw new Error(`Payload request failed: ${response.status} ${response.statusText} ${path}`);
  }

  return response.json() as Promise<T>;
}

interface PayloadCollectionResponse<T> {
  docs: T[];
}

async function fetchProperties(): Promise<any[]> {
  const result = await payloadFetch<PayloadCollectionResponse<any>>(
    "/api/properties?depth=2&limit=100&sort=order"
  );

  if (!Array.isArray(result.docs)) {
    throw new Error("Payload properties response did not contain a docs array");
  }

  return result.docs;
}

function fetchGlobal<T>(slug: string) {
  return payloadFetch<T>(`/api/globals/${encodeURIComponent(slug)}?depth=2`);
}

async function fetchReviews(propertyId: string | number): Promise<any[]> {
  const query = encodeURIComponent(String(propertyId));

  const result = await payloadFetch<PayloadCollectionResponse<any>>(
    `/api/reviews?depth=2&limit=100&where[property][equals]=${query}`
  );

  return Array.isArray(result.docs) ? result.docs : [];
}

// ---------------------------------------------------------------------------
// Mapping helpers — turn Payload's raw shapes into what the components expect.
// ---------------------------------------------------------------------------

// Payload media URLs come back relative (e.g. "/api/media/file/x.jpg"); make
// them absolute against the CMS origin. R2 video URLs are already absolute.
function absoluteUrl(path?: string | null): string {
  if (!path) return "";
  return /^https?:\/\//.test(path) ? path : `${getPayloadUrl()}${path}`;
}

// Normalize a Payload upload object so its `url` is absolute. Components that go
// through resolveImage() keep width/height (and any future srcset) this way.
function mediaObject(media: any): any {
  if (!media || typeof media !== "object") return media ?? null;
  return { ...media, url: absoluteUrl(media.url ?? media.src) };
}

// A plain absolute string src, for components that render <img src> directly.
function mediaSrc(media: any): string {
  if (!media) return "";
  if (typeof media === "string") return absoluteUrl(media);
  return absoluteUrl(media.url ?? media.src);
}

// Lexical richText → array of paragraph plain-text strings.
function richTextParagraphs(rich: any): string[] {
  const children = rich?.root?.children;
  if (!Array.isArray(children)) return [];
  return children
    .filter((node: any) => node?.type === "paragraph")
    .map((node: any) =>
      Array.isArray(node.children)
        ? node.children.map((child: any) => child?.text ?? "").join("")
        : ""
    )
    .filter((text: string) => text.length > 0);
}

// Newlines authored in the CMS become <br /> for the set:html titles.
function brHtml(text?: string | null): string {
  return (text ?? "").replace(/\n/g, "<br />");
}

function hrefToKey(href: string): string {
  return href.replace(/^\/+|\/+$/g, "");
}

// CMS amenity/service `iconKey` values mapped onto the keys Icon.astro draws.
const ICON_KEY_MAP: Record<string, string> = {
  bed: "bed",
  bath: "frame",
  pool: "waves",
  view: "eye",
  kitchen: "fork",
  garden: "leaf",
  wifi: "wifi",
  parking: "frame",
  accessible: "frame",
  bbq: "flame",
  concierge: "frame",
  chef: "fork"
};

function iconFor(key?: string | null): string {
  return (key && ICON_KEY_MAP[key]) || "frame";
}

const GALLERY_NOTE = "Drag to explore, or tap any image to view it full screen.";
const GALLERY_HINT = "Drag to explore · hover to pause";

function mapHero(hero: any, { page }: { page: boolean }) {
  return {
    page,
    layout: "bottom",
    kicker: hero?.kicker ?? "",
    titleHtml: brHtml(hero?.title),
    sub: hero?.sub ?? "",
    imageDesktop: mediaObject(hero?.imageDesktop),
    imageMobile: mediaObject(hero?.imageMobile),
    imageAlt: hero?.imageDesktop?.alt ?? "",
    poster: mediaObject(hero?.imageDesktop),
    videoDesktop: hero?.videoDesktop ?? undefined,
    videoMobile: hero?.videoMobile ?? undefined,
    playOnMobile: !!hero?.playOnMobile,
    priority: hero?.priority !== false
  };
}

function mapGalleryItem(item: any) {
  return {
    image: mediaObject(item?.image),
    alt: item?.alt ?? item?.image?.alt ?? "",
    layout: item?.layout ?? "l",
    height: item?.height ?? "h2"
  };
}

function mapMap(map: any) {
  return {
    latitude: map?.latitude,
    longitude: map?.longitude,
    zoom: map?.zoom ?? 13,
    label: map?.label ?? "",
    directionsQuery: map?.directionsQuery ?? undefined,
    staticPreview: mediaObject(map?.staticPreview)
  };
}

// ---------------------------------------------------------------------------
// Content assembly — fetched once per build and memoized.
// ---------------------------------------------------------------------------

interface Content {
  siteSettings: any;
  navigation: any;
  footer: any;
  locationFacts: any[];
  properties: any[];
  homePage: any;
  locationPage: any;
  contactPage: any;
}

let cachedContent: Promise<Content> | null = null;

function loadContent(): Promise<Content> {
  return (cachedContent ??= buildContent());
}

async function buildContent(): Promise<Content> {
  const [siteRaw, navRaw, footRaw, homeRaw, locRaw, contactRaw, propsRaw] = await Promise.all([
    fetchGlobal<any>("siteSettings"),
    fetchGlobal<any>("navigation"),
    fetchGlobal<any>("footer"),
    fetchGlobal<any>("home"),
    fetchGlobal<any>("locationPage"),
    fetchGlobal<any>("contactPage"),
    fetchProperties()
  ]);

  const reviewsByProperty = await Promise.all(propsRaw.map((p) => fetchReviews(p.id)));

  // Shared location copy (authored once on the locationPage global, reused on
  // the per-property location blocks the CMS doesn't model separately).
  const locOverview = richTextParagraphs(locRaw?.overview);
  const locTitleHtml = brHtml(locOverview[0] ?? "Vourvourou,\nSithonia.");
  const locBody = locOverview[1] ?? "";

  const estateFilmUrl = propsRaw[0]?.hero?.videoDesktop ?? undefined;

  const homeCta = {
    image: mediaSrc(propsRaw[0]?.hero?.imageDesktop),
    imageAlt: homeRaw?.hero?.imageDesktop?.alt ?? "Avista",
    titleHtml: brHtml(homeRaw?.cta?.title),
    text: homeRaw?.cta?.body ?? "",
    buttonLabel: homeRaw?.cta?.buttonLabel ?? "Send an enquiry",
    href: "/contact/"
  };

  const properties = propsRaw.map((raw, index) => {
    const slug = raw.slug;
    const route = `/${slug}/`;
    const gallery = Array.isArray(raw.gallery) ? raw.gallery : [];
    const overview = richTextParagraphs(raw.overview);
    const other = propsRaw[(index + 1) % propsRaw.length];

    return {
      name: raw.name,
      slug,
      order: raw.order,
      numeral: raw.numeral,
      tag: raw.tag,
      route,
      seo: {
        title: raw.seo?.title ?? raw.name,
        description: raw.seo?.description ?? ""
      },
      hero: mapHero(raw.hero, { page: true }),
      comparison: {
        image: mediaSrc(raw.hero?.imageDesktop),
        imageAlt: raw.hero?.imageDesktop?.alt ?? raw.name,
        inset: mediaSrc(gallery[1]?.image),
        insetAlt: gallery[1]?.alt ?? raw.name,
        description: raw.summary ?? "",
        buttonLabel: `View ${raw.name}`
      },
      stats: Array.isArray(raw.stats)
        ? raw.stats.map((s: any) => ({ value: s.value, label: s.label }))
        : [],
      detail: {
        eyebrow: "The house",
        titleHtml: brHtml(overview[0] ?? ""),
        body: overview[1] ?? "",
        image: mediaSrc(gallery[2]?.image ?? raw.hero?.imageDesktop),
        imageAlt: gallery[2]?.alt ?? raw.name
      },
      amenities: Array.isArray(raw.amenities)
        ? raw.amenities.map((a: any) => ({
            icon: iconFor(a.iconKey),
            title: a.title,
            description: a.description ?? ""
          }))
        : [],
      galleryTitleHtml: `Inside ${raw.name}.`,
      galleryNote: GALLERY_NOTE,
      galleryHint: GALLERY_HINT,
      gallery: gallery.map(mapGalleryItem),
      reviews: reviewsByProperty[index].map((r: any) => ({
        authorName: r.authorName,
        authorLocation: r.authorLocation ?? "",
        date: r.date ?? "",
        score: r.score,
        quote: r.quote ?? ""
      })),
      location: {
        titleHtml: locTitleHtml,
        body: locBody,
        image: mediaSrc(raw.hero?.imageDesktop),
        imageAlt: raw.hero?.imageDesktop?.alt ?? raw.name
      },
      crossLink: {
        href: `/${other.slug}/`,
        title: other.name,
        image: mediaSrc(other.hero?.imageDesktop),
        imageAlt: other.hero?.imageDesktop?.alt ?? other.name,
        description: other.summary ?? "",
        buttonLabel: `Discover ${other.name}`
      },
      cta: {
        image: mediaSrc(gallery[gallery.length - 1]?.image ?? raw.hero?.imageDesktop),
        imageAlt: raw.hero?.imageDesktop?.alt ?? raw.name,
        titleHtml: `Reserve ${raw.name}.`,
        text: homeCta.text,
        buttonLabel: "Enquire now",
        href: "/contact/"
      },
      filmUrl: raw.hero?.videoDesktop ?? estateFilmUrl
    };
  });

  const siteSettings = {
    brand: siteRaw?.brandName ?? "Avista",
    contactEmail: siteRaw?.contactEmail ?? "",
    contactPhone: siteRaw?.phone ?? "",
    addressHtml: brHtml(siteRaw?.address),
    weather: {
      latitude: siteRaw?.weather?.latitude,
      longitude: siteRaw?.weather?.longitude,
      label: siteRaw?.tagline ?? "Vourvourou"
    },
    estateFilmUrl,
    mapQuery: locRaw?.map?.directionsQuery ?? contactRaw?.map?.directionsQuery ?? ""
  };

  const mapLinks = (links: any[]) =>
    (Array.isArray(links) ? links : []).map((link: any) => ({
      label: link.label,
      href: link.href,
      key: hrefToKey(link.href)
    }));

  const navigation = {
    left: mapLinks(navRaw?.leftLinks),
    right: mapLinks(navRaw?.rightLinks)
  };

  const exploreColumn =
    (Array.isArray(footRaw?.columns) ? footRaw.columns : []).find(
      (col: any) => col?.heading === "Explore"
    ) ?? footRaw?.columns?.[0];

  const footer = {
    text: footRaw?.brandBlurb ?? "",
    explore: (Array.isArray(exploreColumn?.links) ? exploreColumn.links : []).map((l: any) => ({
      label: l.label,
      href: l.href
    })),
    bottomLeft: siteRaw?.copyright ?? "",
    bottomRight: siteRaw?.locationSlogan ?? ""
  };

  const locationFacts = (Array.isArray(homeRaw?.locationFacts) ? homeRaw.locationFacts : []).map(
    (f: any) => ({ value: f.value, label: f.label })
  );

  const homePage = {
    seo: {
      title: homeRaw?.seo?.title ?? "Avista",
      description: homeRaw?.seo?.description ?? ""
    },
    hero: mapHero(homeRaw?.hero, { page: false }),
    intro: {
      lead: homeRaw?.intro?.lead ?? "",
      statement: richTextParagraphs(homeRaw?.intro?.statement).join("\n\n")
    },
    galleryTitleHtml: "Photos from<br />both villas.",
    galleryNote:
      "Pool terraces, garden shade, sea-facing rooms and evening light across both properties. Drag to browse. Tap any photo to open it full screen.",
    galleryHint: "Drag to browse · tap to open",
    gallery: (Array.isArray(homeRaw?.gallery) ? homeRaw.gallery : []).map(mapGalleryItem),
    services: {
      image: mediaSrc(homeRaw?.hero?.imageDesktop),
      imageAlt: homeRaw?.hero?.imageDesktop?.alt ?? "",
      note: "Services are arranged by request, before or during your stay.",
      titleHtml: "What can be<br />arranged.",
      items: (Array.isArray(homeRaw?.services) ? homeRaw.services : []).map((s: any) => ({
        label: s.iconKey ?? "",
        title: s.title,
        description: s.description ?? ""
      }))
    },
    location: {
      titleHtml: locTitleHtml,
      body: homeRaw?.locationSummary ?? "",
      image: mediaSrc(propsRaw[0]?.hero?.imageDesktop),
      imageAlt: propsRaw[0]?.hero?.imageDesktop?.alt ?? "Vourvourou"
    },
    cta: homeCta
  };

  const locationPage = {
    seo: {
      title: locRaw?.seo?.title ?? "Avista",
      description: locRaw?.seo?.description ?? ""
    },
    hero: mapHero(locRaw?.hero, { page: true }),
    overview: {
      titleHtml: locTitleHtml,
      body: locBody,
      image: mediaSrc(propsRaw[1]?.hero?.imageDesktop ?? propsRaw[0]?.hero?.imageDesktop),
      imageAlt:
        propsRaw[1]?.hero?.imageDesktop?.alt ??
        propsRaw[0]?.hero?.imageDesktop?.alt ??
        "Vourvourou"
    },
    map: {
      titleHtml: "Sithonia,<br />Halkidiki.",
      body:
        "On the middle finger of Halkidiki, about ninety minutes by road from Thessaloniki airport. The villas sit above the bays of Vourvourou, with the islets of Diaporos just offshore.",
      title: locRaw?.map?.label ? `Map of ${locRaw.map.label}` : "Map of Vourvourou, Sithonia, Halkidiki",
      location: mapMap(locRaw?.map)
    },
    cta: homeCta
  };

  const contactInvitation = richTextParagraphs(contactRaw?.invitation);

  const contactPage = {
    seo: {
      title: contactRaw?.seo?.title ?? "Avista",
      description: contactRaw?.seo?.description ?? ""
    },
    hero: mapHero(contactRaw?.hero, { page: true }),
    intro: {
      titleHtml: brHtml(contactInvitation[0] ?? ""),
      body: contactInvitation[1] ?? ""
    },
    map: {
      titleHtml: "Where we<br />are.",
      body:
        "The villas sit above the bays of Vourvourou on the middle finger of Halkidiki, about ninety minutes by road from Thessaloniki airport, with the islets of Diaporos just offshore.",
      title: contactRaw?.map?.label
        ? `Map of ${contactRaw.map.label}`
        : "Map of Vourvourou, Sithonia, Halkidiki",
      location: mapMap(contactRaw?.map)
    }
  };

  return {
    siteSettings,
    navigation,
    footer,
    locationFacts,
    properties,
    homePage,
    locationPage,
    contactPage
  };
}

// ---------------------------------------------------------------------------
// Public loaders — each awaits the shared, memoized content.
// ---------------------------------------------------------------------------

export async function getSiteSettings() {
  return (await loadContent()).siteSettings;
}

export async function getNavigation() {
  return (await loadContent()).navigation;
}

export async function getFooter() {
  return (await loadContent()).footer;
}

export async function getLocationFacts() {
  return (await loadContent()).locationFacts;
}

export async function getProperties() {
  return (await loadContent()).properties;
}

export async function getHomePage() {
  return (await loadContent()).homePage;
}

export async function getLocationPage() {
  return (await loadContent()).locationPage;
}

export async function getContactPage() {
  return (await loadContent()).contactPage;
}
