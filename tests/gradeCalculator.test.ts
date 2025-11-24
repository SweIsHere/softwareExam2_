import { describe, expect, it } from 'vitest';
import { AttendancePolicy } from '../src/domain/AttendancePolicy.js';
import { Evaluation } from '../src/domain/Evaluation.js';
import { ExtraPointsPolicy } from '../src/domain/ExtraPointsPolicy.js';
import { GradeCalculator } from '../src/domain/GradeCalculator.js';
import { ValidationError } from '../src/domain/ValidationError.js';

const baseEvaluations = [
  new Evaluation({ name: 'Parcial', score: 15, weight: 40 }),
  new Evaluation({ name: 'Proyecto', score: 18, weight: 60 }),
];

const attendancePolicy = new AttendancePolicy();
const makeCalculator = (maxPoints = 1, cap = 20): GradeCalculator =>
  new GradeCalculator(attendancePolicy, new ExtraPointsPolicy({ maxPoints, capGradeAt: cap }));

describe('GradeCalculator', () => {
  it('should calculate final grade with attendance and extra points', () => {
    const calculator = makeCalculator(1);
    const result = calculator.calculate({
      evaluations: baseEvaluations,
      hasReachedMinClasses: true,
      allYearsTeachers: [true, true],
    });

    expect(result.weightedAverage).toBeCloseTo(16.8, 2);
    expect(result.extraPointsApplied).toBe(1);
    expect(result.finalGrade).toBeCloseTo(17.8, 2);
  });

  it('should skip extra points when attendance fails', () => {
    const calculator = makeCalculator(2);
    const result = calculator.calculate({
      evaluations: baseEvaluations,
      hasReachedMinClasses: false,
      allYearsTeachers: [true, true],
    });

    expect(result.extraPointsApplied).toBe(0);
    expect(result.finalGrade).toBeCloseTo(16.8, 2);
  });

  it('should skip extra points when teachers disagree', () => {
    const calculator = makeCalculator(2);
    const result = calculator.calculate({
      evaluations: baseEvaluations,
      hasReachedMinClasses: true,
      allYearsTeachers: [true, false],
    });

    expect(result.extraPointsApplied).toBe(0);
    expect(result.finalGrade).toBeCloseTo(16.8, 2);
  });

  it('should cap final grade at configured limit', () => {
    const calculator = makeCalculator(5, 18);
    const evaluations = [
      new Evaluation({ name: 'Examen', score: 19, weight: 50 }),
      new Evaluation({ name: 'Proyecto', score: 20, weight: 50 }),
    ];

    const result = calculator.calculate({
      evaluations,
      hasReachedMinClasses: true,
      allYearsTeachers: [true],
    });

    expect(result.finalGrade).toBe(18);
  });

  it('should throw when no evaluations are provided', () => {
    const calculator = makeCalculator();
    expect(() => calculator.calculate({
      evaluations: [],
      hasReachedMinClasses: true,
      allYearsTeachers: [true],
    })).toThrow(ValidationError);
  });

  it('should throw when evaluations exceed maximum allowed', () => {
    const calculator = makeCalculator();
    const evaluations = Array.from({ length: 11 }, (_, index) =>
      new Evaluation({ name: `Eval ${index + 1}`, score: 12, weight: 100 / 11 }),
    );

    expect(() => calculator.calculate({
      evaluations,
      hasReachedMinClasses: true,
      allYearsTeachers: [true],
    })).toThrow(ValidationError);
  });

  it('should throw when weights do not sum 100', () => {
    const calculator = makeCalculator();
    const evaluations = [
      new Evaluation({ name: 'Eval 1', score: 10, weight: 30 }),
      new Evaluation({ name: 'Eval 2', score: 10, weight: 30 }),
    ];

    expect(() => calculator.calculate({
      evaluations,
      hasReachedMinClasses: true,
      allYearsTeachers: [true],
    })).toThrow('La suma de pesos debe ser exactamente 100.');
  });
});
