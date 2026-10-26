import test from "node:test";
import assert from "node:assert/strict";
import { CLASH } from "../shared/constants.js";
import {
  QUESTIONS,
  QUESTION_CONCEPTS,
  QUESTION_LEVELS,
  QUESTION_LIMITS,
  getQuestionById,
  questionsForLevel,
  validateQuestionBank,
} from "../shared/questions.js";

test("bank soal lolos validasi", () => {
  assert.deepEqual(validateQuestionBank(), []);
  assert.ok(QUESTIONS.length >= 30);
});

test("setiap tingkat memiliki soal yang cukup", () => {
  for (const level of QUESTION_LEVELS) {
    const questions = questionsForLevel(level);
    assert.ok(questions.length >= 8, `level ${level} hanya memiliki ${questions.length} soal`);
    for (const question of questions) assert.equal(question.level, level);
  }
});

test("setiap soal memiliki empat opsi dan kunci valid", () => {
  for (const question of QUESTIONS) {
    assert.equal(question.options.length, 4, question.id);
    assert.ok(Number.isInteger(question.answer), question.id);
    assert.ok(question.answer >= 0 && question.answer <= 3, question.id);
    assert.ok(question.prompt.trim().length > 10, question.id);
    assert.ok(question.explanation.trim().length > 10, question.id);
    assert.equal(new Set(question.options).size, 4, question.id);
  }
});

test("ID soal unik dan dapat dicari", () => {
  const ids = new Set(QUESTIONS.map((question) => question.id));
  assert.equal(ids.size, QUESTIONS.length);
  const first = QUESTIONS[0];
  assert.equal(getQuestionById(first.id), first);
  assert.equal(getQuestionById("tidak-ada"), null);
});

test("soal Physics Clash singkat: satu baris, satu konsep, bisa dijawab 5 detik", () => {
  assert.equal(CLASH.duration, 5);
  for (const question of QUESTIONS) {
    assert.ok(question.prompt.length <= QUESTION_LIMITS.promptChars, question.id);
    assert.ok(question.prompt.includes("→") && question.prompt.includes("?"), question.id);
    assert.ok(QUESTION_CONCEPTS.includes(question.category), question.id);
    assert.ok(question.explanation.length <= QUESTION_LIMITS.explanationChars, question.id);
  }
});

test("setiap konsep dan tingkat punya soal seimbang", () => {
  for (const concept of QUESTION_CONCEPTS) {
    assert.ok(QUESTIONS.filter((question) => question.category === concept).length >= QUESTION_LIMITS.minPerConcept, concept);
    for (const level of QUESTION_LEVELS) {
      assert.ok(questionsForLevel(level).some((question) => question.category === concept), `${concept}/${level}`);
    }
  }
});

test("validator menolak soal cerita panjang dan soal bertahap", () => {
  const base = QUESTIONS[0];
  const story = { ...base, id: "x1", prompt: "Sebuah bola bermassa dua kilogram bergerak dengan kecepatan tiga meter per detik. Berapa momentumnya?" };
  const steps = { ...base, id: "x2", prompt: "m = 2 kg, v = 3 m/s, lalu → p = ?" };
  const noArrow = { ...base, id: "x3", prompt: "m = 2 kg, v = 3 m/s, p = ?" };
  for (const bad of [story, steps, noArrow]) {
    assert.ok(validateQuestionBank([...QUESTIONS, bad]).length > 0, bad.id);
  }
});
