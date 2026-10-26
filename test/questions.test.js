import test from "node:test";
import assert from "node:assert/strict";
import {
  QUESTIONS,
  QUESTION_LEVELS,
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
