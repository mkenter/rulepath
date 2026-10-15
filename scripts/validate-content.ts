import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  parseCrosslinks,
  parseGameDocument,
  parseProcedure,
  parseReference,
} from "../src/content/parser";
import {
  createContentRegistry,
  type ContentBundle,
} from "../src/content/registry";
import type { Crosslinks } from "../src/content/schema";

async function yamlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

async function loadContentBundle(directory: string): Promise<ContentBundle> {
  const gamePath = path.join(directory, "game.yaml");
  const game = parseGameDocument(await readFile(gamePath, "utf8"), gamePath);
  const procedurePaths = await yamlFiles(path.join(directory, "procedures"));
  const referencePaths = await yamlFiles(path.join(directory, "reference"));

  return {
    game,
    procedures: await Promise.all(
      procedurePaths.map(async (filePath) =>
        parseProcedure(await readFile(filePath, "utf8"), filePath),
      ),
    ),
    references: await Promise.all(
      referencePaths.map(async (filePath) =>
        parseReference(await readFile(filePath, "utf8"), filePath),
      ),
    ),
  };
}

async function contentDirectories(): Promise<string[]> {
  const root = path.resolve("content");
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== "fixtures")
    .map((entry) => path.join(root, entry.name))
    .sort();
}

async function main() {
  const directories = await contentDirectories();
  const bundles = await Promise.all(directories.map(loadContentBundle));
  const registry = createContentRegistry(bundles);
  const crosslinksByGame = new Map<string, Crosslinks>();

  for (let index = 0; index < directories.length; index += 1) {
    const directory = directories[index]!;
    const gameId = bundles[index]!.game.game.id;
    const crosslinksPath = path.join(directory, "crosslinks.yaml");
    crosslinksByGame.set(
      gameId,
      parseCrosslinks(await readFile(crosslinksPath, "utf8"), crosslinksPath),
    );
  }

  const crosslinkIssues: string[] = [];
  const presentationWarnings: string[] = [];

  for (const game of registry.games) {
    const crosslinks = crosslinksByGame.get(game.details.id);
    if (!crosslinks) {
      crosslinkIssues.push(`missing crosslinks for game "${game.details.id}"`);
      continue;
    }

    for (const procedure of game.procedures.values()) {
      for (const node of procedure.nodes) {
        if (node.type !== "decision") continue;
        const outcomes = procedure.edges.filter(
          (edge) => edge.from === node.id,
        );
        if (outcomes.length <= 3) continue;
        presentationWarnings.push(
          `${game.details.id}/${procedure.title} (${procedure.id}) decision "${node.label}" (${node.id}) has ${outcomes.length} outcomes: ${outcomes
            .map((edge) => `${edge.label ?? "Unlabelled"} -> ${edge.to}`)
            .join("; ")}`,
        );
      }

      const declaredTargets = crosslinks[procedure.id];
      const actualTargets = [
        ...new Set(
          procedure.nodes
            .filter((node) => node.type === "procedure")
            .map((node) => node.target),
        ),
      ].sort();

      if (!declaredTargets) {
        crosslinkIssues.push(
          `${game.details.id}: missing crosslink entry for procedure "${procedure.id}"`,
        );
        continue;
      }

      const sortedDeclaredTargets = [...declaredTargets].sort();
      if (
        JSON.stringify(sortedDeclaredTargets) !== JSON.stringify(actualTargets)
      ) {
        crosslinkIssues.push(
          `${game.details.id}: procedure "${procedure.id}" declares [${sortedDeclaredTargets.join(", ")}] but links [${actualTargets.join(", ")}]`,
        );
      }
    }

    for (const procedureId of Object.keys(crosslinks)) {
      if (!game.procedures.has(procedureId)) {
        crosslinkIssues.push(
          `${game.details.id}: crosslinks contains unknown procedure "${procedureId}"`,
        );
      }
    }
  }

  if (crosslinkIssues.length) {
    throw new Error(
      `Crosslink validation failed:\n${crosslinkIssues.map((issue) => `- ${issue}`).join("\n")}`,
    );
  }

  if (presentationWarnings.length) {
    console.warn(
      `Flow presentation warnings (>3 outcomes require authored presentation metadata):\n${presentationWarnings
        .map((warning) => `- ${warning}`)
        .join("\n")}`,
    );
  }

  const procedureCount = registry.games.reduce(
    (count, game) => count + game.procedures.size,
    0,
  );
  const referenceCount = registry.games.reduce(
    (count, game) => count + game.references.size,
    0,
  );

  console.log(
    `Validated ${registry.games.length} games, ${procedureCount} procedures, and ${referenceCount} references.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
