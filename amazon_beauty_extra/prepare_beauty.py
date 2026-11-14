"""Chuan bi Amazon Beauty 5-core cho RecBole (thi nghiem BO SUNG, ngoai pham vi de T10).

Chay:  python -I prepare_beauty.py <reviews_Beauty_5.json.gz> <thu_muc_ra> [--ties random|file]

- Amazon chi ghi thoi gian theo ngay, va file goc sap theo ma san pham. Neu giu thu tu file (--ties file),
  moi cap cung ngay deu co ma tang dan, mo hinh co the hoc meo nay thay vi hanh vi that.
  Mac dinh --ties random: xao thu tu trong cung ngay voi seed co dinh.
- Chi lay reviewerID, asin, unixReviewTime. Bo van ban, diem, anh.
- reviewerID chi dung de gom chuoi, sau do doi thanh so thu tu; khong tao dac trung nguoi dung.
- Chia leave-one-out (chuan cua cac bai bao tren Amazon): cuoi = test, ke cuoi = valid, con lai = train.
- Tu dien item dong bang tu train. Target la lo: bo mau. Item la trong prefix: bo khoi prefix.
- Prefix dai toi da 50 (giong Diginetica).
"""
import argparse
import collections
import gzip
import hashlib
import json
import random
import sys
from pathlib import Path

SOURCE_URL = "https://snap.stanford.edu/data/amazon/productGraph/categoryFiles/reviews_Beauty_5.json.gz"
EXPECTED_SHA256 = "e5925ec99023f1dc9c7d3dff7ef34cfeacd40d1b981b5525e1e4ba9c8abc18fe"
EXPECTED = {"users": 22363, "items": 12101, "interactions": 198502}  # so lieu chuan cua Beauty 5-core
DATASET = "beauty_5core"
MAX_LEN = 50
WARM_ABOVE = 10
TIE_SEED = 42
HEADER = "session_id:token\titem_id_list:token_seq\titem_id:token\n"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def make_samples(sid, prefix_items, target, vocab, stats):
    """Mot mau valid/test: bo item la khoi prefix, bo mau neu target la hoac prefix rong."""
    if target not in vocab:
        stats["unseen_target"] += 1
        return None
    known = [i for i in prefix_items if i in vocab]
    if len(known) < len(prefix_items):
        stats["prefixes_with_oov"] += 1
    if not known:
        stats["empty_known_prefix"] += 1
        return None
    if len(known) > MAX_LEN:
        stats["truncated_prefixes"] += 1
    return f"{sid}\t{' '.join(known[-MAX_LEN:])}\t{target}\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("raw")
    ap.add_argument("out")
    ap.add_argument("--ties", choices=["random", "file"], default="random")
    args = ap.parse_args()
    rng = random.Random(TIE_SEED)
    raw, out = Path(args.raw), Path(args.out)

    got = sha256(raw)
    if got != EXPECTED_SHA256:
        sys.exit(f"SHA-256 khac ban da chot: {got}")

    by_user = collections.defaultdict(list)
    n_rows = 0
    items = set()
    with gzip.open(raw, "rt", encoding="utf-8") as f:
        for pos, line in enumerate(f):
            r = json.loads(line)
            tie_key = rng.random() if args.ties == "random" else pos
            by_user[r["reviewerID"]].append((int(r["unixReviewTime"]), tie_key, r["asin"]))
            items.add(r["asin"])
            n_rows += 1

    raw_stats = {"users": len(by_user), "items": len(items), "interactions": n_rows}
    if raw_stats != EXPECTED:
        sys.exit(f"Thong ke khac so chuan: {raw_stats} != {EXPECTED}")

    seqs = []
    ties = ties_ascending = 0
    for uid in sorted(by_user):
        ev = sorted(by_user[uid])
        for a, b in zip(ev, ev[1:]):
            if a[0] == b[0]:
                ties += 1
                ties_ascending += a[2] < b[2]
        seqs.append([e[2] for e in ev])
    del by_user  # khong giu reviewerID sau buoc nay

    counts = collections.Counter()
    for s in seqs:
        counts.update(s[:-2])
    vocab = set(counts)

    data_dir = out / DATASET
    data_dir.mkdir(parents=True, exist_ok=True)
    lines = {"train": [], "valid": [], "test": []}
    stats = {k: collections.Counter() for k in lines}
    for sid, s in enumerate(seqs, start=1):
        tr = s[:-2]
        for t in range(1, len(tr)):
            if t > MAX_LEN:
                stats["train"]["truncated_prefixes"] += 1
            lines["train"].append(f"{sid}\t{' '.join(tr[max(0, t - MAX_LEN):t])}\t{tr[t]}\n")
        for split, target_pos in (("valid", -2), ("test", -1)):
            row = make_samples(sid, s[:target_pos], s[target_pos], vocab, stats[split])
            if row:
                lines[split].append(row)

    report = {"source_url": SOURCE_URL, "sha256": got, "raw": raw_stats, "same_day_adjacent_pairs": ties,
              "same_day_pairs_ascending_item_id": ties_ascending, "tie_policy": args.ties, "tie_seed": TIE_SEED,
              "vocabulary_items": len(vocab), "split": "leave-one-out", "max_prefix_length": MAX_LEN,
              "count_definition": "tuong tac trong phan train cua moi chuoi, truoc khi tao prefix",
              "warm_definition": f"so tuong tac train cua target > {WARM_ABOVE}", "splits": {}}
    hashes = []
    for split, rows in lines.items():
        path = data_dir / f"{DATASET}.{split}.inter"
        path.write_text(HEADER + "".join(rows), encoding="utf-8", newline="\n")
        digest = sha256(path)
        hashes.append(digest)
        targets = [r.rstrip("\n").split("\t")[2] for r in rows]
        warm = sum(counts[t] > WARM_ABOVE for t in targets)
        report["splits"][split] = {"samples": len(rows), "warm_samples": warm,
                                   "long_tail_samples": len(rows) - warm, "sha256": digest, **stats[split]}
    report["fingerprint"] = hashlib.sha256("".join(hashes).encode()).hexdigest()

    (data_dir / "train_item_counts.json").write_text(json.dumps(dict(counts)), encoding="utf-8")
    (out / "data_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
