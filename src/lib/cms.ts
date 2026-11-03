import { AsyncLocalStorage } from "node:async_hooks";
import { getEmDashCollection, getEmDashReferences } from "emdash";

// Content is read per request so published edits appear immediately. The scope
// lets the layout, nav and page share one load during a render.
interface ContentScope {
  origin: string;
  content?: Promise<Content>;
}

const contentScope = new AsyncLocalStorage<ContentScope>();

export function withContentScope<T>(origin: string, render: () => T): T {
  return contentScope.run({ origin }, render);
}

async function fetchCollection(collection: string, options: Record<string, unknown> = {}) {
  const { entries, error } = await getEmDashCollection(collection, options);
  if (error) throw new Error(`Unable to load EmDash collection ${collection}: ${error.message}`);
  return entries as any[];
}

// EmDash has no singleton type: each global is a collection with one entry.
async function fetchSingleton(collection: string): Promise<any> {
  const [entry] = await fetchCollection(collection, { limit: 1, orderBy: { created_at: "asc" } });
  return entry?.data;
}

async function fetchReferences(collection: string, id: string, field: string): Promise<any[]> {
  const { entries, error } = await getEmDashReferences(collection, id, field);
  if (error) throw new Error(`Unable to load ${collection}.${field}: ${error.message}`);
  return entries;
}

// ---------------------------------------------------------------------------
// Mapping helpers — turn EmDash's flat field values into what the components expect.
// ---------------------------------------------------------------------------

