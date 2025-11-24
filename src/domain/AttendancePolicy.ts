import { ValidationError } from './ValidationError.js';

export class AttendancePolicy {
  hasMinimumAttendance(hasReachedMinClasses: boolean): boolean {
    if (typeof hasReachedMinClasses !== 'boolean') {
      throw new ValidationError('La asistencia mínima debe registrarse como verdadero o falso.');
    }

    return hasReachedMinClasses;
  }
}
