import { parse } from 'yaml';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

import {
  gameDocumentSchema,
  crosslinksSchema,
  procedureSchema,
  referenceSchema,
  type GameDocument,
  type Crosslinks,
  type Procedure,
  type Reference,
} from './schema';

export class ContentParseError extends Error {
  constructor(
    public readonly sourceName: string,
    message: string,
  ) {
    super(`${sourceName}: ${message}`);
    this.name = 'ContentParseError';
  }
}

function parseDocument<T>(source: string, sourceName: string, schema: ZodType<T>): T {
  let value: unknown;

  try {
    value = parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid YAML';
    throw new ContentParseError(sourceName, message);
  }

  try {
    return schema.parse(value);
  } catch (error) {
    if (!(error instanceof ZodError)) {
      throw error;
    }

    const details = error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new ContentParseError(sourceName, details);
  }
}

export function parseGameDocument(source: string, sourceName: string): GameDocument {
  return parseDocument(source, sourceName, gameDocumentSchema);
}

export function parseProcedure(source: string, sourceName: string): Procedure {
  return parseDocument(source, sourceName, procedureSchema);
}

export function parseReference(source: string, sourceName: string): Reference {
  return parseDocument(source, sourceName, referenceSchema);
}

export function parseCrosslinks(source: string, sourceName: string): Crosslinks {
  return parseDocument(source, sourceName, crosslinksSchema);
}
