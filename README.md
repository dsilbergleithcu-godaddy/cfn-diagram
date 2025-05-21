# cfn-diagram
![Node.js CI](https://github.com/mhlabs/cfn-diagram/workflows/Node.js%20CI/badge.svg)

CLI tool to visualise CloudFormation/SAM/CDK templates as diagrams. 

## Installation
`npm i -g @mhlabs/cfn-diagram`

## Usage
```
Usage: cfn-dia [options] [command]

Options:
  -v, --vers                          Output the current version
  -h, --help                          Display help for command

Commands:
  draw.io|d [options]                 Generates a draw.io diagram from a CloudFormation template
  html|h [options]                    Generates a vis.js diagram from a CloudFormation template
  browse|b [options]                  Browses and generates diagrams from your deployed templates
  help [command]                      Display help for command

Draw.io Options:
  -t, --template-file [templateFile]  Path to template or cdk.json file
  -c, --ci-mode                       Disable terminal/console interactivity
  -o, --output-file [outputFile]      Name of output file
  -co, --cdk-output [outputPath]      CDK synth output path
  -s, --skip-synth                    Skips CDK synth
  -e, --exclude-types [excludeTypes]  List of resource types to exclude when using CI mode

Html Options:
  -t, --template-file [templateFile]  Path to template or cdk.json file
  -c, --ci-mode                       Disable terminal/console interactivity
  -o, --output-path [outputPath]      Name of output file
  -co, --cdk-output [outputPath]      CDK synth output path
  -s, --skip-synth                    Skips CDK synth
```

## Output formats

### Draw.io
```
Usage: cfn-dia draw.io|d [options]

Generates a draw.io diagram from a CloudFormation template

Options:
  -t, --template-file [templateFile]     Path to template or cdk.json file (default: "template.yaml or
                                         cdk.json")
  -c, --ci-mode                          Disable terminal/console interactivity (default: false)
  --stacks [stacks]                      Comma separated list of stack name(s) to include. Defaults to
                                         all.
  -o, --output-file [outputFile]         Name of output file (default: "template.drawio")
  -co, --cdk-output [outputPath]         CDK synth output path (default: "cdk.out")
  -s, --skip-synth                       Skips CDK synth (default: false)
  -e, --exclude-types [excludeTypes...]  List of resource types to exclude when using CI mode
  -h, --help                             display help for command
```

Use it in combination with the [Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) for VS Code to instantly visualise your stacks.

![Demo](https://raw.githubusercontent.com/mhlabs/cfn-diagram/master/images/demo.gif)

#### Example 
```
cfn-dia draw.io -t template.yaml
```

#### Features 
* Select only the resource types you want to see. This lets you skip granlar things like roles and policies that might not add to the overview you want to see
* Navigate through a new differnet layouts
* Works for both JSON and YAML templates
* Filter on resource type and/or resource names
* Works with CloudFormation, SAM and CDK

### HTML
```
Usage: cfn-dia html|h [options]

Generates a vis.js diagram from a CloudFormation template

Options:
  -t, --template-file [templateFile]  Path to template or cdk.json file (default: "template.yaml or
                                      cdk.json")
  --stacks [stacks]                   Comma separated list of stack name(s) to include. Defaults to all.
  -all --render-all                   If set, all nested stacks will be rendered. By default only root
                                      template is rendered (default: false)
  -c, --ci-mode                       Disable terminal/console interactivity (default: false)
  -o, --output-path [outputPath]      Name of output file (default: "/tmp/cfn-diagram")
  -co, --cdk-output [outputPath]      CDK synth output path (default: "cdk.out")
  -s, --skip-synth                    Skips CDK synth (default: false)
  -h, --help                          display help for command
```

The HTML output uses [vis.js](https://github.com/visjs/vis-network) to generate an interactive diagram from your template.

![Demo](https://raw.githubusercontent.com/mhlabs/cfn-diagram/master/images/demo-html.gif)

#### Example 
```
cfn-dia html -t template.yaml
```
or, for CDK stacks, go to project directory (where cdk.json is located) and enter
```
cfn-dia html 
```

Large stacks, in particular multi-stack CDK projects, tend to generate huge diagrams. You can pass the stack names you want to render using the `--stacks` argument followed by a comma separated list of stack names.

### Ascii-art
```
Usage: cfn-dia ascii-art|a [options]

Generates an ascii-art diagram from a CloudFormation template

Options:
  -t, --template-file [templateFile]     Path to template or cdk.json file (or comma-separated list for side-by-side rendering) (default: "template.yaml or cdk.json")
  --stacks [stacks]                      Comma separated list of stack name(s) to include. Defaults to all.
  -co, --cdk-output [outputPath]         CDK synth output path (default: "cdk.out")
  -s, --skip-synth                       Skips CDK synth (default: false)
  -w, --watch                            Watch for changes in template and rerender diagram on change (default: false)
  -e, --exclude-types [excludeTypes...]  List of resource types to exclude when using CI mode
  --ci                                  Generate ASCII art for CI environments (no cursor control, full output at once)
  --border                              Add a border with stack name around the diagram
  --side-by-side                        Render multiple templates side-by-side
  --spacing [spacing]                    Number of spaces between stacks when rendering side-by-side (default: "4")
  -h, --help                             display help for command
```

Renders a simple Ascii-art diagram of your template directly in the console. Useful to gain a quick overview of smaller stacks.

#### Using CI Mode for ASCII Art

When running in CI/CD pipelines or when needing console output that works well in log files, use the `--ci` flag:

```
cfn-dia ascii-art -t template.yaml --ci
```

The CI mode produces the entire diagram at once without using terminal cursor control sequences, making it suitable for:
- CI/CD pipeline logs
- Redirecting output to files
- Terminals that don't support ANSI cursor movement
- Generating predictable output for automated testing

You can also add a border with the stack name using the `--border` flag (requires CI mode):

```
cfn-dia ascii-art -t template.yaml --ci --border
```

This creates a box around your diagram with the stack name at the top, making it clear which stack the diagram represents. The tool will try to extract the stack name from:

1. The template's CloudFormation stack name (if deployed)
2. Information in the template description
3. The template filename (without extension)

The border will automatically adjust its width to fit both the diagram content and the stack name, ensuring proper display even with very long stack names. For better visual presentation, diagram resources are also automatically centered within the border when the stack name requires a wider border. This is especially useful when displaying multiple stack diagrams together in documentation or logs.

#### Side-by-Side Rendering

You can render multiple templates side-by-side in a single diagram, making it easier to compare different stacks or visualize relationships between them. To use this feature:

```
cfn-dia ascii-art -t template1.yaml,template2.yaml,template3.yaml --side-by-side --ci
```

Side-by-side rendering requires the `--ci` flag to be enabled. You can combine it with the `--border` flag to clearly identify each stack:

```
cfn-dia ascii-art -t template1.yaml,template2.yaml --side-by-side --ci --border
```

You can also adjust the spacing between stacks using the `--spacing` option (default is 4 spaces):

```
cfn-dia ascii-art -t template1.yaml,template2.yaml --side-by-side --ci --spacing 8
```

This feature is particularly useful for:
- Comparing different versions of the same stack
- Visualizing related stacks that work together
- Analyzing dependencies between stacks
- Creating comprehensive architecture documentation

![Demo](https://raw.githubusercontent.com/mhlabs/cfn-diagram/master/images/demo-ascii.gif)

Video demo of using the `--watch` option:
[![Demo of watch command](https://img.youtube.com/vi/2V3zimGWTcU/0.jpg)](https://www.youtube.com/watch?v=2V3zimGWTcU)

### Mermaid
```
Usage: cfn-dia mermaid|m [options]

Generates a mermaid graph from a template

Options:
  -t, --template-file [templateFile]  Path to template or cdk.json file (default: "template.yaml or cdk.json")
  -all --render-all                   If set, all nested stacks will be rendered. By default only root template is rendered (default: false)
  -o, --output-path [outputPath]      Name of output file
  -co, --cdk-output [cdkOutputPath]   CDK synth output path (default: "cdk.out")
  -s, --skip-synth                    Skips CDK synth (default: false)
  -h, --help                          display help for command
```

Renders a [mermaid](https://mermaid-js.github.io/mermaid/#/) diagram of your template directly in the console or to a file. Useful to gain a quick overview of smaller stacks and to generate as part of your CI/CD flow for up-to-date documentation.

![Demo](https://raw.githubusercontent.com/mhlabs/cfn-diagram/master/images/demo-mermaid.gif)


### CI-mode
This functionality lives in its own CLI, [cfn-diagram-ci](https://github.com/mhlabs/cfn-diagram-ci). This is beacuse it requires headless Chromium to be installed which makes the package size very large

It uses [pageres](https://github.com/sindresorhus/pageres) to generate a screenshot of a HTML diagram. This can be used in a CI/CD pipeline to keep an always up-to-date diagram in your readme-file.

#### Installation
```
npm install -g @mhlabs/cfn-diagram-ci
```

#### Example 
```
cfn-dia-ci html -t template.yaml
```


## Known issues
* Some icons are missing. Working on completing the coverage.
* When using WSL you might experience `Error: spawn wslvar ENOENT` when trying to use HTML output. To resolve, install [wslu](https://github.com/wslutilities/wslu). See issue #9.
