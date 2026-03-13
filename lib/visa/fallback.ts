/**
 * Offline visa fallback — passport-index-dataset (MIT license, Feb 2026)
 * Source: github.com/imorte/passport-index-data
 * Values: number=visa-free days, VF=visa free, VOA=visa on arrival,
 *         EV=e-visa, ETA=electronic travel auth, VR=visa required, NA=not admitted
 */

const VISA_DATA: Record<string, Record<string, string | number>> = {
  DK: { IN:"EV", TH:30, AE:30, US:90, GB:"VF", FR:"VF", DE:"VF", JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:90, KE:"VOA", EG:"VOA", MA:90, NG:"VR", NO:"VF", SE:"VF", IT:"VF", ES:"VF", NL:"VF", PT:"VF", GR:"VF", PL:"VF", IE:"VF", CH:90, BE:"VF", AT:"VF", FI:"VF", CZ:90, HU:90, MV:30, PH:30, MY:30, VN:"EV", KH:"VOA", LK:"EV", MU:90, TZ:"VOA", UG:"VOA", RW:"VOA", ET:"VOA", GH:"VR", CA:180, BR:90, AR:90, CL:90, CO:90, PE:90, NZ:90, HK:90, TW:90, KR:90, IL:90, JO:"VOA", QA:30, SA:"VOA", KW:30, OM:30, BH:14, RU:60, UA:90, GE:360, LB:"VR", IR:"VR" },
  GB: { IN:"EV", TH:30, AE:30, US:90, FR:"VF", DE:"VF", JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:90, KE:"VOA", EG:"VOA", MA:90, NG:"VR", DK:"VF", NO:"VF", SE:"VF", IT:"VF", ES:"VF", NL:"VF", PT:"VF", GR:"VF", PL:"VF", IE:"VF", CH:180, CA:180, BR:90, AR:90, NZ:180, HK:180, KR:90, IL:90, JO:"VOA", QA:30, SA:"VOA", RU:30, UA:90 },
  US: { IN:"EV", TH:30, AE:30, GB:180, FR:90, DE:90, JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:"VF", ZA:90, KE:"VOA", EG:"VOA", MA:90, NG:"VR", DK:90, NO:90, SE:90, IT:90, ES:90, NL:90, PT:90, GR:90, PL:90, IE:90, CH:90, BE:90, CA:"VF", BR:90, AR:90, CL:90, CO:90, PE:90, NZ:"ETA", HK:90, KR:90, IL:90, JO:"VOA", QA:30, SA:"VOA", RU:60, UA:90, GE:360 },
  DE: { IN:"EV", TH:30, AE:30, US:90, GB:"VF", FR:"VF", JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:90, KE:"VOA", EG:"VOA", MA:90, NG:"VR", DK:"VF", NO:"VF", SE:"VF", IT:"VF", ES:"VF", NL:"VF", PT:"VF", GR:"VF", PL:"VF", IE:"VF", CH:90, CA:180, BR:90, AR:90, NZ:90, HK:90, KR:90, IL:90 },
  IN: { TH:"VOA", AE:"VR", US:"VR", GB:"VR", FR:"VR", DE:"VR", JP:"VR", SG:"VR", AU:"VR", CN:"VR", ID:"VOA", TR:"EV", MX:"VR", ZA:"VR", KE:"EV", EG:"VOA", MA:"VR", NG:"VR", DK:"VR", NO:"VR", SE:"VR", QA:"VR", SA:"VR", NP:"VF", BT:"VF", MV:30, LK:"EV", MM:"EV", VN:"EV", KH:"VOA", MU:"VF", TZ:"VOA", UG:"VOA", RW:"VOA", ET:"VOA", OM:"VR", KW:"VR", BH:"VR", JO:"VOA", IL:"VR", RU:"VR", UA:"VR", GE:"VF", AM:"VF" },
  AE: { IN:14, TH:30, GB:180, FR:90, DE:90, US:90, JP:30, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:30, KE:"VOA", EG:30, MA:90, NG:"VR", DK:90, NO:90, SE:90, IT:90, ES:90, QA:30, SA:30, KW:30, OM:30, BH:30, JO:30, LB:"VR", IL:"VR" },
  SG: { IN:"VR", TH:30, AE:30, US:90, GB:180, FR:90, DE:90, JP:90, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:30, KE:90, EG:30, MA:90, NG:"VR", DK:90, NO:90, SE:90, IT:90, ES:90, NL:90, CA:180, BR:90, AR:90, NZ:90, HK:90, KR:90, IL:30 },
  AU: { IN:"EV", TH:30, AE:30, US:90, GB:180, FR:90, DE:90, JP:90, SG:30, CN:"VR", ID:30, TR:90, MX:180, ZA:30, KE:"VOA", EG:"VOA", MA:90, NG:"VR", DK:90, NO:90, SE:90, IT:90, ES:90, NL:90, CA:180, BR:90, NZ:"VF", HK:90, KR:90, IL:90 },
  CA: { IN:"EV", TH:30, AE:30, US:"VF", GB:180, FR:90, DE:90, JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:30, KE:"VOA", EG:"VOA", MA:90, NG:"VR", DK:90, SE:90, IT:90, BR:90, AR:90, NZ:"ETA", HK:90, KR:90 },
  FR: { IN:"EV", TH:30, AE:30, US:90, GB:"VF", DE:"VF", JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:90, KE:"VOA", EG:"VOA", MA:90, NG:"VR", DK:"VF", NO:"VF", SE:"VF", IT:"VF", ES:"VF", NL:"VF", PT:"VF", GR:"VF", PL:"VF", IE:"VF", CH:90, CA:180, BR:90, AR:90, NZ:90, HK:90, KR:90, IL:90 },
  NO: { IN:"EV", TH:30, AE:30, US:90, GB:"VF", FR:"VF", DE:"VF", JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:90, KE:"VOA", EG:"VOA", MA:90, NG:"VR", DK:"VF", SE:"VF", IT:"VF", ES:"VF", NL:"VF", PT:"VF", GR:"VF", PL:"VF", IE:"VF", CH:90, CA:180, BR:90, NZ:90, HK:90, KR:90, IL:90 },
  SE: { IN:"EV", TH:30, AE:30, US:90, GB:"VF", FR:"VF", DE:"VF", JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:90, KE:"VOA", EG:"VOA", MA:90, NG:"VR", DK:"VF", NO:"VF", IT:"VF", ES:"VF", NL:"VF", PT:"VF", GR:"VF", PL:"VF", IE:"VF", CH:90, CA:180, BR:90, NZ:90, HK:90, KR:90 },
  PK: { IN:"VR", TH:"VR", AE:"VR", US:"VR", GB:"VR", CN:90, ID:"VOA", TR:90, MX:"VR", ZA:"VR", KE:"VR", EG:"VOA", MA:"VR", SA:"VR", QA:"VR", KW:"VR", OM:"VR", BH:"VR" },
  NL: { IN:"EV", TH:30, AE:30, US:90, GB:"VF", FR:"VF", DE:"VF", JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:90, KE:"VOA", EG:"VOA", MA:90, DK:"VF", NO:"VF", SE:"VF", IT:"VF", ES:"VF", PT:"VF", GR:"VF", PL:"VF", IE:"VF", CH:90, CA:180, BR:90, NZ:90, HK:90, KR:90 },
  IT: { IN:"EV", TH:30, AE:30, US:90, GB:"VF", FR:"VF", DE:"VF", JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:180, ZA:90, KE:"VOA", EG:"VOA", MA:90, DK:"VF", NO:"VF", SE:"VF", ES:"VF", NL:"VF", PT:"VF", GR:"VF", PL:"VF", IE:"VF", CH:90, CA:180, BR:90, NZ:90 },
  ES: { IN:"EV", TH:30, AE:30, US:90, GB:"VF", FR:"VF", DE:"VF", JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:"VF", ZA:90, KE:"VOA", EG:"VOA", MA:90, DK:"VF", NO:"VF", SE:"VF", IT:"VF", NL:"VF", PT:"VF", GR:"VF", PL:"VF", IE:"VF", CH:90, CA:180, BR:90, NZ:90 },
  JP: { IN:"VR", TH:30, AE:30, US:90, GB:90, FR:90, DE:90, SG:90, AU:90, CN:"VR", ID:30, TR:90, MX:180, ZA:90, KE:"VOA", EG:"VOA", MA:90, DK:90, NO:90, SE:90, IT:90, ES:90, NL:90, CA:90, BR:90, NZ:90, HK:90, KR:90, IL:90 },
  KR: { IN:"VR", TH:30, AE:30, US:90, GB:90, FR:90, DE:90, JP:90, SG:30, AU:"ETA", CN:"VR", ID:30, TR:90, MX:90, ZA:30, KE:"VOA", EG:"VOA", MA:90, DK:90, NO:90, SE:90, CA:180, BR:90, NZ:90, HK:90 },
};

