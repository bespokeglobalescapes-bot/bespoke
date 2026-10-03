# Bespoke Global Escapes – travel booking website

A complete travel website with an admin dashboard. Travellers browse destinations and packages, search by dates and budget, save favourites and send booking requests. You manage bookings, packages, content and settings from `/admin`.

It has **no third-party packages**: everything runs on Node.js alone, so there is no `npm install` step.

---

## What's included

**Branding**

- Your company logo in the header: the "B" logo icon on the left and "BESPOKE / GLOBAL ESCAPES" on the right. A white version of the icon is used over dark photos and the footer; the original navy version is used on white backgrounds (for example after scrolling). The same logo appears in the admin dashboard and at the top of every email.
- Favicon set made from the logo icon: `favicon.ico`, 16 and 32 px PNGs, an Apple touch icon (home screen on iPhone/iPad) and 192/512 px icons with a web app manifest. The files are in `public/img`.
- To use a different logo later, upload it in Admin → Settings → General → Logo image.


- Main menu: Home · Destinations (dropdown: Maldives, Thailand, USA, Indonesia, UAE, Africa) · Holiday types (dropdown: Twin Centre, Safari, Cruise, Beach, Adults Only, Cheap, Couple, All Inclusive, Honeymoon and Family Holidays) · Special offers · About us · Contact. On phones the dropdowns open as expandable sections in the menu.
- Homepage in the style of your reference: hero with a **Popular choices slider** (every package you tick as a popular choice, with photo, price, arrows, dots, swipe on phones and optional auto-play), search bar (destination, dates, travellers), popular destinations, "why travel with us", "not sure where to go?" recommender, special offers, video banner, reviews, frequently asked questions and newsletter sign-up
- Special offers page: every package marked as an offer, with its saving, offer text, end date and a photo gallery button on each card; filter by destination and holiday type, sort by ending soonest or price. Offers disappear automatically after their end date.
- A page for each destination and each holiday type, plus the full holidays list with filters and sorting
- Package pages with photo gallery, highlights, day-by-day itinerary, what's included and reviews
- **Your hotels** section on each package: every hotel gets its own photo gallery, star rating (half stars allowed), location, nights, room type, board basis, description and facilities. Packages can have as many hotels as needed (for example both stays of a twin centre), shown in order
- **Dates & prices** section: the next 12 months with the price per adult for each, unavailable months greyed out and the cheapest months highlighted. Clicking a month picks a departure date in it, and the booking form prices the trip for that month (the server checks the same prices)
- Booking confirmation page with reference number, printable summary and next steps
- Optional traveller accounts ("My trips"), password reset, and "Manage my booking" lookup for guests
- FAQ section on the homepage (first six questions, with a help box) and a full FAQs page; each package also has its own "Questions about this trip" section. FAQ pages include search-engine FAQ markup
- Saved trips (heart icon), contact form, booking guide, terms and privacy pages
- WhatsApp chat button (when a number is set), mobile-friendly throughout, sitemap and search-engine tags

**For you (admin dashboard at `/admin`)**

- Dashboard: requests waiting, confirmed sales, departures in the next 30 days, 6-month chart, latest bookings, launch checklist
- Bookings: filter, search, update status and payment, adjust totals, internal notes, email the traveller automatically on status change, add phone bookings, export to CSV
- Packages: add, edit, duplicate, delete; a standard price plus a price for every month (or mark a month as not available), with the lowest available price shown as the "from" price; "was" prices;
  hotels (add, reorder or remove hotels, each with photos, stars and details); tick the holiday types each package belongs to; mark it as a special offer with offer text and an end date; itinerary builder; photo upload and ordering; tick "Popular choice" on as many packages as you like to show them in the homepage hero slider (heading and auto-play speed are in Settings → Homepage); draft or published
- Menus: choose which destinations appear in the Destinations menu ("Show in the Destinations menu" on each destination) and which holiday types appear in the Holiday types menu; the sort order sets the menu order
- FAQs: add, edit, hide, reorder and delete the homepage FAQs; each package's FAQs are edited inside that package (add, reorder, remove questions)
- Destinations, holiday types (with their own page text and photo), reviews, enquiries, newsletter subscribers (CSV export), traveller accounts
- Pages: edit About, Booking guide, Terms and Privacy, or add new pages
- Settings: business name and logo, contact details and social links, every homepage text and image, currency, deposit %, child price %, booking notes, email alerts, admin users and passwords

**Emails** (once email is set up): booking received (traveller), new booking alert (you), status updates (traveller), cancellation requests and enquiries (you), password resets.

---

## Run it on your computer

1. Install **Node.js 22.13 or newer** from https://nodejs.org (the "LTS" download).
2. Unzip this folder, open a terminal in it and run:

   ```
   node server.js
   ```

3. Open http://localhost:3000 for the website and http://localhost:3000/admin for the dashboard.
4. On the first visit to `/admin` you create your admin account.

