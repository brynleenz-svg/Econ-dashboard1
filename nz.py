"""New Zealand: what to show and where the numbers come from.

To add a country (say Australia), copy this file to au.py, change ID / NAME,
point each indicator at the right source, and add the country to data/countries.json.
The updater finds every file in this folder automatically.

Where the NZ data comes from
- NZ dollar and Official Cash Rate: Reserve Bank of New Zealand (RBNZ) tables B1 and B2.
- CPI and unemployment: Stats NZ figures, reproduced by RBNZ in tables M1 and M9. We use
  RBNZ's copies because Stats NZ file names change with every release (they contain the
  quarter), whereas RBNZ keeps one table per series.
"""
import datetime as dt
import random

from lib import month_end, series_from_xlsx, warn

ID = "nz"
NAME = "New Zealand"

RBNZ = "https://www.rbnz.govt.nz"
FILES = RBNZ + "/-/media/project/sites/rbnz/files/statistics/series"

# Exact addresses (checked against RBNZ's site in Oct 2026).
B1_DAILY = {"url": FILES + "/b/b1/hb1-daily.xlsx"}
B2_DAILY = {"url": FILES + "/b/b2/hb2-daily-close.xlsx"}
# For M1 and M9 the script finds the link on RBNZ's page. If RBNZ renames files, this
# still works as long as the file name contains "hm1" / "hm9" (or the /m1/ /m9/ folder).
M1_PRICES = {
    "discover": {
        "page": RBNZ + "/statistics/series/economic-indicators/prices",
        "pick": r"hm1|/m1/",
        "avoid": r"1920|1987",
    },
    "fixture": "hm1.xlsx",
}
M9_LABOUR = {
    "discover": {
        "page": RBNZ + "/statistics/series/economic-indicators/labour-market",
        "pick": r"hm9|/m9/",
    },
    "fixture": "hm9.xlsx",
}

CPI_INDEX = dict(include=[r"consumers?.price.index"], exclude=r"q/q|y/y|%|factor|tradable|trim|median")


def load_usd():
    return series_from_xlsx(
        B1_DAILY,
        include=[r"united states dollar|us dollar|nzd/usd|\busd\b"],
        exclude=r"twi|trade.weighted",
    )


def load_ocr():
    return series_from_xlsx(
        B2_DAILY, include=[r"official cash rate|\bocr\b"], exclude=r"overnight|deposit|repo"
    )


def load_cpi_index():
    return series_from_xlsx(M1_PRICES, **CPI_INDEX)


def load_inflation():
    try:
        return series_from_xlsx(
            M1_PRICES,
            include=[r"consumers?.price.index", r"y/y|annual|12.?month"],
            exclude=r"factor|tradable|trim|median",
        )
    except LookupError:
        warn("no annual-change column in M1; working it out from the CPI index instead")
        idx = series_from_xlsx(M1_PRICES, **CPI_INDEX)
        return [(d, (v / idx[i - 4][1] - 1) * 100) for i, (d, v) in enumerate(idx) if i >= 4]


def load_unemployment():
    return series_from_xlsx(
        M9_LABOUR, include=[r"unemployment rate"], exclude=r"youth|m[aā]ori|pacific|y/y"
    )


