# Economic data dashboard (NZ first)

One page per country (`/nz/`, later `/au/`, `/uk/`). Figures live in `data/nz.json`;
a Python script refreshes that file every day; the web page just draws it.

```
index.html              home page listing countries
nz/index.html           the New Zealand page
assets/                 style.css, dashboard.js (charts + PNG download), config.js (YOUR SITE NAME)
data/nz.json            the figures (rewritten by the update script)
data/countries.json     list of countries for the menu
scripts/countries/nz.py what to show for NZ and where it comes from
scripts/update.py       downloads the figures
.github/workflows/      runs update.py every day on GitHub, for free
```

## 1. Test it on your computer
You need Python 3 (python.org). In a terminal, inside this folder:

```
pip install -r requirements.txt
python scripts/make_sample.py      # fake data so you can see the page now
python -m http.server 8000
```
Open http://localhost:8000/nz/ . (Double-clicking index.html will not work; browsers block the data file.)
Stop the server with Ctrl+C.

## 2. Try the real data
```
python scripts/update.py
```
You should see five `ok` lines. If a line says `FAILED`, the message says why (usually RBNZ moved a file or renamed a column;
the fix is a small edit in `scripts/countries/nz.py`). Then reload the page: the SAMPLE labels are gone.
Compare each number with the RBNZ / Stats NZ sites once, by eye.

## 3. Put your name on it
Replace `YourSiteName` and `yoursite.com` everywhere (search the whole folder): `assets/config.js`,
`index.html`, `nz/index.html`, `robots.txt`, `sitemap.xml`. The first two decide what is printed on the downloadable charts.

## 4. Put it online (free)
1. Create a free account at github.com, make a **new public repository**, and upload all these files (the "uploading an existing file" link works; include the hidden `.github` folder).
2. Netlify: app.netlify.com > Add new site > Import from GitHub > pick the repo. Leave build settings empty. You get a free `*.netlify.app` address.
   (GitHub Pages also works: repo Settings > Pages > deploy from branch `main`.)
3. Buy a domain from any registrar, then in Netlify: Domain management > Add a domain, and follow its DNS instructions.
4. In GitHub: Actions tab > "Update data" > Run workflow. Check it goes green. From then on it runs daily, commits new data, and Netlify republishes by itself.

## 5. Add another country later
1. Copy `nz/` to `au/` and change `data-country="nz"` to `"au"` (and the text/title).
2. Copy `scripts/countries/nz.py` to `au.py`; change `ID`, `NAME` and the sources. The updater finds it automatically.
3. In `data/countries.json` set `"live": true` for `au`. Add the page to `sitemap.xml`.

## 6. Weekly email (Mailchimp)
Mailchimp: Audience > Signup forms > **Embedded forms** > copy the code. From it take the form `action="..."` address and the hidden field name
that starts with `b_`. Paste them into the form in `nz/index.html` (where it says `YOUR_MAILCHIMP_FORM_ACTION_URL` and `b_YOUR_HIDDEN_FIELD_NAME`).
Keep the unsubscribe link Mailchimp adds to every email (required by NZ law).

## Things to know
- NZD/USD and the OCR come from RBNZ tables B1 and B2 (exact file addresses). CPI and unemployment come from RBNZ tables M1 and M9, which republish Stats NZ data;
  the script finds those two files by reading RBNZ's page. If RBNZ blocks automated downloads from GitHub's servers, the run will fail with a clear message.
- Quarterly figures (CPI, unemployment) only change a few times a year, so "latest data" dates will often look old. That is normal.
- Each card shows the date of the latest data point, and the page header shows when the site last checked.
- If a number looks wrong, the script refuses values outside a sanity range (set per figure in `nz.py`) rather than publishing them.
