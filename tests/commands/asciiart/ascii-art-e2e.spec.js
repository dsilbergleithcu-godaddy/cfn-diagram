const path = require('path');
const { spawnSync } = require('child_process');

describe('ascii-art end-to-end', () => {
  test('should successfully run the ascii-art command with a template', () => {
    // Use the project's root directory
    const projectRoot = path.resolve(__dirname, '../../../');
    
    // Path to the test template
    const templatePath = path.resolve(projectRoot, 'tests/resources/simple-template.yaml');
    
    // Run the CLI command with the test template
    const result = spawnSync('node', [
      path.join(projectRoot, 'index.js'),
      'ascii-art',
      '-t', templatePath
    ], {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: projectRoot
    });
    
    // Check that the command executed without error
    expect(result.status).toBe(0);
    
    // Specifically check for our fixed error
    expect(result.stderr).not.toContain("parser.parse is not a function");
    expect(result.stderr).not.toContain("XMLParser");
    
    // The output is expected to be ascii art, which is difficult to verify exactly
    // Just check that it doesn't contain any error messages
    expect(result.stdout).not.toContain('Error:');
    expect(result.stdout).not.toContain('TypeError:');
    expect(result.stdout).not.toContain('Cannot find module');
    expect(result.error).toBeUndefined();
  });
});