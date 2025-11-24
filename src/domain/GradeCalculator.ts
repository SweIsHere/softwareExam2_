import { AttendancePolicy } from './AttendancePolicy.js';
import { Evaluation } from './Evaluation.js';
import { ExtraPointsPolicy } from './ExtraPointsPolicy.js';
import { ValidationError } from './ValidationError.js';

export interface GradeCalculationRequest {
  evaluations: Evaluation[];
  hasReachedMinClasses: boolean;
  allYearsTeachers: boolean[];
}

export interface GradeCalculationResult {
  weightedAverage: number;
  extraPointsApplied: number;
  finalGrade: number;
  attendanceSatisfied: boolean;
  extraPolicyApproved: boolean;
}

export class GradeCalculator {
  private static readonly MAX_EVALUATIONS = 10;

  constructor(
    private readonly attendancePolicy: AttendancePolicy,
    private readonly extraPointsPolicy: ExtraPointsPolicy,
  ) {}

  calculate(request: GradeCalculationRequest): GradeCalculationResult {
    this.ensureValidEvaluations(request.evaluations);
    const attendanceSatisfied = this.attendancePolicy.hasMinimumAttendance(
      request.hasReachedMinClasses,
    );
    const extraPolicyApproved = this.extraPointsPolicy.canApply(request.allYearsTeachers);

    const weightedAverage = this.computeWeightedAverage(request.evaluations);
    const extraPointsApplied = attendanceSatisfied && extraPolicyApproved
      ? this.extraPointsPolicy.computeExtraPoints(true)
      : 0;

    const rawFinalGrade = weightedAverage + extraPointsApplied;
    const finalGrade = this.extraPointsPolicy.clampFinalGrade(rawFinalGrade);

    return {
      weightedAverage: Number(weightedAverage.toFixed(2)),
      extraPointsApplied: Number(extraPointsApplied.toFixed(2)),
      finalGrade,
      attendanceSatisfied,
      extraPolicyApproved,
    };
  }

  private ensureValidEvaluations(evaluations: Evaluation[]): void {
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      throw new ValidationError('Debe registrar al menos una evaluación.');
    }

    if (evaluations.length > GradeCalculator.MAX_EVALUATIONS) {
      throw new ValidationError('La cantidad máxima de evaluaciones es 10.');
    }

    const totalWeight = evaluations.reduce((acc, current) => acc + current.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.001) {
      throw new ValidationError('La suma de pesos debe ser exactamente 100.');
    }
  }

  private computeWeightedAverage(evaluations: Evaluation[]): number {
    const weightedSum = evaluations.reduce((acc, current) => acc + current.score * current.weight, 0);
    return weightedSum / 100;
  }
}
