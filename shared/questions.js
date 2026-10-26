export const QUESTIONS = Object.freeze([
  {
    id: "e01",
    level: "pemula",
    category: "Momentum",
    prompt: "m = 2 kg, v = 3 m/s → p = ?",
    options: ["5 kg·m/s", "6 kg·m/s", "1,5 kg·m/s", "9 kg·m/s"],
    answer: 1,
    explanation: "p = m·v = 2·3 = 6",
  },
  {
    id: "e02",
    level: "pemula",
    category: "Momentum",
    prompt: "m = 5 kg, v = 4 m/s → p = ?",
    options: ["9 kg·m/s", "20 kg·m/s", "1,25 kg·m/s", "10 kg·m/s"],
    answer: 1,
    explanation: "p = m·v = 5·4 = 20",
  },
  {
    id: "e03",
    level: "pemula",
    category: "Momentum",
    prompt: "p = 12 kg·m/s, m = 3 kg → v = ?",
    options: ["36 m/s", "9 m/s", "4 m/s", "15 m/s"],
    answer: 2,
    explanation: "v = p/m = 12/3 = 4",
  },
  {
    id: "e04",
    level: "pemula",
    category: "Impuls",
    prompt: "F = 10 N, Δt = 0,2 s → I = ?",
    options: ["50 N·s", "2 N·s", "0,02 N·s", "10,2 N·s"],
    answer: 1,
    explanation: "I = F·Δt = 10·0,2 = 2",
  },
  {
    id: "e05",
    level: "pemula",
    category: "Impuls",
    prompt: "F = 6 N, Δt = 3 s → I = ?",
    options: ["2 N·s", "9 N·s", "18 N·s", "3 N·s"],
    answer: 2,
    explanation: "I = F·Δt = 6·3 = 18",
  },
  {
    id: "e06",
    level: "pemula",
    category: "Impuls",
    prompt: "I = 12 N·s, Δt = 4 s → F = ?",
    options: ["48 N", "8 N", "3 N", "16 N"],
    answer: 2,
    explanation: "F = I/Δt = 12/4 = 3",
  },
  {
    id: "e07",
    level: "pemula",
    category: "Tumbukan",
    prompt: "Lenting sempurna, m₁ = m₂, v₁ = 4, v₂ = 0 → v₁' = ?",
    options: ["4 m/s", "0 m/s", "2 m/s", "8 m/s"],
    answer: 1,
    explanation: "Massa sama: kecepatan bertukar, v₁' = 0",
  },
  {
    id: "e08",
    level: "pemula",
    category: "Tumbukan",
    prompt: "Tidak lenting, m₁ = m₂ = 2 kg, v₁ = 4, v₂ = 0 → v' = ?",
    options: ["4 m/s", "2 m/s", "1 m/s", "8 m/s"],
    answer: 1,
    explanation: "v' = (2·4)/(2+2) = 2",
  },
  {
    id: "e09",
    level: "pemula",
    category: "Tumbukan",
    prompt: "p total = 10 kg·m/s, m total = 5 kg → v' = ?",
    options: ["50 m/s", "2 m/s", "5 m/s", "0,5 m/s"],
    answer: 1,
    explanation: "v' = p/m = 10/5 = 2",
  },
  {
    id: "e10",
    level: "pemula",
    category: "Proyektil",
    prompt: "Horizontal: v₀ = 20 m/s, t = 2 s → x = ?",
    options: ["10 m", "22 m", "40 m", "80 m"],
    answer: 2,
    explanation: "x = v₀·t = 20·2 = 40",
  },
  {
    id: "e11",
    level: "pemula",
    category: "Proyektil",
    prompt: "Horizontal: v₀ = 15 m/s, t = 4 s → x = ?",
    options: ["19 m", "60 m", "3,75 m", "30 m"],
    answer: 1,
    explanation: "x = v₀·t = 15·4 = 60",
  },
  {
    id: "e12",
    level: "pemula",
    category: "Proyektil",
    prompt: "Jatuh bebas: g = 10, t = 3 s → v = ?",
    options: ["30 m/s", "13 m/s", "3,3 m/s", "90 m/s"],
    answer: 0,
    explanation: "v = g·t = 10·3 = 30",
  },
  {
    id: "m01",
    level: "menengah",
    category: "Momentum",
    prompt: "m = 4 kg, p = 20 kg·m/s → v = ?",
    options: ["80 m/s", "5 m/s", "16 m/s", "0,2 m/s"],
    answer: 1,
    explanation: "v = p/m = 20/4 = 5",
  },
  {
    id: "m02",
    level: "menengah",
    category: "Momentum",
    prompt: "m_A = 2 m_B, v sama → p_A : p_B = ?",
    options: ["1 : 2", "1 : 1", "2 : 1", "4 : 1"],
    answer: 2,
    explanation: "p sebanding dengan m, jadi 2 : 1",
  },
  {
    id: "m03",
    level: "menengah",
    category: "Momentum",
    prompt: "p₁ = 6, p₂ = −2 kg·m/s → p total = ?",
    options: ["8 kg·m/s", "4 kg·m/s", "−8 kg·m/s", "12 kg·m/s"],
    answer: 1,
    explanation: "6 + (−2) = 4",
  },
  {
    id: "m04",
    level: "menengah",
    category: "Impuls",
    prompt: "m = 2 kg, v₀ = 0, v = 5 m/s → I = ?",
    options: ["10 N·s", "2,5 N·s", "7 N·s", "5 N·s"],
    answer: 0,
    explanation: "I = Δp = 2·5 = 10",
  },
  {
    id: "m05",
    level: "menengah",
    category: "Impuls",
    prompt: "F = 20 N, Δt = 0,5 s → Δp = ?",
    options: ["40 kg·m/s", "10 kg·m/s", "20 kg·m/s", "0,025 kg·m/s"],
    answer: 1,
    explanation: "Δp = F·Δt = 20·0,5 = 10",
  },
  {
    id: "m06",
    level: "menengah",
    category: "Impuls",
    prompt: "Δp = 30 kg·m/s, Δt = 6 s → F = ?",
    options: ["180 N", "5 N", "24 N", "36 N"],
    answer: 1,
    explanation: "F = Δp/Δt = 30/6 = 5",
  },
  {
    id: "m07",
    level: "menengah",
    category: "Tumbukan",
    prompt: "Saling dorong dari diam, m_A = m_B, v_A = 3 → v_B = ?",
    options: ["3 m/s", "0 m/s", "−3 m/s", "6 m/s"],
    answer: 2,
    explanation: "Momentum total 0, jadi v_B = −3",
  },
  {
    id: "m08",
    level: "menengah",
    category: "Tumbukan",
    prompt: "Tidak lenting, m₁ = 3 kg, v₁ = 4, m₂ = 1 kg, v₂ = 0 → v' = ?",
    options: ["4 m/s", "3 m/s", "1 m/s", "12 m/s"],
    answer: 1,
    explanation: "v' = (3·4)/(3+1) = 3",
  },
  {
    id: "m09",
    level: "menengah",
    category: "Tumbukan",
    prompt: "Lenting sempurna, m₁ = m₂, v₁ = 6, v₂ = 0 → v₂' = ?",
    options: ["0 m/s", "3 m/s", "6 m/s", "12 m/s"],
    answer: 2,
    explanation: "Massa sama: kecepatan bertukar, v₂' = 6",
  },
  {
    id: "m10",
    level: "menengah",
    category: "Proyektil",
    prompt: "Horizontal: x = 60 m, v₀ = 20 m/s → t = ?",
    options: ["1200 s", "3 s", "40 s", "0,3 s"],
    answer: 1,
    explanation: "t = x/v₀ = 60/20 = 3",
  },
  {
    id: "m11",
    level: "menengah",
    category: "Proyektil",
    prompt: "Jatuh bebas: g = 10, t = 2 s → h = ½gt² = ?",
    options: ["20 m", "40 m", "10 m", "5 m"],
    answer: 0,
    explanation: "h = ½·10·2² = 20",
  },
  {
    id: "m12",
    level: "menengah",
    category: "Proyektil",
    prompt: "Vertikal naik: v₀ = 20 m/s, g = 10 → t puncak = ?",
    options: ["4 s", "2 s", "200 s", "0,5 s"],
    answer: 1,
    explanation: "t = v₀/g = 20/10 = 2",
  },
  {
    id: "h01",
    level: "mahir",
    category: "Momentum",
    prompt: "m = 0,5 kg, v = 12 m/s → p = ?",
    options: ["6 kg·m/s", "24 kg·m/s", "12,5 kg·m/s", "0,04 kg·m/s"],
    answer: 0,
    explanation: "p = m·v = 0,5·12 = 6",
  },
  {
    id: "h02",
    level: "mahir",
    category: "Momentum",
    prompt: "p sama, m_A = 3 m_B → v_A : v_B = ?",
    options: ["3 : 1", "1 : 3", "1 : 1", "9 : 1"],
    answer: 1,
    explanation: "v = p/m, jadi 1 : 3",
  },
  {
    id: "h03",
    level: "mahir",
    category: "Momentum",
    prompt: "p = 8 kg·m/s, v = 0,5 m/s → m = ?",
    options: ["4 kg", "16 kg", "8,5 kg", "0,06 kg"],
    answer: 1,
    explanation: "m = p/v = 8/0,5 = 16",
  },
  {
    id: "h04",
    level: "mahir",
    category: "Impuls",
    prompt: "F = 40 N, Δt = 0,05 s → I = ?",
    options: ["2 N·s", "0,2 N·s", "800 N·s", "20 N·s"],
    answer: 0,
    explanation: "I = F·Δt = 40·0,05 = 2",
  },
  {
    id: "h05",
    level: "mahir",
    category: "Impuls",
    prompt: "Bola 0,5 kg memantul, Δv = 8 m/s → I = ?",
    options: ["4 N·s", "16 N·s", "8,5 N·s", "0,06 N·s"],
    answer: 0,
    explanation: "I = m·Δv = 0,5·8 = 4",
  },
  {
    id: "h06",
    level: "mahir",
    category: "Impuls",
    prompt: "I = 6 N·s, m = 2 kg, dari diam → v = ?",
    options: ["12 m/s", "3 m/s", "4 m/s", "0,3 m/s"],
    answer: 1,
    explanation: "v = I/m = 6/2 = 3",
  },
  {
    id: "h07",
    level: "mahir",
    category: "Tumbukan",
    prompt: "Tidak lenting, m₁ = 1 kg, v₁ = 6, m₂ = 2 kg, v₂ = 0 → v' = ?",
    options: ["6 m/s", "3 m/s", "2 m/s", "1 m/s"],
    answer: 2,
    explanation: "v' = (1·6)/(1+2) = 2",
  },
  {
    id: "h08",
    level: "mahir",
    category: "Tumbukan",
    prompt: "Lenting sempurna, m₁ = m₂, v₁ = 5, v₂ = −5 → v₁' = ?",
    options: ["5 m/s", "0 m/s", "−5 m/s", "10 m/s"],
    answer: 2,
    explanation: "Massa sama: kecepatan bertukar, v₁' = −5",
  },
  {
    id: "h09",
    level: "mahir",
    category: "Tumbukan",
    prompt: "Ledakan dari diam: m₁ = 1 kg, v₁ = 6; m₂ = 2 kg → v₂ = ?",
    options: ["3 m/s", "−3 m/s", "−12 m/s", "6 m/s"],
    answer: 1,
    explanation: "1·6 + 2·v₂ = 0, jadi v₂ = −3",
  },
  {
    id: "h10",
    level: "mahir",
    category: "Proyektil",
    prompt: "Horizontal: x = 90 m, t = 3 s → v₀ = ?",
    options: ["30 m/s", "270 m/s", "93 m/s", "0,03 m/s"],
    answer: 0,
    explanation: "v₀ = x/t = 90/3 = 30",
  },
  {
    id: "h11",
    level: "mahir",
    category: "Proyektil",
    prompt: "Jatuh bebas: g = 10, h = 45 m → t = ?",
    options: ["3 s", "9 s", "4,5 s", "2 s"],
    answer: 0,
    explanation: "45 = ½·10·t², jadi t = 3",
  },
  {
    id: "h12",
    level: "mahir",
    category: "Proyektil",
    prompt: "Vertikal naik: v₀ = 30 m/s, g = 10 → h maks = ?",
    options: ["90 m", "45 m", "30 m", "3 m"],
    answer: 1,
    explanation: "h = v₀²/2g = 900/20 = 45",
  },
]);

