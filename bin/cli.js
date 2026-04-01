#!/usr/bin/env node

import { Command } from 'commander';
import { generate } from '../src/index.js';
import { loadConfig } from '../src/config.js';
import { SIZES } from '../src/sizes.js';

const program = new Command();

program
  .name('clik-screenshots')
  .description('Automated iOS App Store screenshot generator for canvas/WebGL games')
  .version('0.1.0');

program
  .command('generate')
  .description('Generate App Store screenshots')
  .option('--scene <id>', 'Generate only a specific scene')
  .option('--size <id>', 'Generate only a specific device size')
  .option('--mode <mode>', 'Output mode: clean, composited, or both', 'both')
  .option('--config <path>', 'Path to config file', 'clik-screenshots.config.js')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      await generate(config, {
        sceneFilter: options.scene,
        sizeFilter: options.size,
        mode: options.mode,
      });
    } catch (err) {
      console.error(`\n  Error: ${err.message}\n`);
      process.exit(1);
    }
  });

program
  .command('templates')
  .description('List available layout templates')
  .action(() => {
    console.log('\n  Available templates:\n');
    console.log('    device-centered   Device frame centered, headline text above');
    console.log('    device-angled     Device with perspective tilt and strong shadow');
    console.log('    full-bleed        Edge-to-edge game screenshot with text overlay');
    console.log('    minimal           Clean screenshot, optional subtle text');
    console.log('    side-by-side      Two screenshots in device frames\n');
  });

program
  .command('sizes')
  .description('List iOS App Store screenshot sizes')
  .action(() => {
    console.log('\n  iOS App Store screenshot sizes:\n');
    for (const size of SIZES) {
      console.log(`    ${size.id.padEnd(14)} ${size.width}×${size.height}  ${size.label}`);
    }
    console.log();
  });

program
  .command('ui')
  .description('Launch interactive preview UI')
  .option('--port <port>', 'UI server port', '3456')
  .option('--config <path>', 'Path to config file', 'clik-screenshots.config.js')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const { startUI } = await import('../src/ui/server.js');
      const port = process.env.PORT || options.port;
      await startUI(config, parseInt(port));
    } catch (err) {
      console.error(`\n  Error: ${err.message}\n`);
      process.exit(1);
    }
  });

program.parse();
