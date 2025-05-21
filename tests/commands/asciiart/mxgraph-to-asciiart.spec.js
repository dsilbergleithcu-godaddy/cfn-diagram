const mxGraphToAsciiArt = require("../../../commands/asciiart/mxgraph-to-asciiart");

describe("mxgraph-to-asciiart", () => {
  let consoleSpy;
  let consoleWriteSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "clear").mockImplementation(() => {});
    consoleWriteSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWriteSpy.mockRestore();
  });

  test("should render XML properly", () => {
    // Sample XML that represents a simple diagram
    const xml = `<mxfile host="" modified="2020-05-24T15:21:41.060Z" agent="5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.45.0 Chrome/78.0.3904.130 Electron/7.2.4 Safari/537.36" version="13.1.3" etag="lrwgP8mNOWNbAz78NI_h" pages="2">
      <diagram id="diagramid" name="Diagram">
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="2" value="Lambda" style="shape=mxgraph.aws4.lambda;fillColor=#F58534;gradientColor=none;aspect=fixed;" vertex="1" parent="1">
              <mxGeometry x="50" y="50" width="50" height="50" as="geometry"/>
            </mxCell>
          </root>
        </mxGraphModel>
      </diagram>
    </mxfile>`;

    // Should not throw exception
    expect(() => mxGraphToAsciiArt.render(xml)).not.toThrow();
  });

  test("should handle nested diagram structure", () => {
    // XML structure with mxfile > diagram > mxGraphModel
    const xml = `<mxfile host="">
      <diagram id="diagramid" name="Diagram">
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="2" value="Lambda" style="resIcon=mxgraph.aws4.lambda;fillColor=#F58534;" vertex="1" parent="1">
              <mxGeometry x="50" y="50" width="50" height="50" as="geometry"/>
            </mxCell>
          </root>
        </mxGraphModel>
      </diagram>
    </mxfile>`;

    // Should not throw exception
    expect(() => mxGraphToAsciiArt.render(xml)).not.toThrow();
  });

  test("should handle connection edges", () => {
    // XML structure with edges and connection points
    const xml = `<mxfile host="">
      <diagram id="diagramid" name="Diagram">
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="2" value="Lambda" style="resIcon=mxgraph.aws4.lambda;fillColor=#F58534;" vertex="1" parent="1">
              <mxGeometry x="50" y="50" width="50" height="50" as="geometry"/>
            </mxCell>
            <mxCell id="3" value="DynamoDB" style="resIcon=mxgraph.aws4.dynamodb;fillColor=#2E73B8;" vertex="1" parent="1">
              <mxGeometry x="200" y="50" width="50" height="50" as="geometry"/>
            </mxCell>
            <mxCell id="4" value="Connection" edge="1" source="2" target="3" parent="1">
              <mxGeometry relative="1" as="geometry">
                <Array as="points">
                  <mxPoint x="100" y="50"/>
                  <mxPoint x="150" y="50"/>
                  <mxPoint x="200" y="50"/>
                </Array>
              </mxGeometry>
            </mxCell>
          </root>
        </mxGraphModel>
      </diagram>
    </mxfile>`;

    // Should not throw exception
    expect(() => mxGraphToAsciiArt.render(xml)).not.toThrow();
  });
});