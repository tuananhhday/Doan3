"""Train GRU4Rec, NARM, SASRec tren Amazon Beauty 5-core theo giao thuc cua BTL-T10.

Ham metric, evaluate_full va vong train duoc giu nguyen tu BTL_T10.ipynb (cell 10.2, 10.5, 10.6),
de cach cham giong het thi nghiem Diginetica. 36 cau hinh lay nguyen tu btl_t10_results/t10_v2/jobs.

Cac buoc:
  --stage protocol : chot giao thuc ra file (truoc khi train)
  --stage smoke    : 2 epoch de do toc do, ket qua KHONG duoc dung
  --stage train    : default + cac cau hinh (khong cham test tren cau hinh tim kiem)
  --stage winners  : chon cau hinh thang CHI bang valid MRR@20, cham test dung 1 lan
"""
import argparse
import glob
import hashlib
import json
import platform
import time
from pathlib import Path

import numpy as np

DATASET = "beauty_5core"
MODELS = ("GRU4Rec", "NARM", "SASRec")
METRIC_COLS = ["HR@10", "HR@20", "MRR@20", "NDCG@20"]
MAX_LEN, STOPPING_STEP, MAX_TRAIN_SECONDS, SEED = 50, 5, 5400, 42
MAX_EPOCHS = 100  # 30 o Diginetica. Beauty co it buoc moi epoch hon, ly do ghi trong protocol.json.
SHARED_TRIALS = {"GRU4Rec": "GRU4Rec-t06", "NARM": "NARM-t01", "SASRec": "SASRec-t11"}

DEFAULTS = {
    "GRU4Rec": {"embedding_size": 64, "hidden_size": 128, "num_layers": 1, "dropout_prob": 0.3,
                "learning_rate": 0.001, "loss_type": "CE"},
    "NARM": {"embedding_size": 64, "hidden_size": 128, "n_layers": 1, "dropout_probs": [0.25, 0.5],
             "learning_rate": 0.001, "loss_type": "CE"},
    "SASRec": {"n_layers": 2, "n_heads": 2, "hidden_size": 64, "inner_size": 256, "hidden_dropout_prob": 0.5,
               "attn_dropout_prob": 0.5, "hidden_act": "gelu", "layer_norm_eps": 1e-12,
               "initializer_range": 0.02, "learning_rate": 0.001, "loss_type": "CE"},
}


def rank_metrics(ranks):
    r = np.asarray(ranks, dtype=np.float64)
    return {"HR@10": (r <= 10).astype(float),
            "HR@20": (r <= 20).astype(float),
            "MRR@20": np.where(r <= 20, 1.0 / r, 0.0),
            "NDCG@20": np.where(r <= 20, 1.0 / np.log2(r + 1.0), 0.0)}


def group_metrics(ranks, train_counts, warm=10):
    vals = rank_metrics(ranks)
    cnt = np.asarray(train_counts)
    masks = {"All-seen": np.ones(len(cnt), bool), "Warm": cnt > warm, "Long-tail": cnt <= warm}
    return {g: {"n": int(m.sum()), **{k: float(v[m].mean()) for k, v in vals.items()}} for g, m in masks.items()}


def evaluate_full(model, ds, counts_by_id, batch_size=128, keep_rows=False):
    import torch
    model.eval()
    dev = next(model.parameters()).device
    ranks, tids = [], []
    with torch.no_grad():
        for start in range(0, len(ds), batch_size):
            batch = ds.inter_feat[start:start + batch_size].to(dev)
            target = batch[ds.iid_field]
            scores = model.full_sort_predict(batch).reshape(len(target), ds.item_num)
            scores[:, 0] = -torch.inf
            t = scores.gather(1, target[:, None])
            ids = torch.arange(scores.shape[1], device=dev)[None, :]
            r = 1 + (scores > t).sum(1) + ((scores == t) & (ids < target[:, None]) & (ids > 0)).sum(1)
            ranks.append(r.cpu().numpy())
            tids.append(target.cpu().numpy())
    ranks, tids = np.concatenate(ranks), np.concatenate(tids)
    cnt = counts_by_id[tids]
    summary = group_metrics(ranks, cnt)
    if not keep_rows:
        return summary, None
    rows = {"target": ds.field2id_token[ds.iid_field][tids].tolist(), "train_count": cnt.tolist(),
            "rank": ranks.tolist(), "prefix_len": ds.inter_feat["item_length"].numpy().tolist()}
    return summary, rows


