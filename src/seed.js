'use strict';
// Starter content so the site looks complete on first run. Every item is
// editable or removable in the admin dashboard. Prices are examples only.
const { q } = require('./db');
const { U } = require('./settings');
const { nowIso } = require('./lib/util');

const DESTINATIONS = [
  // The first six are shown in the website's Destinations menu (in this order).
  { name: 'Maldives', slug: 'maldives', region: 'Indian Ocean', popular: 1, in_menu: 1, image: U('photo-1514282401047-d79a71a590e8', 1200),
    summary: 'Overwater villas, house reefs and powder-white sandbanks.',
    description: 'Scattered across the Indian Ocean in 26 coral atolls, the Maldives is the classic barefoot escape. Most resorts sit on their own private island, so your days are shaped around the lagoon: snorkelling the house reef, sunset dolphin cruises and dinners on the sand.\n\nThe dry season runs from November to April, with calm seas and long sunny days. May to October brings occasional showers, lower prices and excellent manta and whale shark sightings.' },
  { name: 'Thailand', slug: 'thailand', region: 'Southeast Asia', popular: 1, in_menu: 1, image: U('photo-1506665531195-3566af2b4dfa', 1200),
    summary: 'Island hopping, street food and golden temples.',
    description: 'Thailand offers incredible value and variety: bustling Bangkok, the limestone islands of the Andaman Sea, and the temples and night markets of the north.\n\nNovember to April is the best time for the west-coast islands.' },
  { name: 'USA', slug: 'usa', region: 'North America', popular: 1, in_menu: 1, image: U('photo-1518235506717-e1ed3306a89b', 1200),
    summary: 'City breaks, Florida beaches and Caribbean cruises.',
    description: 'From the skyline of New York to the beaches of Miami, the USA packs huge variety into one trip. Combine a city break with time in the sun, or set sail from Florida on a cruise around the Caribbean islands.\n\nSpring and autumn are ideal for New York; Florida is warm all year, with the driest weather from November to April.' },
  { name: 'Indonesia', slug: 'indonesia', region: 'Bali & beyond', popular: 1, in_menu: 1, image: U('photo-1537996194471-e657df975ab4', 1200),
    summary: 'Temples, rice terraces and beaches on Bali and beyond.',
    description: 'Indonesia’s best-loved island, Bali, blends spiritual culture with laid-back beach life. Spend a few days among the rice terraces and temples of Ubud, then move to the coast for sunsets in Seminyak, cliff-top Uluwatu or the calm beaches of Nusa Dua.\n\nApril to October is the dry season and the best time for touring.' },
  { name: 'UAE', slug: 'uae', region: 'Dubai & Abu Dhabi', popular: 1, in_menu: 1, image: U('photo-1546412414-8035e1776c9a', 1200),
    summary: 'Skyline views, desert safaris and year-round sunshine.',
    description: 'Dubai packs record-breaking architecture, golden beaches, world-class shopping and desert adventures into one easy break, just seven hours from London. It works brilliantly for families and as a stopover on the way to the Maldives or the Indian Ocean.\n\nNovember to March is ideal, with warm days and pleasant evenings.' },
  { name: 'Africa', slug: 'africa', region: 'Tanzania & Zanzibar', popular: 1, in_menu: 1, image: U('photo-1516426122078-c23e76319801', 1200),
    summary: 'Classic safaris and spice-island beaches.',
    description: 'Tanzania is home to some of Africa’s greatest wildlife spectacles, from the Great Migration across the Serengeti to the Big Five in the Ngorongoro Crater. Pair a safari with Zanzibar’s white beaches, the UNESCO-listed lanes of Stone Town and the reefs around Mnemba for the perfect bush-and-beach holiday.\n\nJune to October is peak dry season for game viewing; Zanzibar is also lovely from December to February.' },
  // More destinations, listed on the Destinations page but not in the menu.
  { name: 'Bora Bora', slug: 'bora-bora', region: 'French Polynesia', popular: 0, in_menu: 0, image: U('photo-1589197331516-4d84b72ebde3', 1200),
    summary: 'A turquoise lagoon wrapped around a volcanic peak.',
    description: 'Bora Bora is the South Pacific of the imagination: a jagged green peak rising from a lagoon of impossible blues, ringed by palm-covered motus. It is the ultimate honeymoon destination, best paired with a few nights on Moorea or Tahiti.\n\nMay to October is the dry season, with cooler evenings and clear water.' },
  { name: 'Santorini', slug: 'santorini', region: 'Greece', popular: 0, in_menu: 0, image: U('photo-1570077188670-e3a8d69ac5ff', 1200),
    summary: 'Whitewashed villages on the rim of a sunken volcano.',
    description: 'Santorini’s cliff-top villages look out over a flooded caldera, with blue domes, cave hotels and some of the most famous sunsets in Europe. Beyond Oia and Fira you will find black-sand beaches, volcanic vineyards and quiet fishing harbours.\n\nVisit from May to early October; June and September are warm but less crowded.' },
  { name: 'Cancún', slug: 'cancun', region: 'Mexico', popular: 0, in_menu: 0, image: U('photo-1510097467424-192d713fd8b2', 1200),
    summary: 'Caribbean beaches, cenotes and Mayan ruins.',
    description: 'Cancún and the Riviera Maya combine all-inclusive beach resorts with a fascinating hinterland: swim in freshwater cenotes, explore the pyramids of Chichén Itzá and Tulum, and snorkel the world’s second-largest barrier reef.\n\nDecember to April is the driest, sunniest period.' },
];

