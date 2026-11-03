import { optimizeImage } from "./optimized-image";
import type { MediaInput } from "./media";

const SITE_NAME = "Avista Villas";

// The CMS stores the address as one free-text field; schema.org needs it in parts.
const ADDRESS = {
  "@type": "PostalAddress",
  addressLocality: "Vourvourou",
  addressRegion: "Halkidiki",
  postalCode: "630 78",
  addressCountry: "GR"
};

type Site = URL | string;

const absolute = (path: string, site: Site) => new URL(path, site).href;
const organizationId = (site: Site) => absolute("/#organization", site);

function contactDetails(settings: any) {
  return { email: settings.contactEmail, telephone: settings.contactPhones[0] };
}

export function siteSchema(site: Site, settings: any) {
  return [
    {
      "@type": "Organization",
      "@id": organizationId(site),
      name: SITE_NAME,
      url: absolute("/", site),
      logo: absolute("/assets/logo/logo.svg", site),
      address: ADDRESS,
      ...contactDetails(settings)
    },
    {
      "@type": "WebSite",
      "@id": absolute("/#website", site),
      name: SITE_NAME,
      url: absolute("/", site),
      inLanguage: "en",
      publisher: { "@id": organizationId(site) }
    }
  ];
}

export function breadcrumbSchema(site: Site, name: string, path: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absolute("/", site) },
      { "@type": "ListItem", position: 2, name, item: absolute(path, site) }
    ]
  };
}

// Reads a stat such as { value: "3", label: "Bedrooms" }.
function statValue(stats: any[], label: RegExp) {
  const value = Number(stats.find((stat) => label.test(stat.label))?.value);
  return Number.isFinite(value) ? value : undefined;
}

async function imageUrls(images: MediaInput[], site: Site) {
  const optimized = await Promise.all(images.map((image) => optimizeImage(image)));
  return optimized.flatMap((image) => (image ? [absolute(image.full, site)] : []));
}

// Ratings are left out on purpose: the reviews come from Booking.com, and Google's
// review guidelines exclude ratings taken from other sites.
export async function villaSchema(site: Site, property: any, location: any, settings: any) {
  const { sections } = property;
  const images = [
    ...(sections.hero ? [property.hero.imageDesktop] : []),
    ...(sections.gallery ? property.gallery.map((item: any) => item.image) : [])
  ].slice(0, 8);
  const amenities = sections.amenities ? property.amenities : [];

  return {
    "@type": "VacationRental",
    "@id": absolute(`${property.route}#rental`, site),
    identifier: property.slug,
    name: property.name,
    url: absolute(property.route, site),
    description: property.seo.description,
    image: await imageUrls(images, site),
    address: ADDRESS,
    ...contactDetails(settings),
    parentOrganization: { "@id": organizationId(site) },
    ...(location && {
      latitude: location.latitude,
      longitude: location.longitude,
      geo: {
        "@type": "GeoCoordinates",
        latitude: location.latitude,
        longitude: location.longitude
      }
    }),
    containsPlace: {
      "@type": "Accommodation",
      numberOfBedrooms: statValue(property.stats, /bedroom/i),
      occupancy: {
        "@type": "QuantitativeValue",
        maxValue: statValue(property.stats, /guest/i)
      },
      amenityFeature: amenities.map((amenity: any) => ({
        "@type": "LocationFeatureSpecification",
        name: amenity.title,
        value: true
      }))
    }
  };
}

// CMS text ends up inside a <script>, so "<" must not be able to close it.
export function serializeSchema(graph: unknown[]) {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(
    /</g,
    "\\u003c"
  );
}
