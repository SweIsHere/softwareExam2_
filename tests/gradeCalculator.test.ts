import { describe, expect, it } from 'vitest';
import { AttendancePolicy } from '../src/domain/AttendancePolicy.js';
import { Evaluation } from '../src/domain/Evaluation.js';
import { ExtraPointsPolicy } from '../src/domain/ExtraPointsPolicy.js';
import { GradeCalculator } from '../src/domain/GradeCalculator.js';
import { ValidationError } from '../src/domain/ValidationError.js';

describe('Evaluation', () => {
  it('should create a valid evaluation', () => {
    const evaluation = new Evaluation({ name: 'Test', score: 15, weight: 20 });
    expect(evaluation.name).toBe('Test');
    expect(evaluation.score).toBe(15);
    expect(evaluation.weight).toBe(20);
  });

  it('should throw error for empty name', () => {
    expect(() => new Evaluation({ name: '', score: 10, weight: 10 })).toThrow(ValidationError);
    expect(() => new Evaluation({ name: '   ', score: 10, weight: 10 })).toThrow(ValidationError);
  });

  it('should throw error for invalid score', () => {
    expect(() => new Evaluation({ name: 'Test', score: -1, weight: 10 })).toThrow(ValidationError);
    expect(() => new Evaluation({ name: 'Test', score: 21, weight: 10 })).toThrow(ValidationError);
    expect(() => new Evaluation({ name: 'Test', score: NaN, weight: 10 })).toThrow(ValidationError);
  });

  it('should throw error for invalid weight', () => {
    expect(() => new Evaluation({ name: 'Test', score: 10, weight: 0 })).toThrow(ValidationError);
    expect(() => new Evaluation({ name: 'Test', score: 10, weight: 101 })).toThrow(ValidationError);
    expect(() => new Evaluation({ name: 'Test', score: 10, weight: NaN })).toThrow(ValidationError);
  });
});

describe('AttendancePolicy', () => {
  const policy = new AttendancePolicy();

  it('should return true when attendance is met', () => {
    expect(policy.hasMinimumAttendance(true)).toBe(true);
  });

  it('should return false when attendance is not met', () => {
    expect(policy.hasMinimumAttendance(false)).toBe(false);
  });

  it('should throw error for invalid input type', () => {
    // @ts-expect-error Testing runtime validation
    expect(() => policy.hasMinimumAttendance('yes')).toThrow(ValidationError);
  });
});

describe('ExtraPointsPolicy', () => {
  it('should create valid policy', () => {
    const policy = new ExtraPointsPolicy({ maxPoints: 2, capGradeAt: 20 });
    expect(policy).toBeDefined();
  });

  it('should throw error for invalid max points', () => {
    expect(() => new ExtraPointsPolicy({ maxPoints: -1, capGradeAt: 20 })).toThrow(ValidationError);
    expect(() => new ExtraPointsPolicy({ maxPoints: 6, capGradeAt: 20 })).toThrow(ValidationError);
  });

  it('should throw error for invalid cap grade', () => {
    expect(() => new ExtraPointsPolicy({ maxPoints: 2, capGradeAt: 0 })).toThrow(ValidationError);
  });

  it('should validate teacher policies list', () => {
    const policy = new ExtraPointsPolicy({ maxPoints: 1, capGradeAt: 20 });
    expect(() => policy.canApply([])).toThrow(ValidationError);
    expect(() => policy.canApply(new Array(51).fill(true))).toThrow(ValidationError);
    // @ts-expect-error Testing runtime validation
    expect(() => policy.canApply([true, 'yes'])).toThrow(ValidationError);
  });

  it('should approve extra points only if all teachers agree', () => {
    const policy = new ExtraPointsPolicy({ maxPoints: 1, capGradeAt: 20 });
    expect(policy.canApply([true, true])).toBe(true);
    expect(policy.canApply([true, false])).toBe(false);
  });
});

describe('GradeCalculator', () => {
  const attendancePolicy = new AttendancePolicy();
  const makeCalculator = (maxPoints = 1, cap = 20) =>
    new GradeCalculator(attendancePolicy, new ExtraPointsPolicy({ maxPoints, capGradeAt: cap }));

  const baseEvaluations = [
    new Evaluation({ name: 'P1', score: 15, weight: 50 }),
    new Evaluation({ name: 'P2', score: 15, weight: 50 }),
  ];

  it('should calculate basic weighted average', () => {
    const calculator = makeCalculator();
    const result = calculator.calculate({
      evaluations: baseEvaluations,
      hasReachedMinClasses: true,
      allYearsTeachers: [true],
    });
    expect(result.weightedAverage).toBe(15);
    expect(result.finalGrade).toBe(16); // 15 + 1 extra
  });

  it('should not apply extra points if attendance failed', () => {
    const calculator = makeCalculator();
    const result = calculator.calculate({
      evaluations: baseEvaluations,
      hasReachedMinClasses: false,
      allYearsTeachers: [true],
    });
    expect(result.extraPointsApplied).toBe(0);
    expect(result.finalGrade).toBe(15);
  });

  it('should not apply extra points if teachers disagree', () => {
    const calculator = makeCalculator();
    const result = calculator.calculate({
      evaluations: baseEvaluations,
      hasReachedMinClasses: true,
      allYearsTeachers: [false],
    });
    expect(result.extraPointsApplied).toBe(0);
    expect(result.finalGrade).toBe(15);
  });

  it('should cap final grade', () => {
    const calculator = makeCalculator(5, 18); // Max 5 points, cap at 18
    const evals = [
      new Evaluation({ name: 'E1', score: 18, weight: 50 }),
      new Evaluation({ name: 'E2', score: 18, weight: 50 }),
    ];
    const result = calculator.calculate({
      evaluations: evals,
      hasReachedMinClasses: true,
      allYearsTeachers: [true],
    });
    // Average 18 + 5 extra = 23, capped at 18
    expect(result.finalGrade).toBe(18);
  });

  it('should validate evaluations array', () => {
    const calculator = makeCalculator();
    expect(() => calculator.calculate({
      evaluations: [],
      hasReachedMinClasses: true,
      allYearsTeachers: [true],
    })).toThrow(ValidationError);

    const tooManyEvals = Array(11).fill(new Evaluation({ name: 'E', score: 10, weight: 9 }));
    expect(() => calculator.calculate({
      evaluations: tooManyEvals,
      hasReachedMinClasses: true,
      allYearsTeachers: [true],
    })).toThrow(ValidationError);
  });

  it('should validate weight sum', () => {
    const calculator = makeCalculator();
    const invalidWeights = [
      new Evaluation({ name: 'E1', score: 10, weight: 50 }),
      new Evaluation({ name: 'E2', score: 10, weight: 40 }), // Sum 90
    ];
    expect(() => calculator.calculate({
      evaluations: invalidWeights,
      hasReachedMinClasses: true,
      allYearsTeachers: [true],
    })).toThrow(ValidationError);
  });
});
