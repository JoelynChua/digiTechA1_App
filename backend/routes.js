const express = require("express");
const {
    createTransaction,
    listTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
} = require("./service/carbonTransactions.js");

const { 
    estimateEmissions, 
    getComprehensiveAnalysis,
    predictSpending,
    DEFAULT_FACTORS 
} = require("./service/geminiEmissions.js");

const router = express.Router();

// Health check
router.get("/", (req, res) => {
    res.json({ status: "ok", service: "carbonTransactions API" });
});

// ============================================
// TRANSACTION CRUD OPERATIONS
// ============================================

// Create transaction
router.post("/transactions", async (req, res) => {
    try {
        const tx = await createTransaction(req.body);
        res.status(201).json(tx);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// List all transactions
// router.get("/transactions", async (req, res) => {
//     try {
//         const items = await listTransactions();
//         res.json(items);
//     } catch (e) {
//         console.error(e);
//         res.status(500).json({ error: "Failed to fetch transactions" });
//     }
// });
router.get('/transactions', async (req, res) => {
  try {
    if (String(process.env.DISABLE_DB).toLowerCase() === 'true') {
      return res.json({ transactions: [{ id: 'demo', name: 'Mock Tx', amount: 0 }] });
    }
    console.log('[/transactions GET] calling listTransactions()');
    const items = await listTransactions();
    return res.json(items);
  } catch (e) {
    console.error('[/transactions GET] FAILED:', e?.message, e?.stack);
    return res.status(500).json({ error: 'Failed to fetch transactions', detail: e?.message });
  }
});

// Get single transaction
router.get("/transactions/:id", async (req, res) => {
    const tx = await getTransaction(req.params.id);
    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json(tx);
});

// Update transaction (PUT or PATCH)
router.put("/transactions/:id", async (req, res) => {
    try {
        const tx = await updateTransaction(req.params.id, req.body);
        res.json(tx);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete transaction
router.delete("/transactions/:id", async (req, res) => {
    try {
        await deleteTransaction(req.params.id);
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================
// AI-POWERED EMISSIONS & PREDICTIONS
// ============================================

// Calculate emissions using Gemini AI (legacy endpoint - kept for backward compatibility)
router.get("/ai/emissions", async (req, res) => {
    try {
        const { month, useDefaultFactors } = req.query;
        const factors = useDefaultFactors === "false"
            ? undefined
            : DEFAULT_FACTORS;

        const data = await estimateEmissions({ month, factors });
        res.json(data);
    } catch (err) {
        console.error("AI emissions error:", err);
        res.status(500).json({ error: "Failed to estimate emissions" });
    }
});

// Predict spending based on season
router.get("/ai/predict-spending", async (req, res) => {
    try {
        const { month } = req.query;
        
        if (!month) {
            return res.status(400).json({
                error: 'Month parameter is required (format: YYYY-MM)',
                example: '2024-07'
            });
        }

        const prediction = await predictSpending(month);
        res.json({
            success: true,
            data: prediction
        });
    } catch (error) {
        console.error('Spending prediction error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to predict spending',
            message: error.message
        });
    }
});

// Comprehensive analysis: predictions + emissions + AI recommendations
router.get("/ai/comprehensive-analysis", async (req, res) => {
    try {
        let { month } = req.query;
        
        // Default to current month if not provided
        if (!month) {
            const now = new Date();
            const year = now.getFullYear();
            const monthNum = String(now.getMonth() + 1).padStart(2, '0');
            month = `${year}-${monthNum}`;
        }

        const analysis = await getComprehensiveAnalysis({ month });
        
        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Comprehensive analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate comprehensive analysis',
            message: error.message
        });
    }
});

// Compare emissions across multiple months
router.post("/ai/compare-months", async (req, res) => {
    try {
        const { months } = req.body;
        
        if (!Array.isArray(months) || months.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'months array is required',
                example: { months: ["2024-05", "2024-06", "2024-07"] }
            });
        }

        if (months.length > 12) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 12 months allowed for comparison'
            });
        }

        const comparisons = await Promise.all(
            months.map(async (month) => {
                try {
                    const analysis = await getComprehensiveAnalysis({ month });
                    return {
                        month,
                        totalEmissions: analysis.emissions.totals.totalEmissionsKg || 0,
                        totalSpending: analysis.actualSpending || 0,
                        predictedSpending: analysis.prediction.predictedSpending || 0,
                        season: analysis.prediction.season,
                        byCategory: analysis.emissions.totals.byCategory || {},
                        transactionCount: analysis.emissions.items?.length || 0
                    };
                } catch (error) {
                    console.error(`Error analyzing month ${month}:`, error);
                    return {
                        month,
                        error: 'Failed to analyze this month',
                        totalEmissions: 0,
                        totalSpending: 0,
                        predictedSpending: 0
                    };
                }
            })
        );

        // Filter out months with errors for summary calculations
        const validComparisons = comparisons.filter(c => !c.error);
        
        if (validComparisons.length === 0) {
            return res.json({
                success: true,
                data: {
                    comparisons,
                    summary: {
                        message: 'No valid data found for comparison'
                    }
                }
            });
        }

        // Calculate trends and summary
        const avgEmissions = validComparisons.reduce((sum, c) => sum + c.totalEmissions, 0) / validComparisons.length;
        const avgSpending = validComparisons.reduce((sum, c) => sum + c.totalSpending, 0) / validComparisons.length;

        res.json({
            success: true,
            data: {
                comparisons,
                summary: {
                    averageEmissions: avgEmissions.toFixed(2),
                    averageSpending: avgSpending.toFixed(2),
                    totalMonthsAnalyzed: validComparisons.length,
                    highestEmissionMonth: validComparisons.reduce((max, c) => 
                        c.totalEmissions > max.totalEmissions ? c : max
                    ),
                    lowestEmissionMonth: validComparisons.reduce((min, c) => 
                        c.totalEmissions < min.totalEmissions ? c : min
                    ),
                    trend: calculateTrend(validComparisons)
                }
            }
        });
    } catch (error) {
        console.error('Month comparison error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to compare months',
            message: error.message
        });
    }
});

