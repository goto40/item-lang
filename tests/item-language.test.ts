import { LangiumDocument } from 'langium';
import { createItemLanguageServices } from '../src/language-server/item-language-module';
import { Model, ScalarAttribute, Struct } from '../src/language-server/generated/ast';
import { URI } from 'vscode-uri';
import { Mode } from 'fs';
import { parseDocument } from 'langium/lib/test';

const services = createItemLanguageServices().ItemLanguage;

it("test parsing a simple model", async () => {
    const doc = services.shared.workspace.LangiumDocumentFactory.fromString(
        `
            package first (property_set first.props) {
                property_set props {
                    property optional description: STRING
                }
                rawtype my_int UINT 32
                struct First {
                    scalar x: my_int (.description="x value")
                    scalar y: my_int (.description="y value")
                }
            }        
        `,
        URI.parse("memory://built_in.item")
    );

    await services.shared.workspace.DocumentBuilder.build([doc]);
    const model = doc.parseResult.value as Model; 

    expect(model.packages.length).toEqual(1)
    expect(model.packages[0].name).toEqual("first")
    expect(model.packages[0].property_set?.ref?.name).toEqual("props")
    expect(model.packages[0].items.length).toEqual(2)
    const struct = model.packages[0].items[1] as Struct
    expect(struct.name).toEqual("First")
    expect((struct.attributes[0] as ScalarAttribute).name).toEqual("x")
    expect((struct.attributes[1] as ScalarAttribute).name).toEqual("y")

    expect((struct.attributes[0] as ScalarAttribute).type.ref?.name).toEqual("my_int")
});


it("test parsing a simple model with builtin model", async () => {
    //const doc = await parseDocument(services, // same problem
    services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
    const doc = services.shared.workspace.LangiumDocumentFactory.fromString(
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

    await services.shared.workspace.DocumentBuilder.build([doc]);
    const model = doc.parseResult.value as Model; 

    expect(model.packages.length).toEqual(1)
    expect(model.packages[0].name).toEqual("first")
    expect(model.packages[0].property_set?.ref?.name).toEqual("props")
    expect(model.packages[0].items.length).toEqual(1)
    const struct = model.packages[0].items[0] as Struct
    expect(struct.name).toEqual("First")
    expect((struct.attributes[0] as ScalarAttribute).name).toEqual("x")
    expect((struct.attributes[1] as ScalarAttribute).name).toEqual("y")
    expect((struct.attributes[0] as ScalarAttribute).type.ref?.name).toEqual("float64")
});