def recbole_settings(prepared, checkpoint_dir, epochs):
    return {
        "data_path": str(prepared), "benchmark_filename": ["train", "valid", "test"],
        "USER_ID_FIELD": "session_id", "ITEM_ID_FIELD": "item_id", "TIME_FIELD": None,
        "alias_of_item_id": ["item_id_list"],
        "load_col": {"inter": ["session_id", "item_id_list", "item_id"]},
        "MAX_ITEM_LIST_LENGTH": MAX_LEN, "rm_dup_inter": None,
        "seed": SEED, "reproducibility": True, "use_gpu": True, "gpu_id": "0",
        "epochs": epochs, "eval_step": 1, "stopping_step": STOPPING_STEP,
        "train_batch_size": 2048, "learner": "adam", "weight_decay": 0.0,
        "train_neg_sample_args": None,
        "eval_args": {"order": "TO", "group_by": "none", "mode": "full"},
        "metrics": ["Hit", "MRR", "NDCG"], "topk": [10, 20],
        "valid_metric": "MRR@20", "valid_metric_bigger": True, "eval_batch_size": 128,
        "repeatable": True, "checkpoint_dir": str(checkpoint_dir), "show_progress": False,
    }


def build(job, prepared, run_dir, epochs):
    from recbole.config import Config
    from recbole.data import create_dataset, data_preparation
    from recbole.utils import get_model, init_seed

    model_name = job["model"]
    params = {**DEFAULTS[model_name], **job.get("overrides", {})}
    settings = {**recbole_settings(prepared, run_dir, epochs), **params}
    config = Config(model=model_name, dataset=DATASET, config_dict=settings)
    for key, value in params.items():
        assert config[key] == value, f"{key}: RecBole dung {config[key]}, mong muon {value}"
    init_seed(SEED, True)
    ds = create_dataset(config)
    train_data, valid_data, test_data = data_preparation(config, ds)
    counts = json.loads((Path(prepared) / DATASET / "train_item_counts.json").read_text(encoding="utf-8"))
    tokens = ds.field2id_token[ds.iid_field]
    assert set(tokens[1:]) == set(counts), "Tu dien RecBole khac tu dien train"
    counts_by_id = np.array([0] + [counts[str(t)] for t in tokens[1:]], dtype=np.int64)
    model = get_model(model_name)(config, train_data._dataset).to(config["device"])
    return config, ds, train_data, valid_data, test_data, counts_by_id, model, params


def train_one(job, prepared, work, results, epochs, fingerprint):
    import torch
    from recbole.trainer import Trainer

    out_file = Path(results) / f"{job['name']}.json"
    if out_file.exists():
        return json.loads(out_file.read_text(encoding="utf-8"))
    run_dir = Path(work) / "ckpt" / job["name"]
    run_dir.mkdir(parents=True, exist_ok=True)
    torch.cuda.reset_peak_memory_stats()
    config, ds, train_data, valid_data, test_data, counts_by_id, model, params = build(job, prepared, run_dir, epochs)
    n_params = sum(p.numel() for p in model.parameters())
    history = []

    class LoggedTrainer(Trainer):
        def _train_epoch(self, data, epoch_idx, loss_func=None, show_progress=False):
            t0 = time.monotonic()
            loss = super()._train_epoch(data, epoch_idx, loss_func, show_progress)
            history.append({"epoch": epoch_idx + 1, "train_loss": float(np.sum(loss)),
                            "train_seconds": time.monotonic() - t0})
            return loss

        def _valid_epoch(self, data, show_progress=False):
            t0 = time.monotonic()
            summary, _ = evaluate_full(self.model, data._dataset, counts_by_id)
            history[-1].update(valid_seconds=time.monotonic() - t0,
                               **{f"valid_{k}": summary["All-seen"][k] for k in METRIC_COLS})
            return summary["All-seen"]["MRR@20"], {k: summary["All-seen"][k] for k in METRIC_COLS}

    class TimeBudget(Exception):
        pass

    start = time.monotonic()

    def after_epoch(epoch, score):
        if time.monotonic() - start > MAX_TRAIN_SECONDS:
            raise TimeBudget()

    trainer = LoggedTrainer(config, model)
    stop_reason = "early_stopping"
    try:
        trainer.fit(train_data, valid_data, saved=True, show_progress=False, callback_fn=after_epoch)
    except TimeBudget:
        stop_reason = "time_budget"
    train_seconds = time.monotonic() - start
    ckpt = torch.load(trainer.saved_model_file, map_location=config["device"], weights_only=False)
    model.load_state_dict(ckpt["state_dict"])
    model.load_other_parameter(ckpt.get("other_parameter"))
    if stop_reason != "time_budget" and history[-1]["epoch"] >= epochs:
        stop_reason = "epoch_limit"

    valid_summary, _ = evaluate_full(model, valid_data._dataset, counts_by_id)
    run_test = job.get("run_test", False)
    test_summary, test_rows = (evaluate_full(model, test_data._dataset, counts_by_id, keep_rows=True)
                               if run_test else (None, None))
    result = {**job, "params": params, "n_params": int(n_params), "best_epoch": int(ckpt["epoch"]) + 1,
              "epochs_completed": history[-1]["epoch"], "stop_reason": stop_reason,
              "best_valid_mrr20": float(ckpt["best_valid_score"]), "train_seconds": train_seconds,
              "history": history, "valid": valid_summary, "test": test_summary, "test_rows": test_rows,
              "n_items": int(ds.item_num - 1), "fingerprint": fingerprint, "checkpoint": str(trainer.saved_model_file),
              "gpu": torch.cuda.get_device_name(0), "peak_gpu_gib": torch.cuda.max_memory_allocated() / 2**30,
              "python": platform.python_version(), "torch": torch.__version__}
    out_file.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_file.with_suffix(".tmp")
    tmp.write_text(json.dumps(result), encoding="utf-8")
    tmp.replace(out_file)
    del model, trainer
    torch.cuda.empty_cache()
    return result


