"""Leakage and published-artifact checks (stdlib unittest)."""
import importlib
import json
import math
from pathlib import Path
import unittest
from datetime import date, timedelta

try:
    pipeline = importlib.import_module("train")
except ModuleNotFoundError:
    pipeline = None


class ForecastTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(pipeline, "Forecast pipeline must implement causal features and exact labels")
        start = date(2020, 1, 1)
        self.series = [dict(date=start + timedelta(days=i), price=30000 + i * 10)
                       for i in range(1000) if i % 7 != 6]

    def test_features_unchanged_when_future_prices_change(self):
        prefix = self.series[:100]
        changed = prefix + [dict(row, price=999999) for row in self.series[100:]]
        self.assertEqual(pipeline.feature_rows(prefix), pipeline.feature_rows(changed)[:len(prefix)])
        self.assertEqual(pipeline.feature_rows(prefix), pipeline.feature_rows(self.series)[:len(prefix)])
        self.assertEqual(pipeline.feature_rows(prefix)[-1]["values"][0], prefix[-1]["price"])

    def test_training_labels_exist_on_exact_date_and_never_after_cutoff(self):
        cutoff = self.series[200]["date"]
        actual = {row["date"]: row["price"] for row in self.series}
        for horizon in (1, 7):
            pairs = pipeline.training_pairs(self.series, cutoff, horizon)
            self.assertGreater(len(pairs), 100)
            for row in pairs:
                self.assertLessEqual(row["targetDate"], cutoff)
                self.assertEqual(row["targetDate"], row["origin"] + timedelta(days=horizon))
                self.assertEqual(row["target"], actual[row["targetDate"]] - actual[row["origin"]])

    def test_common_evaluation_origins_have_both_exact_labels(self):
        actual = {row["date"] for row in self.series}
        origins = pipeline.evaluation_origins(self.series)
        self.assertEqual(len(origins), 24)
        self.assertEqual(origins, sorted(set(origins)))
        for origin in origins:
            self.assertGreaterEqual((origin - self.series[0]["date"]).days, 730)
            self.assertGreaterEqual(origin, self.series[-1]["date"] - timedelta(days=180))
            for horizon in (1, 7):
                self.assertIn(origin + timedelta(days=horizon), actual)

    def test_paired_metrics_reject_missing_model_prediction(self):
        row = dict(origin="2026-01-01", date="2026-01-02", actual=100,
                   naive=101, prophet=102, xgboost=103, lower80=90, upper80=110)
        metrics = pipeline.score([row])
        self.assertEqual([item["n"] for item in metrics], [1, 1, 1])
        self.assertEqual([item["mae"] for item in metrics], [1, 2, 3])
        self.assertEqual(metrics[1]["coverage80"], 1)
        with self.assertRaises((ValueError, KeyError)):
            pipeline.score([dict(row, xgboost=None)])

    def test_published_artifact_matches_source_and_measured_metrics(self):
        path = Path(__file__).resolve().parents[2] / "public/data/forecast.json"
        if not path.exists():
            self.skipTest("Run training first to verify the published artifact")
        data = json.loads(path.read_text(encoding="utf-8"))
        source_path = path.with_name("history.json")
        import hashlib
        self.assertEqual(data["sourceSha256"], hashlib.sha256(source_path.read_bytes()).hexdigest())
        source = json.loads(source_path.read_text(encoding="utf-8"))
        actuals = {(r["regionId"], r["date"]): r["priceVndKg"] for r in source["rows"]}
        self.assertLess(path.stat().st_size, 250000)
        self.assertEqual({r["regionId"] for r in data["regions"]}, {"dak-lak", "lam-dong"})
        for region in data["regions"]:
            paired = []
            for horizon in region["horizons"]:
                rows = horizon["backtest"]
                paired.append([r["origin"] for r in rows])
                self.assertEqual(horizon["metrics"], pipeline.score(rows))
                self.assertEqual(len(rows), 24)
                self.assertEqual(horizon["forecast"]["date"],
                                 (date.fromisoformat(region["trainEnd"]) + timedelta(days=horizon["days"])).isoformat())
                for row in rows:
                    self.assertEqual(row["actual"], actuals[region["regionId"], row["date"]])
                    self.assertEqual(date.fromisoformat(row["date"]) - date.fromisoformat(row["origin"]), timedelta(days=horizon["days"]))
                    for key in ("actual", "naive", "prophet", "xgboost", "lower80", "upper80"):
                        self.assertTrue(math.isfinite(row[key]) and row[key] > 0)
                    self.assertLessEqual(row["lower80"], row["upper80"])
                for model in ("naive", "prophet", "xgboost"):
                    self.assertTrue(all(math.isfinite(v) and v > 0 for v in horizon["forecast"][model].values()))
            self.assertEqual(*paired)


if __name__ == "__main__":
    unittest.main()
