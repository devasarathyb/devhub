import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  names,
  readJson,
  updateJson,
  type Tree,
} from '@nx/devkit';
import * as path from 'node:path';
import type { ApplicationGeneratorSchema } from './schema';

export async function applicationGenerator(tree: Tree, options: ApplicationGeneratorSchema) {
  const appName = names(options.name).fileName;
  const createFrontend = options.type === 'frontend' || options.type === 'fullstack';
  const createBackend = options.type === 'backend' || options.type === 'fullstack';
  const webProjectName = `${appName}-web`;
  const apiProjectName = `${appName}-api`;
  const webRoot = `apps/${webProjectName}`;
  const apiRoot = `apps/${apiProjectName}`;

  if (createFrontend && tree.children(webRoot).length > 0) {
    throw new Error(`The frontend project "${webProjectName}" already exists.`);
  }
  if (createBackend && tree.children(apiRoot).length > 0) {
    throw new Error(`The backend project "${apiProjectName}" already exists.`);
  }

  if (createFrontend) {
    generateFiles(tree, path.join(__dirname, 'files', 'web'), webRoot, {
      appName,
      projectName: webProjectName,
    });
  }

  if (createBackend) {
    generateFiles(tree, path.join(__dirname, 'files', 'api'), apiRoot, {
      appName,
      projectName: apiProjectName,
    });
  }

  updateJson(tree, 'tsconfig.json', (tsconfig) => {
    const references = (tsconfig.references ?? []) as Array<{ path: string }>;
    if (createFrontend && !references.some((reference) => reference.path === `./${webRoot}`)) {
      references.push({ path: `./${webRoot}` });
    }
    if (createBackend && !references.some((reference) => reference.path === `./${apiRoot}`)) {
      references.push({ path: `./${apiRoot}` });
    }
    tsconfig.references = references;
    return tsconfig;
  });

  const rootPackageJson = readJson(tree, 'package.json');
  const nxVersion =
    rootPackageJson.devDependencies?.nx ?? rootPackageJson.dependencies?.nx ?? '^23.3.0';
  const runtimeDependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};

  if (createFrontend) {
    Object.assign(runtimeDependencies, {
      next: '~16.1.6',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    });
    Object.assign(devDependencies, {
      '@nx/next': nxVersion,
      '@types/node': '^22.0.0',
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      typescript: '~6.0.3',
    });
  }

  if (createBackend) {
    Object.assign(runtimeDependencies, {
      dotenv: '^18.0.8',
      express: '^5.1.0',
      mongodb: '^7.7.0',
    });
    Object.assign(devDependencies, {
      '@nx/esbuild': nxVersion,
      '@nx/js': nxVersion,
      '@types/express': '^5.0.0',
      '@types/node': '^22.0.0',
      typescript: '~6.0.3',
    });
  }

  const installDependencies = addDependenciesToPackageJson(
    tree,
    runtimeDependencies,
    devDependencies
  );
  await formatFiles(tree);
  return installDependencies;
}

export default applicationGenerator;