def load_manifest(trials_from):
    manifest = {}
    for m in MODELS:
        rows = [json.loads(Path(f).read_text(encoding="utf-8")) for f in sorted(glob.glob(f"{trials_from}/{m}-t??.json"))]
        assert len(rows) == 12, f"{m}: can 12 cau hinh, thay {len(rows)}"
        manifest[m] = [{"trial_id": r["name"], "trial_index": r["trial_index"], "overrides": r["overrides"]}
                       for r in sorted(rows, key=lambda r: r["trial_index"])]
    return manifest


def protocol_doc(manifest, data_report):
    return {
        "name": "t10-amazon-beauty-extra-v1",
        "status": "Thi nghiem BO SUNG. De T10 (Muc 1.5) khong cho dung Amazon thay Diginetica.",
        "dataset": {"name": "Amazon Beauty 5-core (2014)", "sha256": data_report["sha256"],
                    "fingerprint": data_report["fingerprint"], "raw": data_report["raw"],
                    "samples": {k: v["samples"] for k, v in data_report["splits"].items()},
                    "vocabulary_items": data_report["vocabulary_items"]},
        "split": "leave-one-out",
        "same_day_ties": {"policy": data_report["tie_policy"], "seed": data_report["tie_seed"],
                          "pairs": data_report["same_day_adjacent_pairs"],
                          "reason": "File goc sap theo ma san pham; giu nguyen se tao meo 'ma tang dan'"},
        "sensitivity_check": "Sau khi xong, train lai 3 ban mac dinh voi thu tu file goc de do tac dong; khong dung de chon cau hinh",
        "same_as_diginetica": ["3 mo hinh", "tham so mac dinh", "36 cau hinh", "chi so", "full ranking",
                               "cach pha hoa", "seed 42", "patience 5", "batch 2048", "chon theo valid MRR@20",
                               "Warm/Long-tail nguong 10", "RecBole 1.2.1", "torch 2.5.1"],
        "different_from_diginetica": {
            "split": "leave-one-out theo chuoi, thay vi theo ngay: Amazon chi co thoi gian theo ngay, va day la chuan cua cac bai bao tren Amazon",
            "unit": "chuoi cua nguoi dung da an danh, thay vi phien an danh",
            "max_epochs": f"{MAX_EPOCHS} thay vi 30: Beauty co khoang 65 buoc moi epoch, Diginetica khoang 300",
            "hardware": "RTX 3050 Laptop thay vi H100; thoi gian hai bo khong so truc tiep duoc",
        },
        "max_epochs": MAX_EPOCHS, "stopping_step": STOPPING_STEP, "seed": SEED, "budget": "12 cau hinh moi mo hinh",
        "fallback": "Neu thieu thoi gian: lay 8 cau hinh dau cua moi mo hinh, ghi ro ly do",
        "selection": "valid MRR@20 cao nhat; hoa thi lay trial_index nho hon",
        "test_policy": "Chi default va cau hinh thang duoc cham test, moi cai 1 lan",
        "same_parameter_comparison": {"config": "lr 0.0003, hidden 128, 1 lop, dropout 0.1", "trials": SHARED_TRIALS,
                                      "metric": "valid MRR@20 (giong bang Diginetica)"},
        "manifest": manifest,
    }