export const QUESTION_LEVELS = Object.freeze(["pemula", "menengah", "mahir"]);

export function questionsForLevel(level) {
  return QUESTIONS.filter((question) => question.level === level);
}

export function getQuestionById(id) {
  return QUESTIONS.find((question) => question.id === id) ?? null;
}

/** Konsep yang boleh muncul di Physics Clash (satu soal = satu konsep). */
export const QUESTION_CONCEPTS = Object.freeze(["Momentum", "Impuls", "Tumbukan", "Proyektil"]);

/** Batas keterbacaan: soal harus terbaca ~2 detik dan terjawab dalam 5 detik. */
export const QUESTION_LIMITS = Object.freeze({
  promptChars: 64,
  promptWords: 5,
  optionChars: 16,
  explanationChars: 56,
  minPerConcept: 6,
});

const MULTI_STEP_WORDS = /\b(lalu|kemudian|setelah|sesudah|selanjutnya)\b/i;

/** Kata naratif = token huruf saja (>= 3 huruf); angka, simbol, dan satuan tidak dihitung. */
function narrativeWordCount(text) {
  return text
    .split(/\s+/)
    .map((token) => token.replace(/[.,:;!?]/g, ""))
    .filter((token) => /^\p{L}{3,}$/u.test(token)).length;
}

