# Prompt: Add the location local guide to Payload CMS

Use this prompt in the Payload CMS repository:

```text
Add a CMS-managed local guide to the existing Payload 3.x `locationPage` global.

Context:
- The Astro frontend has a `LocalGuide.astro` component.
- The guide belongs on the location page between the map and CTA.
- All guide headings, descriptions, places, areas, and Google Maps URLs must be editable in Payload.
- Preserve the existing Payload architecture, access rules, drafts/versioning configuration, TypeScript conventions, and migration workflow.
- Do not add frontend fallback copy. If the guide is disabled or empty, the frontend should render no guide section.

1. Extend the `locationPage` global with this field structure:

{
  name: 'localGuide',
  type: 'group',
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Supports a newline for the intended heading break.',
      },
    },
    {
      name: 'intro',
      type: 'textarea',
      required: true,
    },
    {
      name: 'note',
      type: 'text',
    },
    {
      name: 'categories',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
        },
        {
          name: 'places',
          type: 'array',
          minRows: 1,
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'description',
              type: 'textarea',
              required: true,
            },
            {
              name: 'area',
              type: 'text',
              required: true,
            },
            {
              name: 'href',
              type: 'text',
              required: true,
              validate: value => {
                if (!value) return 'A Google Maps URL is required'
                try {
                  const url = new URL(value)
                  if (url.protocol !== 'https:') return 'Use an HTTPS URL'
                  if (!['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl'].includes(url.hostname)) {
                    return 'Use a Google Maps URL'
                  }
                  return true
                } catch {
                  return 'Enter a valid URL'
                }
              },
            },
          ],
        },
      ],
    },
  ],
}

2. Create and apply the required database migration. Do not rely on development-time schema push.

3. Seed the existing `locationPage.localGuide` with:

Title:
A few places
to begin.

Intro:
A short local list for swimming, lunch and an easy drink by the water. Ask us for more recommendations during your stay.

Note:
Each name opens in Google Maps.

Categories:

- Beaches
  Description: Sheltered bays and clear, shallow water close to Vourvourou.
  Places:
  - Karidi Beach | Pale sand, pines and calm shallows | Vourvourou | https://www.google.com/maps/search/?api=1&query=Karidi+Beach+Vourvourou
  - Fava Beach | A quieter string of small coves | Vourvourou | https://www.google.com/maps/search/?api=1&query=Fava+Beach+Vourvourou
  - Livari Beach | Long shallows facing Diaporos | Vourvourou | https://www.google.com/maps/search/?api=1&query=Livari+Beach+Vourvourou

- Restaurants
  Description: Local cooking, fresh fish and tables worth lingering over.
  Places:
  - Paris Restaurant | Greek cooking and grilled seafood | Vourvourou | https://www.google.com/maps/search/?api=1&query=Paris+Restaurant+Vourvourou
  - Melia | Dinner beneath the trees | Vourvourou | https://www.google.com/maps/search/?api=1&query=Melia+Restaurant+Vourvourou
  - Aristos Fish Restaurant | Seafood beside the harbour | Ormos Panagias | https://www.google.com/maps/search/?api=1&query=Aristos+Fish+Restaurant+Ormos+Panagias

- Bars by the water
  Description: For a slower afternoon or a drink after the last swim.
  Places:
  - Talgo Beach Bar | Sunbeds and a long sandy bay | Trani Ammouda | https://www.google.com/maps/search/?api=1&query=Talgo+Beach+Bar+Halkidiki
  - Manassu Beach Bar | All-day drinks beneath the pines | Akti Oneirou | https://www.google.com/maps/search/?api=1&query=Manassu+Beach+Bar+Sithonia
  - Ethnik Beach Bar | A relaxed stop on the western coast | Tristinika | https://www.google.com/maps/search/?api=1&query=Ethnik+Beach+Bar+Tristinika

4. Regenerate Payload TypeScript types.

5. Verify the public endpoint:
GET /api/globals/locationPage?depth=2

The response must expose:

localGuide: {
  enabled: boolean
  title: string
  intro: string
  note?: string
  categories: Array<{
    id?: string
    title: string
    description: string
    places: Array<{
      id?: string
      name: string
      description: string
      area: string
      href: string
    }>
  }>
}

6. Add or update tests to confirm:
- Public users can read the local guide.
- Editors can add, reorder, update, and remove categories and places.
- Invalid and non-HTTPS map URLs are rejected.
- Disabling the guide remains represented as `enabled: false`.
- Empty optional note values serialize safely.

7. Report:
- Files changed.
- Migration name.
- Type-generation command used.
- Test and verification commands run.
- A sample API response containing the seeded guide.
```

After the CMS change is deployed, update the Astro frontend to read
`locationPage.localGuide` in `src/lib/cms.ts` and remove the temporary
hardcoded `localGuide` array from `src/pages/location.astro`.
