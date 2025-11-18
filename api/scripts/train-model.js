#!/usr/bin/env node

/**
 * Model Training Script
 *
 * Trains or fine-tunes the gambling classifier model using anonymized training data
 *
 * Usage:
 *   node api/scripts/train-model.js [options]
 *
 * Options:
 *   --data-file <path>    Path to training data JSON file (default: api/data/training-data.json)
 *   --epochs <number>     Number of training epochs (default: 50)
 *   --batch-size <number> Batch size (default: 32)
 *   --validation <float>  Validation split (default: 0.2)
 *   --learning-rate <float> Learning rate (default: 0.001)
 *   --save-path <path>    Model save path (default: api/data/models/gambling-classifier)
 */

const fs = require('fs');
const path = require('path');
const GamblingClassifier = require('../models/gambling-classifier');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dataFile: 'api/data/training-data.json',
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    learningRate: 0.001,
    savePath: 'api/data/models/gambling-classifier',
    verbose: 1
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--data-file':
        options.dataFile = args[++i];
        break;
      case '--epochs':
        options.epochs = parseInt(args[++i]);
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--validation':
        options.validationSplit = parseFloat(args[++i]);
        break;
      case '--learning-rate':
        options.learningRate = parseFloat(args[++i]);
        break;
      case '--save-path':
        options.savePath = args[++i];
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Model Training Script

Usage:
  node api/scripts/train-model.js [options]

Options:
  --data-file <path>        Path to training data JSON file
  --epochs <number>         Number of training epochs (default: 50)
  --batch-size <number>     Batch size (default: 32)
  --validation <float>      Validation split (default: 0.2)
  --learning-rate <float>   Learning rate (default: 0.001)
  --save-path <path>        Model save path
  --help                    Show this help message

Examples:
  # Train with defaults
  node api/scripts/train-model.js

  # Train with custom parameters
  node api/scripts/train-model.js --epochs 100 --batch-size 64

  # Use custom training data
  node api/scripts/train-model.js --data-file /path/to/data.json
  `);
}

/**
 * Load training data
 */
function loadTrainingData(dataFile) {
  try {
    console.log(`Loading training data from: ${dataFile}`);

    if (!fs.existsSync(dataFile)) {
      throw new Error(`Training data file not found: ${dataFile}`);
    }

    const rawData = fs.readFileSync(dataFile, 'utf8');
    const data = JSON.parse(rawData);

    console.log(`Loaded ${data.length} training examples`);

    return data;
  } catch (error) {
    console.error('Error loading training data:', error.message);
    process.exit(1);
  }
}

/**
 * Split data into training and test sets
 */
function splitData(data, testSplit = 0.1) {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const testSize = Math.floor(shuffled.length * testSplit);

  const testData = shuffled.slice(0, testSize);
  const trainData = shuffled.slice(testSize);

  return { trainData, testData };
}

/**
 * Validate training data
 */
function validateData(data) {
  console.log('Validating training data...');

  let valid = 0;
  let invalid = 0;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    // Check required fields
    if (!item.features || !item.hasOwnProperty('isGambling')) {
      console.warn(`Invalid item at index ${i}: missing required fields`);
      invalid++;
      continue;
    }

    // Check features object
    if (typeof item.features !== 'object') {
      console.warn(`Invalid item at index ${i}: features is not an object`);
      invalid++;
      continue;
    }

    valid++;
  }

  console.log(`Validation complete: ${valid} valid, ${invalid} invalid`);

  if (invalid > 0) {
    const invalidPercent = (invalid / data.length) * 100;
    if (invalidPercent > 10) {
      throw new Error(`Too many invalid records (${invalidPercent.toFixed(1)}%). Fix training data.`);
    }
  }

  return data.filter((item, i) => item.features && item.hasOwnProperty('isGambling'));
}

/**
 * Print training statistics
 */
function printStats(data) {
  console.log('\n=== Training Data Statistics ===');
  console.log(`Total examples: ${data.length}`);

  const gamblingCount = data.filter(d => d.isGambling).length;
  const nonGamblingCount = data.length - gamblingCount;

  console.log(`Gambling transactions: ${gamblingCount} (${(gamblingCount / data.length * 100).toFixed(1)}%)`);
  console.log(`Non-gambling transactions: ${nonGamblingCount} (${(nonGamblingCount / data.length * 100).toFixed(1)}%)`);

  // Gambling type distribution
  const types = {};
  data.filter(d => d.isGambling && d.gamblingType).forEach(d => {
    types[d.gamblingType] = (types[d.gamblingType] || 0) + 1;
  });

  console.log('\nGambling types:');
  Object.entries(types).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Trigger distribution
  const triggers = {};
  data.filter(d => d.trigger).forEach(d => {
    triggers[d.trigger] = (triggers[d.trigger] || 0) + 1;
  });

  console.log('\nTriggers:');
  Object.entries(triggers).forEach(([trigger, count]) => {
    console.log(`  ${trigger}: ${count}`);
  });

  console.log('================================\n');
}

/**
 * Main training function
 */
async function main() {
  console.log('=== Gambling Classifier Training ===\n');

  const options = parseArgs();

  // Load training data
  const allData = loadTrainingData(options.dataFile);

  // Validate data
  const validData = validateData(allData);

  // Print statistics
  printStats(validData);

  // Split into train and test
  const { trainData, testData } = splitData(validData, 0.1);
  console.log(`Training set: ${trainData.length} examples`);
  console.log(`Test set: ${testData.length} examples\n`);

  // Initialize classifier
  console.log('Initializing model...');
  const classifier = new GamblingClassifier();
  await classifier.loadModel();

  console.log(`Model version: ${classifier.modelVersion}`);
  console.log('Model architecture:');
  const info = classifier.getModelInfo();
  console.log(`  Input features: ${info.architecture.inputFeatures}`);
  console.log(`  Hidden layers: ${info.architecture.hiddenLayers.join(' -> ')}`);
  console.log(`  Output heads: ${Object.keys(info.architecture.outputs).length}\n`);

  // Train model
  console.log('Starting training...');
  console.log(`Epochs: ${options.epochs}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log(`Validation split: ${options.validationSplit}`);
  console.log(`Learning rate: ${options.learningRate}\n`);

  const startTime = Date.now();

  const history = await classifier.train(trainData, {
    epochs: options.epochs,
    batchSize: options.batchSize,
    validationSplit: options.validationSplit,
    verbose: options.verbose
  });

  const trainingTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nTraining completed in ${trainingTime}s`);

  // Evaluate on test set
  console.log('\nEvaluating on test set...');
  const evaluation = await classifier.evaluate(testData);

  console.log('Test set results:');
  console.log(`  Loss: ${evaluation.loss}`);
  console.log(`  Accuracy: ${evaluation.accuracy}`);

  // Save model
  console.log('\nSaving model...');
  await classifier.saveModel();
  console.log(`Model saved to: ${options.savePath}`);

  // Print summary
  console.log('\n=== Training Summary ===');
  console.log(`Training examples: ${trainData.length}`);
  console.log(`Test examples: ${testData.length}`);
  console.log(`Training time: ${trainingTime}s`);
  console.log(`Final test accuracy: ${evaluation.accuracy}`);
  console.log(`Model version: ${classifier.modelVersion}`);
  console.log('========================\n');

  console.log('Training complete! ✓');
}

// Run training
if (require.main === module) {
  main().catch(error => {
    console.error('Training failed:', error);
    process.exit(1);
  });
}

module.exports = { main, loadTrainingData, validateData, splitData };
