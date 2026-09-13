// Extract the key parts from index.html
const client = {
  name: "Dr. Smith Dental Clinic",
  prof: "Dentist",
  city: "Paris",
  address: "123 Rue de Rivoli",
  phone: "+33 1 23 45 67 89",
  rating: "4.8",
  reviews: "127",
  website_url: "https://smith-dental.fr",
  identity: "no",
  hours: "Mon-Fri 9am-6pm",
  notes: "Premium dental clinic specializing in implants",
  selectedUSP: "Same-day implants with 3D planning"
};

const options = {
  lang: "en",
  cta: "whatsapp",
  tone: "luxury",
  variant: "premium"
};

const SERVICES_HINT = {
  dental: "dental cleaning & whitening, implants, orthodontics/braces, veneers, pediatric dentistry, emergency care"
};

function detectProfessionId(text) {
  if (!text) return null;
  if (/dentist|dental|teeth/i.test(text)) return "dental";
  return null;
}

const SERVICES_HINT_OBJ = SERVICES_HINT;
const lockGate = fn => fn;

const TIER_BRIEFS = {
  en: {
    premium: {
      title: "Premium and immersive landing page",
      brief: `Create an exceptional landing page for [NAME], a [PROFESSION] in [CITY] — flagship clinic level.

Priority: visual storytelling, refined details, immersive experience.
Tone: exclusive, editorial, discreet luxury (not flashy).
Structure: cinematic hero + patient journey + signature services + gallery + testimonials + premium FAQ + map + VIP CTA.
Main CTA: one-click WhatsApp booking.

Total freedom: sophisticated palette, editorial typography, subtle animations, micro-interactions. I want a result worthy of a high-end flagship clinic.

ART-DIRECTION: rich deep palette mandatory (black or emerald + gold), one single consistent CTA color everywhere, crafted hero visual (never raw stock photo), high-contrast typography. "Discreet luxury" means sober richness, not paleness.

ART-DIRECTION: light background only (white / pale medical blue), no dark backgrounds, minimal graphics and animations, simple sans-serif.`
    }
  }
};

function buildPrompts() {
  const LANG_FULL = {
    en: 'English — LTR layout, use Inter font'
  }[options.lang];

  const CTA = {
    whatsapp: `WhatsApp booking — real number: ${client.phone}. CRITICAL JS REQUIREMENT: Include a complete, functional <script> tag before </body> that (1) selects the booking form by id or tag, (2) intercepts its submit event with e.preventDefault(), (3) extracts the name, phone, and service fields from the form, (4) builds the message body including the service name and patient name, and (5) opens https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text={encoded_message} in a new tab via window.open(). Use encodeURIComponent for the text parameter. The script must be fully working production code — NO mock alerts, NO placeholder callbacks, NO console.log stubs. If the form has no id, add one (e.g. id="bookingForm").`
  }[options.cta];

  const TONE = {
    trust: 'trusted, calm, clinical',
    luxury: 'luxury, premium',
    friendly: 'friendly, warm',
    modern: 'modern, tech-forward'
  }[options.tone];

  const servicesHint = SERVICES_HINT_OBJ[detectProfessionId((client.prof || '') + ' ' + (client.name || ''))] || 'top 4-6 core services with short benefit-driven blurbs';
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

  const _briefLang = options.lang[0] === 'f' ? 'fr' : options.lang[0] === 'a' ? 'ar' : 'en';
  const _tierKey = options.variant in TIER_BRIEFS[_briefLang] ? options.variant : 'conservative';
  const _brief = TIER_BRIEFS[_briefLang][_tierKey];

  const TIER = `${_brief.title}

${_brief.brief
    .replace(/\[NAME\]/g, client.name || '[NAME]')
    .replace(/\[PROFESSION\]/g, client.prof || '[PROFESSION]')
    .replace(/\[CITY\]/g, client.city || '[CITY]')}`;

  const landing = `You are a senior web designer specializing in medical landing pages. Build a complete page:

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
- Google Maps link: (none)
- Coordinates: (derive from address)
- Map embed src: https://maps.google.com/maps?q=${encodeURIComponent(client.address)}&z=15&output=embed
- Directions link: https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(client.address)}

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
OUTPUT: single self-contained HTML/CSS/JS file.`;

  return landing;
}

console.log(buildPrompts());