def stage_protocol(args, manifest, report):
    path = Path(args.results) / "protocol.json"
    doc = protocol_doc(manifest, report)
    text = json.dumps(doc, indent=2, ensure_ascii=False)
    if path.exists() and path.read_text(encoding="utf-8") != text:
        raise SystemExit("protocol.json da chot va khac ban hien tai. Khong doi giao thuc sau khi da train.")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print("protocol sha256", hashlib.sha256(text.encode("utf-8")).hexdigest())


def stage_smoke(args, manifest, report):
    # Chi do toc do va bo nho, ghi vao thu muc tam, khong dung ket qua
    probes = [{"name": "smoke-GRU4Rec-256x2", "model": "GRU4Rec", "overrides": manifest["GRU4Rec"][2]["overrides"]},
              {"name": "smoke-NARM-256", "model": "NARM", "overrides": manifest["NARM"][1]["overrides"]},
              {"name": "smoke-SASRec-128x2", "model": "SASRec", "overrides": manifest["SASRec"][6]["overrides"]}]
    for job in probes:
        r = train_one(job, args.prepared, args.work, Path(args.work) / "smoke", 2, report["fingerprint"])
        h = r["history"][-1]
        print(job["name"], "train_s/epoch", round(h["train_seconds"], 2), "valid_s", round(h["valid_seconds"], 2),
              "peak_gib", round(r["peak_gpu_gib"], 2), "params", r["n_params"], flush=True)


def stage_train(args, manifest, report):
    jobs = [{"name": f"default-{m}-s42", "model": m, "overrides": {}, "run_test": True, "trial_index": 0} for m in MODELS]
    for i in range(args.trials):  # moi dot ca 3 mo hinh tien deu: dung o dau cung giu ngan sach bang nhau
        for m in MODELS:
            t = manifest[m][i]
            jobs.append({"name": t["trial_id"], "model": m, "overrides": t["overrides"], "run_test": False,
                         "trial_index": t["trial_index"]})
    log = Path(args.results) / "progress.log"
    for n, job in enumerate(jobs, start=1):
        t0 = time.monotonic()
        try:
            r = train_one(job, args.prepared, args.work, args.results, MAX_EPOCHS, report["fingerprint"])
            msg = (f"{n}/{len(jobs)} {job['name']} valid_MRR@20={r['best_valid_mrr20']:.4f} best={r['best_epoch']}/"
                   f"{r['epochs_completed']} stop={r['stop_reason']} train_min={r['train_seconds'] / 60:.1f} "
                   f"wall_min={(time.monotonic() - t0) / 60:.1f}")
        except Exception as exc:  # giu lai lan loi, khong am tham thay the
            (Path(args.results) / f"{job['name']}.failed.json").write_text(
                json.dumps({"job": job, "error": repr(exc)}), encoding="utf-8")
            msg = f"{n}/{len(jobs)} {job['name']} FAILED {exc!r}"
        print(msg, flush=True)
        with open(log, "a", encoding="utf-8") as f:
            f.write(msg + "\n")


def stage_shared(args, manifest, report):
    # Chay truoc 3 lan train cung tham so, roi cham test (xem protocol_amendment_1.json).
    # Khong dung diem test nay de chon cau hinh: stage_winners chi doc valid.
    import torch

    for m in MODELS:
        trial = next(t for t in manifest[m] if t["trial_id"] == SHARED_TRIALS[m])
        job = {"name": trial["trial_id"], "model": m, "overrides": trial["overrides"], "run_test": False,
               "trial_index": trial["trial_index"]}
        r = train_one(job, args.prepared, args.work, args.results, MAX_EPOCHS, report["fingerprint"])
        print(f"shared-train {r['name']} valid_MRR@20={r['best_valid_mrr20']:.4f} best={r['best_epoch']}/"
              f"{r['epochs_completed']} stop={r['stop_reason']} train_min={r['train_seconds'] / 60:.1f}", flush=True)
        out = Path(args.results) / f"{r['name']}__shared_test.json"
        if out.exists():
            continue
        run_dir = Path(r["checkpoint"]).parent
        config, ds, train_data, valid_data, test_data, counts_by_id, model, _ = build(r, args.prepared, run_dir, MAX_EPOCHS)
        ckpt = torch.load(r["checkpoint"], map_location=config["device"], weights_only=False)
        model.load_state_dict(ckpt["state_dict"])
        model.load_other_parameter(ckpt.get("other_parameter"))
        valid_summary, _ = evaluate_full(model, valid_data._dataset, counts_by_id)
        assert abs(valid_summary["All-seen"]["MRR@20"] - r["best_valid_mrr20"]) < 1e-5, "Nap sai checkpoint"
        test_summary, test_rows = evaluate_full(model, test_data._dataset, counts_by_id, keep_rows=True)
        result = {k: r[k] for k in ("name", "model", "overrides", "trial_index", "best_valid_mrr20", "best_epoch",
                                    "epochs_completed", "stop_reason", "train_seconds")}
        result.update(valid=valid_summary, test=test_summary, test_rows=test_rows, fingerprint=report["fingerprint"])
        out.write_text(json.dumps(result), encoding="utf-8")
        print(f"shared-test {r['name']} MRR@20={test_summary['All-seen']['MRR@20']:.4f}", flush=True)
        del model
        torch.cuda.empty_cache()


