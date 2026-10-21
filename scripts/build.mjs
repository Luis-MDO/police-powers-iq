import * as esbuild from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const builds = [
  {
    entryPoints: ['styles/styles.css'],
    outfile: 'styles.css',
    bundle: true,
    minify: true,
    // Keep conventional selectors; do not introduce nesting or cascade layers.
    target: ['chrome90', 'firefox90', 'safari14'],
    banner: { css: '/* Generated from styles/. Edit source files and run npm run build. */' },
  },
  {
    entryPoints: ['visuals/landing-scene.js'],
    outfile: 'assets/landing-scene.js',
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['es2020'],
    legalComments: 'linked',
  },
];

if (watch) {
  for (const options of builds) {
    const context = await esbuild.context(options);
    await context.watch();
  }
  console.log('Watching CSS sources and the optional landing scene.');
} else {
  for (const options of builds) await esbuild.build(options);
  await mkdir('dist/assets', { recursive: true });
  await copyFile('node_modules/three/LICENSE', 'assets/THREE-LICENSE.txt');
  const runtimeFiles = ['index.html','styles.css','app.js','appearance.js','landing.js',
    'study-tools.js','study-guide.js','question-reports.js','report-confirmed.html',
    'questions.js','legal-feedback.js','legal-authorities.json','question-feedback.json'];
  for (const file of runtimeFiles) await copyFile(file, `dist/${file}`);
  for (const file of ['landing-scene.js','landing-scene.js.LEGAL.txt','THREE-LICENSE.txt']) {
    await copyFile(`assets/${file}`, `dist/assets/${file}`);
  }
  console.log('Built one CSS bundle and the optional 3D scene. Deployment files are in dist/.');
}