export function validateQuestionBank(bank = QUESTIONS) {
  const errors = [];
  const ids = new Set();
  const perConcept = new Map(QUESTION_CONCEPTS.map((concept) => [concept, 0]));
  if (bank.length < 30) errors.push("Bank soal harus memiliki minimal 30 soal.");
  for (const question of bank) {
    if (ids.has(question.id)) errors.push(`ID ganda: ${question.id}`);
    ids.add(question.id);
    if (!QUESTION_LEVELS.includes(question.level)) errors.push(`Level tidak valid: ${question.id}`);
    if (!QUESTION_CONCEPTS.includes(question.category)) {
      errors.push(`Konsep tidak valid: ${question.id}`);
    } else {
      perConcept.set(question.category, perConcept.get(question.category) + 1);
    }
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      errors.push(`Opsi harus berjumlah 4: ${question.id}`);
    } else {
      if (new Set(question.options).size !== 4) errors.push(`Opsi ganda: ${question.id}`);
      if (question.options.some((option) => option.length > QUESTION_LIMITS.optionChars)) {
        errors.push(`Opsi terlalu panjang: ${question.id}`);
      }
    }
    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
      errors.push(`Kunci jawaban tidak valid: ${question.id}`);
    }
    if (!question.prompt || !question.explanation) {
      errors.push(`Teks soal tidak lengkap: ${question.id}`);
      continue;
    }
    const { prompt, explanation } = question;
    if (/\n/.test(prompt) || prompt.length > QUESTION_LIMITS.promptChars) {
      errors.push(`Soal harus satu baris <= ${QUESTION_LIMITS.promptChars} karakter: ${question.id}`);
    }
    if (narrativeWordCount(prompt) > QUESTION_LIMITS.promptWords) {
      errors.push(`Soal terlalu banyak kata cerita: ${question.id}`);
    }
    if (!prompt.includes("?") || prompt.split("→").length !== 2) {
      errors.push(`Soal harus berbentuk "data → besaran = ?": ${question.id}`);
    }
    if (MULTI_STEP_WORDS.test(prompt)) errors.push(`Soal tidak boleh bertahap: ${question.id}`);
    if (/\n/.test(explanation) || explanation.length > QUESTION_LIMITS.explanationChars) {
      errors.push(`Pembahasan harus satu baris pendek: ${question.id}`);
    }
  }
  for (const [concept, count] of perConcept) {
    if (count < QUESTION_LIMITS.minPerConcept) errors.push(`Konsep ${concept} hanya ${count} soal.`);
  }
  return errors;
}
