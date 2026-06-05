const asset = (path: string) => `/assets/${path}`;

export const siteSettings = {
  brand: "Avista",
  contactEmail: "stay@avista.gr",
  contactPhone: "+30 000 000 000",
  addressHtml: "Vourvourou 630 78<br />Halkidiki, Greece",
  weather: {
    latitude: 40.1969,
    longitude: 23.7761,
    label: "Vourvourou"
  },
  estateFilmUrl:
    "https://drive.google.com/file/d/1K1lpUHufT-ImoCSl2V4z7R1Sx9nqoH1t/preview",
  mapQuery: "Vourvourou, Sithonia, Halkidiki, Greece"
};

export const navigation = {
  left: [
    { label: "Avista Villa", href: "/avista-villa/", key: "avista-villa" },
    {
      label: "Private Resort",
      href: "/avista-private-resort/",
      key: "avista-private-resort"
    }
  ],
  right: [
    { label: "Location", href: "/location/", key: "location" },
    { label: "Enquire", href: "/contact/", key: "contact" }
  ]
};

export const footer = {
  text:
    "Two private villas in Vourvourou, where pine shade meets the Aegean. Sithonia, Halkidiki, Greece.",
  explore: [
    { label: "Avista Villa", href: "/avista-villa/" },
    { label: "Private Resort", href: "/avista-private-resort/" },
    { label: "Location", href: "/location/" },
    { label: "Enquire", href: "/contact/" }
  ],
  bottomLeft: "2026 Avista Villas",
  bottomRight: "Vourvourou · Sithonia · Halkidiki"
};

