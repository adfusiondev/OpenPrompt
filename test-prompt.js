// Carrental fixture test — mirrored Phase-2 logic from index.html
const client = {
  name: "Car Rental Ltd Location Voiture Marrakech",
  prof: "Car rental agency",
  city: "Amitaf 40000",
  address: "Bureau 11 Rue Loubnane, Amitaf 40000, Morocco",
  phone: "212661601990",
  rating: "4.9",
  reviews: "688",
  website_url: "https://www.carrental-ltd.com/",
  identity: "no",
  hours: "",
  notes: "",
  rawUrl: "https://maps.google.com/maps/place/?q=place_id:ChIJBXIh6o7urw0R1dmLo2YJgtw",
  lat: 31.6373543,
  lng: -8.0105591,
  selectedUSP: "Explore Marrakech seamlessly with Marrakech's highest-rated 4.9-star trusted car rental service."
};

const options = {
  lang: "en",
  cta: "whatsapp",
  tone: "luxury",
  variant: "premium"
};

const VERTICALS = {
  dental: { label: "Dental clinic", services: ["dental cleaning & whitening", "implants", "orthodontics/braces", "veneers", "pediatric dentistry", "emergency care"], audience: "patients", single: "patient", roleLine: "dental landing pages" },
  carrental: { label: "Car rental agency", services: ["citadines", "SUV & famille", "luxe", "longue durée", "avec chauffeur", "livraison aéroport 24/7"], audience: "customers", single: "customer", roleLine: "car rental landing pages" }
};
const SERVICES_HINT = Object.fromEntries(Object.entries(VERTICALS).map(([id, v]) => [id, v.services.join(', ')]));

function detectProfessionId(text) {
  if (!text) return null;
  if (/car rental|car hire|rent a car|location de voiture|location voiture|voiture de location|locauto/i.test(text)) return "carrental";
  if (/dental|dentist|teeth/i.test(text)) return "dental";
  return null;
}

const lockGate = fn => fn;

const TIER_BRIEFS = {
  en: {
    premium: {
      title: "Premium and immersive landing page",
      brief: `Create an exceptional landing page for [NAME], a [PROFESSION] in [CITY] — flagship business level.

Priority: visual storytelling, refined details, immersive experience.
Tone: exclusive, editorial, discreet luxury (not flashy).
Structure: cinematic hero + customer journey + signature services + gallery + testimonials + premium FAQ + map + VIP CTA.
Main CTA: one-click WhatsApp booking.

Total freedom: sophisticated palette, editorial typography, subtle animations, micro-interactions. I want a result worthy of a high-end flagship business.

ART-DIRECTION: rich deep palette mandatory (black or emerald + gold), one single consistent CTA color everywhere, crafted hero visual (never raw stock photo), high-contrast typography. "Discreet luxury" means sober richness, not paleness.`
    }
  }
};

