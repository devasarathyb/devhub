import { formatFiles, generateFiles, names, type Tree } from '@nx/devkit';
import * as path from 'node:path';
import type { PresetGeneratorSchema } from './schema';

export async function presetGenerator(tree: Tree, options: PresetGeneratorSchema) {
  const workspaceName = names(options.name).fileName;

  generateFiles(tree, path.join(__dirname, 'files'), '.', {
    name: workspaceName,
  });

  await formatFiles(tree);
}

export default presetGenerator;
