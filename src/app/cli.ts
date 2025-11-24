import { createInterface } from 'node:readline/promises';
import process from 'node:process';
import { AttendancePolicy } from '../domain/AttendancePolicy.js';
import { Evaluation } from '../domain/Evaluation.js';
import { ExtraPointsPolicy } from '../domain/ExtraPointsPolicy.js';
import { GradeCalculator } from '../domain/GradeCalculator.js';
import { ValidationError } from '../domain/ValidationError.js';

const PROMPT_PREFIX = '👉 ';
const MAX_EVALUATIONS = 10;
const MAX_TEACHER_POLICIES = 50;

export async function runCli(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  console.log('\n=== CS-GradeCalculator ===');

  try {
    const studentCode = await rl.question(`${PROMPT_PREFIX}Código del estudiante: `);
    if (!studentCode.trim()) {
      throw new ValidationError('El código del estudiante es obligatorio.');
    }

    const evaluationCount = await askNumber(rl, `Cantidad de evaluaciones (1-${MAX_EVALUATIONS}): `, 1, MAX_EVALUATIONS);
    const evaluations: Evaluation[] = [];

    for (let i = 0; i < evaluationCount; i += 1) {
      console.log(`\nEvaluación ${i + 1}`);
      const name = await rl.question(`${PROMPT_PREFIX}Nombre: `);
      const score = await askNumber(rl, `${PROMPT_PREFIX}Nota (0-20): `, 0, 20);
      const weight = await askNumber(rl, `${PROMPT_PREFIX}Peso porcentual (restante ${remainingWeight(evaluations)}): `, 0.1, 100);
      evaluations.push(new Evaluation({ name, score, weight }));
    }

    ensureWeightsCloseTo100(evaluations);

    const hasReachedMinClasses = await askBoolean(rl, `${PROMPT_PREFIX}¿Cumplió asistencia mínima? (s/n): `);

    const policyCount = await askNumber(rl, `${PROMPT_PREFIX}Cantidad de políticas anuales (1-${MAX_TEACHER_POLICIES}): `, 1, MAX_TEACHER_POLICIES);
    const allYearsTeachers: boolean[] = [];
    for (let i = 0; i < policyCount; i += 1) {
      const approval = await askBoolean(rl, `${PROMPT_PREFIX}¿Docentes del año ${i + 1} aprobaron puntos extra? (s/n): `);
      allYearsTeachers.push(approval);
    }

    const extraPoints = await askNumber(rl, `${PROMPT_PREFIX}Valor de puntos extra cuando aplique (0-5): `, 0, 5);

    const calculator = new GradeCalculator(
      new AttendancePolicy(),
      new ExtraPointsPolicy({ maxPoints: extraPoints, capGradeAt: 20 }),
    );

    const result = calculator.calculate({ evaluations, hasReachedMinClasses, allYearsTeachers });

    console.log('\n=== Resultado ===');
    console.log(`Estudiante: ${studentCode}`);
    console.log(`Promedio ponderado: ${result.weightedAverage}`);
    console.log(`Asistencia mínima cumplida: ${result.attendanceSatisfied ? 'Sí' : 'No'}`);
    console.log(`Docentes aprobaron puntos extra: ${result.extraPolicyApproved ? 'Sí' : 'No'}`);
    console.log(`Puntos extra aplicados: ${result.extraPointsApplied}`);
    console.log(`Nota final: ${result.finalGrade}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`\n[Error de validación] ${error.message}`);
    } else {
      console.error('\n[Error inesperado]', error);
    }
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

async function askNumber(
  rl: ReturnType<typeof createInterface>,
  question: string,
  min: number,
  max: number,
): Promise<number> {
  const answer = await rl.question(question);
  const value = Number.parseFloat(answer);

  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ValidationError(`Ingrese un valor numérico entre ${min} y ${max}.`);
  }

  return value;
}

async function askBoolean(rl: ReturnType<typeof createInterface>, question: string): Promise<boolean> {
  const answer = await rl.question(question);
  const normalized = answer.trim().toLowerCase();
  if (normalized === 's' || normalized === 'si' || normalized === 'sí') {
    return true;
  }
  if (normalized === 'n' || normalized === 'no') {
    return false;
  }
  throw new ValidationError('Responda con "s" o "n".');
}

function ensureWeightsCloseTo100(evaluations: Evaluation[]): void {
  const totalWeight = evaluations.reduce((acc, current) => acc + current.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.001) {
    throw new ValidationError('Los pesos deben sumar exactamente 100.');
  }
}

function remainingWeight(evaluations: Evaluation[]): string {
  const totalWeight = evaluations.reduce((acc, current) => acc + current.weight, 0);
  const remaining = 100 - totalWeight;
  return `${Math.max(0, remaining).toFixed(2)}%`;
}
