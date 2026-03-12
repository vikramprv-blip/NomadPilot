'use client';
import { useState } from 'react';

const NATIONALITIES = ['Afghan','Albanian','Algerian','American','Argentine','Armenian','Australian','Austrian','Azerbaijani','Bahraini','Bangladeshi','Belgian','Brazilian','British','Bulgarian','Cambodian','Canadian','Chilean','Chinese','Colombian','Croatian','Czech','Danish','Dutch','Egyptian','Emirati','Estonian','Ethiopian','Finnish','French','Georgian','German','Ghanaian','Greek','Hungarian','Indian','Indonesian','Iranian','Iraqi','Irish','Israeli','Italian','Japanese','Jordanian','Kazakh','Kenyan','Korean','Kuwaiti','Latvian','Lebanese','Lithuanian','Malaysian','Mexican','Moroccan','Nigerian','Norwegian','Omani','Pakistani','Philippine','Polish','Portuguese','Qatari','Romanian','Russian','Saudi','Serbian','Singaporean','South African','Spanish','Sri Lankan','Swedish','Swiss','Syrian','Taiwanese','Thai','Turkish','Ukrainian','Venezuelan','Vietnamese'];

// Currency list
const CURRENCIES = [
  { code:'USD', symbol:'$',  label:'USD — US Dollar' },
  { code:'EUR', symbol:'€',  label:'EUR — Euro' },
  { code:'GBP', symbol:'£',  label:'GBP — British Pound' },
  { code:'INR', symbol:'₹',  label:'INR — Indian Rupee' },
  { code:'AED', symbol:'د.إ',label:'AED — UAE Dirham' },
  { code:'SGD', symbol:'S$', label:'SGD — Singapore Dollar' },
  { code:'AUD', symbol:'A$', label:'AUD — Australian Dollar' },
  { code:'CAD', symbol:'C$', label:'CAD — Canadian Dollar' },
  { code:'JPY', symbol:'¥',  label:'JPY — Japanese Yen' },
  { code:'CNY', symbol:'¥',  label:'CNY — Chinese Yuan' },
  { code:'CHF', symbol:'Fr', label:'CHF — Swiss Franc' },
  { code:'SEK', symbol:'kr', label:'SEK — Swedish Krona' },
  { code:'NOK', symbol:'kr', label:'NOK — Norwegian Krone' },
  { code:'DKK', symbol:'kr', label:'DKK — Danish Krone' },
  { code:'THB', symbol:'฿',  label:'THB — Thai Baht' },
  { code:'MYR', symbol:'RM', label:'MYR — Malaysian Ringgit' },
  { code:'SAR', symbol:'ر.س',label:'SAR — Saudi Riyal' },
  { code:'QAR', symbol:'ر.ق',label:'QAR — Qatari Riyal' },
  { code:'KWD', symbol:'د.ك',label:'KWD — Kuwaiti Dinar' },
  { code:'ZAR', symbol:'R',  label:'ZAR — South African Rand' },
  { code:'BRL', symbol:'R$', label:'BRL — Brazilian Real' },
  { code:'MXN', symbol:'$',  label:'MXN — Mexican Peso' },
  { code:'NZD', symbol:'NZ$',label:'NZD — New Zealand Dollar' },
  { code:'HKD', symbol:'HK$',label:'HKD — Hong Kong Dollar' },
  { code:'TRY', symbol:'₺',  label:'TRY — Turkish Lira' },
];