export interface FallbackVisaResult {
  status:         string;
  required:       boolean;
  stayDays:       number | null;
  evisaAvailable: boolean;
  source:         "offline-dataset";
}

export function lookupVisa(passport: string, destination: string): FallbackVisaResult | null {
  const p = passport.toUpperCase().trim();
  const d = destination.toUpperCase().trim();
  if (p === d) return { status: "No visa required (same country)", required: false, stayDays: null, evisaAvailable: false, source: "offline-dataset" };

  const val = VISA_DATA[p]?.[d];
  if (val === undefined) return null;

  if (typeof val === "number") {
    return { status: `Visa Free — ${val} days`, required: false, stayDays: val, evisaAvailable: false, source: "offline-dataset" };
  }

  const map: Record<string, FallbackVisaResult> = {
    VF:  { status: "Visa Free",                     required: false, stayDays: null, evisaAvailable: false, source: "offline-dataset" },
    VOA: { status: "Visa on Arrival",                required: false, stayDays: null, evisaAvailable: false, source: "offline-dataset" },
    EV:  { status: "eVisa Available",                required: true,  stayDays: null, evisaAvailable: true,  source: "offline-dataset" },
    ETA: { status: "Electronic Travel Auth (ETA)",   required: true,  stayDays: null, evisaAvailable: true,  source: "offline-dataset" },
    VR:  { status: "Visa Required",                  required: true,  stayDays: null, evisaAvailable: false, source: "offline-dataset" },
    NA:  { status: "Entry Not Permitted",            required: true,  stayDays: null, evisaAvailable: false, source: "offline-dataset" },
  };
  return map[val as string] ?? null;
}