export const properties = [
  {
    name: "Avista Villa",
    slug: "avista-villa",
    order: 1,
    numeral: "I",
    tag: "Sea-facing architectural villa",
    route: "/avista-villa/",
    seo: {
      title: "Avista Villa, The architect's house · Vourvourou",
      description:
        "Avista Villa: a contemporary, light-filled house with a horizon-edge pool above the bay of Vourvourou."
    },
    hero: {
      page: true,
      layout: "bottom",
      kicker: "The architect's villa",
      titleHtml: "Avista <em>Villa</em>",
      sub:
        "Clean lines, walls of glass and a horizon-edge pool that dissolves into the Aegean, a contemporary house built entirely around the light.",
      image: asset("avista-villa/hero-aerial.jpg"),
      imageAlt: "Avista Villa from the air",
      poster: asset("avista-villa/hero-aerial.jpg"),
      videoUrl:
        "https://pub-d6e79d28cef04ba49c2a61300dbd5552.r2.dev/avista-villa.mp4"
    },
    comparison: {
      image: asset("avista-villa/terrace-dusk.jpg"),
      imageAlt: "Avista Villa terrace and pool illuminated at dusk",
      inset: asset("avista-villa/bedroom.jpg"),
      insetAlt: "Avista Villa bedroom with warm evening light",
      description:
        "For groups who want a contemporary layout, wide sea views and a pool that sits level with the horizon. Living, kitchen and terraces stay open to the water throughout the day.",
      buttonLabel: "View Avista Villa"
    },
    stats: [
      { value: "5", label: "Bedrooms" },
      { value: "10", label: "Guests" },
      { value: "∞", label: "Infinity pool" },
      { value: "Wide", label: "Sea views" }
    ],
    detail: {
      eyebrow: "The house",
      titleHtml: "A house built<br />for light.",
      body:
        "Set into the hillside above Vourvourou, Avista Villa opens completely to the view. Living spaces flow without walls to the edge of the pool, where the water meets the horizon — and five bedrooms, including a step-free ground-floor suite, sit in the quiet of the pines.",
      image: asset("avista-villa/pool-terrace.jpg"),
      imageAlt: "Avista Villa pool and terrace at the horizon's edge"
    },
    amenities: [
      {
        icon: "bed",
        title: "5 bedrooms",
        description:
          "Each en-suite, including a step-free ground-floor suite."
      },
      {
        icon: "users",
        title: "Sleeps 10",
        description: "Comfortable for a family or group of ten."
      },
      {
        icon: "waves",
        title: "Infinity edge pool",
        description: "A heated, horizon-edge pool the length of the terrace."
      },
      {
        icon: "eye",
        title: "360° sea views",
        description: "The Aegean in frame from nearly every room."
      },
      {
        icon: "frame",
        title: "Walls of glass",
        description: "Floor-to-ceiling glass; inside and terrace become one."
      },
      {
        icon: "fork",
        title: "Chef-ready kitchen",
        description: "A full kitchen and a long table for slow dinners."
      },
      {
        icon: "snowflake",
        title: "Air-conditioned",
        description: "Blackout and climate control throughout."
      },
      {
        icon: "wifi",
        title: "Fast Wi-Fi",
        description: "Reliable connection across the house."
      }
    ],
    galleryTitleHtml: "Inside Avista Villa.",
    galleryNote: "Drag to explore, or tap any image to view it full screen.",
    galleryHint: "Drag to explore · hover to pause",
    gallery: [
      {
        src: asset("avista-villa/terrace-sunset.jpg"),
        alt: "Sunset",
        size: "l",
        height: "h1"
      },
      {
        src: asset("avista-villa/living-room-2.jpg"),
        alt: "Living room",
        size: "p",
        height: "h2"
      },
      { src: asset("avista-villa/pool.jpg"), alt: "Pool", size: "s", height: "h3" },
      {
        src: asset("avista-villa/bedroom-2.jpg"),
        alt: "Bedroom",
        size: "p",
        height: "h4"
      },
      {
        src: asset("avista-villa/kitchen-2.jpg"),
        alt: "Kitchen",
        size: "l",
        height: "h1"
      },
      {
        src: asset("avista-villa/bathroom.jpg"),
        alt: "Bathroom",
        size: "p",
        height: "h2"
      },
      {
        src: asset("avista-villa/villa-night.jpg"),
        alt: "Villa at night",
        size: "s",
        height: "h3"
      },
      {
        src: asset("avista-villa/hallway.jpg"),
        alt: "Hallway",
        size: "p",
        height: "h4"
      },
      {
        src: asset("avista-villa/hero-aerial.jpg"),
        alt: "Avista Villa from the air",
        size: "l",
        height: "h5"
      }
    ],
    reviews: [
      {
        authorName: "Dima",
        authorLocation: "Luxembourg",
        date: "October 2024",
        score: "10",
        quote:
          "The private villa is amazing and very spacious. The garden is just stunning — full of greenery with olive trees all around. A must-stay experience!"
      },
      {
        authorName: "Yasmine",
        authorLocation: "Australia",
        date: "August 2023",
        score: "10",
        quote:
          "The hosts display the best customer service and hospitality I have ever experienced. The facilities are amazing and the grounds beautifully kept — a home away from home."
      },
      {
        authorName: "Yani",
        authorLocation: "Bulgaria",
        date: "September 2024",
        score: "10",
        quote:
          "The hosts were extremely helpful and communication was flawless. The real gem is the big green garden with olive trees and the pool beside it. Highly recommend."
      },
      {
        authorName: "Boban",
        authorLocation: "North Macedonia",
        date: "July 2023",
        score: "10",
        quote:
          "The rooms were nicely decorated and spotless, and the swimming pool is a great spot to relax at the end of the day. Atanasis is a great host — highly recommended!"
      },
      {
        authorName: "Frances",
        authorLocation: "Ireland",
        date: "September 2023",
        score: "10",
        quote:
          "Wonderful family-run property whose hosts were extremely helpful. Peaceful, beautiful pool, close to the beach and very clean. Would recommend to family and friends."
      },
      {
        authorName: "Lupascu",
        authorLocation: "Romania",
        date: "October 2023",
        score: "10",
        quote:
          "The host, Dimitri, was very kind and welcoming, with great recommendations. The view was excellent and the house very clean and cozy. Thank you for the beautiful experience!"
      }
    ],
    location: {
      titleHtml: "Vourvourou,<br />Sithonia.",
      body:
        "A string of nine small bays on the middle finger of Halkidiki, edged with pine and looking out to the islets of Diaporos. Calm, shallow water and some of the clearest sea in the Aegean.",
      image: asset("avista-villa/hero-aerial.jpg"),
      imageAlt: "Avista Villa hillside above the bay"
    },
    crossLink: {
      href: "/avista-private-resort/",
      title: "Avista Private Resort",
      image: asset("private-resort/hero-aerial.jpg"),
      imageAlt: "Avista Private Resort",
      description:
        "The softer, greener sister, a walled garden estate made for long family summers under the olive trees.",
      buttonLabel: "Discover the Resort"
    },
    cta: {
      image: asset("common/terrace-pool-night.jpg"),
      imageAlt: "Avista Villa at night",
      titleHtml: "Reserve Avista Villa.",
      text:
        "Tell us your dates and how many you'll be, and we will take care of the rest.",
      buttonLabel: "Enquire now",
      href: "/contact/"
    },
    filmUrl:
      "https://drive.google.com/file/d/1K1lpUHufT-ImoCSl2V4z7R1Sx9nqoH1t/preview"
  },
  {
    name: "Avista Private Resort",
    slug: "avista-private-resort",
    order: 2,
    numeral: "II",
    tag: "Garden estate for larger groups",
    route: "/avista-private-resort/",
    seo: {
      title: "Avista Private Resort, The garden estate · Vourvourou",
      description:
        "Avista Private Resort: a walled garden estate with a generous pool, shaded patios and BBQ, made for long family summers in Vourvourou."
    },
    hero: {
      page: true,
      layout: "bottom",
      kicker: "The garden estate",
      titleHtml: "Avista <em>Private Resort</em>",
      sub:
        "A mature, walled garden wrapping a generous pool, shaded patios and a built-in BBQ, the softer, greener house made for long family summers under the olive trees.",
      image: asset("private-resort/hero-aerial.jpg"),
      imageAlt: "Avista Private Resort from the air",
      poster: asset("private-resort/hero-aerial.jpg"),
      videoUrl:
        "https://pub-d6e79d28cef04ba49c2a61300dbd5552.r2.dev/private-resort.mp4"
    },
    comparison: {
      image: asset("private-resort/hero-aerial.jpg"),
      imageAlt: "Avista Private Resort garden and pool from the air",
      inset: asset("private-resort/garden-path.jpg"),
      insetAlt: "Mature garden planting at Avista Private Resort",
      description:
        "For larger families or two-household stays that need more bedrooms, garden space and shaded places to gather. The pool, BBQ terrace and walled garden keep the day centered outside.",
      buttonLabel: "View Avista Private Resort"
    },
    stats: [
      { value: "6", label: "Bedrooms" },
      { value: "12", label: "Guests" },
      { value: "1,200", label: "m² garden" },
      { value: "BBQ", label: "Terrace" }
    ],
    detail: {
      eyebrow: "The house",
      titleHtml: "A walled garden<br />estate.",
      body:
        "Behind its garden walls, the Resort is a private world of its own. Established trees and lawns wrap a generous pool, shaded patios and a long table under the vines. Six bedrooms open onto the green, and the built-in BBQ is the heart of every evening.",
      image: asset("private-resort/gardens.jpg"),
      imageAlt: "The walled gardens of Avista Private Resort"
    },
    amenities: [
      {
        icon: "bed",
        title: "6 bedrooms",
        description: "Spread across the estate, each its own quiet corner."
      },
      {
        icon: "users",
        title: "Sleeps 12",
        description: "Comfortable for larger families and groups."
      },
      {
        icon: "waves",
        title: "Large garden pool",
        description: "Ringed by loungers, parasols and an outdoor shower."
      },
      {
        icon: "leaf",
        title: "Walled private gardens",
        description: "Decades-old trees, lawns and flowering vines."
      },
      {
        icon: "flame",
        title: "Built-in BBQ",
        description: "An outdoor kitchen made for slow Greek evenings."
      },
      {
        icon: "fork",
        title: "Long patio dining",
        description: "A vine-shaded table at the heart of the day."
      },
      {
        icon: "snowflake",
        title: "Air-conditioned",
        description: "Climate control throughout the house."
      },
      {
        icon: "wifi",
        title: "Fast Wi-Fi",
        description: "Reliable connection across the estate."
      }
    ],
    galleryTitleHtml: "Inside the Resort.",
    galleryNote: "Drag to explore, or tap any image to view it full screen.",
    galleryHint: "Drag to explore · hover to pause",
    gallery: [
      {
        src: asset("private-resort/garden-3.jpg"),
        alt: "Garden",
        size: "l",
        height: "h1"
      },
      {
        src: asset("private-resort/bedroom.jpg"),
        alt: "Bedroom",
        size: "p",
        height: "h2"
      },
      { src: asset("private-resort/pool.jpg"), alt: "Pool", size: "s", height: "h3" },
      {
        src: asset("private-resort/garden-path.jpg"),
        alt: "Garden path",
        size: "p",
        height: "h4"
      },
      {
        src: asset("private-resort/gardens.jpg"),
        alt: "Gardens",
        size: "l",
        height: "h1"
      },
      {
        src: asset("private-resort/living-room.jpg"),
        alt: "Living room",
        size: "p",
        height: "h2"
      },
      {
        src: asset("private-resort/patio-bbq.jpg"),
        alt: "Patio",
        size: "s",
        height: "h3"
      },
      {
        src: asset("private-resort/garden.jpg"),
        alt: "Garden",
        size: "p",
        height: "h4"
      },
      {
        src: asset("private-resort/garden-2.jpg"),
        alt: "Garden",
        size: "l",
        height: "h5"
      }
    ],
    reviews: [
      {
        authorName: "Alexandros",
        authorLocation: "United States",
        date: "September 2023",
        score: "10",
        quote:
          "If I could, I would rate 11/10! One of the best villas we have ever stayed in Chalkidiki. We loved the privacy — no neighbouring houses close by and a real connection with nature."
      },
      {
        authorName: "Agnese",
        authorLocation: "Latvia",
        date: "May 2025",
        score: "10",
        quote:
          "The villa was perfect for a larger group — no neighbours nearby, spacious, a large pool and beds of high hotel quality. The host was very friendly. A perfect escape."
      },
      {
        authorName: "Binka",
        authorLocation: "Bulgaria",
        date: "May 2024",
        score: "10",
        quote:
          "The owners are wonderful people! The service and cleanliness are at a very high level. The villa is 10/10 — everything was beyond perfect!"
      },
      {
        authorName: "Koray",
        authorLocation: "Turkey",
        date: "July 2024",
        score: "10",
        quote:
          "The facilities are superb and the location beautiful — everything has been thought of. The birthday cake gesture was lovely, and our contact was very helpful. Thank you for everything."
      },
      {
        authorName: "Yannick",
        authorLocation: "Germany",
        date: "May 2026",
        score: "10",
        quote:
          "Excellent from front to back. There were eight of us — six adults and two toddlers — and it was perfect."
      },
      {
        authorName: "Simone",
        authorLocation: "Germany",
        date: "June 2024",
        score: "10",
        quote: "Wonderful house and super friendly hosts."
      }
    ],
    location: {
      titleHtml: "Vourvourou,<br />Sithonia.",
      body:
        "A string of nine small bays on the middle finger of Halkidiki, edged with pine and looking out to the islets of Diaporos. Calm, shallow water and some of the clearest sea in the Aegean.",
      image: asset("private-resort/hero-aerial.jpg"),
      imageAlt: "Avista Private Resort near the bay"
    },
    crossLink: {
      href: "/avista-villa/",
      title: "Avista Villa",
      image: asset("avista-villa/hero-aerial.jpg"),
      imageAlt: "Avista Villa",
      description:
        "The contemporary, light-filled house with a horizon-edge pool that opens toward the bay.",
      buttonLabel: "Discover Avista Villa"
    },
    cta: {
      image: asset("private-resort/gardens.jpg"),
      imageAlt: "Avista Private Resort gardens",
      titleHtml: "Reserve the Resort.",
      text:
        "Tell us your dates and how many you'll be, and we will take care of the rest.",
      buttonLabel: "Enquire now",
      href: "/contact/"
    },
    filmUrl:
      "https://drive.google.com/file/d/1BexM9QlmlhwiqP0EN8qzqC6ejex6PZdX/preview"
  }
];

