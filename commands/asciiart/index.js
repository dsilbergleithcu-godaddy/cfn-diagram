const program = require("commander");
const mxGenerator = require("../../graph/MxGenerator");
const templateParser = require("../../shared/templateParser");
const filterConfig = require("../../resources/FilterConfig");
const mxGraphToAsciiArt = require("./mxgraph-to-asciiart");
const fs = require("fs");
program
  .command("ascii-art")
  .alias("a")
  .option(
    "-t, --template-file [templateFile]",
    "Path to template or cdk.json file (or comma-separated list of template files for side-by-side rendering)",
    "template.yaml or cdk.json"
  )
  .option(
    "--stacks [stacks]",
    "Comma separated list of stack name(s) to include. Defaults to all."
  )
  .option(
    "--side-by-side",
    "Render multiple templates side-by-side",
    false
  )
  .option(
    "--spacing [spacing]",
    "Number of spaces between stacks when rendering side-by-side",
    "4"
  )
  .option("-co, --cdk-output [outputPath]", "CDK synth output path", `cdk.out`)
  .option("-s, --skip-synth", "Skips CDK synth", false)
  .option(
    "-w, --watch",
    "Watch for changes in template and rerender diagram on change",
    false
  )
  .option(
    "-e, --exclude-types [excludeTypes...]",
    "List of resource types to exclude when using CI mode"
  )
  .option(
    "--ci",
    "Generate ASCII art for CI environments (no cursor control, full output at once)",
    false
  )
  .option(
    "--border",
    "Add a border with stack name around the diagram",
    false
  )
  .description("Generates an ascii-art diagram from a CloudFormation template")
  .action(async (cmd) => {
    await render(cmd);
    if (cmd.watch && !cmd.sideBySide) {
      fs.watchFile(cmd.templateFile, (a, b) => {
        render(cmd);
      });
    }
  });
