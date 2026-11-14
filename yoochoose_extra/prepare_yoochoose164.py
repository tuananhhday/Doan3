"""Chuan bi Yoochoose 1/64 cho RecBole. Thi nghiem bo sung, de T10 Muc 1.5 cho phep Yoochoose.

Chay: python -I prepare_yoochoose164.py <thu_muc_co_train.txt_test.txt> <thu_muc_ra>

- Hai file la pickle tu mirror cong khai. Doc bang Unpickler khoa toan bo global: chi tao duoc
  list va so, nen file khong the thuc thi ma.
- Du lieu da duoc xu ly san: (danh sach prefix, danh sach dap an). Thong ke khop bai DGTN:
  375.043 mau train, 55.405 mau test, 17.319 san pham.
- Valid: 10% mau cuoi cua train theo thu tu file, cat dung ranh gioi phien.
- Tu dien dong bang tu phan train con lai. Dap an la: bo mau. San pham la trong prefix: bo khoi prefix.
"""
import argparse
import collections
import hashlib
import io
import json
import pickle
import sys
from pathlib import Path

DATASET = "yoochoose164"
MAX_LEN = 50
WARM_ABOVE = 10
VALID_SHARE = 0.10
EXPECTED_SHA256 = {"train.txt": "6be222b9adfcf27d4409ff82dc066405f22b7f80f65eff320877855bc1454cf4",
                   "test.txt": "38d4dbf63efbb6e9f6990d200fa7045e7205d0bd0cebed5075ff5e320faa14bf"}
EXPECTED_COUNTS = {"train.txt": 375043, "test.txt": 55405}
HEADER = "session_id:token\titem_id_list:token_seq\titem_id:token\n"


class NoGlobals(pickle.Unpickler):
    def find_class(self, module, name):
        raise pickle.UnpicklingError(f"Chan global {module}.{name}")


def read_samples(path):
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != EXPECTED_SHA256[path.name]:
        sys.exit(f"SHA-256 cua {path.name} khac ban da chot: {digest}")
    prefixes, targets = NoGlobals(io.BytesIO(raw)).load()
    if len(prefixes) != EXPECTED_COUNTS[path.name] or len(prefixes) != len(targets):
        sys.exit(f"So mau cua {path.name} khac so da chot: {len(prefixes)}")
    return prefixes, targets


def to_sessions(prefixes, targets):
    """Gom mau thanh phien: mau sau noi tiep mau truoc khi prefix = prefix truoc + dap an truoc."""
    sessions, current = [], None
    for prefix, target in zip(prefixes, targets):
        if current is None or prefix != current:
            sessions.append(list(prefix) + [target])
        else:
            sessions[-1].append(target)
        current = list(prefix) + [target]
    return sessions


def split_rows(sessions, sid_start, vocab, stats):
    rows = []
    for offset, session in enumerate(sessions):
        for pos in range(1, len(session)):
            target = session[pos]
            if target not in vocab:
                stats["unseen_target"] += 1
                continue
            known = [i for i in session[:pos] if i in vocab]
            if len(known) < pos:
                stats["prefixes_with_oov"] += 1
            if not known:
                stats["empty_known_prefix"] += 1
                continue
            if len(known) > MAX_LEN:
                stats["truncated_prefixes"] += 1
            rows.append((sid_start + offset, known[-MAX_LEN:], target))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("out")
    args = ap.parse_args()
    source, out = Path(args.source), Path(args.out)

    train_sessions = to_sessions(*read_samples(source / "train.txt"))
    test_sessions = to_sessions(*read_samples(source / "test.txt"))
    samples = [len(s) - 1 for s in train_sessions]
    total = sum(samples)
    kept, cut = 0, len(train_sessions)
    for i, n in enumerate(samples):
        if kept >= total * (1 - VALID_SHARE):
            cut = i
            break
        kept += n
    dev_sessions, valid_sessions = train_sessions[:cut], train_sessions[cut:]

    counts = collections.Counter(i for s in dev_sessions for i in s)
    vocab = set(counts)
    stats = {"train": collections.Counter(), "valid": collections.Counter(), "test": collections.Counter()}
    groups = {"train": (dev_sessions, 1), "valid": (valid_sessions, cut + 1),
              "test": (test_sessions, len(train_sessions) + 1)}

    data_dir = out / DATASET
    data_dir.mkdir(parents=True, exist_ok=True)
    report = {"source": "github.com/RecoHut-Datasets/yoochoose (commit e9c847877f60312e09b59db50ae5acac17bf76e2)",
              "sha256": EXPECTED_SHA256, "source_samples": EXPECTED_COUNTS,
              "published_match": "DGTN: 375.043 train, 55.405 test, 17.319 san pham",
              "note": "Bo loc san pham cua ban xu ly san co the da dung ca du lieu test; khong kiem tra lai duoc tu file nay",
              "max_prefix_length": MAX_LEN, "vocabulary_items": len(vocab), "valid_rule": "10% mau cuoi train, cat theo phien",
              "warm_definition": f"so tuong tac train cua target > {WARM_ABOVE}", "splits": {}}
    hashes = []
    for split, (sessions, start) in groups.items():
        rows = split_rows(sessions, start, vocab, stats[split])
        path = data_dir / f"{DATASET}.{split}.inter"
        text = HEADER + "".join(f"{sid}\t{' '.join(map(str, p))}\t{t}\n" for sid, p, t in rows)
        path.write_text(text, encoding="utf-8", newline="\n")
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        hashes.append(digest)
        warm = sum(counts[t] > WARM_ABOVE for _, _, t in rows)
        report["splits"][split] = {"sessions": len(sessions), "samples": len(rows), "warm_samples": warm,
                                   "long_tail_samples": len(rows) - warm, "sha256": digest, **stats[split]}
    report["fingerprint"] = hashlib.sha256("".join(hashes).encode()).hexdigest()
    (data_dir / "train_item_counts.json").write_text(json.dumps({str(k): v for k, v in counts.items()}), encoding="utf-8")
    (out / "data_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
