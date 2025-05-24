#!/usr/bin/env node
const path = require('path');
const cfnDiagram = require('../index');

async function main() {
  try {
    console.log("Example 1: Basic rendering of CloudFormation template as ASCII art");
    
    // Path to your template file
    const templatePath = path.join(__dirname, '../tests/resources/simple-template.yaml');
    
    // Render template as ASCII art and capture output as string
    const asciiOutput = await cfnDiagram.renderers.asciiArt.render(templatePath, {
      returnBuffer: true,   // Return the ASCII art as a string instead of printing to console
      border: true,         // Add a border with stack name
      ci: true              // CI mode (no cursor control, full output at once)
    });
    
    console.log("\nASCII Art Output:");
    console.log(asciiOutput);
    
    // Example 1b: ASCII art with custom title for outer border
    console.log("\nExample 1b: ASCII art with custom title for outer border");
    const titleOutput = await cfnDiagram.renderers.asciiArt.render(templatePath, {
      returnBuffer: true,
      border: true,
      title: "My Custom CloudFormation Stack"
    });
    
    console.log("\nASCII Art with Custom Title:");
    console.log(titleOutput);
    
    // Example 1c: Side-by-side rendering of multiple templates
    console.log("\nExample 1c: Side-by-side rendering with custom title");
    const template2Path = path.join(__dirname, '../tests/resources/complex-template.yaml');
    const sideBySideOutput = await cfnDiagram.renderers.asciiArt.render(
      templatePath + ',' + template2Path, {
      returnBuffer: true,
      sideBySide: true,
      border: true,
      spacing: 4,
      title: "Comparison of Two CloudFormation Templates"
    });
    
    console.log("\nSide-by-side ASCII Art:");
    console.log(sideBySideOutput);
    
    // Example 2: Get raw XML representation
    console.log("\nExample 2: Get raw XML representation of the CloudFormation template");
    const xmlOutput = await cfnDiagram.renderTemplate(templatePath);
    console.log(`XML generated (length: ${xmlOutput.length} characters)`);
    // console.log(xmlOutput); // Uncomment to see the full XML
    
    // Example 3: Generate a draw.io diagram
    console.log("\nExample 3: Generate a draw.io diagram file");
    const outputPath = '/tmp/cfn-diagram-example.drawio';
    const drawioFile = await cfnDiagram.renderers.drawio.render(templatePath, outputPath, {
      ciMode: true,
      excludeTypes: ['AWS::IAM::Role'] // Example of excluding a specific resource type
    });
    console.log(`Draw.io diagram generated at: ${drawioFile}`);
    
    console.log("\nExamples completed successfully!");
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Run the examples
main();