// Holiday types appear in the Holiday Types menu. A package can belong to several.
const HOLIDAY_TYPES = [
  { key: 'twin', name: 'Twin Centre Holidays', slug: 'twin-centre-holidays', icon: 'twin', image: U('photo-1595184979141-090792f6b578', 1200),
    description: 'Two destinations in one trip.',
    intro: 'Combine two places in one holiday: a city stopover followed by a beach, or a safari followed by an island. We arrange the connecting flights and transfers so the whole trip runs smoothly.' },
  { key: 'safari', name: 'Safari Holidays', slug: 'safari-holidays', icon: 'paw', image: U('photo-1516496798850-70e120364fe4', 1200),
    description: 'Game drives, big cats and the Great Migration.',
    intro: 'Watch lions, elephants and giraffes on game drives with expert guides, stay in comfortable safari lodges, and finish with a few days on the beach if you like.' },
  { key: 'cruise', name: 'Cruise Holidays', slug: 'cruise-holidays', icon: 'ship', image: U('photo-1599640842225-85d111c60e6b', 1200),
    description: 'Sail between ports with everything on board.',
    intro: 'Unpack once and wake up somewhere new. Our cruise holidays include flights and a hotel stay before you sail, so you start the voyage relaxed.' },
  { key: 'beach', name: 'Beach Holidays', slug: 'beach-holidays', icon: 'palm', image: U('photo-1541417904950-b855846fe074', 1200),
    description: 'White sand, warm seas and time to unwind.',
    intro: 'From overwater villas in the Maldives to the spice-island beaches of Zanzibar, these are holidays built around the sea and the sun.' },
  { key: 'adults', name: 'Adults Only Holidays', slug: 'adults-only-holidays', icon: 'martini', image: U('photo-1646668072507-b2215b873c70', 1200),
    description: 'Peaceful resorts for grown-ups only.',
    intro: 'Quiet pools, unhurried dinners and spa time without the splash of the kids’ club. Every hotel in this collection welcomes adults only.' },
  { key: 'cheap', name: 'Cheap Holidays', slug: 'cheap-holidays', icon: 'tag', image: U('photo-1602088113235-229c19758e9f', 1200),
    description: 'Great-value trips that keep costs down.',
    intro: 'Our best-value holidays, with flights and hotels included and no hidden fees on your quote.' },
  { key: 'couple', name: 'Couple Holidays', slug: 'couple-holidays', icon: 'couple', image: U('photo-1580502304784-8985b7eb7260', 1200),
    description: 'Trips designed for two.',
    intro: 'Sunset dinners, boutique hotels and experiences to share, for anniversaries, special birthdays or simply time together.' },
  { key: 'allinc', name: 'All Inclusive Holidays', slug: 'all-inclusive-holidays', icon: 'meals', image: U('photo-1586861635167-e5223aadc9fe', 1200),
    description: 'Meals and drinks covered, so you can relax.',
    intro: 'Know the cost before you go. These holidays include your meals and selected drinks, so you can leave your wallet in the room.' },
  { key: 'honeymoon', name: 'Honeymoon Holidays', slug: 'honeymoon-holidays', icon: 'gem', image: U('photo-1590523277543-a94d2e4eb00b', 1200),
    description: 'Romantic escapes to start married life.',
    intro: 'Overwater villas, private dinners on the beach and once-in-a-lifetime experiences. Tell us your wedding date and we will tailor the trip around it.' },
  { key: 'family', name: 'Family Holidays', slug: 'family-holidays', icon: 'family', image: U('photo-1589083130544-0d6a2926e519', 1200),
    description: 'Fun, safe trips for every age.',
    intro: 'Family rooms, kids’ clubs, child prices and activities the whole family will enjoy, from desert safaris to theme-park cities.' },
];

const it = (...days) => JSON.stringify(days.map(([label, title, text]) => ({ label, title, text })));

