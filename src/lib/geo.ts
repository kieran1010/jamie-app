/** UK postcode handling and distance maths. */

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function isValidUkPostcode(raw: string): boolean {
  return POSTCODE_RE.test(raw.trim());
}

/** "sw1a1aa" -> "SW1A 1AA". Returns null if it isn't a postcode shape. */
export function normalisePostcode(raw: string): string | null {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (!POSTCODE_RE.test(compact)) return null;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

/** The outward code — "SW1A 1AA" -> "SW1A". Useful for coarse display. */
export function outcodeOf(postcode: string): string {
  const normalised = normalisePostcode(postcode);
  return normalised ? normalised.split(" ")[0] : postcode.toUpperCase();
}

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A latitude/longitude box that certainly contains everything within
 * `radiusMiles`. Used to cheaply narrow the candidate set in SQL before the
 * exact haversine filter runs in application code.
 */
export function boundingBox(latitude: number, longitude: number, radiusMiles: number) {
  const latDelta = radiusMiles / 69.0;
  const cos = Math.cos((latitude * Math.PI) / 180);
  // Guard against the poles, where a degree of longitude collapses to nothing.
  const lonDelta = radiusMiles / Math.max(0.01, 69.0 * cos);
  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLon: longitude - lonDelta,
    maxLon: longitude + lonDelta,
  };
}

export type GeocodeResult = { latitude: number; longitude: number; postcode: string };

/**
 * Look a postcode up with postcodes.io — free, no API key, UK only.
 *
 * Returns null on an unknown postcode *or* on any network failure. Callers must
 * treat a null as "we could not place this tutor on the map yet" rather than as
 * an error, so that a geocoder outage never blocks someone from saving a
 * profile. Coordinates are cached on the profile, so this is never called from
 * the search path.
 */
export async function geocodePostcode(raw: string): Promise<GeocodeResult | null> {
  const normalised = normalisePostcode(raw);
  if (!normalised) return null;

  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(normalised.replace(/\s/g, ""))}`,
      { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      result?: { latitude?: number; longitude?: number; postcode?: string };
    };
    const lat = body.result?.latitude;
    const lon = body.result?.longitude;
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    return { latitude: lat, longitude: lon, postcode: body.result?.postcode ?? normalised };
  } catch {
    return null;
  }
}
