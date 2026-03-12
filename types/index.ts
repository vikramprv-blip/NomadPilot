// ─── Core Trip Types ──────────────────────────────────────────────────────────

export interface TripIntent {
  raw: string;
  destination: string;
  origin: string;
  departureDate: string;
  returnDate: string;
  budget?: number;
  currency?: string;
  travelers: number;
  preferences: TripPreferences;
  constraints: TripConstraints;
  services?: string[]; // e.g. ['flight','hotel','car','train']
}

export interface TripPreferences {
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  hotelStars?: number;
  loyaltyPrograms?: string[];
  dietaryRestrictions?: string[];
  accessibility?: string[];
  esgPreference?: boolean;
}

export interface TripConstraints {
  maxLayovers?: number;
  maxFlightDuration?: number;
  mustArriveBefore?: string;
  mustDepartAfter?: string;
  corporatePolicy?: CorporatePolicy;
  visaPassport?: string; // nationality ISO code
}

export interface CorporatePolicy {
  maxFlightCost?: number;
  maxHotelPerNight?: number;
  requiresApproval?: boolean;
  approverEmail?: string;
  preferredVendors?: string[];
}

// ─── Itinerary Types ──────────────────────────────────────────────────────────

export interface Itinerary {
  id: string;
  score: OptimizerScore;
  flights: FlightOption[];
  hotels: HotelOption[];
  ground: GroundOption[];
  totalCost: number;
  currency: string;
  visaRequired: boolean;
  visaInfo?: string;
  carbonFootprint?: number;
  summary: string;
}

export interface OptimizerScore {
  overall: number;
  price: number;
  time: number;
  convenience: number;
  loyalty: number;
  esg: number;
}

export interface FlightOption {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  cabin: string;
  price: number;
  currency: string;
  bookingClass: string;
  loyaltyMiles?: number;
  co2kg?: number;
}

export interface HotelOption {
  id: string;
  name: string;
  stars: number;
  address: string;
  checkIn?: string;
  checkOut?: string;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  rating: number;
  amenities: string[];
  loyaltyPoints?: number;
  co2kg?: number;
  bookingUrl?: string;
  images?: string[];
}

export interface GroundOption {
  id: string;
  type: 'rail' | 'car' | 'rideshare' | 'shuttle';
  provider: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  price: number;
  currency: string;
}

// ─── Booking Types ────────────────────────────────────────────────────────────

export interface BookingResult {
  id: string;
  status: 'confirmed' | 'pending' | 'failed';
  confirmationNumber: string;
  pnr?: string;
  tickets: TicketDocument[];
  createdAt: string;
}

export interface TicketDocument {
  type: 'flight' | 'hotel' | 'ground';
  reference: string;
  documentUrl?: string;
  qrCode?: string;
}

// ─── Ops Types ────────────────────────────────────────────────────────────────

export interface OpsAlert {
  id: string;
  tripId: string;
  type: 'delay' | 'cancellation' | 'gate_change' | 'rebooking' | 'info';
  severity: 'low' | 'medium' | 'high';
  message: string;
  autoResolved: boolean;
  createdAt: string;
}

// ─── App State ────────────────────────────────────────────────────────────────

export type AppStage =
  | 'input'
  | 'processing'
  | 'generation'
  | 'optimization'
  | 'confirmation'
  | 'booking'
  | 'ops'
  | 'organizer'
  | 'post_trip';

export interface AppState {
  stage: AppStage;
  intent?: TripIntent;
  itineraries?: Itinerary[];
  selectedItinerary?: Itinerary;
  booking?: BookingResult;
  alerts?: OpsAlert[];
  userId?: string;
  tripId?: string;
}