const PACKAGES = [
  {
    title: 'Maldives Premium Getaway', slug: 'maldives-premium-getaway', dest: 'maldives', types: ['beach', 'allinc', 'honeymoon', 'couple'], style: 'couple',
    days: 7, nights: 6, price: 1899, old_price: null, featured: 1, is_deal: 0, badge: 'Popular choice', board: 'All inclusive',
    includes: 'Flights + Villa + All inclusive',
    summary: 'Six nights in a beach villa on a private island resort, with seaplane transfers and all-inclusive dining.',
    overview: 'Wake up to the sound of the lagoon in your own beach villa, with the house reef a few steps from your terrace. This all-inclusive escape takes care of everything, from scenic seaplane transfers to dinners on the sand, so all you need to decide is snorkel or sun lounger.',
    highlights: 'Scenic seaplane transfers over the atolls\nBeach villa with private terrace\nAll meals and selected drinks included\nSunset dolphin cruise\nSnorkelling equipment for the house reef',
    itinerary: it(['Day 1', 'Fly to Malé', 'Overnight flight from London Heathrow to Malé.'],
      ['Day 2', 'Seaplane to your island', 'Arrive in Malé and board your seaplane for a 40-minute flight over the atolls. Check in to your beach villa and spend the afternoon by the lagoon.'],
      ['Days 3–6', 'Island life', 'Days at leisure to snorkel the house reef, relax at the spa or try diving. Enjoy a sunset dolphin cruise included in your package.'],
      ['Day 7', 'Fly home', 'Seaplane back to Malé for your return flight to London.']),
    inclusions: 'Return economy flights from London\nReturn seaplane transfers\n6 nights in a Beach Villa\nAll-inclusive meals and selected drinks\nSunset dolphin cruise\n24/7 support during your trip',
    exclusions: 'Travel insurance\nSpa treatments and diving\nPremium drinks\nGreen tax payable locally',
    images: [U('photo-1514282401047-d79a71a590e8'), U('photo-1574226780565-388f10f8121e'), U('photo-1586861635167-e5223aadc9fe'), U('photo-1595184979141-090792f6b578')],
  },
  {
    title: 'Maldives Paradise', slug: 'maldives-paradise', dest: 'maldives', types: ['beach', 'couple', 'honeymoon'], style: 'couple',
    days: 5, nights: 4, price: 1299, old_price: 1599, featured: 0, is_deal: 1, offer_label: 'Save £300 per person', offer_days: 40, badge: '', board: 'Half board',
    includes: 'Flights + Hotel + Meals',
    summary: 'A short and sweet Maldives escape with speedboat transfers and half-board dining.',
    overview: 'Perfect for a quick winter-sun fix, this four-night stay puts you on a lush island with a wide sandy beach and a vibrant house reef. Speedboat transfers mean more time on the island.',
    highlights: 'Quick speedboat transfers from Malé\nWater villa upgrade available\nHalf board: breakfast and dinner\nFree snorkelling equipment',
    itinerary: it(['Day 1', 'Depart London', 'Overnight flight to Malé.'],
      ['Day 2', 'Arrive in paradise', 'Speedboat transfer to your resort and the rest of the day at leisure.'],
      ['Days 3–4', 'At leisure', 'Snorkel, swim and relax. Optional excursions include sandbank picnics and fishing trips.'],
      ['Day 5', 'Return home', 'Transfer back to Malé for your flight home.']),
    inclusions: 'Return flights from London\nReturn speedboat transfers\n4 nights in a Beach Bungalow\nBreakfast and dinner daily',
    exclusions: 'Travel insurance\nLunch and drinks\nExcursions\nGreen tax payable locally',
    images: [U('photo-1590523277543-a94d2e4eb00b'), U('photo-1578922746465-3a80a228f223'), U('photo-1620065487644-1080510335f5')],
  },
  {
    title: 'Bali Adventure', slug: 'bali-adventure', dest: 'indonesia', types: ['beach', 'couple'], style: 'solo',
    days: 8, nights: 7, price: 1149, old_price: 1399, featured: 0, is_deal: 1, offer_label: 'Save £250 per person', badge: '', board: 'Breakfast',
    includes: 'Flights + Hotel + Tours',
    summary: 'Ubud’s temples and rice terraces followed by beach days in the south.',
    overview: 'Split your time between the cultural heart of Bali and its beautiful southern coast. Guided days take you to sacred temples, waterfalls and the famous Tegallalang rice terraces before you unwind by the beach.',
    highlights: 'Tegallalang rice terraces\nUlun Danu Bratan and Tanah Lot temples\nSunrise trek option on Mount Batur\nBeach stay in Seminyak',
    itinerary: it(['Day 1', 'Fly to Bali', 'Overnight flight to Denpasar.'],
      ['Day 2', 'Arrive in Ubud', 'Private transfer to your boutique hotel in Ubud.'],
      ['Days 3–4', 'Temples & terraces', 'Guided touring of temples, rice terraces and waterfalls, with an optional Mount Batur sunrise trek.'],
      ['Days 5–7', 'Seminyak beach', 'Transfer to the coast for beach days, spa time and sunset at Tanah Lot.'],
      ['Day 8', 'Fly home', 'Transfer to the airport for your flight home.']),
    inclusions: 'Return flights from London\n7 nights in boutique hotels\nDaily breakfast\n2 days of guided touring\nPrivate transfers',
    exclusions: 'Travel insurance\nBali tourist levy\nOptional excursions',
    images: [U('photo-1537996194471-e657df975ab4'), U('photo-1518548419970-58e3b4079ab2'), U('photo-1604999333679-b86d54738315')],
  },
  {
    title: 'Dubai Experience', slug: 'dubai-experience', dest: 'uae', types: ['family', 'cheap', 'beach'], style: 'family',
    days: 5, nights: 4, price: 799, old_price: 999, featured: 0, is_deal: 1, offer_label: 'Kids stay free in selected weeks', badge: '', board: 'Breakfast',
    includes: 'Flights + Hotel + Tours',
    summary: 'Skyline views, a desert safari and beach time in one easy break.',
    overview: 'Dubai is ideal for a short, sunny family break. Ride to the top of the Burj Khalifa, dune-bash on a desert safari with a barbecue dinner, and spend lazy afternoons on the beach at Jumeirah.',
    highlights: 'Burj Khalifa observation deck\nEvening desert safari with dinner\nDubai Marina dhow cruise\nBeachfront hotel',
    itinerary: it(['Day 1', 'Arrive in Dubai', 'Fly from London and transfer to your beachfront hotel.'],
      ['Day 2', 'City highlights', 'Half-day city tour finishing at the Burj Khalifa.'],
      ['Day 3', 'Desert safari', 'Morning at leisure, then an afternoon desert safari with barbecue dinner.'],
      ['Day 4', 'Beach day', 'Relax on the beach and enjoy an evening dhow cruise in the Marina.'],
      ['Day 5', 'Fly home', 'Transfer to the airport for your return flight.']),
    inclusions: 'Return flights from London\n4 nights at a 4★ beachfront hotel\nDaily breakfast\nCity tour, desert safari and dhow cruise\nAirport transfers',
    exclusions: 'Travel insurance\nTourism dirham fee payable locally',
    images: [U('photo-1546412414-8035e1776c9a'), U('photo-1607414851776-f2fcc379fb48'), U('photo-1651467606797-e1c660cf3fda')],
  },
  {
    title: 'Santorini Sunset Escape', slug: 'santorini-sunset-escape', dest: 'santorini', types: ['couple', 'honeymoon', 'cheap'], style: 'couple',
    days: 6, nights: 5, price: 949, old_price: null, featured: 0, is_deal: 0, badge: '', board: 'Breakfast',
    includes: 'Flights + Cave hotel + Breakfast',
    summary: 'A caldera-view cave hotel, a catamaran cruise and Oia’s famous sunset.',
    overview: 'Stay in a traditional cave hotel carved into the caldera cliffs, with a private terrace for sunset. A sunset catamaran cruise with dinner on board is included.',
    highlights: 'Caldera-view cave suite\nSunset catamaran cruise with dinner\nWine tasting at a volcanic vineyard\nWalk from Fira to Oia',
    itinerary: it(['Day 1', 'Fly to Santorini', 'Direct flight and private transfer to your cave hotel.'],
      ['Day 2', 'Fira & Oia', 'Explore the clifftop villages at your own pace.'],
      ['Day 3', 'Catamaran cruise', 'Sail to the hot springs and Red Beach, with dinner on board at sunset.'],
      ['Days 4–5', 'At leisure', 'Beaches, wineries and lazy terrace afternoons.'],
      ['Day 6', 'Fly home', 'Transfer to the airport.']),
    inclusions: 'Return flights from London\n5 nights in a caldera-view cave suite\nDaily breakfast\nSunset catamaran cruise\nPrivate transfers',
    exclusions: 'Travel insurance\nLocal accommodation tax',
    images: [U('photo-1570077188670-e3a8d69ac5ff'), U('photo-1613395877344-13d4a8e0d49e'), U('photo-1533105079780-92b9be482077'), U('photo-1580502304784-8985b7eb7260')],
  },
  {
    title: 'Bora Bora Overwater Retreat', slug: 'bora-bora-overwater-retreat', dest: 'bora-bora', types: ['honeymoon', 'couple', 'beach', 'adults'], style: 'couple',
    days: 10, nights: 8, price: 3999, old_price: null, featured: 0, is_deal: 0, badge: 'Honeymoon favourite', board: 'Breakfast',
    includes: 'Flights + Overwater villa + Breakfast',
    summary: 'Two nights on Tahiti followed by six nights in an overwater villa facing Mount Otemanu.',
    overview: 'The once-in-a-lifetime honeymoon: an overwater villa with glass floor panels and a ladder straight into the lagoon, views of Mount Otemanu and a lagoon tour to swim with rays and reef sharks.',
    highlights: 'Overwater villa with lagoon access\nLagoon tour with rays and reef sharks\nTahiti stopover\nRomantic beach dinner',
    itinerary: it(['Days 1–2', 'Fly to Tahiti', 'Fly via Los Angeles to Papeete and rest at your hotel.'],
      ['Day 3', 'Tahiti', 'Day at leisure on Tahiti.'],
      ['Day 4', 'Bora Bora', 'Short flight to Bora Bora and boat transfer to your overwater villa.'],
      ['Days 5–9', 'Lagoon life', 'Lagoon tour, beach dinner and days at leisure.'],
      ['Day 10', 'Journey home', 'Fly back to London via Tahiti.']),
    inclusions: 'Return flights from London\n2 nights in Tahiti\n6 nights in an overwater villa\nDaily breakfast\nLagoon tour and romantic dinner\nAll transfers',
    exclusions: 'Travel insurance\nLunches and dinners (except where stated)',
    images: [U('photo-1589197331516-4d84b72ebde3'), U('photo-1580725869538-9b164c27c44f'), U('photo-1601604451607-332d3203d425')],
  },
  {
    title: 'Cancún Beach & Mayan Ruins', slug: 'cancun-beach-mayan-ruins', dest: 'cancun', types: ['family', 'allinc', 'beach'], style: 'family',
    days: 8, nights: 7, price: 1249, old_price: null, featured: 0, is_deal: 0, badge: '', board: 'All inclusive',
    includes: 'Flights + Resort + All inclusive',
    summary: 'An all-inclusive Caribbean beach resort with a day trip to Chichén Itzá.',
    overview: 'Seven nights at a family-friendly all-inclusive resort on Cancún’s hotel strip, with kids’ clubs, pools and a white-sand beach. A guided day trip to Chichén Itzá and a cenote swim is included.',
    highlights: 'All-inclusive beachfront resort\nChichén Itzá and cenote day trip\nKids’ club and family pools\nOptional Isla Mujeres catamaran trip',
    itinerary: it(['Day 1', 'Fly to Cancún', 'Direct flight from London and transfer to your resort.'],
      ['Days 2–3', 'Beach days', 'Relax at the resort.'],
      ['Day 4', 'Chichén Itzá', 'Guided tour of the pyramid and a swim in a cenote.'],
      ['Days 5–7', 'At leisure', 'More beach time, or optional trips to Tulum and Isla Mujeres.'],
      ['Day 8', 'Fly home', 'Transfer to the airport for your overnight flight.']),
    inclusions: 'Return flights from London\n7 nights all inclusive\nChichén Itzá day trip\nAirport transfers',
    exclusions: 'Travel insurance\nMexico tourist tax',
    images: [U('photo-1510097467424-192d713fd8b2'), U('photo-1568402102990-bc541580b59f'), U('photo-1602088113235-229c19758e9f')],
  },
  {
    title: 'Tanzania Safari & Zanzibar Beach', slug: 'tanzania-safari-zanzibar-beach', dest: 'africa', types: ['twin', 'safari', 'beach', 'allinc', 'couple', 'honeymoon'], style: 'couple',
    days: 13, nights: 11, price: 1999, old_price: null, featured: 0, is_deal: 0, badge: 'Bush & beach', board: 'Full board + All inclusive',
    includes: 'Flights + Safari + All-inclusive beach',
    summary: 'A four-night classic safari followed by seven all-inclusive nights on Zanzibar.',
    overview: 'The perfect bush-and-beach combination. Start with a classic safari through Tarangire, the Serengeti and the Ngorongoro Crater, staying in safari lodges with game drives in a 4x4. Then fly to Zanzibar for seven all-inclusive nights at a boutique beach resort.',
    highlights: 'Classic 4-night safari with game drives\nSerengeti and Ngorongoro Crater\nSeven all-inclusive nights on Zanzibar\nInternal flight from Kilimanjaro to Zanzibar',
    itinerary: it(['Day 1', 'Fly to Kilimanjaro', 'Depart London Heathrow on your connecting flight to Kilimanjaro.'],
      ['Day 2', 'Arrive in Tanzania', 'Meet your safari guide and transfer to your lodge.'],
      ['Days 3–5', 'Classic safari', 'Game drives in Tarangire, the Serengeti and the Ngorongoro Crater, full board in safari lodges.'],
      ['Day 6', 'Fly to Zanzibar', 'Transfer to the airport for your flight to Zanzibar and check in to your beach resort.'],
      ['Days 7–12', 'Zanzibar', 'All-inclusive beach days, with optional Stone Town, spice farm and Mnemba snorkelling tours.'],
      ['Day 13', 'Fly home', 'Transfer to Zanzibar airport for your connecting flight to London.']),
    inclusions: 'Return international flights from London\n4 nights safari, full board\nGame drives with a private guide\nPark fees as per itinerary\nFlight from Kilimanjaro to Zanzibar\n7 nights all inclusive on Zanzibar\nAll transfers',
    exclusions: 'Travel insurance\nVisas\nTips for guides\nOptional excursions on Zanzibar',
    images: [U('photo-1516426122078-c23e76319801'), U('photo-1526226128118-9ef71fc2f34b'), U('photo-1575999502951-4ab25b5ca889'), U('photo-1707410436230-d4b2fba910e7')],
  },
  {
    title: 'Thailand Island Hopping', slug: 'thailand-island-hopping', dest: 'thailand', types: ['beach', 'couple'], style: 'solo',
    days: 11, nights: 9, price: 1349, old_price: 1549, featured: 0, is_deal: 1, offer_label: 'Save £200 per person', badge: '', board: 'Breakfast',
    includes: 'Flights + Hotels + Ferries',
    summary: 'Bangkok, Phuket, Phi Phi and Krabi with ferries and transfers arranged.',
    overview: 'Start with the temples and street food of Bangkok, then fly south for an island-hopping route through the Andaman Sea, with ferries, transfers and handpicked beach hotels all arranged.',
    highlights: 'Grand Palace and Wat Pho in Bangkok\nPhi Phi and Maya Bay\nRailay Beach in Krabi\nLongtail boat tour of the Hong islands',
    itinerary: it(['Day 1', 'Fly to Bangkok', 'Overnight flight from London.'],
      ['Days 2–3', 'Bangkok', 'Temples, markets and a river cruise.'],
      ['Days 4–5', 'Phuket', 'Fly to Phuket for beach time.'],
      ['Days 6–7', 'Koh Phi Phi', 'Ferry to Phi Phi and a boat trip to Maya Bay.'],
      ['Days 8–10', 'Krabi', 'Ferry to Krabi, with a longtail tour of the Hong islands.'],
      ['Day 11', 'Fly home', 'Fly from Krabi via Bangkok to London.']),
    inclusions: 'International and domestic flights\n9 nights in 3★ and 4★ hotels\nDaily breakfast\nFerries and transfers\nBangkok city tour',
    exclusions: 'Travel insurance\nNational park fees',
    images: [U('photo-1506665531195-3566af2b4dfa'), U('photo-1504214208698-ea1916a2195a'), U('photo-1483683804023-6ccdb62f86ef')],
  },
  {
    title: 'Dubai & Maldives Twin Centre', slug: 'dubai-maldives-twin-centre', dest: 'uae', types: ['twin', 'beach', 'honeymoon', 'couple', 'allinc'], style: 'couple',
    days: 12, nights: 10, price: 2199, old_price: 2499, featured: 0, is_deal: 1, offer_label: 'Save £300 per person', offer_days: 45, badge: 'Twin centre', board: 'Breakfast + All inclusive',
    includes: 'Flights + Hotels + Transfers',
    summary: 'Three nights in Dubai followed by seven all-inclusive nights in a Maldives beach villa.',
    overview: 'Start with the energy of Dubai: skyline views, souks and a desert safari. Then fly on to the Maldives for seven all-inclusive nights in a beach villa, with time to snorkel, swim and do absolutely nothing.',
    highlights: 'Three nights in a Dubai beach hotel\nDesert safari with barbecue dinner\nSeven all-inclusive nights in the Maldives\nSpeedboat transfers to your island',
    itinerary: it(['Day 1', 'Fly to Dubai', 'Fly from London and transfer to your beachfront hotel.'],
      ['Days 2–3', 'Dubai', 'City highlights, the Burj Khalifa and an evening desert safari.'],
      ['Day 4', 'Fly to the Maldives', 'Short flight to Malé and speedboat transfer to your island resort.'],
      ['Days 5–11', 'Maldives', 'All-inclusive days on the beach and the house reef.'],
      ['Day 12', 'Fly home', 'Return flight to London via Dubai.']),
    inclusions: 'Return flights from London\n3 nights in Dubai with breakfast\n7 nights in the Maldives, all inclusive\nDesert safari\nAll transfers',
    exclusions: 'Travel insurance\nTourism fees payable locally',
    images: [U('photo-1607414851776-f2fcc379fb48'), U('photo-1595184979141-090792f6b578'), U('photo-1546412414-8035e1776c9a'), U('photo-1574226780565-388f10f8121e')],
  },
  {
    title: 'New York & Miami Twin Centre', slug: 'new-york-miami-twin-centre', dest: 'usa', types: ['twin', 'family', 'couple', 'beach'], style: 'family',
    days: 11, nights: 10, price: 1549, old_price: null, featured: 0, is_deal: 0, badge: 'Twin centre', board: 'Room only',
    includes: 'Flights + Hotels + Internal flight',
    summary: 'Four nights in Manhattan followed by six nights on Miami Beach.',
    overview: 'See the sights of New York, from the Brooklyn Bridge to Central Park and Times Square, then fly south to Florida for six nights of sunshine on Miami Beach.',
    highlights: 'Central Manhattan hotel\nNew York sightseeing pass\nInternal flight to Miami\nBeachfront hotel in Miami Beach',
    itinerary: it(['Day 1', 'Fly to New York', 'Fly from London and transfer to your Manhattan hotel.'],
      ['Days 2–4', 'New York', 'Explore with your sightseeing pass: Empire State Building, Statue of Liberty ferry and more.'],
      ['Day 5', 'Fly to Miami', 'Short internal flight and transfer to Miami Beach.'],
      ['Days 6–10', 'Miami Beach', 'Beach days, Art Deco walks and day trips to the Everglades.'],
      ['Day 11', 'Fly home', 'Overnight flight back to London.']),
    inclusions: 'Return flights from London\nInternal flight New York to Miami\n4 nights in New York\n6 nights in Miami Beach\nNew York sightseeing pass',
    exclusions: 'Travel insurance\nESTA visa waiver\nResort fees payable locally',
    images: [U('photo-1518235506717-e1ed3306a89b'), U('photo-1496588152823-86ff7695e68f'), U('photo-1589083130544-0d6a2926e519'), U('photo-1514565131-fce0801e5785')],
  },
  {
    title: 'Caribbean Cruise from Miami', slug: 'caribbean-cruise-from-miami', dest: 'usa', types: ['cruise', 'family', 'couple'], style: 'family',
    days: 10, nights: 9, price: 1449, old_price: null, featured: 0, is_deal: 0, badge: '', board: 'Full board on board',
    includes: 'Flights + Hotel + 7-night cruise',
    summary: 'Two nights in Miami, then a seven-night Eastern Caribbean cruise.',
    overview: 'Fly to Miami for two nights before boarding your ship for a seven-night Eastern Caribbean cruise, calling at sun-soaked islands with time for beaches, snorkelling and shore excursions.',
    highlights: 'Seven-night Eastern Caribbean cruise\nFull board on the ship\nTwo nights in Miami before sailing\nPorts including the Bahamas and St Maarten',
    itinerary: it(['Day 1', 'Fly to Miami', 'Fly from London and transfer to your hotel.'],
      ['Day 2', 'Miami', 'A day to explore Miami Beach and Little Havana.'],
      ['Day 3', 'Set sail', 'Transfer to the port and board your ship.'],
      ['Days 4–9', 'Eastern Caribbean', 'Sea days and island calls with optional excursions.'],
      ['Day 10', 'Fly home', 'Disembark in Miami and fly back to London.']),
    inclusions: 'Return flights from London\n2 nights in Miami\n7-night cruise in an inside cabin\nFull board on board\nTransfers',
    exclusions: 'Travel insurance\nShip gratuities\nDrinks packages and excursions\nESTA visa waiver',
    images: [U('photo-1599640842225-85d111c60e6b'), U('photo-1554254648-2d58a1bc3fd5'), U('photo-1548574505-5e239809ee19'), U('photo-1535498730771-e735b998cd64')],
  },
  {
    title: 'Zanzibar Beach Escape', slug: 'zanzibar-beach-escape', dest: 'africa', types: ['beach', 'adults', 'allinc', 'cheap', 'couple'], style: 'couple',
    days: 9, nights: 7, price: 999, old_price: 1199, featured: 0, is_deal: 1, offer_label: 'Save £200 per person', offer_days: 30, badge: 'Adults only', board: 'All inclusive',
    includes: 'Flights + Resort + All inclusive',
    summary: 'Seven all-inclusive nights at an adults-only beach resort on Zanzibar’s east coast.',
    overview: 'Unwind on Zanzibar’s white-sand east coast at a boutique adults-only resort. Days are for the pool, the beach and the warm Indian Ocean, with optional trips to Stone Town, a spice farm or the reefs around Mnemba.',
    highlights: 'Adults-only boutique resort\nAll meals and selected drinks\nOptional Stone Town and spice tours\nSnorkelling around Mnemba Atoll',
    itinerary: it(['Day 1', 'Fly to Zanzibar', 'Depart London on your connecting flight.'],
      ['Day 2', 'Arrive on Zanzibar', 'Transfer to your adults-only beach resort.'],
      ['Days 3–8', 'At leisure', 'All-inclusive beach days, with optional excursions.'],
      ['Day 9', 'Fly home', 'Transfer to the airport for your flight to London.']),
    inclusions: 'Return flights from London\n7 nights all inclusive\nAirport transfers',
    exclusions: 'Travel insurance\nVisa\nOptional excursions',
    images: [U('photo-1575999502951-4ab25b5ca889'), U('photo-1646668072507-b2215b873c70'), U('photo-1541417904950-b855846fe074'), U('photo-1603477849227-705c424d1d80')],
  },
];

