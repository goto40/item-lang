import { LangiumDocument } from 'langium';
import { parseDocument } from 'langium/lib/test';
import { createItemLanguageServices } from '../src/language-server/item-language-module';
import { Model, ScalarAttribute, Struct } from '../src/language-server/generated/ast';
import { URI } from 'vscode-uri';
import { Mode } from 'fs';

const services = createItemLanguageServices().ItemLanguage;

it("test parsing a simple model", () => {
    const result = services.shared.workspace.LangiumDocumentFactory.fromString(
        // TODO: make property_set built_in.props implicit
        `
            package first (property_set built_in.props) {
                struct First {
                    scalar x: built_in.float64 (.description="x value")
                    scalar y: built_in.float64 (.description="y value")
                }
            }        
        `,
        URI.parse("memory://built_in.item")
    );
    const model = result.parseResult.value as Model; 
    expect(model.packages.length).toEqual(1)
    expect(model.packages[0].name).toEqual("first")
    expect(model.packages[0].items.length).toEqual(1)
    const struct = model.packages[0].items[0] as Struct
    expect(struct.name).toEqual("First")
    expect((struct.attributes[0] as ScalarAttribute).name).toEqual("x")
    expect((struct.attributes[1] as ScalarAttribute).name).toEqual("y")
});