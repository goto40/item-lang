import { DefaultWorkspaceManager, LangiumSharedServices } from 'langium';


export class ItemLangWorkspaceManager extends DefaultWorkspaceManager {
    constructor(services: LangiumSharedServices) {
        super(services);
        console.log("ItemWorkspaceManager created.");
    }
}