const PAGES = [
  { slug: 'about', title: 'About us', content:
`## Holidays planned around you

Bespoke Global Escapes creates tailor-made holidays to some of the most beautiful places on earth, from overwater villas in the Maldives to safaris in Tanzania.

We start with what you want from your trip, then build it: the right flights, the right hotels and the experiences that make a holiday memorable. Every package on this website can be changed, extended or combined with another destination.

## How we work

- **We listen first.** Tell us your dates, budget and the kind of trip you have in mind.
- **We check everything.** Prices and availability are confirmed with our partners before you pay.
- **We stay in touch.** Our team is a phone call or email away before, during and after your trip.

## Get in touch

Have a question or an idea for a trip? [Contact us](/contact) and we will get back to you.` },
  { slug: 'booking-guide', title: 'Booking guide', content:
`## How booking works

1. **Choose your trip.** Browse packages by destination, experience or price.
2. **Send a booking request.** Pick a date and the number of travellers. You will get a booking reference straight away.
3. **We confirm availability.** Our team checks flights and hotels for your dates and contacts you, usually by phone or email.
4. **Pay your deposit.** Once you are happy with the final price, you pay the deposit to secure your booking.
5. **Get ready to travel.** We send your travel documents before departure.

## Manage your booking

Use [My booking](/booking/lookup) with your reference and email address, or [sign in](/account/login) to see all your trips.` },
  { slug: 'terms', title: 'Terms & conditions', is_template: 1, content:
`## Booking terms

These terms apply to bookings made with Bespoke Global Escapes. Please read them carefully.

**Booking requests.** A booking request sent through this website is not a confirmed booking. Your booking is confirmed only when we have checked availability, you have accepted the final price and we have received your deposit.

**Prices.** Prices shown are per person, based on two adults sharing, and are subject to availability. The final price is confirmed before payment.

**Payment.** A deposit is due to confirm your booking, with the balance due before departure as stated on your confirmation.

**Changes and cancellations.** If you need to change or cancel, contact us as soon as possible. Charges may apply depending on supplier terms and how close to departure the change is made.

**Travel documents.** You are responsible for valid passports, visas and any health requirements.

**Insurance.** We strongly recommend comprehensive travel insurance from the date your booking is confirmed.` },
  { slug: 'privacy', title: 'Privacy policy', is_template: 1, content:
`## How we use your information

Bespoke Global Escapes collects the personal information you give us when you send a booking request, create an account, contact us or subscribe to our newsletter.

**What we collect.** Your name, email address, phone number, travel dates, number of travellers and any notes you add.

**Why we collect it.** To arrange and manage your booking, respond to your enquiries and, if you have subscribed, send you travel offers.

**Who we share it with.** Only with the suppliers needed to arrange your trip, such as airlines and hotels, and service providers who help us run this website.

**How long we keep it.** For as long as needed to provide our services and meet our legal obligations.

**Your rights.** Under UK data protection law you can ask to see, correct or delete your personal information, or unsubscribe from marketing at any time. Contact us to make a request.

**Cookies.** This website uses essential cookies to keep you signed in and protect forms. It does not use advertising cookies.` },
];