Stop the site with `Ctrl + C`.

---

## Put it online

The site needs a host that runs Node.js 22+ and keeps files between restarts (for the database and uploaded photos). Three common options:

### Option A: Render, Railway or Fly.io (easiest)

1. Upload this folder to a private GitHub repository.
2. Create a new **Web Service** from the repository.
   - Build command: *(leave empty)*
   - Start command: `node server.js`
3. Add a **persistent disk** (Render: "Disks"; Railway: "Volume") mounted at `/data`.
4. Add environment variables: `DATA_DIR=/data`, `NODE_ENV=production`, `BASE_URL=https://your-domain`, and the email settings below.
5. Connect your domain in the host's dashboard.

A `Dockerfile` is included if your host prefers containers.

### Option B: Your own server (VPS)

```
# Ubuntu example
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
# copy the folder to /var/www/bge, then:
cd /var/www/bge && cp .env.example .env   # edit it
sudo npm install -g pm2 && pm2 start server.js --name bge && pm2 save && pm2 startup
```

Put Nginx or Caddy in front for HTTPS (Caddy does certificates automatically: `reverse_proxy localhost:3000`).

### Option C: cPanel hosting

If your cPanel has "Setup Node.js App" with Node 22 or newer, create an app pointing at this folder with `server.js` as the startup file.

> **Important:** visit `/admin` straight after the site goes live and create your account, or set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before the first start. Until an admin exists, anyone who visits `/admin` first could create one.

---

## Settings file (.env)

Copy `.env.example` to `.env` and fill in what you need. On hosting platforms, add the same values as environment variables instead. Restart the site after changes.

### Email setup

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@bespokeglobalescapes.co.uk
SMTP_PASS=your-app-password
MAIL_FROM=admin@bespokeglobalescapes.co.uk
```

- **Gmail / Google Workspace:** turn on 2-step verification, then create an app password at https://myaccount.google.com/apppasswords.
- **Microsoft 365:** `smtp.office365.com`, port `587`. SMTP AUTH must be enabled for the mailbox.
- **Your web host's mailbox:** use the SMTP details it gives you (port 465 also works).

Then go to **Admin → Settings → Email** and send a test email. Alerts go to the address in **Settings → Booking**.

Without email the site still works: bookings and enquiries appear in the dashboard, but nobody is emailed.

---

## Before you launch

The dashboard's **launch checklist** tracks these:

- **Packages and prices** – the 13 starter packages and prices are examples. Edit or delete each one, and add your own offers under Packages → Add package (tick "Show in Special offers").
- **Terms & privacy** – these are short templates. Replace them with your own wording (ideally checked by a professional), including any ATOL/ABTA details.
- **Reviews and figures** – only add genuine reviews. The hero rating line and homepage statistics stay hidden until you enter real numbers in Settings → Homepage.
- **Photos** – starter photos load from Unsplash (free to use under the Unsplash licence). You can keep them or upload your own from each package and destination.
- **Contact details** – address, opening hours, WhatsApp and social links in Settings → Contact.

---

## How booking works

1. A traveller picks a package, date and number of travellers and sends a **booking request**. No card details are taken.
2. They get a reference (e.g. `BGE-7K3P9Q`), a confirmation page and an email. You get an alert.
3. You check availability, contact them and arrange payment as you do today.
4. In **Admin → Bookings** you set the status (Confirmed, Cancelled, Completed) and payment (Deposit paid, Paid in full). The traveller is emailed when the status changes, if you leave the option ticked.

Travellers can view their booking from the email link, from **Manage my booking** (reference + email), or from **My trips** if they have an account.

---

## Updating from the first version

The starter content changed (new menu destinations, holiday types and sample packages). If you ran the earlier version and have nothing to keep, delete the `data` folder before starting the site to load the new starter content. Otherwise the site keeps your data and adds the holiday types; set up the menu destinations under Admin → Destinations.

## Backups

Everything you add lives in the `data` folder (or wherever `DATA_DIR` points):

- `site.db` – the database (bookings, packages, settings, accounts)
- `uploads/` – photos you've uploaded

Copy that folder somewhere safe regularly. To move hosts, copy the folder across.

---

## Project layout

```
server.js            Starts the website
src/config.js        Reads .env settings
src/db.js            Database tables (built-in SQLite)
src/seed.js          Starter destinations, packages and pages
src/settings.js      All admin-editable settings and their defaults
src/models.js        Database queries for packages, destinations, reviews
src/auth.js          Passwords, sign-in sessions, form protection
src/mail.js          Email sending (SMTP)
src/emails.js        Email wording
src/routes/          Website, account and admin pages
src/views/           Page templates
public/              Stylesheets, scripts, logo and favicon images
```

Security built in: hashed passwords, protected forms (CSRF), rate limits on sign-in and forms, spam honeypots, image-only uploads checked by file content, and signed links for booking pages.
