import { EMPTY_SCOPE, Stream, getDocument, AstNodeDescriptionProvider, AstNodeDescription, DefaultScopeComputation, interruptAndCheck, LangiumDocument, LangiumServices, PrecomputedScopes, AstNode, MultiMap, DefaultScopeProvider, StreamScope, Scope, stream} from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { ItemLangNameProvider } from './item-language-naming';
import { isScalarAttribute, Attribute, Model, Package, isPackage, Struct, isStruct, Constants, isConstants, isModel, PropertyDefinition, ScalarAttribute, FormulaElement, isFormulaElement} from './generated/ast';
import { ItemLanguageServices } from './item-language-module';
import { isAttrRef } from './generated/ast';
import { isAttribute } from './generated/ast';

function get_parent_package(node: AstNode): Package|null {
    let p = node.$container;
    while(!isPackage(p)) {
        // "?." == "safe navigation" 
        p = p?.$container;
        if (p === undefined) return null;
    }
    return p as Package
}

function get_parent_packages(node: AstNode): Package[] {
    let result : Package[] = [];
    let finished = true;
    const first = get_parent_package(node);
    if (first!==null) {
        result.push.apply(result,[first]);
        finished = false;
    }
    let current = result;
    while(!finished) {
        finished = true;
        let next : Package[] = [];
        current.forEach( (p) => {
            const np = get_parent_package(p);
            if (np!==null) {
                next.push.apply(next, [np]);
                finished = false;
            }
        });
        result.push.apply(result, next);
        current = next
    }
    return result
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

function get_possible_next_elements(node: AstNode): AstNode[]|null {
    const e = node.$container;
    function next_elements(e: FormulaElement|undefined): AstNode[]|null {
        if(isAttribute(e)) {
            let result : AstNode[] = [];
            //console.log(`isAttribute!`)
            if(isScalarAttribute(e)) {
                if (isStruct(e.type.ref)) {
                    result.push.apply(result, e.type.ref.attributes);
                }
            }
            return result;
        }
        else if (isPackage(e)) {
            let result : AstNode[] = [];
            result.push.apply(result, e.packages);
            result.push.apply(result, e.items);
            result.push.apply(result, e.constants);
            return result;
        }
        else if (isConstants(e)||isStruct(e)) {
            let result : AstNode[] = [];
            result.push.apply(result, e.constant_entries);
            return result;
        }
        return null;        
    }
    if (isAttrRef(e)) {
        return next_elements(e.element_ref.ref);
    }
    else if (e !== undefined) {
        const s = get_parent_struct(e);
        let result : AstNode[] = [];
        if (s!==null) {
            //console.log(`isStruct! ${s.name}`)
            result.push.apply(result, s.attributes);
            result.push.apply(result, s.constant_entries);
 
            const pkgs = get_parent_packages(s);
            result.push.apply(result, pkgs);
        }
        return result;
    }
    return null;
}

export class ItemLangScopeProvider extends DefaultScopeProvider {

    descriptionProvider: AstNodeDescriptionProvider;

    constructor(services: ItemLanguageServices) {
        super(services);
        this.descriptionProvider = services.index.AstNodeDescriptionProvider;
    }

    getElementRefStream(prefix: String, attrs: ArrayLike<AstNode>): Stream<AstNodeDescription> {
        let descriptions = stream(attrs)
            .filter(isFormulaElement)
            .map(element =>
                this.descriptionProvider.createDescription(element, prefix + element.name, getDocument(element)));

        // this solution (partly impl. is not capable of providing the "way" through the referenced elements)
        // descriptions = Array.from(attrs)
        //     .map(element => element.content)
        //     .filter(isScalarAttribute)
        //     .map(element => element.type.ref)
        //     .filter(isStruct)
        //     .reduce<Stream<AstNodeDescription>>((d, element) => d.concat(this.getAttrRefStream("header.", element.attributes)), descriptions)

        return descriptions
    }

    getScope(node: AstNode, referenceId: string): Scope {
        if (referenceId=="Property:definition") {
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
                return EMPTY_SCOPE;
            }    
        }
        else if (referenceId=="AttrRef:element_ref") {
            let attrs: AstNode[]|null = [];
            attrs = get_possible_next_elements(node);
            if (attrs!==null) {
                //attrs = attrs.filter(e => ((e as FormulaElement).name!="m"))
                //attrs.forEach( value => {console.log(`${value.$type}: ${(value as FormulaElement).name}`);})
                const result = new StreamScope(this.getElementRefStream("", attrs));
                return result;
            }
            else {
                const result = new StreamScope(this.getElementRefStream("", []));
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
        console.log(`ItemLangScopeComputation::computeScope ${document.uri}`)
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