// Hotels shown in each package's "Where you'll stay" section (examples; edit in the admin).
const POOL = (id) => U(id, 1400);
const H = (name, location, stars, nights, room, board, description, facilities, images) => ({ name, location, stars, nights, room, board, description, facilities: facilities.join('\n'), images });
const HOTELS = {
  'maldives-premium-getaway': [H('Beach villa resort', 'Noonu Atoll, Maldives', 5, 6, 'Beach Villa with private terrace', 'All inclusive',
    'A private-island resort with a long white beach, a vibrant house reef and villas set just steps from the lagoon. Seaplane transfers take around 40 minutes from Malé.',
    ['House reef', 'Infinity pool', 'Spa', 'Dive centre', '3 restaurants', 'Free Wi-Fi'],
    [POOL('photo-1514282401047-d79a71a590e8'), POOL('photo-1618773928121-c32242e63f39'), POOL('photo-1584132869994-873f9363a562'), POOL('photo-1586861635167-e5223aadc9fe')])],
  'maldives-paradise': [H('Island beach resort', 'South Malé Atoll, Maldives', 4, 4, 'Beach Bungalow', 'Half board',
    'A relaxed island resort 30 minutes by speedboat from Malé, with a wide sandy beach, a lagoon pool and easy snorkelling straight from the shore.',
    ['Lagoon pool', 'Snorkelling', 'Spa', 'Water sports', 'Kids’ club'],
    [POOL('photo-1590523277543-a94d2e4eb00b'), POOL('photo-1611892440504-42a792e24d32'), POOL('photo-1623718649591-311775a30c43')])],
  'dubai-maldives-twin-centre': [
    H('Beachfront hotel', 'Jumeirah Beach, Dubai', 5, 3, 'Sea View Room', 'Breakfast',
      'A five-star beach hotel with views of the Arabian Gulf, a private beach and easy access to the Marina and the Palm.',
      ['Private beach', 'Outdoor pools', 'Spa', 'Kids’ club', 'Gym'],
      [POOL('photo-1546412414-8035e1776c9a'), POOL('photo-1631049307264-da0ec9d70304'), POOL('photo-1742171046853-0961eabdc7d4')]),
    H('Lagoon island resort', 'Baa Atoll, Maldives', 4.5, 7, 'Beach Villa', 'All inclusive',
      'An island resort inside a UNESCO biosphere reserve, known for manta ray sightings, with villas along a soft sandy beach.',
      ['House reef', 'Infinity pool', 'Spa', 'Dive centre', 'Overwater bar'],
      [POOL('photo-1595184979141-090792f6b578'), POOL('photo-1618773928121-c32242e63f39'), POOL('photo-1584132869994-873f9363a562')])],
  'tanzania-safari-zanzibar-beach': [
    H('Safari lodges', 'Tarangire, Serengeti & Ngorongoro', 4, 4, 'Lodge room', 'Full board',
      'Comfortable lodges chosen for their locations close to the best game-viewing areas, with sweeping views over the plains and the Ngorongoro Crater.',
      ['Game drives', 'Swimming pool', 'Sundowner deck', 'Restaurant', 'Laundry'],
      [POOL('photo-1667987566780-3b31fa5485c8'), POOL('photo-1734362815901-24bdeb199da5'), POOL('photo-1516426122078-c23e76319801'), POOL('photo-1607712617949-8c993d290809')]),
    H('Boutique beach resort', 'East coast, Zanzibar', 4, 7, 'Garden Room', 'All inclusive',
      'A boutique resort on Zanzibar’s white-sand east coast, with a pool beside the beach and excursions to Stone Town and Mnemba easily arranged.',
      ['Beachfront', 'Swimming pool', 'Spa', 'Restaurant & bar', 'Free Wi-Fi'],
      [POOL('photo-1575999502951-4ab25b5ca889'), POOL('photo-1611892440504-42a792e24d32'), POOL('photo-1610641818989-c2051b5e2cfd')])],
  'new-york-miami-twin-centre': [
    H('Midtown Manhattan hotel', 'Midtown, New York', 4, 4, 'Standard Queen Room', 'Room only',
      'A stylish hotel a short walk from Times Square, the Empire State Building and Central Park.',
      ['Rooftop bar', 'Gym', '24-hour reception', 'Free Wi-Fi'],
      [POOL('photo-1518235506717-e1ed3306a89b'), POOL('photo-1631049552057-403cdb8f0658'), POOL('photo-1590490360182-c33d57733427')]),
    H('Miami Beach hotel', 'South Beach, Miami', 4, 6, 'Ocean View Room', 'Room only',
      'An Art Deco hotel on Ocean Drive with a pool, beach service and the best of South Beach on the doorstep.',
      ['Beach service', 'Outdoor pool', 'Restaurant', 'Bar', 'Free Wi-Fi'],
      [POOL('photo-1589083130544-0d6a2926e519'), POOL('photo-1582719478250-c89cae4dc85b'), POOL('photo-1549294413-26f195200c16')])],
  'caribbean-cruise-from-miami': [
    H('Downtown Miami hotel', 'Brickell, Miami', 4, 2, 'City View Room', 'Room only',
      'A modern hotel close to the cruise port, ideal for a couple of nights before you sail.',
      ['Rooftop pool', 'Gym', 'Restaurant', 'Free Wi-Fi'],
      [POOL('photo-1535498730771-e735b998cd64'), POOL('photo-1629140727571-9b5c6f6267b4')]),
    H('Caribbean cruise ship', 'Eastern Caribbean', 4, 7, 'Inside Cabin', 'Full board',
      'A modern family-friendly ship with pools, a theatre, kids’ clubs and a choice of restaurants included in your fare.',
      ['Pools & waterslides', 'Theatre shows', 'Kids’ clubs', 'Spa', 'Main dining room'],
      [POOL('photo-1599640842225-85d111c60e6b'), POOL('photo-1548574505-5e239809ee19'), POOL('photo-1554254648-2d58a1bc3fd5')])],
  'zanzibar-beach-escape': [H('Adults-only boutique resort', 'Paje, Zanzibar', 4.5, 7, 'Superior Room', 'All inclusive',
    'An intimate adults-only resort on one of Zanzibar’s finest beaches, with a quiet pool, spa and sunset bar.',
    ['Adults only (18+)', 'Beachfront', 'Swimming pool', 'Spa', 'Sunset bar'],
    [POOL('photo-1646668072507-b2215b873c70'), POOL('photo-1611892440504-42a792e24d32'), POOL('photo-1664876080601-acf03b40c5e3')])],
  'bali-adventure': [
    H('Ubud boutique hotel', 'Ubud, Bali', 4, 3, 'Deluxe Room with jungle view', 'Breakfast',
      'A peaceful hotel overlooking the rice terraces, a short ride from Ubud’s temples and markets.',
      ['Infinity pool', 'Yoga pavilion', 'Spa', 'Restaurant'],
      [POOL('photo-1693934304978-22274e6a3276'), POOL('photo-1611892440504-42a792e24d32')]),
    H('Seminyak beach resort', 'Seminyak, Bali', 4.5, 4, 'Garden Suite', 'Breakfast',
      'A stylish resort steps from Seminyak beach and its sunset bars.',
      ['Beachfront', 'Two pools', 'Spa', 'Beach club'],
      [POOL('photo-1610641818989-c2051b5e2cfd'), POOL('photo-1618773928121-c32242e63f39')])],
  'dubai-experience': [H('Family beach hotel', 'Jumeirah Beach Residence, Dubai', 4, 4, 'Family Room', 'Breakfast',
    'A family-friendly beachfront hotel with a kids’ club and pools, close to the Marina and the beach walk.',
    ['Private beach', 'Kids’ club', 'Pools', 'Restaurants'],
    [POOL('photo-1742171046853-0961eabdc7d4'), POOL('photo-1631049307264-da0ec9d70304')])],
  'santorini-sunset-escape': [H('Caldera cave hotel', 'Imerovigli, Santorini', 4.5, 5, 'Cave Suite with caldera view', 'Breakfast',
    'Traditional cave suites carved into the cliff, each with a private terrace facing the caldera sunset.',
    ['Caldera views', 'Plunge pool', 'Breakfast on your terrace', 'Free Wi-Fi'],
    [POOL('photo-1613395877344-13d4a8e0d49e'), POOL('photo-1582719478250-c89cae4dc85b')])],
  'thailand-island-hopping': [
    H('Riverside hotel', 'Bangkok', 4, 2, 'Deluxe River View Room', 'Breakfast', 'A calm riverside hotel with a free boat shuttle to the Grand Palace and the night markets.', ['River views', 'Outdoor pool', 'Spa', 'Boat shuttle'], [POOL('photo-1631049552057-403cdb8f0658'), POOL('photo-1687834618283-1b9e12de54a7')]),
    H('Beach resort', 'Kata Beach, Phuket', 4, 2, 'Garden View Room', 'Breakfast', 'A friendly resort across the road from Kata Beach, with lagoon pools and a lively evening market nearby.', ['Lagoon pools', 'Beach access', 'Kids’ club', 'Restaurants'], [POOL('photo-1623718649591-311775a30c43'), POOL('photo-1629140727571-9b5c6f6267b4')]),
    H('Beach bungalows', 'Koh Phi Phi', 3.5, 2, 'Garden Bungalow', 'Breakfast', 'Simple, comfortable bungalows set in tropical gardens a few steps from a quiet beach.', ['Beachfront', 'Pool', 'Snorkelling trips', 'Restaurant'], [POOL('photo-1506665531195-3566af2b4dfa'), POOL('photo-1611892440504-42a792e24d32')]),
    H('Cliffside resort', 'Railay, Krabi', 4, 3, 'Deluxe Room', 'Breakfast', 'A resort tucked beneath Railay’s limestone cliffs, reachable only by longtail boat.', ['Infinity pool', 'Beach access', 'Spa', 'Rock climbing nearby'], [POOL('photo-1504214208698-ea1916a2195a'), POOL('photo-1582719478250-c89cae4dc85b')])],
  'bora-bora-overwater-retreat': [
    H('Tahiti lagoon hotel', 'Papeete, Tahiti', 4, 2, 'Lagoon View Room', 'Breakfast', 'A relaxing stopover hotel by the lagoon, close to Papeete airport.', ['Lagoon pool', 'Restaurant', 'Airport shuttle'], [POOL('photo-1580725869538-9b164c27c44f'), POOL('photo-1618773928121-c32242e63f39')]),
    H('Overwater resort', 'Bora Bora', 5, 6, 'Overwater Villa with Mount Otemanu view', 'Breakfast', 'Overwater villas with glass floor panels and ladders straight into the lagoon, facing Mount Otemanu.', ['Overwater villas', 'Infinity pool', 'Spa', 'Lagoon excursions'], [POOL('photo-1589197331516-4d84b72ebde3'), POOL('photo-1601604451607-332d3203d425'), POOL('photo-1584132869994-873f9363a562')])],
  'cancun-beach-mayan-ruins': [H('All-inclusive family resort', 'Hotel Zone, Cancún', 4.5, 7, 'Ocean View Room', 'All inclusive',
    'A large beachfront resort with pools for every age, a kids’ club and a choice of restaurants included.',
    ['Beachfront', 'Kids’ club', '5 pools', '6 restaurants', 'Evening entertainment'],
    [POOL('photo-1510097467424-192d713fd8b2'), POOL('photo-1623718649591-311775a30c43'), POOL('photo-1631049552057-403cdb8f0658')])],
};