// Auto-detect currency from nationality
const NATIONALITY_CURRENCY: Record<string,string> = {
  'American':'USD','British':'GBP','Australian':'AUD','Canadian':'CAD',
  'Indian':'INR','Emirati':'AED','Singaporean':'SGD','Japanese':'JPY',
  'Chinese':'CNY','Swiss':'CHF','Swedish':'SEK','Norwegian':'NOK','Danish':'DKK',
  'Thai':'THB','Malaysian':'MYR','Saudi':'SAR','Qatari':'QAR','Kuwaiti':'KWD',
  'South African':'ZAR','Brazilian':'BRL','Mexican':'MXN','Hong Kong':'HKD',
  'Turkish':'TRY','Korean':'KRW','Filipino':'PHP','Indonesian':'IDR',
  'Pakistani':'PKR','Bangladeshi':'BDT','Sri Lankan':'LKR','Nepali':'NPR',
  'Egyptian':'EGP','Nigerian':'NGN','Kenyan':'KES','Moroccan':'MAD',
  'French':'EUR','German':'EUR','Italian':'EUR','Spanish':'EUR','Dutch':'EUR',
  'Belgian':'EUR','Austrian':'EUR','Portuguese':'EUR','Greek':'EUR','Finnish':'EUR',
  'Irish':'EUR','Polish':'PLN','Czech':'CZK','Romanian':'RON','Hungarian':'HUF',
  'Bulgarian':'BGN','Croatian':'EUR','Serbian':'RSD',
  'Russian':'RUB','Ukrainian':'UAH','Israeli':'ILS','Lebanese':'LBP',
  'Jordanian':'JOD','Iranian':'IRR','Iraqi':'IQD',
  'Argentine':'ARS','Venezuelan':'VES','Colombian':'COP','Chilean':'CLP',
  'Peruvian':'PEN',
};

const SERVICES = [
  { id:'flight', icon:'✈', label:'Flight' },
  { id:'hotel',  icon:'🏨', label:'Hotel' },
  { id:'car',    icon:'🚗', label:'Car Rental' },
  { id:'train',  icon:'🚂', label:'Train' },
  { id:'ferry',  icon:'⛴', label:'Ferry' },
  { id:'insurance', icon:'🛡', label:'Insurance' },
];

type TripType = 'return'|'oneway'|'multicity';
interface Leg { from:string; to:string; date:string; }

