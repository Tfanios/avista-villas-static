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

function mapLocalGuide(guide: any) {
  if (!guide || guide.enabled === false) return null;

  const categories = (Array.isArray(guide.categories) ? guide.categories : [])
    .map((category: any) => {
      const places = (Array.isArray(category?.places) ? category.places : [])
        .map((place: any) => ({
          name: place?.name ?? "",
          description: place?.description ?? "",
          area: place?.area ?? "",
          href: place?.href ?? ""
        }))
        .filter((place: any) => place.name && place.href);

      return {
        title: category?.title ?? "",
        description: category?.description ?? "",
        places
      };
    })
    .filter((category: any) => category.places.length > 0);

  if (categories.length === 0) return null;

  return {
    titleHtml: brHtml(guide.title),
    intro: guide.intro ?? "",
    note: guide.note ?? "",
    categories
  };
}

// ---------------------------------------------------------------------------
// Content assembly — fetched once per build and memoized.
// ---------------------------------------------------------------------------

interface Content {
  siteSettings: any;
  navigation: any;
  footer: any;
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
  const locTitleHtml = brHtml(locOverview[0] ?? "");
  const locBody = locOverview[1] ?? "";

  const estateFilmUrl = propsRaw[0]?.hero?.videoDesktop ?? undefined;

  const navigationLinks = [
    ...(Array.isArray(navRaw?.leftLinks) ? navRaw.leftLinks : []),
    ...(Array.isArray(navRaw?.rightLinks) ? navRaw.rightLinks : [])
  ];

  const navigationLabel = (href: string, fallback = "") =>
    navigationLinks.find((link: any) => link?.href === href)?.label ?? fallback;

