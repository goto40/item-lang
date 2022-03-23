/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNodeDescription, DefaultAstNodeDescriptionProvider, interruptAndCheck, LangiumDocument, LangiumServices, streamAllContents } from 'langium';
import { CancellationToken } from 'vscode-languageserver';
import { ItemLangNameProvider } from './item-language-naming';
import { isPackage, isType, isPropertySet, Package } from './generated/ast';

export class ItemLangNameDescriptionProvider extends DefaultAstNodeDescriptionProvider {

    constructor(services: LangiumServices) {
        super(services);
    }

    /**
     * Exports only types (`DataType or `Entity`) with their qualified names.
     */
    async createDescriptions(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<AstNodeDescription[]> {
        const descr: AstNodeDescription[] = [];
        for (const modelNode of streamAllContents(document.parseResult.value)) {
            await interruptAndCheck(cancelToken);
            if (isType(modelNode) || isPropertySet(modelNode)) {
                let name = this.nameProvider.getName(modelNode);
                if (name) {
                    if (isPackage(modelNode.$container)) {
                        name = (this.nameProvider as ItemLangNameProvider).getQualifiedName(modelNode.$container as Package, name);
                    }
                    descr.push(this.createDescription(modelNode, name, document));
                    // console.log(`adding2index ${name}`)
                }
            }
        }
        return descr;
    }
}