// Seasonal prices per person by calendar month (months not listed use the standard price).
const MONTH_PRICES = {
  'maldives-premium-getaway': { 1: { price: 2299 }, 2: { price: 2299 }, 3: { price: 2199 }, 4: { price: 2099 }, 7: { price: 1999 }, 8: { price: 1999 }, 10: { price: 1999 }, 11: { price: 2099 }, 12: { price: 2499 } },
  'maldives-paradise': { 1: { price: 1599 }, 2: { price: 1599 }, 3: { price: 1499 }, 4: { price: 1499 }, 10: { price: 1399 }, 11: { price: 1499 }, 12: { price: 1799 } },
  'tanzania-safari-zanzibar-beach': { 1: { price: 2099 }, 2: { price: 2099 }, 3: { price: 2099 }, 4: { closed: true }, 5: { closed: true }, 7: { price: 2399 }, 8: { price: 2399 }, 9: { price: 2299 }, 12: { price: 2299 } },
  'dubai-experience': { 1: { price: 999 }, 2: { price: 999 }, 3: { price: 949 }, 4: { price: 899 }, 5: { price: 849 }, 9: { price: 849 }, 10: { price: 899 }, 11: { price: 999 }, 12: { price: 1099 } },
  'dubai-maldives-twin-centre': { 12: { price: 2699 }, 1: { price: 2499 }, 2: { price: 2499 }, 3: { price: 2399 } },
  'zanzibar-beach-escape': { 4: { closed: true }, 7: { price: 1149 }, 8: { price: 1149 }, 12: { price: 1199 } },
  'caribbean-cruise-from-miami': { 1: { price: 1549 }, 2: { price: 1549 }, 3: { price: 1599 }, 7: { price: 1649 }, 8: { price: 1649 }, 12: { price: 1749 } },
  'new-york-miami-twin-centre': { 7: { price: 1799 }, 8: { price: 1799 }, 12: { price: 1899 } },
};

