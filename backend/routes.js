// routes.js
const express = require('express');
const {
  createTransaction,
  listTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
} = require('./service/carbonTransactions');

const {
  estimateEmissions,
  getComprehensiveAnalysis,
  predictSpending,
  DEFAULT_FACTORS,
} = require('./service/geminiEmissions'); // keep or replace with your real impl

const router = express.Router();

// Root for this router (mounted at /api)
router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'carbonTransactions API' });
});

// ===== Transactions CRUD =====

// Create
router.post('/transactions', async (req, res) => {
  try {
    const tx = await createTransaction(req.body);
    res.status(201).json(tx);
  } catch (err) {
    console.error('[/transactions POST] FAILED:', err?.message);
    res.status(400).json({ error: err.message });
  }
});

// List
router.get('/transactions', async (req, res) => {
  try {
    console.log('[/transactions GET] start');
    const items = await listTransactions();
    console.log('[/transactions GET] success. count:', Array.isArray(items) ? items.length : 0);
    // Return consistent shape
    res.json({ transactions: items });
  } catch (e) {
    console.error('[/transactions GET] FAILED:', e?.message, e?.stack);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get one
router.get('/transactions/:id', async (req, res) => {
  try {
    const tx = await getTransaction(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Not found' });
    res.json(tx);
  } catch (e) {
    console.error('[/transactions/:id GET] FAILED:', e?.message);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Update
router.put('/transactions/:id', async (req, res) => {
  try {
    const tx = await updateTransaction(req.params.id, req.body);
    res.json(tx);
  } catch (err) {
    console.error('[/transactions/:id PUT] FAILED:', err?.message);
    res.status(400).json({ error: err.message });
  }
});

// Delete
router.delete('/transactions/:id', async (req, res) => {
  try {
    await deleteTransaction(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[/transactions/:id DELETE] FAILED:', err?.message);
    res.status(400).json({ error: err.message });
  }
});

// ===== AI endpoints (keep if applicable) =====

// Legacy emissions
router.get('/ai/emissions', async (req, res) => {
  try {
    const { month, useDefaultFactors } = req.query;
    const factors = useDefaultFactors === 'false' ? undefined : DEFAULT_FACTORS;
    const data = await estimateEmissions({ month, factors });
    res.json(data);
  } catch (err) {
    console.error('[AI emissions] FAILED:', err);
    res.status(500).json({ error: 'Failed to estimate emissions' });
  }
});

// Predict spending
router.get('/ai/predict-spending', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({
        error: 'Month parameter is required (format: YYYY-MM)',
        example: '2024-07',
      });
    }
    const prediction = await predictSpending(month);
    res.json({ success: true, data: prediction });
  } catch (error) {
    console.error('[AI predict-spending] FAILED:', error);
    res.status(500).json({ success: false, error: 'Failed to predict spending', message: error.message });
  }
});

// Comprehensive analysis
router.get('/ai/comprehensive-analysis', async (req, res) => {
  try {
    let { month } = req.query;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const analysis = await getComprehensiveAnalysis({ month });
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('[AI comprehensive-analysis] FAILED:', error);
    res.status(500).json({ success: false, error: 'Failed to generate comprehensive analysis', message: error.message });
  }
});

// Compare months
router.post('/ai/compare-months', async (req, res) => {
  try {
    const { months } = req.body;
    if (!Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'months array is required',
        example: { months: ['2024-05', '2024-06', '2024-07'] },
      });
    }
    if (months.length > 12) {
      return res.status(400).json({ success: false, error: 'Maximum 12 months allowed for comparison' });
    }

    const comparisons = await Promise.all(
      months.map(async (m) => {
        try {
          const analysis = await getComprehensiveAnalysis({ month: m });
          return {
            month: m,
            totalEmissions: analysis.emissions.totals.totalEmissionsKg || 0,
            totalSpending: analysis.actualSpending || 0,
            predictedSpending: analysis.prediction.predictedSpending || 0,
            season: analysis.prediction.season,
            byCategory: analysis.emissions.totals.byCategory || {},
            transactionCount: analysis.emissions.items?.length || 0,
          };
        } catch (error) {
          console.error(`[AI compare] month ${m} FAILED:`, error);
          return {
            month: m,
            error: 'Failed to analyze this month',
            totalEmissions: 0,
            totalSpending: 0,
            predictedSpending: 0,
          };
        }
      })
    );

    const valid = comparisons.filter((c) => !c.error);
    if (valid.length === 0) {
      return res.json({ success: true, data: { comparisons, summary: { message: 'No valid data found for comparison' } } });
    }

    const avgEmission = valid.reduce((s, c) => s + c.totalEmissions, 0) / valid.length;
    const avgSpend = valid.reduce((s, c) => s + c.totalSpending, 0) / valid.length;
    const sorted = [...valid].sort((a, b) => a.month.localeCompare(b.month));
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const avgFirst = firstHalf.reduce((s, c) => s + c.totalEmissions, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, c) => s + c.totalEmissions, 0) / secondHalf.length;
    const pct = avgFirst ? (((avgSecond - avgFirst) / avgFirst) * 100).toFixed(1) : '0.0';
    const trend = Math.abs(Number(pct)) < 5 ? 'stable' : (Number(pct) > 0 ? `increasing (+${pct}%)` : `decreasing (${pct}%)`);

    res.json({
      success: true,
      data: {
        comparisons,
        summary: {
          averageEmissions: Number.isFinite(avgEmission) ? avgEmission.toFixed(2) : '0.00',
          averageSpending: Number.isFinite(avgSpend) ? avgSpend.toFixed(2) : '0.00',
          totalMonthsAnalyzed: valid.length,
          highestEmissionMonth: valid.reduce((max, c) => (c.totalEmissions > max.totalEmissions ? c : max)),
          lowestEmissionMonth: valid.reduce((min, c) => (c.totalEmissions < min.totalEmissions ? c : min)),
          trend,
        },
      },
    });
  } catch (error) {
    console.error('[AI compare-months] FAILED:', error);
    res.status(500).json({ success: false, error: 'Failed to compare months', message: error.message });
  }
});

// Handprint suggestions
router.get('/ai/handprint-suggestions', async (req, res) => {
  try {
    let { month } = req.query;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const analysis = await getComprehensiveAnalysis({ month });
    res.json({
      success: true,
      data: {
        month,
        season: analysis.prediction.season,
        totalEmissions: analysis.emissions.totals.totalEmissionsKg || 0,
        handprintActions: analysis.recommendations?.handprintActions || [],
        seasonalTips: analysis.recommendations?.seasonalTips || [],
        topEmitters: analysis.recommendations?.topEmitters || [],
      },
    });
  } catch (error) {
    console.error('[AI handprint-suggestions] FAILED:', error);
    res.status(500).json({ success: false, error: 'Failed to get handprint suggestions', message: error.message });
  }
});

// Greener alternatives
router.get('/ai/greener-alternatives', async (req, res) => {
  try {
    let { month } = req.query;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const analysis = await getComprehensiveAnalysis({ month });
    res.json({
      success: true,
      data: {
        month,
        summary: analysis.recommendations?.summary || '',
        alternatives: analysis.recommendations?.alternatives || [],
        topEmitters: analysis.recommendations?.topEmitters || [],
        potentialSavings: calculatePotentialSavings(analysis.recommendations?.alternatives || []),
      },
    });
  } catch (error) {
    console.error('[AI greener-alternatives] FAILED:', error);
    res.status(500).json({ success: false, error: 'Failed to get greener alternatives', message: error.message });
  }
});

function calculatePotentialSavings(alts) {
  if (!alts || !alts.length) return 'No data available';
  const nums = alts.map((a) => {
    const m = a.potentialSavings?.match(/(\d+)-?(\d+)?%/);
    if (!m) return 0;
    const min = parseInt(m[1], 10);
    const max = m[2] ? parseInt(m[2], 10) : min;
    return (min + max) / 2;
  });
  const avg = nums.reduce((s, n) => s + n, 0) / nums.length;
  return `Average ${Number.isFinite(avg) ? avg.toFixed(0) : '0'}% reduction possible`;
}

module.exports = router;
