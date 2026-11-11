"""Causal labels, temporal selection, conformal calibration and artifact checks."""
from datetime import date, timedelta
import hashlib
import importlib
import json
import math
from pathlib import Path
import unittest

try:
    study = importlib.import_module('study')
except ModuleNotFoundError:
    study = None


class StudyTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(study, 'The retrospective study must be implemented')
        self.series = [dict(date=date(2020, 1, 1) + timedelta(days=i), price=30000 + 10*i)
                       for i in range(1200) if i % 7 != 6]

    def test_split_targets_precede_next_partition_origins(self):
        splits = study.temporal_split(self.series)
        self.assertEqual([len(splits[k]) for k in study.COUNTS], [6, 8, 12])
        for earlier, later in [('validation', 'calibration'), ('calibration', 'evaluation')]:
            self.assertLess(max(splits[earlier]) + timedelta(days=7), min(splits[later]))
        actual = {r['date'] for r in self.series}
        for origins in splits.values():
            for origin in origins:
                self.assertTrue(all(origin + timedelta(days=h) in actual for h in (1, 7)))
                self.assertIn(origin - timedelta(days=6), actual)

    def test_features_and_training_labels_cannot_see_future(self):
        prefix = self.series[:300]
        changed = prefix + [dict(r, price=999999) for r in self.series[300:]]
        self.assertEqual(study.return_features(prefix), study.return_features(changed)[:300])
        for h in (1, 7):
            pairs = study.return_pairs(changed, prefix[-1]['date'], h)
            self.assertEqual(pairs, study.return_pairs(prefix, prefix[-1]['date'], h))
            actual = {r['date']: r['price'] for r in prefix}
            for row in pairs:
                self.assertLessEqual(row['targetDate'], prefix[-1]['date'])
                self.assertEqual(row['targetDate'] - row['origin'], timedelta(days=h))
                self.assertAlmostEqual(row['target'], actual[row['targetDate']]/actual[row['origin']] - 1)

    def test_selection_uses_validation_only_and_stable_tie_break(self):
        rows = [dict(actual=100, a=101, b=110), dict(actual=100, a=102, b=100)]
        self.assertEqual(study.select_candidate(rows, ['a', 'b']), 'a')
        self.assertEqual(study.select_candidate([dict(actual=100, a=100, b=100)], ['b', 'a']), 'b')

    def test_calibration_quantile_and_metrics(self):
        rows = [dict(actual=100, naive=100+i, seasonalNaive=100+i, prophet=100+i, xgboost=100+i)
                for i in range(1, 9)]
        widths = study.calibrate(rows)
        self.assertEqual(widths, dict.fromkeys(study.MODELS, 8))
        scored = study.with_intervals(rows, widths)
        for metric in study.metrics(scored):
            self.assertEqual(metric['mae'], 4.5)
            self.assertEqual(metric['rmse'], round(math.sqrt(25.5), 4))
            self.assertEqual(metric['coverage80'], 1)
            self.assertEqual(metric['meanWidth80'], 16)
        with self.assertRaises(ValueError):
            study.metrics([dict(scored[0], prophet=float('nan'))])
        with self.assertRaises(ValueError):
            study.calibrate([])

    def test_artifact_matches_source_splits_predictions_and_metrics(self):
        root = Path(__file__).resolve().parents[2]
        path = root / 'public/data/forecast-study.json'
        if not path.exists():
            self.skipTest('Run study.py before artifact verification')
        data = json.loads(path.read_text(encoding='utf-8'))
        source = root / 'public/data/history.json'
        self.assertEqual(data['sourceSha256'], hashlib.sha256(source.read_bytes()).hexdigest())
        self.assertFalse(data['currentEligible'])
        self.assertEqual(data['studyType'], 'retrospective')
        self.assertEqual(data['protocolSha256'], hashlib.sha256(json.dumps(data['protocol'], sort_keys=True).encode()).hexdigest())
        self.assertEqual(data['implementationSha256'], hashlib.sha256((root / 'tools/forecasting/study.py').read_bytes()).hexdigest())
        self.assertEqual({r['regionId'] for r in data['regions']}, {'dak-lak', 'lam-dong'})
        actual = {(r['regionId'], r['date']): r['priceVndKg'] for r in json.loads(source.read_text())['rows']}
        for region in data['regions']:
            split = region['splits']
            self.assertLess(max(split['validation']['targetDates']), min(split['calibration']['origins']))
            self.assertLess(max(split['calibration']['targetDates']), min(split['evaluation']['origins']))
            for selection in region['selections']:
                validation = selection['validationBacktest']
                self.assertEqual([r['origin'] for r in validation], split['validation']['origins'])
                self.assertEqual(selection['prophet'], study.select_candidate(validation, study.PROPHET_CANDIDATES))
                self.assertEqual(selection['xgboost'], study.select_candidate(validation, study.XGB_CANDIDATES))
            for horizon in region['horizons']:
                rows = horizon['backtest']
                self.assertEqual(horizon['metrics'], study.metrics(rows))
                self.assertEqual(len(rows), 12)
                self.assertEqual(horizon['intervalCalibration']['n'], 8)
                self.assertEqual([r['origin'] for r in rows], split['evaluation']['origins'])
                for row in rows:
                    self.assertEqual(row['actual'], actual[region['regionId'], row['targetDate']])
                    self.assertEqual((date.fromisoformat(row['targetDate']) - date.fromisoformat(row['origin'])).days, horizon['days'])
                    self.assertEqual(row['naive'], actual[region['regionId'], row['origin']])
                    seasonal_date = date.fromisoformat(row['targetDate']) - timedelta(days=7)
                    self.assertEqual(row['seasonalNaive'], actual[region['regionId'], seasonal_date.isoformat()])
                    for model in study.MODELS:
                        self.assertTrue(math.isfinite(row[model]) and row[model] > 0)
                calibration = horizon['calibrationBacktest']
                self.assertEqual(study.calibrate(calibration), horizon['intervalCalibration']['absoluteErrorQuantiles'])
                self.assertEqual(rows, study.with_intervals(rows, study.calibrate(calibration)))


if __name__ == '__main__':
    unittest.main()
