#!/usr/bin/env python3
"""Write made-up data so you can test the website before the real update has ever run.

    python scripts/make_sample.py

Every card built this way shows a SAMPLE label. Running scripts/update.py replaces it.
"""
import importlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from lib import build_entry  # noqa: E402
from update import DATA, write_country  # noqa: E402

for p in sorted((HERE / "countries").glob("*.py")):
    if p.name.startswith("_"):
        continue
    mod = importlib.import_module(f"countries.{p.stem}")
    if not hasattr(mod, "sample_points"):
        continue
    pts = mod.sample_points()
    entries = [build_entry(m, pts[m["id"]], sample=True) for m in mod.INDICATORS]
    write_country(DATA / f"{mod.ID}.json", mod.ID, mod.NAME, entries)
    print(f"wrote sample data for {mod.NAME}")
