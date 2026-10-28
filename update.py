#!/usr/bin/env python3
"""Download the latest figures and write data/<country>.json for the website.

Run it with:   python scripts/update.py          (all countries)
               python scripts/update.py nz       (just one)

If one figure fails (RBNZ changes a file, a download is blocked...) the others still
update, the old value of the failed one is kept, and the script exits with an error so
GitHub emails you.
"""
import datetime as dt
import importlib
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from lib import build_entry  # noqa: E402

ROOT = HERE.parent
DATA = Path(os.environ.get("DATA_DIR") or ROOT / "data")


def write_country(path: Path, country_id: str, name: str, entries: list[dict]) -> None:
    head = {
        "country": country_id,
        "name": name,
        "generatedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    body = ",\n".join(json.dumps(e, ensure_ascii=False, separators=(",", ":")) for e in entries)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(head, ensure_ascii=False)[:-1] + ',"indicators":[\n' + body + "\n]}\n",
        encoding="utf-8",
    )


def main(argv: list[str]) -> int:
    wanted = set(argv[1:])
    names = sorted(
        p.stem for p in (HERE / "countries").glob("*.py") if not p.name.startswith("_")
    )
    failures = 0
    for name in names:
        if wanted and name not in wanted:
            continue
        mod = importlib.import_module(f"countries.{name}")
        out = DATA / f"{mod.ID}.json"
        previous = {}
        if out.exists():
            previous = {i["id"]: i for i in json.loads(out.read_text("utf-8"))["indicators"]}
        print(f"== {mod.NAME}")
        entries = []
        for meta in mod.INDICATORS:
            try:
                entry = build_entry(meta, meta["load"]())
                print(f"  ok      {meta['id']:<13} {entry['value']} (to {entry['asOf']})")
            except Exception as e:  # keep going: one broken source shouldn't block the rest
                failures += 1
                entry = previous.get(meta["id"])
                kept = "keeping the previous value" if entry else "nothing to keep"
                print(f"  FAILED  {meta['id']:<13} {e}\n          ({kept})")
            if entry:
                entries.append(entry)
        if entries:
            write_country(out, mod.ID, mod.NAME, entries)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
