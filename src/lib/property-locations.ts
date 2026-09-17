// Property pins from Google's listings, verified 2026-09-17.
// Keep map embeds and directions pointed at the same coordinates.
export const propertyLocations: Record<string, {
  latitude: number;
  longitude: number;
  zoom: number;
  label: string;
}> = {
  // https://www.google.com/travel/hotels/entity/ChoIx-r-_sCcmu3gARoNL2cvMTFxcHc0dzZyZhAB
  "avista-villa": {
    latitude: 40.1865085,
    longitude: 23.7842627,
    zoom: 16,
    label: "Avista Villa"
  },
  // https://www.google.com/travel/hotels/entity/CiMIw567t7iJhO0IEM-ev5SWmPfecxoNL2cvMTFrajVwOHM2dxAC
  "avista-private-resort": {
    latitude: 40.1824,
    longitude: 23.811661,
    zoom: 16,
    label: "Avista Private Resort"
  }
};