def stage_winners(args, manifest, report):
    import torch

    for m in MODELS:
        out = Path(args.results) / f"{m}-winner__test.json"
        if out.exists():
            print(m, "da cham test truoc do, khong cham lai", flush=True)
            continue
        rows = [json.loads((Path(args.results) / f"{t['trial_id']}.json").read_text(encoding="utf-8"))
                for t in manifest[m][:args.trials]]
        best = max(rows, key=lambda r: (r["best_valid_mrr20"], -r["trial_index"]))
        run_dir = Path(best["checkpoint"]).parent
        config, ds, train_data, valid_data, test_data, counts_by_id, model, _ = build(best, args.prepared, run_dir, MAX_EPOCHS)
        ckpt = torch.load(best["checkpoint"], map_location=config["device"], weights_only=False)
        model.load_state_dict(ckpt["state_dict"])
        model.load_other_parameter(ckpt.get("other_parameter"))
        valid_summary, _ = evaluate_full(model, valid_data._dataset, counts_by_id)
        assert abs(valid_summary["All-seen"]["MRR@20"] - best["best_valid_mrr20"]) < 1e-5, "Nap sai checkpoint"
        test_summary, test_rows = evaluate_full(model, test_data._dataset, counts_by_id, keep_rows=True)
        result = {k: best[k] for k in ("name", "model", "overrides", "trial_index", "best_valid_mrr20")}
        result.update(valid=valid_summary, test=test_summary, test_rows=test_rows, fingerprint=report["fingerprint"])
        out.write_text(json.dumps(result), encoding="utf-8")
        print(m, "winner", best["name"], "valid", round(best["best_valid_mrr20"], 4), flush=True)
        del model
        torch.cuda.empty_cache()


def set_run_options(dataset, max_epochs):
    # Dung lai script nay cho bo du lieu khac, ma giu nguyen cach train va cach cham
    global DATASET, MAX_EPOCHS
    DATASET, MAX_EPOCHS = dataset, max_epochs


def check_metrics():
    # Ví dụ tính tay: hạng 1, 3, 15, 50 (giống slide "Chấm điểm 1 lần gợi ý")
    m = rank_metrics([1, 3, 15, 50])
    assert m["HR@10"].tolist() == [1, 1, 0, 0] and m["HR@20"].tolist() == [1, 1, 1, 0]
    assert np.allclose(m["MRR@20"], [1, 1 / 3, 1 / 15, 0])
    assert np.allclose(m["NDCG@20"], [1, 0.5, 0.25, 0])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", required=True, choices=["protocol", "smoke", "shared", "train", "winners"])
    ap.add_argument("--prepared", required=True)
    ap.add_argument("--work", required=True)
    ap.add_argument("--results", required=True)
    ap.add_argument("--trials-from", required=True)
    ap.add_argument("--trials", type=int, default=12)
    ap.add_argument("--dataset", default=DATASET)
    ap.add_argument("--max-epochs", type=int, default=MAX_EPOCHS)
    args = ap.parse_args()
    set_run_options(args.dataset, args.max_epochs)
    check_metrics()
    manifest = load_manifest(args.trials_from)
    report = json.loads((Path(args.prepared) / "data_report.json").read_text(encoding="utf-8"))
    {"protocol": stage_protocol, "smoke": stage_smoke, "shared": stage_shared, "train": stage_train,
     "winners": stage_winners}[args.stage](args, manifest, report)


if __name__ == "__main__":
    main()
