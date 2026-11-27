import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const outdir = path.join(root, 'dist');
const entryPoints = {
  index: 'src/index.ts',
  llm: 'src/llm/core/index.ts',
  'llm/remote': 'src/llm/remote/index.ts',
  'llm/device': 'src/llm/device/index.ts',
  harness: 'src/harness/core/index.ts',
  'harness/onbloc': 'src/harness/mcp/index.ts',
};

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await Promise.all(['esm', 'cjs'].map(format => build({
  absWorkingDir: root,
  entryPoints,
  outdir,
  bundle: true,
  packages: 'external',
  platform: 'neutral',
  target: 'es2022',
  format,
  splitting: format === 'esm',
  outExtension: { '.js': format === 'esm' ? '.js' : '.cjs' },
  logLevel: 'info',
})));
await writeFile(path.join(outdir, 'package.json'), '{"type":"module"}\n');

const require = createRequire(import.meta.url);
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json'], {
  cwd: root,
  stdio: 'inherit',
});

// Explicit declaration specifiers also resolve under NodeNext, not just bundlers.
const typesRoot = path.join(outdir, 'types');
const declarations = (await readdir(typesRoot, { recursive: true })).filter(file => file.endsWith('.d.ts'));
const declarationPaths = new Set(declarations.map(file => path.join(typesRoot, file)));
for (const relative of declarations) {
  const file = path.join(typesRoot, relative);
  const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const result = ts.transform(source, [context => {
    function visit(node) {
      const parent = node.parent;
      const moduleSpecifier = parent && (
        ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) ||
        (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent) && parent.parent.argument === parent)
      );
      if (moduleSpecifier && ts.isStringLiteral(node) && node.text.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), node.text);
        const fileImport = declarationPaths.has(`${resolved}.d.ts`);
        if (!fileImport && !declarationPaths.has(path.join(resolved, 'index.d.ts'))) {
          throw new Error(`Unresolved declaration import: ${node.text} in ${file}`);
        }
        const specifier = fileImport ? `${node.text}.js` : `${node.text}/index.js`;
        return ts.factory.createStringLiteral(specifier);
      }
      return ts.visitEachChild(node, visit, context);
    }
    return node => ts.visitNode(node, visit);
  }]);
  await writeFile(file, ts.createPrinter().printFile(result.transformed[0]));
  result.dispose();
}
