const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Test cases for HTML output format
const testCases = [
  {
    name: 'Simple template',
    templateFile: 'simple-template.yaml', 
    ciMode: true,
    outputFile: 'test-output-html.html',
    args: ['--standalone']
  },
  {
    name: 'Complex template',
    templateFile: 'complex-template.yaml',
    ciMode: true,
    outputFile: 'test-output-html-complex.html',
    args: ['--standalone']
  }
];

// Helper function to run the CLI command
function runHtmlCommand(templateFile, ciMode, outputFile, extraArgs = []) {
  // Use the project's root directory
  const projectRoot = path.resolve(__dirname, '../../../');
  
  // Path to the test template
  const templatePath = path.resolve(projectRoot, `tests/resources/${templateFile}`);
  
  // Prepare command arguments
  const args = [
    path.join(projectRoot, 'index.js'),
    'html',
    '-t', templatePath
  ];
  
  // Add ci flag if needed
  if (ciMode) {
    args.push('--ci-mode');
  }
  
  // For HTML, we need a directory path rather than a file
  const outputDir = path.join(projectRoot, 'tests', 'output', outputFile.replace('.html', ''));
  args.push('-o', outputDir);
  
  // Make sure the directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Add any extra arguments
  if (extraArgs && extraArgs.length > 0) {
    args.push(...extraArgs);
  }
  
  // Run the CLI command
  return spawnSync('node', args, {
    encoding: 'utf-8',
    stdio: 'pipe',
    cwd: projectRoot,
    env: { 
      ...process.env,
      FORCE_COLOR: '0',  // Disable colors in the output for consistent snapshots
      NODE_ENV: 'test'   // Mark as test environment
    }
  });
}

// Clean output for snapshots
function cleanOutput(content) {
  if (!content) return '';
  
  // HTML-specific cleaning
  return content
    .replace(/node\d+/g, 'node[ID]')
    .replace(/edge\d+/g, 'edge[ID]')
    .replace(/modified="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z"/g, 'modified="[TIMESTAMP]"')
    .replace(/date="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z"/g, 'date="[TIMESTAMP]"');
}

// For each test case, create a describe block
testCases.forEach(({ name, templateFile, ciMode, outputFile, args }) => {
  describe(`HTML Output Format: ${name}`, () => {
    let result;
    let outputContent;
    
    // Setup - run once for each describe block
    beforeAll(() => {
      result = runHtmlCommand(templateFile, ciMode, outputFile, args);
      
      try {
        const projectRoot = path.resolve(__dirname, '../../../');
        const outputDir = path.join(projectRoot, 'tests', 'output', outputFile.replace('.html', ''));
        const htmlFile = path.join(outputDir, 'index.html');
        
        if (fs.existsSync(htmlFile)) {
          outputContent = fs.readFileSync(htmlFile, 'utf-8');
        } else {
          outputContent = `Error: Output file not found: ${htmlFile}`;
        }
      } catch (error) {
        outputContent = `Error reading output file: ${error.message}`;
      }
    });
    
    // Cleanup after tests
    afterAll(() => {
      try {
        const projectRoot = path.resolve(__dirname, '../../../');
        const outputDir = path.join(projectRoot, 'tests', 'output', outputFile.replace('.html', ''));
        const htmlFile = path.join(outputDir, 'index.html');
        
        if (fs.existsSync(htmlFile)) {
          fs.unlinkSync(htmlFile);
        }
        if (fs.existsSync(outputDir)) {
          fs.rmdirSync(outputDir, { recursive: true });
        }
      } catch (error) {
        console.error(`Error cleaning up directory ${outputFile}:`, error.message);
      }
    });
    
    // Test successful execution
    test('should complete successfully', () => {
      expect(result.status).toBe(0);
    });
    
    // Test for no errors in stderr
    test('should have no errors', () => {
      const cleanStdErr = result.stderr
        .replace(/\(node:\d+\) \[DEP\d+\].*\n?/g, '')
        .replace(/\(Use `node --trace-deprecation.*\n?/g, '')
        .trim();
      expect(cleanStdErr).toBe('');
    });
    
    // Test for file creation
    test('should create output file', () => {
      expect(outputContent).not.toContain('Error:');
    });
    
    // Test for HTML structure
    test('should have valid HTML structure', () => {
      expect(outputContent).toContain('<!DOCTYPE html');
      expect(outputContent).toContain('<html');
      expect(outputContent).toContain('</html>');
    });
    
    // Snapshot test for HTML
    test('should match snapshot', () => {
      const cleaned = cleanOutput(outputContent);
      
      // Create a unique snapshot name based on the test case
      const snapshotName = `html - ${path.basename(templateFile)}`;
      
      expect(cleaned).toMatchSnapshot(snapshotName);
    });
  });
});