// Astro only optimizes absolute URLs, and EmDash media URLs are site-relative.
function absoluteUrl(path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${contentScope.getStore()?.origin ?? ""}${path}`;
}

// Keep width/height with the URL: they size the responsive image variants.
function mediaObject(media: any): any {
  if (!media || typeof media !== "object") return media ?? null;
  const key = media.meta?.storageKey;
  const stored = key ? `/_emdash/api/media/file/${encodeURIComponent(key)}` : undefined;
  return { ...media, url: absoluteUrl(media.src ?? media.url ?? stored) };
}

// Portable Text → array of paragraph plain-text strings.
function richTextParagraphs(blocks: any): string[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((block: any) => block?._type === "block" && block.style === "normal" && !block.listItem)
    .map((block: any) =>
      Array.isArray(block.children)
        ? block.children.map((child: any) => child?.text ?? "").join("")
        : ""
    )
    .filter((text: string) => text.length > 0);
}

// Reads the show_* toggles. A section hidden by default stays hidden unless enabled,
// so entries saved before a toggle existed keep their current appearance.
function sections<On extends string, Off extends string = never>(
  data: any,
  shown: readonly On[],
  hidden: readonly Off[] = []
) {
  return Object.fromEntries([
    ...shown.map((name) => [name, data?.[`show_${name}`] !== false]),
    ...hidden.map((name) => [name, data?.[`show_${name}`] === true])
  ]) as Record<On | Off, boolean>;
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

function mapHero(data: any, { page }: { page: boolean }) {
  return {
    page,
    layout: "bottom",
    kicker: data?.hero_kicker ?? "",
    titleHtml: brHtml(data?.hero_title),
    sub: data?.hero_sub ?? "",
    imageDesktop: mediaObject(data?.hero_image_desktop),
    imageMobile: mediaObject(data?.hero_image_mobile),
    imageAlt: data?.hero_image_desktop?.alt ?? "",
    poster: mediaObject(data?.hero_image_desktop),
    videoDesktop: data?.hero_video_desktop || undefined,
    videoMobile: data?.hero_video_mobile || undefined,
    playOnMobile: !!data?.hero_play_on_mobile,
    priority: data?.hero_priority !== false
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

function mapMap(data: any) {
  return {
    latitude: data?.map_latitude,
    longitude: data?.map_longitude,
    zoom: data?.map_zoom ?? 13,
    label: data?.map_label ?? "",
    directionsQuery: data?.map_directions_query || undefined,
    staticPreview: mediaObject(data?.map_static_preview)
  };
}

function mapLocalGuide(data: any) {
  if (!data || data.local_guide_enabled === false) return null;

  const categories = (Array.isArray(data.local_guide_categories) ? data.local_guide_categories : [])
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
    titleHtml: brHtml(data.local_guide_title),
    intro: data.local_guide_intro ?? "",
    note: data.local_guide_note ?? "",
    categories
  };
}

// ---------------------------------------------------------------------------
// Content assembly — loaded once per request.
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

function loadContent(): Promise<Content> {
  const scope = contentScope.getStore();
  if (!scope) return buildContent();
  return (scope.content ??= buildContent());
}

async function buildContent(): Promise<Content> {
  const [siteRaw, navRaw, footRaw, homeRaw, locRaw, contactRaw, propertyEntries] = await Promise.all([
    fetchSingleton("site_settings"),
    fetchSingleton("navigation"),
    fetchSingleton("footer"),
    fetchSingleton("home"),
    fetchSingleton("location_page"),
    fetchSingleton("contact_page"),
    fetchCollection("properties", { orderBy: { order: "asc" } })
  ]);

  const propsRaw = propertyEntries.map((entry) => entry.data);
  const featuredVillas = homeRaw?.id
    ? await fetchReferences("home", homeRaw.id, "villas_featured")
    : [];

  // Shared location copy (authored once on the location page, reused on
  // the per-property location blocks the CMS doesn't model separately).
  const locOverview = richTextParagraphs(locRaw?.overview);
  const locTitleHtml = brHtml(locOverview[0] ?? "");
  const locBody = locOverview[1] ?? "";

  const estateFilmUrl = propsRaw[0]?.hero_video_desktop || undefined;

  const navigationLinks = [
    ...(Array.isArray(navRaw?.left_links) ? navRaw.left_links : []),
    ...(Array.isArray(navRaw?.right_links) ? navRaw.right_links : [])
  ];

  const navigationLabel = (href: string, fallback = "") =>
    navigationLinks.find((link: any) => link?.href === href)?.label ?? fallback;

  const homeCta = {
    image: mediaObject(propsRaw[0]?.hero_image_desktop),
    imageAlt: propsRaw[0]?.hero_image_desktop?.alt ?? "",
    titleHtml: brHtml(homeRaw?.cta_title),
    text: homeRaw?.cta_body ?? "",
    buttonLabel: homeRaw?.cta_button_label ?? "",
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
      sections: sections(
        raw,
        ["hero", "spaces", "amenities", "gallery", "reviews", "map", "cta"],
        ["location", "cross_link"]
      ),
      slug,
      order: raw.order,
      numeral: raw.numeral,
      tag: raw.tag,
      route,
      seo: {
        title: raw.seo_title ?? raw.name,
        description: raw.seo_description ?? ""
      },
      hero: mapHero(raw, { page: true }),
      comparison: {
        image: mediaObject(raw.hero_image_desktop),
        imageAlt: raw.hero_image_desktop?.alt ?? "",
        inset: mediaObject(gallery[1]?.image),
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
        image: mediaObject(gallery[2]?.image ?? raw.hero_image_desktop),
        imageAlt: gallery[2]?.alt ?? raw.hero_image_desktop?.alt ?? ""
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
      location: {
        titleHtml: locTitleHtml,
        body: locBody,
        image: mediaObject(raw.hero_image_desktop),
        imageAlt: raw.hero_image_desktop?.alt ?? "",
        facts: (Array.isArray(locRaw?.location_facts) ? locRaw.location_facts : []).map((f: any) => ({
          value: f.value,
          label: f.label
        }))
      },
      crossLink:
        other && other.id !== raw.id
          ? {
              href: `/${other.slug}/`,
              title: other.name,
              image: mediaObject(other.hero_image_desktop),
              imageAlt: other.hero_image_desktop?.alt ?? "",
              description: other.summary ?? "",
              buttonLabel: navigationLabel(`/${other.slug}/`, other.name)
            }
          : null,
      cta: {
        image: mediaObject(gallery[gallery.length - 1]?.image ?? raw.hero_image_desktop),
        imageAlt:
          gallery[gallery.length - 1]?.alt ?? raw.hero_image_desktop?.alt ?? "",
        titleHtml: brHtml(homeRaw?.cta_title),
        text: homeCta.text,
        buttonLabel: homeCta.buttonLabel,
        href: "/contact/"
      },
      filmUrl: raw.hero_video_desktop || undefined
    };
  });

  const siteSettings = {
    brand: siteRaw?.brand_name ?? "",
    contactEmail: "info@avistavillas.com",
    contactPhones: ["+30 697 714 8903"],
    addressHtml: brHtml(siteRaw?.address),
    weather: {
      latitude: siteRaw?.weather_latitude,
      longitude: siteRaw?.weather_longitude,
      label: siteRaw?.tagline ?? ""
    },
    estateFilmUrl,
    mapQuery: locRaw?.map_directions_query ?? contactRaw?.map_directions_query ?? ""
  };

  const mapLinks = (links: any[]) =>
    (Array.isArray(links) ? links : []).map((link: any) => ({
      label: link.label,
      href: link.href,
      key: hrefToKey(link.href)
    }));

  const navigation = {
    left: mapLinks(navRaw?.left_links),
    right: mapLinks(navRaw?.right_links)
  };

  const footer = {
    show: footRaw?.show_footer !== false,
    text: footRaw?.brand_blurb ?? "",
    columns: (Array.isArray(footRaw?.columns) ? footRaw.columns : []).map((column: any) => ({
      heading: column.heading ?? "",
      links: (Array.isArray(column.links) ? column.links : []).map((link: any) => ({
        label: link.label ?? "",
        href: link.href ?? ""
      })).flatMap((link: { label: string; href: string }, index: number, links: { href: string }[]) => {
        if (/^mailto:|^tel:/.test(link.href)) {
          if (links.slice(0, index).some((item) => /^mailto:|^tel:/.test(item.href))) return [];
          return [
            { label: siteSettings.contactEmail, href: `mailto:${siteSettings.contactEmail}` },
            ...siteSettings.contactPhones.map((phone) => ({
              label: phone,
              href: `tel:${phone.replace(/[^+\d]/g, "")}`
            }))
          ];
        }
        return [link];
      }),
      addressHtml: (Array.isArray(column.links) ? column.links : []).some(
        (link: any) => /^mailto:|^tel:/.test(link?.href ?? "")
      )
        ? brHtml(siteRaw?.address)
        : ""
    })),
    bottomLeft: siteRaw?.copyright ?? "",
    bottomRight: siteRaw?.location_slogan ?? ""
  };

  const locationFacts = (Array.isArray(homeRaw?.location_facts) ? homeRaw.location_facts : []).map(
    (f: any) => ({ value: f.value, label: f.label })
  );

  const homePage = {
    sections: sections(
      homeRaw,
      ["hero", "intro", "villas", "gallery", "location", "cta"],
      ["services"]
    ),
    seo: {
      title: homeRaw?.seo_title ?? siteRaw?.brand_name ?? "",
      description: homeRaw?.seo_description ?? siteRaw?.default_seo_description ?? ""
    },
    hero: mapHero(homeRaw, { page: false }),
    intro: {
      lead: homeRaw?.intro_lead ?? "",
      statement: richTextParagraphs(homeRaw?.intro_statement).join("\n\n")
    },
    villas: {
      kicker: homeRaw?.villas_kicker ?? "",
      titleHtml: brHtml(homeRaw?.villas_title),
      body: homeRaw?.villas_body ?? "",
      // Empty → the page falls back to all properties.
      featuredSlugs: featuredVillas.map((villa: any) => villa.data.slug)
    },
    galleryTitleHtml: "",
    galleryNote: "",
    galleryHint: "",
    gallery: (Array.isArray(homeRaw?.gallery) ? homeRaw.gallery : []).map(mapGalleryItem),
    services: {
      image: mediaObject(homeRaw?.hero_image_desktop),
      imageAlt: homeRaw?.hero_image_desktop?.alt ?? "",
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
      body: homeRaw?.location_summary ?? "",
      image: mediaObject(propsRaw[0]?.hero_image_desktop),
      imageAlt: propsRaw[0]?.hero_image_desktop?.alt ?? "",
      facts: locationFacts
    },
    cta: homeCta
  };

  const locationPage = {
    sections: sections(locRaw, ["hero", "cta"], ["overview"]),
    seo: {
      title: locRaw?.seo_title ?? siteRaw?.brand_name ?? "",
      description: locRaw?.seo_description ?? siteRaw?.default_seo_description ?? ""
    },
    hero: mapHero(locRaw, { page: true }),
    overview: {
      titleHtml: locTitleHtml,
      body: locBody,
      image: mediaObject(propsRaw[1]?.hero_image_desktop ?? propsRaw[0]?.hero_image_desktop),
      imageAlt:
        propsRaw[1]?.hero_image_desktop?.alt ??
        propsRaw[0]?.hero_image_desktop?.alt ??
        "",
      facts: (Array.isArray(locRaw?.location_facts) ? locRaw.location_facts : []).map((f: any) => ({
        value: f.value,
        label: f.label
      }))
    },
    map: {
      titleHtml: brHtml(locRaw?.map_label),
      body: "",
      title: locRaw?.map_label ?? "",
      location: mapMap(locRaw)
    },
    crossLinks: (Array.isArray(locRaw?.cross_links) ? locRaw.cross_links : []).map((link: any) => ({
      label: link.label ?? "",
      href: link.href ?? ""
    })),
    localGuide: mapLocalGuide(locRaw),
    cta: homeCta
  };

  const contactInvitation = richTextParagraphs(contactRaw?.invitation);

  const contactPage = {
    sections: sections(contactRaw, ["hero", "enquiry", "map"]),
    seo: {
      title: contactRaw?.seo_title ?? siteRaw?.brand_name ?? "",
      description: contactRaw?.seo_description ?? siteRaw?.default_seo_description ?? ""
    },
    hero: mapHero(contactRaw, { page: true }),
    intro: {
      titleHtml: brHtml(contactInvitation[0] ?? ""),
      body: contactInvitation[1] ?? ""
    },
    map: {
      titleHtml: brHtml(contactRaw?.map_label),
      body: "",
      title: contactRaw?.map_label ?? "",
      location: mapMap(contactRaw)
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

// References live in a join table, so each review's villa is a separate lookup.
// Only villa pages show reviews; keep that cost off every other page.
export async function getPropertyReviews(slug: string) {
  const entries = await fetchCollection("reviews");
  const villas = await Promise.all(
    entries.map((entry) => fetchReferences("reviews", entry.data.id, "property"))
  );

  return entries
    .filter((_, index) => villas[index][0]?.data.slug === slug)
    .map(({ data }) => ({
      authorName: data.author_name,
      authorLocation: data.author_location ?? "",
      date: data.date ?? "",
      score: data.score,
      quote: data.quote ?? "",
      source: data.source ?? ""
    }));
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
