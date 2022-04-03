import { DefaultWorkspaceManager, LangiumDocument, LangiumSharedServices } from 'langium';
import { WorkspaceFolder } from 'vscode-languageclient';


export class ItemLangWorkspaceManager extends DefaultWorkspaceManager {
    constructor(services: LangiumSharedServices) {
        super(services);
        console.log("ItemWorkspaceManager created.");
    }

    protected loadAdditionalDocuments(_folders: WorkspaceFolder[], _collector: (document: LangiumDocument) => void): Promise<void> {
        console.log("loadAdditionalDocuments...");
        const model_text = `
        package built_in (property_set built_in.props) {
            property_set props {
                property optional description: STRING
            }
            rawtype uint8 UINT 8
            rawtype uint16 UINT 16
            rawtype uint32 UINT 32
            rawtype uint64 UINT 64
            rawtype int8 SINT 8
            rawtype int16 SINT 16
            rawtype int32 SINT 32
            rawtype int64 SINT 64
            rawtype float32 FLOAT 32
            rawtype float64 FLOAT 64
        }        
        `
        
        return Promise.resolve();
    }
}