export const locationFacts = [
  { value: "90 min", label: "From Thessaloniki airport" },
  { value: "200 m", label: "To nearest beach" },
  { value: "9", label: "Bays of Vourvourou" },
  { value: "Diaporos", label: "Island offshore" }
];

export const homePage = {
  seo: {
    title: "Avista | Private Villas · Vourvourou, Halkidiki",
    description:
      "Compare Avista Villa and Avista Private Resort, two private villas in Vourvourou, Sithonia, with pools, sea views, garden space and personal enquiry."
  },
  hero: {
    page: false,
    layout: "bottom",
    kicker: "Two private villas by the Aegean",
    titleHtml: "Where the pine forest <em>meets</em> the sea.",
    sub:
      "Choose between a sea-facing architectural villa and a garden estate, each booked for one group at a time above Vourvourou's quiet bays.",
    image: asset("avista-villa/terrace-sunset.jpg"),
    imageAlt: "Avista villa terrace above Vourvourou bay at golden hour",
    poster: asset("avista-villa/terrace-sunset.jpg"),
    videoUrl:
      "https://pub-d6e79d28cef04ba49c2a61300dbd5552.r2.dev/avista-villa.mp4"
  },
  intro: {
    lead:
      "Two distinct villas, one private estate. Avista is for guests who want the whole place to themselves.",
    statement:
      "Set among Aleppo pines on the Sithonia peninsula, the villas look out over the sheltered waters of Vourvourou and the islets of Diaporos. Each villa is booked for one group, so the pool, terrace, garden and view are yours for the stay."
  },
  galleryTitleHtml: "Photos from<br />both villas.",
  galleryNote:
    "Pool terraces, garden shade, sea-facing rooms and evening light across both properties. Drag to browse. Tap any photo to open it full screen.",
  galleryHint: "Drag to browse · tap to open",
  gallery: [
    {
      src: asset("avista-villa/villa-night.jpg"),
      alt: "Villa terrace lit at twilight",
      size: "l",
      height: "h1"
    },
    {
      src: asset("avista-villa/living-room-2.jpg"),
      alt: "Living room with sea-facing glass doors",
      size: "p",
      height: "h2"
    },
    {
      src: asset("avista-villa/pool.jpg"),
      alt: "Pool terrace with loungers",
      size: "s",
      height: "h3"
    },
    {
      src: asset("private-resort/garden-3.jpg"),
      alt: "Shaded garden beside the villa",
      size: "p",
      height: "h4"
    },
    {
      src: asset("avista-villa/bedroom-2.jpg"),
      alt: "Bedroom prepared for guests",
      size: "l",
      height: "h1"
    },
    {
      src: asset("avista-villa/hero-aerial.jpg"),
      alt: "Aerial view of the estate and coastline",
      size: "s",
      height: "h2"
    },
    {
      src: asset("avista-villa/kitchen-2.jpg"),
      alt: "Kitchen and dining area for private meals",
      size: "p",
      height: "h3"
    },
    {
      src: asset("private-resort/pool.jpg"),
      alt: "Private Resort pool and terrace",
      size: "l",
      height: "h5"
    },
    {
      src: asset("avista-villa/hallway.jpg"),
      alt: "Interior hallway leading to bedrooms",
      size: "p",
      height: "h4"
    }
  ],
  services: {
    image: asset("avista-villa/suite.jpg"),
    imageAlt: "Guest suite with living area and bedroom",
    note: "Services are arranged by request, before or during your stay.",
    titleHtml: "What can be<br />arranged.",
    items: [
      {
        label: "Pool",
        title: "Pool setup & sun terrace",
        description:
          "Loungers, shaded daybeds and outdoor showers set for pool days."
      },
      {
        label: "Table",
        title: "Private chef & in-villa dining",
        description:
          "Greek breakfast, casual lunches or a longer evening table, arranged by request."
      },
      {
        label: "Care",
        title: "Concierge & daily housekeeping",
        description:
          "Transfers, boat days to Diaporos and discreet daily care for the house."
      },
      {
        label: "Suite",
        title: "Accessible ground-floor suite",
        description:
          "A step-free bedroom and wet room for guests who need easier access."
      }
    ]
  },
  location: {
    titleHtml: "Vourvourou,<br />Sithonia.",
    body:
      "Vourvourou sits on Sithonia's eastern coast, where pine trees meet sheltered water and the islets of Diaporos sit just offshore. It is quiet, shallow and easy for families, with tavernas and small beaches close by.",
    image: asset("avista-villa/hero-aerial.jpg"),
    imageAlt: "Aerial view of Vourvourou bay and Diaporos islets"
  },
  cta: {
    image: asset("common/terrace-pool-night.jpg"),
    imageAlt: "Avista terrace and pool lighting at night",
    titleHtml: "Ask about availability<br />at Avista.",
    text:
      "Send your preferred dates, group size and which villa you are considering. We will reply with availability, rates and the details that matter for your stay.",
    buttonLabel: "Send an enquiry",
    href: "/contact/"
  }
};