// Get carbon handprint suggestions based on emissions
router.get("/ai/handprint-suggestions", async (req, res) => {
    try {
        let { month } = req.query;
        
        if (!month) {
            const now = new Date();
            const year = now.getFullYear();
            const monthNum = String(now.getMonth() + 1).padStart(2, '0');
            month = `${year}-${monthNum}`;
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
                topEmitters: analysis.recommendations?.topEmitters || []
            }
        });
    } catch (error) {
        console.error('Handprint suggestions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get handprint suggestions',
            message: error.message
        });
    }
});

// Get greener alternatives for high-emission categories
router.get("/ai/greener-alternatives", async (req, res) => {
    try {
        let { month } = req.query;
        
        if (!month) {
            const now = new Date();
            const year = now.getFullYear();
            const monthNum = String(now.getMonth() + 1).padStart(2, '0');
            month = `${year}-${monthNum}`;
        }

        const analysis = await getComprehensiveAnalysis({ month });
        
        res.json({
            success: true,
            data: {
                month,
                summary: analysis.recommendations?.summary || '',
                alternatives: analysis.recommendations?.alternatives || [],
                topEmitters: analysis.recommendations?.topEmitters || [],
                potentialSavings: calculatePotentialSavings(analysis.recommendations?.alternatives || [])
            }
        });
    } catch (error) {
        console.error('Greener alternatives error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get greener alternatives',
            message: error.message
        });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateTrend(comparisons) {
    if (comparisons.length < 2) return 'insufficient data';
    
    const sorted = [...comparisons].sort((a, b) => a.month.localeCompare(b.month));
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const avgFirst = firstHalf.reduce((sum, c) => sum + c.totalEmissions, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, c) => sum + c.totalEmissions, 0) / secondHalf.length;
    
    const change = ((avgSecond - avgFirst) / avgFirst * 100).toFixed(1);
    
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? `increasing (+${change}%)` : `decreasing (${change}%)`;
}

function calculatePotentialSavings(alternatives) {
    if (!alternatives || alternatives.length === 0) {
        return 'No data available';
    }
    
    // Extract percentage savings from potentialSavings string
    const savings = alternatives.map(alt => {
        const match = alt.potentialSavings?.match(/(\d+)-?(\d+)?%/);
        if (match) {
            const min = parseInt(match[1]);
            const max = match[2] ? parseInt(match[2]) : min;
            return (min + max) / 2;
        }
        return 0;
    });
    
    const avgSavings = savings.reduce((sum, s) => sum + s, 0) / savings.length;
    return `Average ${avgSavings.toFixed(0)}% reduction possible`;
}

module.exports = router;