  const homeCta = {
    image: mediaSrc(propsRaw[0]?.hero?.imageDesktop),
    imageAlt: propsRaw[0]?.hero?.imageDesktop?.alt ?? "",
    titleHtml: brHtml(homeRaw?.cta?.title),
    text: homeRaw?.cta?.body ?? "",
    buttonLabel: homeRaw?.cta?.buttonLabel ?? "",
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
        imageAlt: raw.hero?.imageDesktop?.alt ?? "",
        inset: mediaSrc(gallery[1]?.image),
        insetAlt: gallery[1]?.alt ?? "",
        description: raw.summary ?? "",
        buttonLabel: navigationLabel(route, raw.name)
      },
      stats: Array.isArray(raw.stats)
        ? raw.stats.map((s: any) => ({ value: s.value, label: s.label }))
        : [],
      detail: {
        titleHtml: brHtml(overview[0] ?? ""),
        body: overview[1] ?? "",
        image: mediaSrc(gallery[2]?.image ?? raw.hero?.imageDesktop),
        imageAlt: gallery[2]?.alt ?? raw.hero?.imageDesktop?.alt ?? ""
      },
      amenities: Array.isArray(raw.amenities)
        ? raw.amenities.map((a: any) => ({
            icon: iconFor(a.iconKey),
            title: a.title,
            description: a.description ?? ""
          }))
        : [],
      galleryTitleHtml: brHtml(raw.name),
      galleryNote: "",
      galleryHint: "",
      gallery: gallery.map(mapGalleryItem),
      reviews: reviewsByProperty[index].map((r: any) => ({
        authorName: r.authorName,
        authorLocation: r.authorLocation ?? "",
        date: r.date ?? "",
        score: r.score,
        quote: r.quote ?? "",
        source: r.source ?? ""
      })),
      location: {
        titleHtml: locTitleHtml,
        body: locBody,
        image: mediaSrc(raw.hero?.imageDesktop),
        imageAlt: raw.hero?.imageDesktop?.alt ?? "",
        facts: (Array.isArray(locRaw?.locationFacts) ? locRaw.locationFacts : []).map((f: any) => ({
          value: f.value,
          label: f.label
        }))
      },
      crossLink:
        other && other.id !== raw.id
          ? {
              href: `/${other.slug}/`,
              title: other.name,
              image: mediaSrc(other.hero?.imageDesktop),
              imageAlt: other.hero?.imageDesktop?.alt ?? "",
              description: other.summary ?? "",
              buttonLabel: navigationLabel(`/${other.slug}/`, other.name)
            }
          : null,
      cta: {
        image: mediaSrc(gallery[gallery.length - 1]?.image ?? raw.hero?.imageDesktop),
        imageAlt:
          gallery[gallery.length - 1]?.alt ?? raw.hero?.imageDesktop?.alt ?? "",
        titleHtml: brHtml(homeRaw?.cta?.title),
        text: homeCta.text,
        buttonLabel: homeCta.buttonLabel,
        href: "/contact/"
      },
      filmUrl: raw.hero?.videoDesktop ?? undefined
    };
  });

  const siteSettings = {
    brand: siteRaw?.brandName ?? "",
    contactEmail: siteRaw?.contactEmail ?? "",
    contactPhone: siteRaw?.phone ?? "",
    addressHtml: brHtml(siteRaw?.address),
    weather: {
      latitude: siteRaw?.weather?.latitude,
      longitude: siteRaw?.weather?.longitude,
      label: siteRaw?.tagline ?? ""
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

  const footer = {
    text: footRaw?.brandBlurb ?? "",
    columns: (Array.isArray(footRaw?.columns) ? footRaw.columns : []).map((column: any) => ({
      heading: column.heading ?? "",
      links: (Array.isArray(column.links) ? column.links : []).map((link: any) => ({
        label: link.label ?? "",
        href: link.href ?? ""
      })),
      addressHtml: (Array.isArray(column.links) ? column.links : []).some(
        (link: any) => /^mailto:|^tel:/.test(link?.href ?? "")
      )
        ? brHtml(siteRaw?.address)
        : ""
    })),
    bottomLeft: siteRaw?.copyright ?? "",
    bottomRight: siteRaw?.locationSlogan ?? ""
  };

  const locationFacts = (Array.isArray(homeRaw?.locationFacts) ? homeRaw.locationFacts : []).map(
    (f: any) => ({ value: f.value, label: f.label })
  );

  const homePage = {
    seo: {
      title: homeRaw?.seo?.title ?? siteRaw?.brandName ?? "",
      description: homeRaw?.seo?.description ?? siteRaw?.defaultSeo?.description ?? ""
    },
    hero: mapHero(homeRaw?.hero, { page: false }),
    intro: {
      lead: homeRaw?.intro?.lead ?? "",
      statement: richTextParagraphs(homeRaw?.intro?.statement).join("\n\n")
    },
    villas: {
      kicker: homeRaw?.villas?.kicker ?? "",
      titleHtml: brHtml(homeRaw?.villas?.title),
      body: homeRaw?.villas?.body ?? "",
      // `featured` is a hasMany relationship; with depth=2 it resolves to property
      // objects. Expose the slugs so the page can order/filter the rich property
      // list it already has. Empty → the page falls back to all properties.
      featuredSlugs: (Array.isArray(homeRaw?.villas?.featured) ? homeRaw.villas.featured : [])
        .map((p: any) => (p && typeof p === "object" ? p.slug : null))
        .filter((slug: any): slug is string => typeof slug === "string" && slug.length > 0)
    },
    galleryTitleHtml: "",
    galleryNote: "",
    galleryHint: "",
    gallery: (Array.isArray(homeRaw?.gallery) ? homeRaw.gallery : []).map(mapGalleryItem),
    services: {
      image: mediaSrc(homeRaw?.hero?.imageDesktop),
      imageAlt: homeRaw?.hero?.imageDesktop?.alt ?? "",
      note: "",
      titleHtml: "",
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
      imageAlt: propsRaw[0]?.hero?.imageDesktop?.alt ?? "",
      facts: locationFacts
    },
    cta: homeCta
  };

  const locationPage = {
    seo: {
      title: locRaw?.seo?.title ?? siteRaw?.brandName ?? "",
      description: locRaw?.seo?.description ?? siteRaw?.defaultSeo?.description ?? ""
    },
    hero: mapHero(locRaw?.hero, { page: true }),
    overview: {
      titleHtml: locTitleHtml,
      body: locBody,
      image: mediaSrc(propsRaw[1]?.hero?.imageDesktop ?? propsRaw[0]?.hero?.imageDesktop),
      imageAlt:
        propsRaw[1]?.hero?.imageDesktop?.alt ??
        propsRaw[0]?.hero?.imageDesktop?.alt ??
        "",
      facts: (Array.isArray(locRaw?.locationFacts) ? locRaw.locationFacts : []).map((f: any) => ({
        value: f.value,
        label: f.label
      }))
    },
    map: {
      titleHtml: brHtml(locRaw?.map?.label),
      body: "",
      title: locRaw?.map?.label ?? "",
      location: mapMap(locRaw?.map)
    },
    crossLinks: (Array.isArray(locRaw?.crossLinks) ? locRaw.crossLinks : []).map((link: any) => ({
      label: link.label ?? "",
      href: link.href ?? ""
    })),
    localGuide: mapLocalGuide(locRaw?.localGuide),
    cta: homeCta
  };

  const contactInvitation = richTextParagraphs(contactRaw?.invitation);

  const contactPage = {
    seo: {
      title: contactRaw?.seo?.title ?? siteRaw?.brandName ?? "",
      description: contactRaw?.seo?.description ?? siteRaw?.defaultSeo?.description ?? ""
    },
    hero: mapHero(contactRaw?.hero, { page: true }),
    intro: {
      titleHtml: brHtml(contactInvitation[0] ?? ""),
      body: contactInvitation[1] ?? ""
    },
    map: {
      titleHtml: brHtml(contactRaw?.map?.label),
      body: "",
      title: contactRaw?.map?.label ?? "",
      location: mapMap(contactRaw?.map)
    }
  };

  return {
    siteSettings,
    navigation,
    footer,
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