function fromPrice(base, mp) {
  const open = [];
  for (let m = 1; m <= 12; m++) { const e = (mp || {})[m] || {}; if (!e.closed) open.push(e.price != null ? e.price : base); }
  return open.length ? Math.min(...open) : base;
}


// Homepage FAQs (also shown on the /faqs page). Edit them in Admin → FAQs.
const HOME_FAQS = [
  ['How do I book a holiday?', 'Choose a package, pick your travel month and departure date, add the number of travellers and send a booking request. It’s free and there’s no obligation. We check availability with our partners and contact you to confirm your trip and the final price.'],
  ['Do I have to pay online?', 'No card details are taken on this website. Once we’ve confirmed availability, we send you the final price and a secure way to pay your deposit. The balance is due before you travel, as shown on your confirmation.'],
  ['Why do prices change by month?', 'Flights and hotels cost more in school holidays and peak seasons. Each package shows the price per adult for every month in its “Dates & prices” section, so you can see the best time to travel before you book.'],
  ['Are prices per person?', 'Yes. Prices are per adult, based on two people sharing a room. Child prices are shown in the booking form, and single travellers can ask us for a solo price.'],
  ['Can you tailor a package for me?', 'Yes. Every holiday can be changed, from flight times and departure airports to extra nights, room upgrades or adding a second destination. Add a note to your booking request or contact us and we’ll build the trip around you.'],
  ['What happens after I send a booking request?', 'You get a booking reference straight away and a copy by email. Our team checks flights and hotels for your dates, then calls or emails you to confirm everything before you pay anything.'],
  ['Do I need travel insurance?', 'Travel insurance isn’t included, but we strongly recommend arranging comprehensive cover as soon as your booking is confirmed.'],
  ['What about passports and visas?', 'You need a passport valid for the length of your stay, and some countries need a visa or travel authorisation. Check the GOV.UK foreign travel advice for each country you visit; we’re happy to point you in the right direction.'],
];

