const path = require('path');
const { spawnSync } = require('child_process');

describe('ascii-art snapshot', () => {
  test('should generate expected output for a simple template', () => {
    // Use the project's root directory
    const projectRoot = path.resolve(__dirname, '../../../');
    
    // Path to the test template
    const templatePath = path.resolve(projectRoot, 'tests/resources/simple-template.yaml');
    
    // Run the CLI command with the test template
    // We'll use an environment variable to prevent clearing the console and to suppress colors
    const result = spawnSync('node', [
      path.join(projectRoot, 'index.js'),
      'ascii-art',
      '-t', templatePath
    ], {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: projectRoot,
      env: { 
        ...process.env,
        FORCE_COLOR: '0',  // Disable colors in the output for consistent snapshots
        NODE_ENV: 'test'  // Mark as test environment
      }
    });
    
    // Check that the command completed successfully
    expect(result.status).toBe(0);
    
    // Filter out deprecation warnings and other non-error messages
    const cleanStdErr = result.stderr
      .replace(/\(node:\d+\) \[DEP\d+\].*\n?/g, '')
      .replace(/\(Use `node --trace-deprecation.*\n?/g, '')
      .trim();
    
    // Expect no errors
    expect(cleanStdErr).toBe('');
    
    // Check that our fixed error doesn't appear anymore
    expect(result.stderr).not.toContain('parser.parse is not a function');
    
    // The ASCII art output is variable by terminal size and other factors,
    // so we'll just ensure the output contains expected elements
    expect(result.stdout).toContain('Lambda');
    expect(result.stdout).toContain('Role');
    
    // Create a snapshot of the stdout, but filter out anything that might change between runs
    const cleanOutput = result.stdout
      // Remove timestamps or other variable parts if needed
      .replace(/modified="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z"/g, 'modified="[TIMESTAMP]"');
    
    // Match against snapshot
    expect(cleanOutput).toMatchSnapshot();
  });
});