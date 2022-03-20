import { DefaultNameProvider } from 'langium';
import { isPackage, Package } from './generated/ast';

export function toQualifiedName(pack: Package, childName: string): string {
    return (isPackage(pack.$container) ? toQualifiedName(pack.$container, pack.name) : pack.name) + '.' + childName;
}

export class ItemLangNameProvider extends DefaultNameProvider {

    /**
     * @param qualifier if the qualifier is a `string`, simple string concatenation is done: `qualifier.name`.
     *      if the qualifier is a `Package` fully qualified name is created: `package1.package2.name`.
     * @param name simple name
     * @returns qualified name separated by `.`
     */
    getQualifiedName(qualifier: Package | string, name: string): string {
        let prefix = qualifier;
        if (isPackage(prefix)) {
            prefix = (isPackage(prefix.$container)
                ? this.getQualifiedName(prefix.$container, prefix.name) : prefix.name);
        }
        return (prefix ? prefix + '.' : '') + name;
    }

}
