import { ValidationError } from './ValidationError.js';

export interface EvaluationProps {
  name: string;
  score: number;
  weight: number;
}

export class Evaluation {
  public readonly name: string;
  public readonly score: number;
  public readonly weight: number;

  private static readonly SCORE_MIN = 0;
  private static readonly SCORE_MAX = 20;
  private static readonly WEIGHT_MIN = 0.1;
  private static readonly WEIGHT_MAX = 100;

  constructor({ name, score, weight }: EvaluationProps) {
    if (!name || !name.trim()) {
      throw new ValidationError('El nombre de la evaluación es obligatorio.');
    }

    if (!Number.isFinite(score) || score < Evaluation.SCORE_MIN || score > Evaluation.SCORE_MAX) {
      throw new ValidationError('La nota debe estar entre 0 y 20.');
    }

    if (!Number.isFinite(weight) || weight < Evaluation.WEIGHT_MIN || weight > Evaluation.WEIGHT_MAX) {
      throw new ValidationError('El peso debe estar entre 0.1 y 100.');
    }

    this.name = name.trim();
    this.score = Number(score.toFixed(2));
    this.weight = Number(weight.toFixed(2));
  }
}
