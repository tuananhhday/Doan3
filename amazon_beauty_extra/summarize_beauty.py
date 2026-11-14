"""Tong hop ket qua Amazon Beauty thanh bang cho bao cao. Chi doc file ket qua, khong train.

Chay: python summarize_beauty.py --results <thu_muc_ket_qua> --prepared <thu_muc_du_lieu> [--trials 12]
Ra:   amazon_summary.json, amazon_scores.csv trong thu muc ket qua.
"""
import argparse
import csv
import json
from pathlib import Path

import numpy as np

MODELS = ("GRU4Rec", "NARM", "SASRec")
METRICS = ["HR@10", "HR@20", "MRR@20", "NDCG@20"]
GROUPS = ["All-seen", "Warm", "Long-tail"]
SHARED = {"GRU4Rec": "GRU4Rec-t06", "NARM": "NARM-t01", "SASRec": "SASRec-t11"}


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def rank_metrics(ranks):
    r = np.asarray(ranks, dtype=np.float64)
    return {"HR@10": (r <= 10).astype(float), "HR@20": (r <= 20).astype(float),
            "MRR@20": np.where(r <= 20, 1.0 / r, 0.0), "NDCG@20": np.where(r <= 20, 1.0 / np.log2(r + 1.0), 0.0)}


def group_metrics(ranks, counts):
    vals = rank_metrics(ranks)
    cnt = np.asarray(counts)
    masks = {"All-seen": np.ones(len(cnt), bool), "Warm": cnt > 10, "Long-tail": cnt <= 10}
    return {g: {"n": int(m.sum()), **{k: float(v[m].mean()) for k, v in vals.items()}} for g, m in masks.items()}


def paired_bootstrap(diff, n_boot=2000, chunk=100, seed=42):
    rng = np.random.default_rng(seed)
    means = []
    for start in range(0, n_boot, chunk):
        idx = rng.integers(0, len(diff), size=(min(chunk, n_boot - start), len(diff)))
        means.append(diff[idx].mean(axis=1))
    low, high = np.percentile(np.concatenate(means), [2.5, 97.5])
    return {"diff": float(diff.mean()), "ci_low": float(low), "ci_high": float(high),
            "ci_excludes_zero": bool(low > 0 or high < 0)}


def order(values):
    return " > ".join(sorted(values, key=lambda m: -values[m]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True)
    ap.add_argument("--prepared", required=True)
    ap.add_argument("--trials", type=int, default=12)
    args = ap.parse_args()
    res = Path(args.results)

    defaults = {m: load(res / f"default-{m}-s42.json") for m in MODELS}
    winners = {m: load(res / f"{m}-winner__test.json") for m in MODELS}
    trials = {m: sorted((load(res / f"{m}-t{i:02d}.json") for i in range(1, args.trials + 1)),
                        key=lambda r: r["trial_index"]) for m in MODELS}
    fingerprints = {r["fingerprint"] for r in [*defaults.values(), *winners.values(), *sum(trials.values(), [])]}
    assert len(fingerprints) == 1, "Cac lan chay khong cung mot phien ban du lieu"

    summary = {"trials_per_model": args.trials, "fingerprint": fingerprints.pop(), "models": {}, "same_parameter": {},
               "ranking": {}, "bootstrap": {}}
    csv_rows = []
    for m in MODELS:
        d, w, ts = defaults[m], winners[m], trials[m]
        valid = [t["valid"]["All-seen"]["MRR@20"] for t in ts]
        best_of_k = [max(valid[:k]) for k in range(1, len(valid) + 1)]
        summary["models"][m] = {
            "winner": w["name"], "winner_overrides": w["overrides"],
            "default_valid_mrr20": d["valid"]["All-seen"]["MRR@20"], "winner_valid_mrr20": w["valid"]["All-seen"]["MRR@20"],
            "default_test": d["test"], "winner_test": w["test"],
            "gain_pct": {g: {k: (w["test"][g][k] / d["test"][g][k] - 1) * 100 for k in METRICS} for g in GROUPS},
            "default_run": {k: d[k] for k in ("best_epoch", "epochs_completed", "stop_reason", "train_seconds", "n_params")},
            "best_of_k": best_of_k,
            "trials_beating_default": int(sum(v > d["valid"]["All-seen"]["MRR@20"] for v in valid)),
            "valid_range": [min(valid), max(valid)],
            "train_minutes_trials": sum(t["train_seconds"] for t in ts) / 60,
            "epoch_limit_trials": sum(t["stop_reason"] == "epoch_limit" for t in ts),
        }
        for g in GROUPS:
            for variant, block in (("Default", d["test"]), ("Tuned", w["test"])):
                csv_rows.append({"Model": m, "Variant": variant, "Group": g, "N": block[g]["n"],
                                 **{k: block[g][k] for k in METRICS}})

    for m in MODELS:
        t = next(r for r in trials[m] if r["name"] == SHARED[m])
        summary["same_parameter"][m] = {"trial": t["name"], "valid": t["valid"]["All-seen"], "best_epoch": t["best_epoch"],
                                        "epochs_completed": t["epochs_completed"], "stop_reason": t["stop_reason"]}

    for g in GROUPS:
        for k in METRICS:
            a = {m: defaults[m]["test"][g][k] for m in MODELS}
            b = {m: winners[m]["test"][g][k] for m in MODELS}
            summary["ranking"][f"{g}|{k}"] = {"default": order(a), "tuned": order(b), "changed": order(a) != order(b)}

    mrr_d = {m: rank_metrics(defaults[m]["test_rows"]["rank"])["MRR@20"] for m in MODELS}
    mrr_w = {m: rank_metrics(winners[m]["test_rows"]["rank"])["MRR@20"] for m in MODELS}
    for m in MODELS:
        assert defaults[m]["test_rows"]["target"] == winners[m]["test_rows"]["target"], "Thu tu mau test khac nhau"
        summary["bootstrap"][f"{m}: tuned - default"] = paired_bootstrap(mrr_w[m] - mrr_d[m])
    for a, b in (("SASRec", "NARM"), ("NARM", "GRU4Rec"), ("SASRec", "GRU4Rec")):
        summary["bootstrap"][f"{a} - {b} (default)"] = paired_bootstrap(mrr_d[a] - mrr_d[b])
        summary["bootstrap"][f"{a} - {b} (tuned)"] = paired_bootstrap(mrr_w[a] - mrr_w[b])

    # Pop: goi y san pham pho bien nhat trong train, hoa thi ma nho hon dung truoc
    counts = load(Path(args.prepared) / "beauty_5core" / "train_item_counts.json")
    ordered = sorted(counts, key=lambda i: (-counts[i], i))
    pos = {item: i + 1 for i, item in enumerate(ordered)}
    rows = defaults["SASRec"]["test_rows"]
    summary["pop_test"] = group_metrics([pos[str(t)] for t in rows["target"]], rows["train_count"])

    sens = res / "sensitivity_file_order"
    if all((sens / f"default-{m}-s42.json").exists() for m in MODELS):
        summary["sensitivity_file_order"] = {}
        for m in MODELS:
            s = load(sens / f"default-{m}-s42.json")
            summary["sensitivity_file_order"][m] = {
                "test_file_order": s["test"]["All-seen"], "test_shuffled": defaults[m]["test"]["All-seen"],
                "best_epoch": s["best_epoch"], "epochs_completed": s["epochs_completed"]}

    (res / "amazon_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    with open(res / "amazon_scores.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(csv_rows[0]))
        writer.writeheader()
        writer.writerows(csv_rows)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
