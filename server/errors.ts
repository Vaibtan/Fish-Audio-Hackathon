import { Data } from 'effect';
import type { ErrorCode } from '../shared/contracts';
export class ApiFailure extends Data.TaggedError('ApiFailure')<{
  code: ErrorCode; message: string;
}> {}