function buildPrompts() {
  const catId = detectProfessionId((client.prof || '') + ' ' + (client.name || ''));
  const vert = VERTICALS[catId];
  const wsNoun = (vert && vert.single) || 'patient';
  const audLabel = (vert && vert.audience) || 'patients';
  const LANG_FULL = {
    en: 'English — LTR layout, use Inter font'
  }[options.lang];

  const CTA = {
    whatsapp: `WhatsApp booking — real number: ${client.phone}. CRITICAL JS REQUIREMENT: Include a complete, functional <script> tag before </body> that (1) selects the booking form by id or tag, (2) intercepts its submit event with e.preventDefault(), (3) extracts the name, phone, and service fields from the form, (4) builds the message body including the service name and ${wsNoun} name, and (5) opens https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text={encoded_message} in a new tab via window.open(). Use encodeURIComponent for the text parameter. The script must be fully working production code — NO mock alerts, NO placeholder callbacks, NO console.log stubs. If the form has no id, add one (e.g. id="bookingForm").`
  }[options.cta];

  const TONE = {
    trust: 'trusted, calm, clinical',
    luxury: 'luxury, premium',
    friendly: 'friendly, warm',
    modern: 'modern, tech-forward'
  }[options.tone];

  const servicesHint = SERVICES_HINT[catId] || 'top 4-6 core services with short benefit-driven blurbs';
  const WEB = client.website_url
    ? `Client has a website (${client.website_url}) — build a conversion-focused landing page.`
    : 'Client has NO website — this will be their first digital presence.';
  const IDENT = client.identity === 'no' ? 'No visual identity — suggest one.' : 'Match their existing brand.';
  const PROOF = client.rating ? `- Real Google rating: ${client.rating} ⭐ (${client.reviews || '?'} reviews).` : '';
  const HOURS = client.hours ? `- Working hours: ${client.hours}` : '';
  const NOTES = client.notes ? `Additional: ${client.notes}` : '';
  const USP = client.selectedUSP ? `PRIMARY USP TO EMPHASIZE: ${client.selectedUSP}` : '';
  const INSIGHTS = '';
  const COMPETITIVE = '';
  const BUILD_ORDER = options.lang.split('_').length > 1 ? `\nBUILD ORDER...` : '';

  const _briefLang = options.lang[0] === 'f' ? 'fr' : options.lang[0] === 'a' ? 'ar' : 'en';
  const _tierKey = options.variant in TIER_BRIEFS[_briefLang] ? options.variant : 'conservative';
  const _brief = TIER_BRIEFS[_briefLang][_tierKey];

  const TIER = `${_brief.title}

${_brief.brief
    .replace(/\[NAME\]/g, client.name || '[NAME]')
    .replace(/\[PROFESSION\]/g, client.prof || '[PROFESSION]')
    .replace(/\[CITY\]/g, client.city || '[CITY]')}`;

  const landing = `You are a senior web designer specializing in ${vert && vert.roleLine ? vert.roleLine : 'medical landing pages'}. Build a complete page:

CLIENT DATA:
- Name: ${client.name}
- Profession: ${client.prof}
- City: ${client.city}
- Address: ${client.address}
- Phone/WhatsApp: ${client.phone}
- Website: ${client.website_url || 'none'}
${HOURS}
${PROOF}

LOCATION DATA (use exactly):
- Google Maps link: ${client.rawUrl || '(none)'}
- Coordinates: ${client.lat && client.lng ? client.lat + ',' + client.lng : '(derive from address)'}
- Map embed src: https://maps.google.com/maps?q=${client.lat && client.lng ? client.lat + ',' + client.lng : encodeURIComponent(client.address)}&z=15&output=embed
- Directions link: https://www.google.com/maps/dir/?api=1&destination=${client.lat && client.lng ? client.lat + ',' + client.lng : encodeURIComponent(client.address)}

PAGE LANGUAGE: ${LANG_FULL}
CONTEXT: ${WEB} ${IDENT} ${NOTES}
PRIMARY CTA: ${CTA}.
VISUAL TONE: ${TONE}.${USP ? '\n' + USP : ''}

QUALITY TIER — CREATIVE DIRECTION:
${TIER}

MANDATORY PAGE FEATURES (apply to every version):
1. Booking form: real-time client-side validation (non-empty name, valid phone format) with visual error states on inputs; persist entered data in localStorage and restore it after refresh; clear on successful send.
2. Contact: a fixed "Call now" button in the mobile menu (one-tap tel: link) in addition to the WhatsApp CTA; and a "Leave a Google Review" button wired to a single clearly-named constant (GOOGLE_REVIEW_URL) holding the client's Google Maps link, easy for the owner to replace.
3. Theme & type: working light/dark mode toggle that remembers the user's choice (system preference as default); Arabic sections in Cairo or IBM Plex Sans Arabic with consistent RTL rendering.
4. Final self-check before delivering: responsive layout, accessibility (contrast, focus states, aria labels), and nothing existing broken.

TECHNICAL: Mobile-first, fast, local SEO for "${client.prof} ${client.city}", WCAG contrast. Services to feature (suggest): ${servicesHint}. Embed a LIVE Google Map using the embed src above (keyless iframe), with a prominent 'Get Directions' button linking to the directions link — do NOT use a placeholder map.
OUTPUT: single self-contained HTML/CSS/JS file.${BUILD_ORDER}`;

  return landing;
}

const P = buildPrompts();
const checked = {
  roleLine: P.includes('specializing in car rental landing pages'),
  whatsappCustomerName: P.includes('including the service name and customer name'),
  servicesExact: P.includes('citadines, SUV & famille, luxe, longue durée, avec chauffeur, livraison aéroport 24/7'),
  noClinic: !/\bclinic\b/i.test(P),
  noPatient: !/\bpatient\b/i.test(P),
  noMedical: !/\bmedical\b/i.test(P)
};
console.log('CHECKS:', JSON.stringify(checked, null, 2));
console.log('\n===== LANDING PROMPT =====\n');
console.log(P);
