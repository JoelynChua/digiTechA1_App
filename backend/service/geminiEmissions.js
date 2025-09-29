// backend/service/aiEmissions.js
// NOTE: This version calls the Gemini REST API directly (snake_case payload)
// and uses your Firestore via ../config/firebase.
const { firestore } = require('../config/firebase');
const { db } = require("../config/firebase");
const fs = require("fs");
const path = require("path");

// If you're on Node 18+/Vercel, global fetch is available. If not, uncomment:
// const fetch = require("node-fetch");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  // Don't throw at import-time in serverless; log and let callers handle errors.
  console.warn("[aiEmissions] GOOGLE_API_KEY is not set. AI endpoints will fail until configured.");
}

const COLLECTION = "carbonTransactions";

// Singapore-context emission factors (kgCO2e per $1 spent, approx values)
const DEFAULT_FACTORS = {
  Utility: 0.40,
  Shopping: 0.25,
  Transport: 0.55,
  Travel: 0.80,
  Others: 0.20,
};

// ===== Prediction model (JSON converted from pickle) =====
let modelData = null;

function loadModel() {
  if (!modelData) {
    try {
      const modelPath = path.join(__dirname, "../predictive_analysis/linear_regression_model.json");
      modelData = JSON.parse(fs.readFileSync(modelPath, "utf8"));
      console.log("✓ Loaded prediction model:", modelData.feature_names);
    } catch (error) {
      console.warn("[aiEmissions] Could not load model; using fallback predictions");
      // Fallback model based on typical SG spending patterns
      modelData = {
        coefficients: [200, 300, 100, 150], // Spring, Summer, Fall, Winter
        intercept: 1000,
        feature_names: ["season_Spring", "season_Summer", "season_Fall", "season_Winter"],
      };
    }
  }
  return modelData;
}

function getSeasonFromMonth(month) {
  // month format: "YYYY-MM"
  const monthNum = parseInt(month.split("-")[1], 10);

  // SG (simplified, based on monsoon patterns)
  // Dec–Mar: Winter; Apr–May: Spring; Jun–Sep: Summer; Oct–Nov: Fall
  if (monthNum >= 12 || monthNum <= 3) return "Winter";
  if (monthNum >= 4 && monthNum <= 5) return "Spring";
  if (monthNum >= 6 && monthNum <= 9) return "Summer";
  return "Fall";
}

function createSeasonFeatures(season) {
  return {
    season_Spring: season === "Spring" ? 1 : 0,
    season_Summer: season === "Summer" ? 1 : 0,
    season_Fall: season === "Fall" ? 1 : 0,
    season_Winter: season === "Winter" ? 1 : 0,
  };
}

async function predictSpending(month) {
  const model = loadModel();
  const season = getSeasonFromMonth(month);
  const features = createSeasonFeatures(season);

  // Linear regression: y = intercept + sum(coef_i * feature_i)
  let prediction = model.intercept;
  model.feature_names.forEach((featureName, i) => {
    prediction += model.coefficients[i] * features[featureName];
  });

  return {
    month,
    season,
    predictedSpending: Math.round(prediction * 100) / 100,
    features,
    confidence: 0.85, // placeholder; replace with training metric if available
  };
}