export const locationPage = {
  seo: {
    title: "Avista | Location, Vourvourou, Sithonia · Halkidiki",
    description:
      "Where Avista's two private villas sit: Vourvourou on the Sithonia peninsula of Halkidiki, where pine meets sheltered water and the islets of Diaporos lie just offshore."
  },
  hero: {
    page: true,
    layout: "bottom",
    kicker: "The setting",
    titleHtml: "Where the pine forest <em>meets</em> the sea.",
    sub:
      "Vourvourou sits on Sithonia's eastern coast, where pine trees meet sheltered water and the islets of Diaporos sit just offshore. It is quiet, shallow and easy for families, with tavernas and small beaches close by.",
    image: asset("avista-villa/hero-aerial.jpg"),
    imageAlt: "Avista hillside above Vourvourou and the Aegean"
  },
  overview: {
    titleHtml: "Vourvourou,<br />Sithonia.",
    body:
      "A string of nine small bays on the middle finger of Halkidiki, edged with pine and looking out to the islets of Diaporos. Calm, shallow water and some of the clearest sea in the Aegean.",
    image: asset("private-resort/hero-aerial.jpg"),
    imageAlt: "Aerial view of the Avista estate near Vourvourou"
  },
  map: {
    titleHtml: "Sithonia,<br />Halkidiki.",
    body:
      "On the middle finger of Halkidiki, about ninety minutes by road from Thessaloniki airport. The villas sit above the bays of Vourvourou, with the islets of Diaporos just offshore.",
    query: siteSettings.mapQuery,
    title: "Map of Vourvourou, Sithonia, Halkidiki"
  },
  cta: homePage.cta
};