export default function InputStage({ onSubmit, onAISubmit, loading }: {
  onSubmit:(data:object)=>void;
  onAISubmit:(text:string)=>void;
  loading:boolean;
}) {
  const [tab, setTab]           = useState<'search'|'ai'>('search');
  const [tripType, setTripType] = useState<TripType>('return');
  const [services, setServices] = useState(['flight','hotel']);
  const [nationality, setNationality] = useState('');
  const [currency, setCurrency]       = useState('USD');
  const [aiText, setAiText]     = useState('');
  const [travelers, setTravelers] = useState(1);
  const [cabinClass, setCabinClass] = useState('economy');
  const [mainLeg, setMainLeg]   = useState({ from:'', to:'', departure:'', return:'' });
  const [legs, setLegs]         = useState<Leg[]>([{from:'',to:'',date:''},{from:'',to:'',date:''}]);

  const toggleSvc = (id:string) => setServices(p => p.includes(id) ? p.filter(s=>s!==id) : [...p,id]);
  const updateLeg = (i:number, f:keyof Leg, v:string) => setLegs(p => p.map((l,idx)=> idx===i?{...l,[f]:v}:l));

  const canSearch = tripType==='multicity' ? legs[0].from&&legs[0].to&&legs[0].date : mainLeg.from&&mainLeg.to&&mainLeg.departure;

  const labelStyle: React.CSSProperties = { fontSize:11, color:'var(--text-dim)', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', display:'block', marginBottom:6 };
  const iconInput = (placeholder:string, val:string, onChange:(v:string)=>void, icon='📍') => (
    <div style={{position:'relative'}}>
      <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:13}}>{icon}</span>
      <input className="input-field" style={{paddingLeft:30}} placeholder={placeholder} value={val} onChange={e=>onChange(e.target.value)} />
    </div>
  );

  return (
    <div className="fade-up" style={{maxWidth:880,margin:'0 auto'}}>
      {/* Hero */}
      <div style={{textAlign:'center',marginBottom:36}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'5px 16px',borderRadius:20,marginBottom:20,background:'rgba(232,160,32,0.1)',border:'1px solid rgba(232,160,32,0.2)'}}>
          <span style={{fontSize:11,color:'var(--gold)',fontWeight:700,letterSpacing:'0.12em'}}>AUTONOMOUS AI TRAVEL PLATFORM</span>
        </div>
        <h1 style={{fontSize:'clamp(32px,5vw,56px)',fontWeight:700,lineHeight:1.1,marginBottom:12}}>
          Where shall we take<br/><span style={{color:'var(--gold)'}}>you next?</span>
        </h1>
        <p style={{color:'var(--text-dim)',fontSize:16,maxWidth:440,margin:'0 auto'}}>
          Search manually or let our AI plan your entire journey — flights, hotels, visas & more.
        </p>
      </div>

      {/* Card */}
      <div className="card-gold" style={{padding:28}}>
        <div className="tab-bar" style={{marginBottom:24,maxWidth:300}}>
          <button className={`tab-btn ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}>🔍 Search</button>
          <button className={`tab-btn ${tab==='ai'?'active':''}`} onClick={()=>setTab('ai')}>✦ AI Planner</button>
        </div>

        {tab==='ai' ? (
          <div>
            <textarea className="input-field" value={aiText} onChange={e=>setAiText(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&aiText.trim()){e.preventDefault();onAISubmit(aiText.trim());}}}
              placeholder="e.g. Fly me from Dubai to Tokyo next month, business class, 2 people, budget $6000, I have a US passport..."
              rows={4} style={{resize:'none',marginBottom:12,lineHeight:1.6}} />
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
              {['NYC to London, business, next Friday','Dubai to Bali, eco hotels, 2 weeks','Multi-city: Paris → Rome → Barcelona'].map(ex=>(
                <button key={ex} onClick={()=>setAiText(ex)} style={{background:'var(--navy-light)',border:'1px solid var(--navy-border)',borderRadius:6,padding:'6px 12px',color:'var(--text-dim)',cursor:'pointer',fontSize:12,fontFamily:'DM Sans'}}>{ex}</button>
              ))}
            </div>
            <button className="btn btn-gold btn-lg" onClick={()=>aiText.trim()&&onAISubmit(aiText.trim())} disabled={!aiText.trim()||loading} style={{width:'100%',justifyContent:'center'}}>
              {loading ? <span className="spin">◌</span> : '✦'} {loading ? 'AI is planning...' : 'Plan My Trip with AI'}
            </button>
          </div>
        ) : (
          <div>
            {/* Trip type */}
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              {(['return','oneway','multicity'] as TripType[]).map(t=>(
                <button key={t} onClick={()=>setTripType(t)} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${tripType===t?'var(--gold)':'var(--navy-border)'}`,background:tripType===t?'rgba(232,160,32,0.12)':'var(--navy-light)',color:tripType===t?'var(--gold)':'var(--text-dim)',cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'DM Sans',transition:'all 0.15s'}}>
                  {t==='return'?'⇄ Return':t==='oneway'?'→ One Way':'⊞ Multi-City'}
                </button>
              ))}
            </div>

            {/* Routes */}
            {tripType==='multicity' ? (
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                {legs.map((leg,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8,alignItems:'center'}}>
                    {iconInput('From — city or IATA',leg.from,v=>updateLeg(i,'from',v))}
                    {iconInput('To — city or IATA',leg.to,v=>updateLeg(i,'to',v))}
                    <input className="input-field" type="date" value={leg.date} onChange={e=>updateLeg(i,'date',e.target.value)} />
                    {i>=2&&<button onClick={()=>setLegs(p=>p.filter((_,idx)=>idx!==i))} style={{background:'none',border:'1px solid var(--navy-border)',borderRadius:6,color:'var(--red)',cursor:'pointer',padding:'8px 10px'}}>✕</button>}
                  </div>
                ))}
                <button onClick={()=>setLegs(p=>[...p,{from:'',to:'',date:''}])} className="btn btn-navy" style={{alignSelf:'flex-start',fontSize:13}}>+ Add City</button>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:`1fr 1fr 1fr${tripType==='return'?' 1fr':''}`,gap:12,marginBottom:16}}>
                {iconInput('From — City or IATA',mainLeg.from,v=>setMainLeg(p=>({...p,from:v})))}
                {iconInput('To — City or IATA',mainLeg.to,v=>setMainLeg(p=>({...p,to:v})))}
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'var(--text-muted)'}}>📅</span>
                  <input className="input-field" style={{paddingLeft:30}} type="date" value={mainLeg.departure} onChange={e=>setMainLeg(p=>({...p,departure:e.target.value}))} />
                </div>
                {tripType==='return'&&(
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'var(--text-muted)'}}>📅</span>
                    <input className="input-field" style={{paddingLeft:30}} type="date" value={mainLeg.return} onChange={e=>setMainLeg(p=>({...p,return:e.target.value}))} />
                  </div>
                )}
              </div>
            )}

            {/* Travelers + class + nationality */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:20}}>
              <div>
                <label style={labelStyle}>Travelers</label>
                <input className="input-field" type="number" min={1} max={9} value={travelers} onChange={e=>setTravelers(Number(e.target.value))} />
              </div>
              <div>
                <label style={labelStyle}>Cabin Class</label>
                <select className="input-field" value={cabinClass} onChange={e=>setCabinClass(e.target.value)}>
                  <option value="economy">Economy</option>
                  <option value="premium_economy">Premium Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First Class</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nationality (visa check)</label>
                <select className="input-field" value={nationality} onChange={e=>{
                    setNationality(e.target.value);
                    const auto = NATIONALITY_CURRENCY[e.target.value];
                    if (auto) setCurrency(auto);
                  }}>
                  <option value="">Select nationality</option>
                  {NATIONALITIES.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select className="input-field" value={currency} onChange={e=>setCurrency(e.target.value)}>
                  {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
                </select>
              </div>
            </div>

            {/* Services */}
            <div style={{marginBottom:20}}>
              <label style={labelStyle}>Services Required</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {SERVICES.map(s=>(
                  <div key={s.id} className={`service-chip ${services.includes(s.id)?'active':''}`} onClick={()=>toggleSvc(s.id)}>
                    <span>{s.icon}</span> {s.label} {services.includes(s.id)&&<span style={{fontSize:10}}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            {nationality&&(
              <div style={{marginBottom:20,padding:'10px 14px',borderRadius:8,background:'rgba(232,160,32,0.07)',border:'1px solid rgba(232,160,32,0.2)',fontSize:13,color:'var(--gold-light)',display:'flex',alignItems:'center',gap:8}}>
                🛂 Visa requirements for <strong style={{marginLeft:4}}>{nationality}</strong> travelers will be checked automatically
              </div>
            )}

            <button className="btn btn-gold btn-lg" onClick={()=>onSubmit({tripType,services,nationality,currency,legs:tripType==='multicity'?legs:[mainLeg],travelers,cabinClass})} disabled={!canSearch||loading} style={{width:'100%',justifyContent:'center'}}>
              {loading?<span className="spin">◌</span>:'🔍'} {loading?'Searching...':'Search Reservations'}
            </button>
          </div>
        )}
      </div>

      {/* Partner logos */}
      <div style={{marginTop:28,textAlign:'center'}}>
        <p style={{fontSize:11,color:'var(--text-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:14}}>Searching across</p>
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:28,flexWrap:'wrap'}}>
          {['Booking.com','Expedia','Skyscanner','MakeMyTrip','Hotels.com','Amadeus GDS'].map(p=>(
            <span key={p} style={{fontSize:13,fontWeight:600,color:'var(--text-muted)'}}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
