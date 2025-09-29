import axios from "axios";

// const API_BASE =  "http://localhost:4000/api";
const API_BASE = "https://digi-tech-a1-app.vercel.app";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ---- Transactions API ----
export const listTransactions = () => api.get("/transactions");
export const getTransaction = (id) => api.get(`/transactions/${id}`);
export const createTransaction = (payload) => api.post("/transactions", payload);
export const updateTransaction = (id, payload) => api.put(`/transactions/${id}`, payload);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);

// ---- Converting transactions to emissions using Gemini API ----
export const getEmissions = (month) =>
  api.get("/ai/emissions", { params: { month } });