// Package FAQs (shown on each package page). Edit them inside each package in the admin.
const PACKAGE_FAQS = {
  'maldives-premium-getaway': [
    ['Is the seaplane transfer included?', 'Yes. Return seaplane transfers between Malé and the resort are included. They run in daylight, so if you land late you may spend the first night near the airport, which we arrange for you.'],
    ['Can we upgrade to a water villa?', 'Yes, subject to availability. Add a note to your booking request and we’ll quote the upgrade for your dates.'],
    ['What does all inclusive cover?', 'All meals and a selection of drinks at the resort’s main restaurants and bars. Premium drinks, spa treatments and diving are extra.'],
  ],
  'tanzania-safari-zanzibar-beach': [
    ['Why can’t I book in April and May?', 'April and May are the long rains in East Africa. Some lodges close and roads in the parks can be difficult, so we don’t offer this trip in those months.'],
    ['Do I need a visa for Tanzania?', 'Most UK passport holders need a visa for Tanzania, which can be applied for online before travel. Check the GOV.UK advice for the latest requirements.'],
    ['Can I add more nights on Zanzibar?', 'Yes. Let us know how many nights you’d like and we’ll update the price.'],
  ],
  'dubai-maldives-twin-centre': [
    ['Can I change how many nights I spend in each place?', 'Yes. You can lengthen or shorten either stay; we’ll re-price the trip for your dates.'],
    ['Is the flight from Dubai to the Maldives included?', 'Yes. All flights, including the connection from Dubai to Malé, and all transfers are included.'],
  ],
  'caribbean-cruise-from-miami': [
    ['Are gratuities included?', 'Ship gratuities aren’t included. They’re usually added to your onboard account daily; we’ll confirm the current rate when you book.'],
    ['Do I need an ESTA?', 'UK passport holders need an approved ESTA to travel to the USA. Apply online well before departure.'],
  ],
  'zanzibar-beach-escape': [
    ['Is the resort really adults only?', 'Yes. Guests must be 18 or over, which keeps the resort quiet and relaxed.'],
  ],
};

// One-time seeding, remembered in settings so deleting everything later doesn't bring the samples back.
function once(flag, fn) {
  if (q.get('SELECT 1 FROM settings WHERE key = ?', flag)) return;
  fn();
  q.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING', flag, '1');
}
function seedHomeFaqs() {
  once('seeded_faqs', () => {
    if (q.get('SELECT COUNT(*) c FROM faqs').c > 0) return;
    const now = nowIso();
    HOME_FAQS.forEach(([question, answer], i) => q.run('INSERT INTO faqs (question, answer, sort, published, created_at) VALUES (?,?,?,1,?)', question, answer, i, now));
  });
}
function seedHolidayTypes() {
  once('seeded_types', () => seedHolidayTypesNow());
}
function seedHolidayTypesNow() {
  if (q.get('SELECT COUNT(*) c FROM holiday_types').c > 0) return;
  HOLIDAY_TYPES.forEach((t, i) => q.run('INSERT INTO holiday_types (name, slug, icon, description, intro, image, in_menu, sort, active) VALUES (?,?,?,?,?,?,1,?,1)',
    t.name, t.slug, t.icon, t.description, t.intro, t.image, i));
}

// Sample trips shown in the homepage "Popular choices" slider.
const POPULAR = ['maldives-premium-getaway', 'dubai-maldives-twin-centre', 'tanzania-safari-zanzibar-beach', 'thailand-island-hopping', 'bali-adventure', 'new-york-miami-twin-centre'];
function seedPopular() {
  once('seeded_popular', () => {
    q.run(`UPDATE packages SET featured = 1 WHERE is_sample = 1 AND slug IN (${POPULAR.map(() => '?').join(',')})`, ...POPULAR);
  });
}

function seed() {
  const n = q.get('SELECT COUNT(*) c FROM destinations').c;
  if (n > 0) { seedHolidayTypes(); seedHomeFaqs(); seedPopular(); return false; }
  const now = nowIso();
  const today = now.slice(0, 10);
  const inDays = (d) => { const x = new Date(today + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  q.tx(() => {
    DESTINATIONS.forEach((d, i) => q.run('INSERT INTO destinations (name, slug, region, summary, description, image, popular, in_menu, sort, active, created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)',
      d.name, d.slug, d.region, d.summary, d.description, d.image, d.popular, d.in_menu, i, now));
    seedHolidayTypes();
    seedHomeFaqs();
    const destId = (s) => q.get('SELECT id FROM destinations WHERE slug = ?', s)?.id ?? null;
    const typeId = (key) => { const t = HOLIDAY_TYPES.find((x) => x.key === key); return t ? q.get('SELECT id FROM holiday_types WHERE slug = ?', t.slug)?.id : null; };
    PACKAGES.forEach((p, i) => {
      const r = q.run(`INSERT INTO packages (title, slug, destination_id, style, days, nights, price, old_price, child_price,
        includes, board, summary, overview, highlights, itinerary, inclusions, exclusions, images, max_travellers, featured, is_deal, offer_label, offer_ends, month_prices, from_price, hotels, faqs, badge, status, sort, is_sample, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,?,?,?,?,12,?,?,?,?,?,?,?,?,?,'published',?,1,?,?)`,
      p.title, p.slug, destId(p.dest), p.style, p.days, p.nights, p.price, p.old_price, p.includes, p.board, p.summary, p.overview,
      p.highlights, p.itinerary, p.inclusions, p.exclusions, JSON.stringify(p.images), p.featured, p.is_deal, p.offer_label || '', p.offer_days ? inDays(p.offer_days) : '',
      JSON.stringify(MONTH_PRICES[p.slug] || {}), fromPrice(p.price, MONTH_PRICES[p.slug]), JSON.stringify(HOTELS[p.slug] || []), JSON.stringify((PACKAGE_FAQS[p.slug] || []).map(([question, answer]) => ({ question, answer }))), p.badge, i, now, now);
      for (const key of p.types || []) { const tid = typeId(key); if (tid) q.run('INSERT OR IGNORE INTO package_types (package_id, type_id) VALUES (?, ?)', r.lastInsertRowid, tid); }
    });
    seedPopular();
    PAGES.forEach((p) => q.run('INSERT INTO pages (slug, title, content, is_template, updated_at) VALUES (?,?,?,?,?)', p.slug, p.title, p.content, p.is_template || 0, now));
  });
  return true;
}

module.exports = { seed };