function toMonthRange(monthStr) {
  if (!monthStr) return null;
  const [y, m] = monthStr.split("-").map(Number);
  if (!y || !m) return null;
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

function tsToDate(ts) {
  if (!ts) return null;
  if (typeof ts === "object" && "_seconds" in ts) return new Date(ts._seconds * 1000);
  return new Date(ts);
}

async function getTransactionsForMonth(month) {
  // db is Firestore (from config/firebase)
  // const ref = db.collection(COLLECTION);
  const ref = firestore.collection('carbonTransactions');
  let q = ref.orderBy("createDatetime", "desc");
  if (month) {
    const range = toMonthRange(month);
    if (range) {
      q = q.where("createDatetime", ">=", range.start).where("createDatetime", "<", range.end);
    }
  }
  const snap = await q.limit(500).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ===== Gemini prompt builders =====
function buildEmissionsPrompt(transactions, factors) {
  return {
    systemInstruction: `
You are a sustainability analyst working in Singapore. 
Estimate the carbon emissions (kgCO2e) for each financial transaction using the provided category factors (kgCO2e per 1 Singapore dollar). 

Contextual boundaries/requirements:
- Singapore's grid electricity emission factor is ~0.408 kgCO2e/kWh. Use this when reasoning about "Utility".
- For "Transport", assume mix of MRT (low emissions) and cars/taxis (higher emissions). Use the factor table, not external assumptions.
- For "Travel", assume air travel in/out of Singapore is the baseline (higher impact).
- If category is missing or unknown, default to "Others".
- The emissions calculation: emissionsKg = amount * factor(category).
- Every transaction in the list must appear in the output.
- Always output strict JSON with "items" (list of transactions + emissionsKg) and "totals" (sum and byCategory).
- Do not add extra commentary, only JSON.

Schema reminder:
{
  "items": [
    {
      "id": "...",
      "title": "...",
      "category": "...",
      "amount": 123,
      "emissionsKg": 45.6,
      "note": "optional remark"
    }
  ],
  "totals": {
    "totalEmissionsKg": 200.5,
    "byCategory": { "Transport": 100.2, "Utility": 50.1, ... }
  }
}
`,
    input: {
      factors,
      transactions: transactions.map((t) => ({
        id: t.id,
        title: t.title ?? null,
        category: t.category ?? null,
        amount: typeof t.amount === "number" ? t.amount : Number(t.amount || 0),
        createDatetime: tsToDate(t.createDatetime)?.toISOString() ?? null,
      })),
    },
  };
}

function buildRecommendationsPrompt(emissionsData, predictedSpending, actualSpending, month) {
  const season = getSeasonFromMonth(month);

  return {
    systemInstruction: `
You are a sustainability advisor specializing in Singapore's environmental context. 
Analyze the carbon emissions data and provide personalized recommendations.

Your task:
1. Identify the highest emission categories and specific transactions
2. Suggest practical greener alternatives for Singapore residents
3. Recommend carbon handprint activities to offset emissions
4. Consider the seasonal context (${season}) and spending patterns

Carbon Handprint Actions (prioritize Singapore context):
- Tree planting programs (NParks initiatives)
- Supporting renewable energy projects in Singapore
- Using public transport (MRT/buses) vs private vehicles
- Choosing local/sustainable food options
- Participating in community recycling programs
- Supporting green businesses and social enterprises
- Energy efficiency improvements at home
- Solar panel adoption programs
- Food waste reduction initiatives
- Second-hand shopping and circular economy

Output Format (strict JSON):
{
  "summary": "Brief overview of emissions profile in 2-3 sentences",
  "topEmitters": [
    {
      "category": "Transport",
      "emissionsKg": 150.5,
      "percentageOfTotal": 45.2
    }
  ],
  "alternatives": [
    {
      "category": "Transport",
      "current": "Frequent taxi/Grab rides",
      "greenerOption": "Use MRT and buses for daily commute",
      "potentialSavings": "~30-40% reduction in transport emissions",
      "implementation": "Plan routes using MyTransport.SG app"
    }
  ],
  "handprintActions": [
    {
      "action": "Plant trees through NParks Community in Bloom",
      "impact": "Offsets ~20kg CO2e per tree annually",
      "effort": "Low - monthly volunteer sessions available",
      "category": "Nature-based solutions"
    }
  ],
  "seasonalTips": [
    "Season-specific advice for ${season} in Singapore"
  ],
  "spendingInsight": "Analysis comparing predicted ($${predictedSpending.toFixed(2)}) vs actual ($${actualSpending.toFixed(2)}) and emission implications"
}

Important: Provide specific, actionable recommendations tailored to Singapore. 
Include at least 3 alternatives and 5 handprint actions.
Do not add extra commentary outside the JSON structure.
`,
    input: {
      month,
      season,
      predictedSpending,
      actualSpending,
      emissionsData,
    },
  };
}

// ===== Gemini REST call (snake_case payload) =====
async function callGeminiREST(promptObj) {
  if (!GEMINI_API_KEY) {
    throw new Error("GOOGLE_API_KEY not set");
  }

  const userText = JSON.stringify(promptObj.input, null, 2);
  const fullPrompt = `${promptObj.systemInstruction.trim()}

Data to analyse:
${userText}`;

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generation_config: {
      temperature: 0.3,
      max_output_tokens: 2048, // optional
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini REST error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  

  try {
    return JSON.parse(textOut);
  } catch {
    const m = textOut.match(/\{[\s\S]*\}$/);
    return m
      ? JSON.parse(m[0])
      : { items: [], totals: { totalEmissionsKg: 0, byCategory: {} } };
  }
}


// ===== Public API =====
function buildEmissions(transactions, factors = DEFAULT_FACTORS) {
  const prompt = buildEmissionsPrompt(transactions, factors);
  return callGeminiREST(prompt);
}

async function estimateEmissions({ month, factors = DEFAULT_FACTORS }) {
  const tx = await getTransactionsForMonth(month);
  if (tx.length === 0) {
    return { items: [], totals: { totalEmissionsKg: 0, byCategory: {} } };
  }

  const json = await buildEmissions(tx, factors);
  const items = Array.isArray(json.items) ? json.items : [];
  const totals = json.totals && typeof json.totals === "object"
    ? json.totals
    : { totalEmissionsKg: 0, byCategory: {} };

  return { items, totals, month };
}

async function getComprehensiveAnalysis({ month, factors = DEFAULT_FACTORS }) {
  // 1) Predicted spending
  const prediction = await predictSpending(month);

  // 2) Actual transactions
  const transactions = await getTransactionsForMonth(month);
  if (transactions.length === 0) {
    return {
      prediction,
      emissions: { items: [], totals: { totalEmissionsKg: 0, byCategory: {} } },
      recommendations: {
        summary:
          "No transactions found for this month. Start tracking your spending to get personalized carbon footprint insights!",
        alternatives: [],
        handprintActions: [],
        topEmitters: [],
        seasonalTips: [],
      },
      actualSpending: 0,
      comparison: {
        predictedVsActual: -prediction.predictedSpending,
        percentageDifference: -100,
      },
    };
  }

  const actualSpending = transactions.reduce((sum, tx) => {
    const amount = typeof tx.amount === "number" ? tx.amount : Number(tx.amount || 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  // 3) Emissions (AI)
  const emissionsData = await buildEmissions(transactions, factors);
  const items = Array.isArray(emissionsData.items) ? emissionsData.items : [];
  const totals =
    emissionsData.totals && typeof emissionsData.totals === "object"
      ? emissionsData.totals
      : { totalEmissionsKg: 0, byCategory: {} };
  const emissions = { items, totals };

  // 4) Recommendations (AI)
  const recPrompt = buildRecommendationsPrompt(
    emissions,
    prediction.predictedSpending,
    actualSpending,
    month
  );
  const recommendations = await callGeminiREST(recPrompt);

  return {
    prediction,
    emissions,
    recommendations,
    actualSpending,
    comparison: {
      predictedVsActual: actualSpending - prediction.predictedSpending,
      percentageDifference:
        prediction.predictedSpending > 0
          ? (((actualSpending - prediction.predictedSpending) / prediction.predictedSpending) * 100).toFixed(2)
          : 0,
    },
  };
}

module.exports = {
  estimateEmissions,
  getComprehensiveAnalysis,
  predictSpending,
  DEFAULT_FACTORS,
};
