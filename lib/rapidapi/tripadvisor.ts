/**
 * TripAdvisor via RapidAPI (DataCrawler/tripadvisor16)
 * Used for: hotels with reviews, restaurants, attractions
 */

const BASE    = 'https://tripadvisor16.p.rapidapi.com/api/v1';
const HEADERS = {
  'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY!,
  'X-RapidAPI-Host': 'tripadvisor16.p.rapidapi.com',
};

export interface TAHotel {
  id:            string;
  name:          string;
  stars:         number;
  rating:        number;
  reviewCount:   number;
  priceRange:    string;
  address:       string;
  imageUrl?:     string;
  url:           string;
}

export interface TARestaurant {
  id:       string;
  name:     string;
  cuisine:  string;
  rating:   number;
  reviews:  number;
  price:    string;
  address:  string;
  url:      string;
}

export interface TAAttraction {
  id:      string;
  name:    string;
  type:    string;
  rating:  number;
  reviews: number;
  url:     string;
}

export async function searchTAHotels(params: {
  destination: string;
  checkIn:     string;
  checkOut:    string;
  adults:      number;
}): Promise<TAHotel[]> {
  try {
    // Search location first
    const locRes  = await fetch(
      `${BASE}/hotels/searchLocation?query=${encodeURIComponent(params.destination)}`,
      { headers: HEADERS }
    );
    const locData = await locRes.json();
    const geoId   = locData?.data?.[0]?.geoId;
    if (!geoId) return [];

    const url = new URL(`${BASE}/hotels/searchHotels`);
    url.searchParams.set('geoId',       geoId);
    url.searchParams.set('checkIn',     params.checkIn);
    url.searchParams.set('checkOut',    params.checkOut);
    url.searchParams.set('adults',      String(params.adults));
    url.searchParams.set('currencyCode','USD');

    const res  = await fetch(url.toString(), { headers: HEADERS });
    const data = await res.json();

    return (data?.data?.data || []).slice(0, 6).map((h: any): TAHotel => ({
      id:          String(h?.cardLink?.route?.params?.contentId || Math.random()),
      name:        h?.cardTitle || 'Hotel',
      stars:       h?.bubbleRating?.count || 0,
      rating:      parseFloat(h?.bubbleRating?.rating || '0'),
      reviewCount: h?.reviewsCount || 0,
      priceRange:  h?.priceDetails || '',
      address:     h?.secondaryInfo || params.destination,
      imageUrl:    h?.cardPhotos?.[0]?.sizes?.urlTemplate?.replace('{width}','400').replace('{height}','300'),
      url:         `https://www.tripadvisor.com${h?.cardLink?.route?.url || ''}`,
    }));
  } catch (err) {
    console.error('[TripAdvisor Hotels]', err);
    return [];
  }
}

export async function searchTARestaurants(destination: string): Promise<TARestaurant[]> {
  try {
    const locRes  = await fetch(
      `${BASE}/restaurant/searchLocation?query=${encodeURIComponent(destination)}`,
      { headers: HEADERS }
    );
    const locData = await locRes.json();
    const geoId   = locData?.data?.[0]?.geoId;
    if (!geoId) return [];

    const res  = await fetch(
      `${BASE}/restaurant/searchRestaurants?locationId=${geoId}`,
      { headers: HEADERS }
    );
    const data = await res.json();

    return (data?.data?.data || []).slice(0, 8).map((r: any): TARestaurant => ({
      id:      String(r?.restaurantsId || Math.random()),
      name:    r?.name || 'Restaurant',
      cuisine: r?.establishmentTypeAndCuisineTags?.[0] || 'International',
      rating:  parseFloat(r?.averageRating || '0'),
      reviews: r?.userReviewCount || 0,
      price:   r?.priceTag || '',
      address: r?.addressObj?.street1 || destination,
      url:     `https://www.tripadvisor.com${r?.url || ''}`,
    }));
  } catch (err) {
    console.error('[TripAdvisor Restaurants]', err);
    return [];
  }
}

export async function searchTAAttractions(destination: string): Promise<TAAttraction[]> {
  try {
    const locRes  = await fetch(
      `${BASE}/attractions/searchLocation?query=${encodeURIComponent(destination)}`,
      { headers: HEADERS }
    );
    const locData = await locRes.json();
    const geoId   = locData?.data?.[0]?.geoId;
    if (!geoId) return [];

    const res  = await fetch(
      `${BASE}/attractions/searchAttractions?geoId=${geoId}&sort=TRAVELER_FAVORITE`,
      { headers: HEADERS }
    );
    const data = await res.json();

    return (data?.data?.data || []).slice(0, 6).map((a: any): TAAttraction => ({
      id:      String(a?.cardLink?.route?.params?.contentId || Math.random()),
      name:    a?.cardTitle || 'Attraction',
      type:    a?.primaryInfo || 'Attraction',
      rating:  parseFloat(a?.bubbleRating?.rating || '0'),
      reviews: a?.reviewsCount || 0,
      url:     `https://www.tripadvisor.com${a?.cardLink?.route?.url || ''}`,
    }));
  } catch (err) {
    console.error('[TripAdvisor Attractions]', err);
    return [];
  }
}
