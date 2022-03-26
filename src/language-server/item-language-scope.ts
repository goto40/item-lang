import { Stream, getDocument, AstNodeDescriptionProvider, AstNodeDescription, DefaultScopeComputation, interruptAndCheck, LangiumDocument, LangiumServices, PrecomputedScopes, AstNode, MultiMap, DefaultScopeProvider, StreamScope, Scope, stream} from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { ItemLangNameProvider } from './item-language-naming';
import { isScalarAttribute, Attribute, Model, Package, isPackage, Struct, isStruct, Constants, isConstants, isModel, PropertyDefinition, ScalarAttribute, FormulaElement} from './generated/ast';
import { ItemLanguageServices } from './item-language-module';

function get_parent_package(node: AstNode): Package|null {
    let p = node.$container;
    while(!isPackage(p)) {
        // "?." == "safe navigation" 
        p = p?.$container;
        if (p === null) return null;
    }
    return p as Package
}

function get_parent_struct(node: AstNode): Struct|null {
    let p = node.$container;
    while(!isStruct(p)) {
        // "?." == "safe navigation" 
        p = p?.$container;
        if (p === null) return null;
    }
    return p as Struct
}

export class ItemLangScopeProvider extends DefaultScopeProvider {

    descriptionProvider: AstNodeDescriptionProvider;

    constructor(services: ItemLanguageServices) {
        super(services);
        this.descriptionProvider = services.index.AstNodeDescriptionProvider;
    }

    getAttrRefStream(prefix: String, attrs: ArrayLike<Attribute>): Stream<AstNodeDescription> {
        let descriptions = stream(attrs)
            .filter(element => isScalarAttribute(element.content))
            .filter(element => !isStruct((element.content as ScalarAttribute).type) )
            .map(element =>
                this.descriptionProvider.createDescription(element, prefix + element.content.name, getDocument(element)));

        descriptions = Array.from(attrs)
            .map(element => element.content)
            .filter(isScalarAttribute)
            .map(element => element.type.ref)
            .filter(isStruct)
            .reduce<Stream<AstNodeDescription>>((d, element) => d.concat(this.getAttrRefStream("header.", element.attributes)), descriptions)

        return descriptions
    }

    getScope(node: AstNode, referenceId: string): Scope {
        if (referenceId=="Property:definition" && node.$type=='Property') {
            let definitions: PropertyDefinition[]|undefined = [];
            definitions = get_parent_package(node)?.property_set?.ref?.property_definitions;
            // console.log(`definitions==${definitions}`);
            if (definitions!==undefined) {
                // definitions.forEach( d => { console.log(`name==${d.name}`); });
                // solution suggested here: https://github.com/langium/langium/discussions/401
                const descriptions = stream(definitions).map(element =>
                    this.descriptionProvider.createDescription(element, element.name, getDocument(element)));
                return new StreamScope(descriptions);
            }
            else {
                const result = super.getScope(node, referenceId);
                return result;    
            }    
        }
        else if (referenceId=="AttrRef:formula_element_ref" && node.$type=='AttrRef') {
            // first: attributes
            let attrs: Attribute[]|undefined = [];
            attrs = get_parent_struct(node)?.attributes;
            // console.log(`definitions==${definitions}`);
            if (attrs!==undefined) {
                const other_scope = super.getScope(node, referenceId);
                const result = new StreamScope(this.getAttrRefStream("", attrs), other_scope);
                return result;
            }
            else {
                const result = super.getScope(node, referenceId);
                return result;    
            }
        }
        else {
            const result = super.getScope(node, referenceId);
            return result;
        }
    }

}

export class ItemLangScopeComputation extends DefaultScopeComputation {

    constructor(services: LangiumServices) {
        super(services);
    }

    async computeScope(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<PrecomputedScopes> {
        const model = document.parseResult.value as Model;
        const scopes = new MultiMap<AstNode, AstNodeDescription>();
        // console.log(`computeScope for ${document.uri.path}`)
        await this.processContainer(model, scopes, document, cancelToken);
        return scopes;
    }

    protected async processContainer(container: Model | Package | Struct | Constants, scopes: PrecomputedScopes, document: LangiumDocument, cancelToken: CancellationToken): Promise<AstNodeDescription[]> {
        const localDescriptions: AstNodeDescription[] = [];

        if (isPackage(container)) {
            for (const element of container.property_sets) {
                interruptAndCheck(cancelToken);
                const description = this.descriptions.createDescription(element, element.name, document);
                localDescriptions.push(description);                
            }    
            for (const element of container.items) {
                interruptAndCheck(cancelToken);
                const description = this.descriptions.createDescription(element, element.name, document);
                localDescriptions.push(description);                
            }    
            for (const element of container.constants) {
                interruptAndCheck(cancelToken);
                const description = this.descriptions.createDescription(element, element.name, document);
                localDescriptions.push(description);                
            }    
        }
        if (isStruct(container)) {
            for (const element of container.constant_entries) {
                interruptAndCheck(cancelToken);
                const description = this.descriptions.createDescription(element, element.name, document);
                localDescriptions.push(description);                
            }    
        }
        if (isConstants(container)) {
            for (const element of container.constant_entries) {
                interruptAndCheck(cancelToken);
                const description = this.descriptions.createDescription(element, element.name, document);
                localDescriptions.push(description);                
            }    
        }

        if (isPackage(container) || isModel(container)) {
            for (const element of container.packages) {
                // console.log(`processContainer.. ${element.name}`)
                interruptAndCheck(cancelToken);
                const nestedDescriptions = await this.processContainer(element, scopes, document, cancelToken);
                for (const description of nestedDescriptions) {
                    // Add qualified names to the container
                    const qualified = this.createQualifiedDescription(element, description, document);
                    localDescriptions.push(qualified);
                    // console.log(`adding ${qualified.name}`)
                }
            }
        }
        if (isPackage(container)) {
            for (const element of container.items) {
                if (isStruct(element)) {
                    interruptAndCheck(cancelToken);
                    const nestedDescriptions = await this.processContainer(element, scopes, document, cancelToken);
                    for (const description of nestedDescriptions) {
                        // Add qualified names to the container
                        const qualified = this.createQualifiedDescription(element, description, document);
                        localDescriptions.push(qualified);
                    }
                }
            }
            for (const element of container.constants) {
                interruptAndCheck(cancelToken);
                const nestedDescriptions = await this.processContainer(element, scopes, document, cancelToken);
                for (const description of nestedDescriptions) {
                    // Add qualified names to the container
                    const qualified = this.createQualifiedDescription(element, description, document);
                    localDescriptions.push(qualified);
                }
            }
        }
        scopes.addAll(container, localDescriptions);
        return localDescriptions;
    }

    protected createQualifiedDescription(pack: Package|Struct|Constants, description: AstNodeDescription, document: LangiumDocument): AstNodeDescription {
        const name = (this.nameProvider as ItemLangNameProvider).getQualifiedName(pack.name, description.name);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.descriptions.createDescription(description.node!, name, document);
    }

}