# Each indicator = one card on the page.
#   range: sanity check. If the newest value falls outside, the update fails loudly
#          instead of publishing a wrong number.
#   change: how the small "up/down" line under the number is worked out.
INDICATORS = [
    {
        "id": "nzd_usd",
        "label": "NZ dollar (NZD/USD)",
        "prefix": "US$",
        "decimals": 4,
        "period": "day",
        "range": (0.2, 1.5),
        "max_age_days": 10,
        "history": {"n": 260},
        "change": {"type": "pct", "back": 5, "label": "over 5 trading days"},
        "blurb": "US dollars per NZ$1, the 2pm WM/Refinitiv fix. Matters if you import, export or pay overseas suppliers.",
        "source_name": "RBNZ (B1)",
        "source_url": RBNZ + "/statistics/series/exchange-and-interest-rates/exchange-rates-and-the-trade-weighted-index",
        "load": load_usd,
    },
    {
        "id": "ocr",
        "label": "Official Cash Rate (OCR)",
        "suffix": "%",
        "decimals": 2,
        "period": "day",
        "shape": "step",
        "range": (0, 15),
        "max_age_days": 10,
        "history": {"weekly": True, "n": 160},
        "change": {"type": "last_move"},
        "blurb": "The RBNZ's policy interest rate. It feeds through to business loans, mortgages and deposit rates.",
        "source_name": "RBNZ (B2)",
        "source_url": RBNZ + "/statistics/series/exchange-and-interest-rates/wholesale-interest-rates",
        "load": load_ocr,
    },
    {
        "id": "cpi",
        "label": "Consumers Price Index (CPI)",
        "decimals": 0,
        "period": "quarter",
        "range": (900, 3000),
        "max_age_days": 130,
        "history": {"n": 24},
        "change": {"type": "pct", "back": 1, "label": "on previous quarter"},
        "blurb": "Price level of a fixed basket of household goods and services (June 2006 quarter = 1000). Published quarterly.",
        "source_name": "Stats NZ, via RBNZ (M1)",
        "source_url": RBNZ + "/statistics/series/economic-indicators/prices",
        "load": load_cpi_index,
    },
    {
        "id": "inflation",
        "label": "Annual inflation",
        "suffix": "%",
        "decimals": 1,
        "period": "quarter",
        "range": (-5, 25),
        "max_age_days": 130,
        "history": {"n": 24},
        "change": {"type": "pts", "back": 1, "label": "vs previous quarter"},
        "blurb": "Change in the CPI over the last 12 months. The RBNZ aims to keep it between 1% and 3%.",
        "source_name": "Stats NZ, via RBNZ (M1)",
        "source_url": RBNZ + "/statistics/series/economic-indicators/prices",
        "load": load_inflation,
    },
    {
        "id": "unemployment",
        "label": "Unemployment rate",
        "suffix": "%",
        "decimals": 1,
        "period": "quarter",
        "range": (1, 20),
        "max_age_days": 130,
        "history": {"n": 24},
        "change": {"type": "pts", "back": 1, "label": "vs previous quarter"},
        "blurb": "Share of the labour force without a job and looking for one (seasonally adjusted). Published quarterly.",
        "source_name": "Stats NZ, via RBNZ (M9)",
        "source_url": RBNZ + "/statistics/series/economic-indicators/labour-market",
        "load": load_unemployment,
    },
]


def sample_points():
    """Made-up numbers so the page has something to show before the first real update.
    Every card built from these is labelled SAMPLE on the page."""
    rnd = random.Random(7)
    today = dt.date.today()

    days, d = [], today
    while len(days) < 800:
        if d.weekday() < 5:
            days.append(d)
        d -= dt.timedelta(days=1)
    days.reverse()

    usd, v = [], 0.57
    for day in days[-300:]:
        v = min(0.66, max(0.52, v + rnd.uniform(-0.004, 0.004)))
        usd.append((day, v))

    # (days ago the rate started to apply, rate): made-up history
    periods = [(0, 3.00), (90, 3.25), (270, 3.75), (450, 4.50), (800, 5.25)]
    ocr = []
    for day in days:
        ago = (today - day).days
        ocr.append((day, max((s, r) for s, r in periods if s <= ago)[1]))

    quarters = sorted(
        month_end(dt.date(yy, mm, 1))
        for yy in range(today.year - 10, today.year + 1)
        for mm in (3, 6, 9, 12)
        if month_end(dt.date(yy, mm, 1)) <= today - dt.timedelta(days=25)
    )[-28:]
    idx, cpi = 1100.0, []
    for q in quarters:
        idx *= 1 + rnd.uniform(0.003, 0.012)
        cpi.append((q, idx))
    infl = [(q, (cpi[i][1] / cpi[i - 4][1] - 1) * 100) for i, (q, _) in enumerate(cpi) if i >= 4]
    unemp, u = [], 4.6
    for q in quarters:
        u = min(6.2, max(3.8, u + rnd.uniform(-0.2, 0.25)))
        unemp.append((q, u))
    return {
        "nzd_usd": usd,
        "ocr": ocr,
        "cpi": cpi[4:],
        "inflation": infl,
        "unemployment": unemp[4:],
    }
