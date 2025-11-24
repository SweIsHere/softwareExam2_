import { ValidationError } from './ValidationError.js';

export interface ExtraPointsConfig {
  maxPoints: number;
  capGradeAt: number;
}

export class ExtraPointsPolicy {
  private readonly maxPoints: number;
  private readonly capGradeAt: number;

  constructor(config: ExtraPointsConfig) {
    if (config.maxPoints < 0 || config.maxPoints > 5) {
      throw new ValidationError('Los puntos extra deben estar entre 0 y 5.');
    }

    if (config.capGradeAt <= 0) {
      throw new ValidationError('El tope de nota final debe ser mayor que 0.');
    }

    this.maxPoints = Number(config.maxPoints.toFixed(2));
    this.capGradeAt = Number(config.capGradeAt.toFixed(2));
  }

  canApply(allYearsTeachers: boolean[]): boolean {
    if (!Array.isArray(allYearsTeachers) || allYearsTeachers.length === 0) {
      throw new ValidationError('Debe registrar al menos una política anual de docentes.');
    }

    if (allYearsTeachers.length > 50) {
      throw new ValidationError('La lista de políticas no debe exceder 50 entradas.');
    }

    if (!allYearsTeachers.every((value) => typeof value === 'boolean')) {
      throw new ValidationError('Las decisiones de docentes deben ser booleanas.');
    }

    return allYearsTeachers.every(Boolean);
  }

  computeExtraPoints(apply: boolean): number {
    return apply ? this.maxPoints : 0;
  }

  clampFinalGrade(grade: number): number {
    return Math.min(this.capGradeAt, Number(grade.toFixed(2)));
  }
}
