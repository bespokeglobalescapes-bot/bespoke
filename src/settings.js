'use strict';
const { q } = require('./db');

const U = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

// Every editable setting, grouped as it appears in Admin → Settings.
const FIELDS = [
  // General
  { key: 'site_name', group: 'general', label: 'Business name', def: 'Bespoke Global Escapes' },
  { key: 'site_tagline', group: 'general', label: 'Tagline (footer and browser tab title)', def: 'Tailored holidays, extraordinary journeys' },
  { key: 'logo', group: 'general', label: 'Logo image', type: 'image', def: '', help: 'Optional. Replaces the built-in Bespoke Global Escapes logo (icon plus name) in the header and footer. Use a wide PNG with a transparent background that reads on both dark and white backgrounds. Leave empty to keep the built-in logo.' },
  { key: 'seo_description', group: 'general', label: 'Search engine description', type: 'textarea', def: 'Tailor-made holidays, beach escapes, safaris and city breaks from Bespoke Global Escapes. Request your trip online and our team will confirm availability.' },
  { key: 'footer_about', group: 'general', label: 'Footer description', type: 'textarea', def: 'Your travel partner for tailor-made journeys around the world.' },
  { key: 'company_info', group: 'general', label: 'Company details (footer small print)', type: 'textarea', def: '', help: 'For example company number, registered address, ATOL or ABTA numbers.' },

  // Contact
  { key: 'contact_phone', group: 'contact', label: 'Phone', def: '07848 448852' },
  { key: 'contact_email', group: 'contact', label: 'Email', type: 'email', def: 'admin@bespokeglobalescapes.co.uk' },
  { key: 'contact_whatsapp', group: 'contact', label: 'WhatsApp number (international format, e.g. 447848448852)', def: '' },
  { key: 'contact_address', group: 'contact', label: 'Address', type: 'textarea', def: '' },
  { key: 'contact_hours', group: 'contact', label: 'Opening hours', def: '' },
  { key: 'social_facebook', group: 'contact', label: 'Facebook URL', type: 'url', def: '' },
  { key: 'social_instagram', group: 'contact', label: 'Instagram URL', type: 'url', def: '' },
  { key: 'social_tiktok', group: 'contact', label: 'TikTok URL', type: 'url', def: '' },
  { key: 'social_youtube', group: 'contact', label: 'YouTube URL', type: 'url', def: '' },
  { key: 'social_x', group: 'contact', label: 'X (Twitter) URL', type: 'url', def: '' },

  // Homepage
  { key: 'hero_title', group: 'home', label: 'Hero heading', def: 'Travel farther,' },
  { key: 'hero_script', group: 'home', label: 'Hero heading, handwritten line', def: 'Live better' },
  { key: 'hero_subtitle', group: 'home', label: 'Hero text', type: 'textarea', def: 'Tailor-made holidays to beautiful places, from overwater villas in the Maldives to safaris across the Serengeti.' },
  { key: 'hero_image', group: 'home', label: 'Hero background image', type: 'image', def: U('photo-1506953823976-52e1fdc0149a', 2200) },
  { key: 'hero_video_url', group: 'home', label: 'Promo video (YouTube or Vimeo link)', type: 'url', def: '', help: 'Shows the "Watch video" buttons. Leave empty to hide them.' },
  { key: 'rating_text', group: 'home', label: 'Hero rating line', def: '', help: 'For example "4.9/5 from 320 Trustpilot reviews". Only use real figures. Leave empty to hide.' },
  { key: 'popular_title', group: 'home', label: 'Hero slider heading', def: 'Popular choices', help: 'The slider shows every package with "Popular choice" ticked (Packages → edit → Promotion).' },
  { key: 'popular_interval', group: 'home', label: 'Hero slider: seconds per slide', type: 'number', def: '6', help: 'Set 0 to turn automatic sliding off. Visitors can always use the arrows, dots or swipe.' },
  { key: 'why_title', group: 'home', label: '"Why travel with us" heading', def: 'We make your journey amazing' },
  { key: 'why_1_title', group: 'home', label: 'Reason 1 title', def: 'Tailor-made trips' },
  { key: 'why_1_text', group: 'home', label: 'Reason 1 text', def: 'Every itinerary shaped around you' },
  { key: 'why_2_title', group: 'home', label: 'Reason 2 title', def: 'Handpicked hotels' },
  { key: 'why_2_text', group: 'home', label: 'Reason 2 text', def: 'Comfortable stays for a perfect trip' },
  { key: 'why_3_title', group: 'home', label: 'Reason 3 title', def: 'Real people to help' },
  { key: 'why_3_text', group: 'home', label: 'Reason 3 text', def: 'Talk to us before, during and after' },
  { key: 'why_4_title', group: 'home', label: 'Reason 4 title', def: 'Secure booking' },
  { key: 'why_4_text', group: 'home', label: 'Reason 4 text', def: 'Your details handled with care' },
  { key: 'why_5_title', group: 'home', label: 'Reason 5 title', def: 'Clear pricing' },
  { key: 'why_5_text', group: 'home', label: 'Reason 5 text', def: 'No hidden fees on your quote' },
  { key: 'promo_title', group: 'home', label: 'Video banner heading', def: 'Your next adventure' },
  { key: 'promo_script', group: 'home', label: 'Video banner handwritten line', def: 'starts here!' },
  { key: 'promo_points', group: 'home', label: 'Video banner points (one per line)', type: 'textarea', def: 'Handpicked destinations\nClear, honest prices\nMemories for a lifetime' },
  { key: 'promo_image', group: 'home', label: 'Video banner image', type: 'image', def: U('photo-1520277872024-58b40679ddb4', 2000) },
  { key: 'stat_1_value', group: 'home', label: 'Stat 1 number', def: '', help: 'Shown beside reviews, e.g. "2,500+". Leave a number empty to hide that stat.' },
  { key: 'stat_1_label', group: 'home', label: 'Stat 1 label', def: 'Happy travellers' },
  { key: 'stat_2_value', group: 'home', label: 'Stat 2 number', def: '' },
  { key: 'stat_2_label', group: 'home', label: 'Stat 2 label', def: 'Destinations' },
  { key: 'stat_3_value', group: 'home', label: 'Stat 3 number', def: '' },
  { key: 'stat_3_label', group: 'home', label: 'Stat 3 label', def: 'Satisfaction rate' },
  { key: 'faq_title', group: 'home', label: 'FAQ section heading', def: 'Frequently asked questions' },
  { key: 'faq_text', group: 'home', label: 'FAQ section text', type: 'textarea', def: 'Everything you need to know before you book. Can’t find your answer? Our team is happy to help.' },
  { key: 'newsletter_title', group: 'home', label: 'Newsletter heading', def: 'Subscribe to our newsletter' },
  { key: 'newsletter_text', group: 'home', label: 'Newsletter text', def: 'Get exclusive deals, travel tips and inspiration.' },

  // Booking
  { key: 'currency_symbol', group: 'booking', label: 'Currency symbol', def: '£' },
  { key: 'currency_code', group: 'booking', label: 'Currency code', def: 'GBP' },
  { key: 'deposit_percent', group: 'booking', label: 'Deposit (% of total)', type: 'number', def: '20', help: 'Shown to travellers as the amount due to secure a confirmed booking. Set 0 to hide.' },
  { key: 'child_price_percent', group: 'booking', label: 'Child price (% of adult price)', type: 'number', def: '75', help: 'Used when a package has no specific child price.' },
  { key: 'booking_note', group: 'booking', label: 'Note shown beside the booking form', type: 'textarea', def: 'Sending a booking request is free. We check availability with our partners and contact you to confirm your trip and arrange payment.' },
  { key: 'booking_next_steps', group: 'booking', label: 'Next steps on the confirmation page (one per line)', type: 'textarea', def: 'We check availability for your dates.\nWe call or email you to confirm the details and final price.\nYou pay the deposit to secure your booking.\nWe send your full travel documents before departure.' },
  { key: 'notify_email', group: 'booking', label: 'Send new booking and enquiry alerts to', type: 'email', def: 'admin@bespokeglobalescapes.co.uk' },
  { key: 'booking_prefix', group: 'booking', label: 'Booking reference prefix', def: 'BGE' },
];

const DEFAULTS = Object.fromEntries(FIELDS.map((f) => [f.key, f.def]));
let cache = null;

function all() {
  if (cache) return cache;
  const rows = q.all("SELECT key, value FROM settings WHERE key <> 'app_secret'");
  const s = { ...DEFAULTS };
  for (const r of rows) s[r.key] = r.value;
  cache = s;
  return s;
}

function save(values) {
  q.tx(() => {
    for (const [k, v] of Object.entries(values)) {
      if (k === 'app_secret') continue;
      q.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', k, String(v ?? ''));
    }
  });
  cache = null;
}

const GROUPS = [
  { id: 'general', label: 'General' },
  { id: 'contact', label: 'Contact & social' },
  { id: 'home', label: 'Homepage' },
  { id: 'booking', label: 'Booking' },
];

module.exports = { all, save, FIELDS, GROUPS, DEFAULTS, U };