async function render(cmd) {
  try {
    // Check if we're doing side-by-side rendering with multiple templates
    const sideBySide = cmd.sideBySide;
    const spacing = parseInt(cmd.spacing || '4', 10);
    
    // Parse the template file(s)
    let templateFiles = [cmd.templateFile];
    if (sideBySide && cmd.templateFile.includes(',')) {
      // Split the comma-separated list of template files
      templateFiles = cmd.templateFile.split(',').map(file => file.trim());
    }
    
    if (templateFiles.length === 1 && !sideBySide) {
      // Original behavior for a single template
      const template = templateParser.get({ ...cmd, templateFile: templateFiles[0] }).template;

      if (!template.Resources) {
        console.log("Can't find resources in " + templateFiles[0]);
        return;
      }
      filterConfig.resourceNamesToInclude = Object.keys(template.Resources);
      filterConfig.resourceTypesToInclude = Object.keys(template.Resources).map(
        (p) => template.Resources[p].Type
      );
      mxGenerator.reset();
      const xml = await mxGenerator.renderTemplate(template);
      const stackName = templateParser.getStackName(template);
      mxGraphToAsciiArt.render(xml, { 
        ci: cmd.ci, 
        border: cmd.border, 
        stackName: stackName
      });
      return xml;
    } else {
      // Handle multiple templates for side-by-side rendering
      const diagrams = [];
      
      for (const templateFile of templateFiles) {
        // Process each template file separately
        try {
          const template = templateParser.get({ ...cmd, templateFile }).template;
          
          if (!template.Resources) {
            console.log("Can't find resources in " + templateFile + ", skipping.");
            continue;
          }
          
          filterConfig.resourceNamesToInclude = Object.keys(template.Resources);
          filterConfig.resourceTypesToInclude = Object.keys(template.Resources).map(
            (p) => template.Resources[p].Type
          );
          
          // Reset the mxGenerator for each template
          mxGenerator.reset();
          
          // Generate the XML and render to an ASCII buffer (not to stdout)
          const xml = await mxGenerator.renderTemplate(template);
          const stackName = templateParser.getStackName(template);
          
          // Create a buffer for this diagram
          let buffer = new mxGraphToAsciiArt.AsciiBuffer();
          
          // Render this diagram to the buffer without outputting to stdout
          buffer = mxGraphToAsciiArt.render(xml, {
            ci: true, // Force CI mode for buffer generation
            border: false, // ALWAYS skip borders when doing side-by-side
            stackName: stackName,
            buffer: buffer,
            skipOutput: true // Skip direct output to stdout
          });
          
          // Store diagram data
          diagrams.push({
            buffer: buffer,
            stackName: stackName
          });
        } catch (err) {
          console.log(`Error processing ${templateFile}: ${err.message}`);
        }
      }
      
      if (diagrams.length === 0) {
        console.log("No valid templates were found.");
        return;
      }
      
      if (cmd.border) {
        // Extract buffers for each diagram
        const buffers = diagrams.map(d => d.buffer);
        
        // Combine the raw buffers side-by-side first
        const combinedBuffer = mxGraphToAsciiArt.combineBuffersSideBySide(buffers, spacing);
        
        // Now we'll manually create a new buffer with proper borders
        const borderedBuffer = new mxGraphToAsciiArt.AsciiBuffer();
        
        // Calculate the exact width of each diagram
        let currentPosition = 0;
        const diagramWidths = [];
        
        for (const buffer of buffers) {
          // Get maximum content width
          let maxWidth = 0;
          for (let y = 0; y < buffer.buffer.length; y++) {
            for (let x = buffer.buffer[y].length - 1; x >= 0; x--) {
              if (buffer.buffer[y][x] && buffer.buffer[y][x] !== ' ') {
                maxWidth = Math.max(maxWidth, x + 1);
                break;
              }
            }
          }
          diagramWidths.push(maxWidth);
        }
        
        // Now draw the borders and content
        currentPosition = 0;
        
        for (let i = 0; i < diagrams.length; i++) {
          const buffer = buffers[i];
          const stackName = diagrams[i].stackName;
          const contentWidth = diagramWidths[i];
          
          // Calculate border width based on content and title
          const title = stackName ? "Stack: " + stackName : "";
          const titleWidth = title.length + 4; // Add some padding
          const borderWidth = Math.max(contentWidth + 4, titleWidth);
          
          // Draw top border with precise character placement
          borderedBuffer.write(currentPosition, 0, '╭');
          for (let x = 1; x < borderWidth - 1; x++) {
            borderedBuffer.write(currentPosition + x, 0, '─');
          }
          borderedBuffer.write(currentPosition + borderWidth - 1, 0, '╮');
          
          // Draw title row (vertical borders with title text)
          borderedBuffer.write(currentPosition, 1, '│');
          borderedBuffer.write(currentPosition + borderWidth - 1, 1, '│');
          
          // Add title if available - with precise character placement
          if (stackName) {
            // Calculate padding for centering
            const padding = Math.floor((borderWidth - 2 - title.length) / 2);
            
            // Add spaces before title
            for (let x = 0; x < padding; x++) {
              borderedBuffer.write(currentPosition + 1 + x, 1, ' ');
            }
            
            // Add title text
            for (let x = 0; x < title.length; x++) {
              borderedBuffer.write(currentPosition + 1 + padding + x, 1, title.charAt(x));
            }
            
            // Add spaces after title
            for (let x = 0; x < borderWidth - 2 - padding - title.length; x++) {
              borderedBuffer.write(currentPosition + 1 + padding + title.length + x, 1, ' ');
            }
          } else {
            // No title, just spaces
            for (let x = 0; x < borderWidth - 2; x++) {
              borderedBuffer.write(currentPosition + 1 + x, 1, ' ');
            }
          }
          
          // Draw separator line with precise character placement
          borderedBuffer.write(currentPosition, 2, '├');
          for (let x = 1; x < borderWidth - 1; x++) {
            borderedBuffer.write(currentPosition + x, 2, '─');
          }
          borderedBuffer.write(currentPosition + borderWidth - 1, 2, '┤');
          
          // Draw content with vertical borders
          const contentOffset = 3; // 3 rows for top border + title + separator
          const extraWidth = borderWidth - 4 - contentWidth;
          const centeringOffset = Math.floor(extraWidth / 2);
          
          // Copy content from the original buffer with centering
          for (let y = 0; y < buffer.buffer.length; y++) {
            // Draw left border
            borderedBuffer.write(currentPosition, y + contentOffset, '│');
            
            // Draw content with centering
            for (let x = 0; x < buffer.buffer[y].length; x++) {
              if (buffer.buffer[y][x]) {
                borderedBuffer.write(
                  currentPosition + 2 + centeringOffset + x, 
                  y + contentOffset, 
                  buffer.buffer[y][x],
                  buffer.colors[y] ? buffer.colors[y][x] : null
                );
              }
            }
            
            // Draw right border
            borderedBuffer.write(currentPosition + borderWidth - 1, y + contentOffset, '│');
          }
          
          // Draw bottom border with precise character placement
          const bottomY = buffer.buffer.length + contentOffset;
          borderedBuffer.write(currentPosition, bottomY, '╰');
          for (let x = 1; x < borderWidth - 1; x++) {
            borderedBuffer.write(currentPosition + x, bottomY, '─');
          }
          borderedBuffer.write(currentPosition + borderWidth - 1, bottomY, '╯');
          
          // Move to next diagram position
          currentPosition += borderWidth + spacing;
        }
        
        // Output the bordered buffer
        process.stdout.write(borderedBuffer.toString());
      } else {
        // For non-border mode, just combine the raw buffers and output
        const buffers = diagrams.map(d => d.buffer);
        const combinedBuffer = mxGraphToAsciiArt.combineBuffersSideBySide(buffers, spacing);
        process.stdout.write(combinedBuffer.toString());
      }
      
      return;
    }
  } catch (err) {
    console.log(err.message);
  }
}
