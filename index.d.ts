// TypeScript declarations for @mhlabs/cfn-diagram

export interface RenderOptions {
  /** CDK output directory, defaults to 'cdk.out' */
  cdkOutput?: string;
  /** Skip CDK synthesis, defaults to true */
  skipSynth?: boolean;
  /** Specific stacks to process */
  stacks?: string[] | null;
}

export interface AsciiArtOptions extends RenderOptions {
  /** Run in CI mode, defaults to true */
  ci?: boolean;
  /** Add border around diagram, defaults to false */
  border?: boolean;
  /** Return buffer instead of printing to console */
  returnBuffer?: boolean;
  /** Custom title for the outer border when rendering multiple diagrams */
  title?: string;
  /** Enable side-by-side rendering for multiple templates, defaults to false */
  sideBySide?: boolean;
  /** Spacing between diagrams in side-by-side mode, defaults to 2 */
  spacing?: number;
}

export interface DrawioOptions extends RenderOptions {
  /** Run in CI mode, defaults to true */
  ciMode?: boolean;
  /** Resource types to exclude from diagram */
  excludeTypes?: string[];
}

export interface HtmlOptions extends RenderOptions {
  // Additional HTML-specific options would go here
}

export interface MermaidOptions extends RenderOptions {
  // Additional Mermaid-specific options would go here
}

export interface TemplateParser {
  get(cmd: any): { template: any };
  getStackName(template: any): string;
}

export interface MxGenerator {
  renderTemplate(template: any): Promise<string>;
  reset(): void;
}

export interface AsciiArtRenderer {
  /**
   * Render CloudFormation template as ASCII art
   * @param templatePath Path to CloudFormation template file
   * @param options Rendering options
   * @returns Promise resolving to XML string or ASCII buffer string
   */
  render(templatePath: string, options?: AsciiArtOptions): Promise<string>;
}

export interface DrawioRenderer {
  /**
   * Render CloudFormation template as Draw.io diagram
   * @param templatePath Path to CloudFormation template file
   * @param outputFile Output file path, defaults to 'template.drawio'
   * @param options Rendering options
   * @returns Promise resolving to output file path
   */
  render(templatePath: string, outputFile?: string, options?: DrawioOptions): Promise<string>;
}

export interface HtmlRenderer {
  /**
   * Render CloudFormation template as HTML (not yet implemented)
   * @param templatePath Path to CloudFormation template file
   * @param options Rendering options
   * @throws Error indicating not yet implemented
   */
  render(templatePath: string, options?: HtmlOptions): never;
}

export interface MermaidRenderer {
  /**
   * Render CloudFormation template as Mermaid diagram (not yet implemented)
   * @param templatePath Path to CloudFormation template file
   * @param options Rendering options
   * @throws Error indicating not yet implemented
   */
  render(templatePath: string, options?: MermaidOptions): never;
}

export interface Renderers {
  asciiArt: AsciiArtRenderer;
  drawio: DrawioRenderer;
  html: HtmlRenderer;
  mermaid: MermaidRenderer;
}

export interface Utils {
  templateParser: TemplateParser;
  mxGenerator: MxGenerator;
}

/**
 * Core function to render CloudFormation template
 * @param templatePath Path to CloudFormation template file
 * @param options Rendering options
 * @returns Promise resolving to XML string
 */
export function renderTemplate(templatePath: string, options?: RenderOptions): Promise<string>;

/** Collection of specialized renderers for different output formats */
export const renderers: Renderers;

/** Utility functions and objects */
export const utils: Utils;

declare const cfnDiagram: {
  renderTemplate: typeof renderTemplate;
  renderers: Renderers;
  utils: Utils;
};

export = cfnDiagram;