import { z } from 'zod';

const idSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase kebab-case IDs');

const nonEmptyTextSchema = z.string().trim().min(1);

const webUrlSchema = z.url({ protocol: /^https?$/ });

export const publicationSchema = z
  .object({
    title: nonEmptyTextSchema,
    edition: nonEmptyTextSchema,
    url: webUrlSchema,
    creator: nonEmptyTextSchema,
    publisher: nonEmptyTextSchema.optional(),
  })
  .strict();

export const licensingSchema = z
  .object({
    copyright: nonEmptyTextSchema,
    license: z.object({ name: nonEmptyTextSchema, url: webUrlSchema }).strict(),
    attribution: nonEmptyTextSchema,
    adaptation: nonEmptyTextSchema,
  })
  .strict();

export const sourceMetadataSchema = z
  .object({
    publication: publicationSchema,
    licensing: licensingSchema,
  })
  .strict();

export const sourceSchema = z
  .object({
    section: nonEmptyTextSchema,
    pages: z.array(z.number().int().positive()).min(1).optional(),
    // Replace whole groups so their required fields stay together.
    overrides: sourceMetadataSchema.partial().optional(),
  })
  .strict();

const terminalNodeSchema = z
  .object({
    id: idSchema,
    type: z.enum(['start', 'end']),
    label: nonEmptyTextSchema,
  })
  .strict();

const stepNodeSchema = z
  .object({
    id: idSchema,
    type: z.literal('step'),
    label: nonEmptyTextSchema,
  })
  .strict();

const decisionNodeSchema = z
  .object({
    id: idSchema,
    type: z.literal('decision'),
    label: nonEmptyTextSchema,
  })
  .strict();

const procedureLinkNodeSchema = z
  .object({
    id: idSchema,
    type: z.literal('procedure'),
    label: nonEmptyTextSchema,
    target: idSchema,
  })
  .strict();

export const procedureNodeSchema = z.discriminatedUnion('type', [
  terminalNodeSchema,
  stepNodeSchema,
  decisionNodeSchema,
  procedureLinkNodeSchema,
]);

export const edgeSchema = z
  .object({
    from: idSchema,
    to: idSchema,
    label: nonEmptyTextSchema.optional(),
  })
  .strict();

export const procedureSchema = z
  .object({
    id: idSchema,
    title: nonEmptyTextSchema,
    aliases: z.array(nonEmptyTextSchema).default([]),
    summary: nonEmptyTextSchema,
    source: sourceSchema,
    nodes: z.array(procedureNodeSchema).min(1),
    edges: z.array(edgeSchema),
    keyRules: z.array(nonEmptyTextSchema).default([]),
    references: z.array(idSchema).default([]),
    related: z.array(idSchema).default([]),
    authorNotes: z.array(nonEmptyTextSchema).default([]),
  })
  .strict();

const relatedResourceSchema = z.union([
  z.object({ procedure: idSchema }).strict(),
  z.object({ reference: idSchema }).strict(),
]);

const referenceTableSchema = z.object({
  columns: z.array(nonEmptyTextSchema).min(1),
  rows: z.array(z.array(nonEmptyTextSchema).min(1)).min(1),
}).strict().superRefine((table, context) => {
  table.rows.forEach((row, index) => {
    if (row.length !== table.columns.length) {
      context.addIssue({ code: 'custom', path: ['rows', index], message: 'Row must match the number of columns' });
    }
  });
});

const referenceSectionSchema = z.object({
  heading: nonEmptyTextSchema,
  paragraphs: z.array(nonEmptyTextSchema).default([]),
  bullets: z.array(nonEmptyTextSchema).default([]),
  table: referenceTableSchema.optional(),
}).strict();

export const referenceSchema = z
  .object({
    id: idSchema,
    title: nonEmptyTextSchema,
    aliases: z.array(nonEmptyTextSchema).default([]),
    summary: nonEmptyTextSchema,
    source: sourceSchema,
    sections: z.array(referenceSectionSchema).optional(),
    related: z.array(relatedResourceSchema).default([]),
    authorNotes: z.array(nonEmptyTextSchema).default([]),
  })
  .strict();

const sectionItemSchema = z.union([
  z.object({ procedure: idSchema }).strict(),
  z.object({ reference: idSchema }).strict(),
]);

export const gameDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    game: z
      .object({
        id: idSchema,
        title: nonEmptyTextSchema,
        publisher: nonEmptyTextSchema.optional(),
        summary: nonEmptyTextSchema.optional(),
        accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        source: sourceMetadataSchema,
      })
      .strict(),
    sections: z.array(
      z
        .object({
          id: idSchema,
          title: nonEmptyTextSchema,
          items: z.array(sectionItemSchema),
        })
        .strict(),
    ),
  })
  .strict();

export const crosslinksSchema = z.record(idSchema, z.array(idSchema));

export type Source = z.infer<typeof sourceSchema>;
export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;
export type ResolvedSource = SourceMetadata & Pick<Source, 'section' | 'pages'>;
export type ProcedureNode = z.infer<typeof procedureNodeSchema>;
export type Procedure = z.infer<typeof procedureSchema>;
export type Reference = z.infer<typeof referenceSchema>;
export type GameDocument = z.infer<typeof gameDocumentSchema>;
export type SectionItem = GameDocument['sections'][number]['items'][number];
export type Crosslinks = z.infer<typeof crosslinksSchema>;