export const contactPage = {
  seo: {
    title: "Avista | Enquire · Vourvourou, Halkidiki",
    description:
      "Enquire about a private stay at Avista — two villas above the bays of Vourvourou, Sithonia. Share your dates and group size and we will reply personally."
  },
  hero: {
    page: true,
    layout: "bottom",
    kicker: "Enquiries · Vourvourou",
    titleHtml: "Begin the <em>conversation</em>.",
    sub:
      "Tell us your dates, your group and which villa draws you. We reply personally with availability, rates and the details that matter for your stay.",
    image: asset("avista-villa/terrace-dusk.jpg"),
    imageAlt: "Avista Villa terrace and pool at dusk above Vourvourou bay"
  },
  intro: {
    titleHtml: "Send an<br />enquiry.",
    body:
      "Avista is booked one group at a time, so every stay begins with a short conversation. Share a few details below and we will come back to you by email, usually within a day."
  },
  map: {
    titleHtml: "Where we<br />are.",
    body:
      "The villas sit above the bays of Vourvourou on the middle finger of Halkidiki, about ninety minutes by road from Thessaloniki airport, with the islets of Diaporos just offshore.",
    query: siteSettings.mapQuery,
    title: "Map of Vourvourou, Sithonia, Halkidiki"
  }
};
