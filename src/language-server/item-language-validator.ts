import { ValidationAcceptor, ValidationCheck, ValidationRegistry } from 'langium';
import { ItemLanguageAstType, Package } from './generated/ast';
import type { ItemLanguageServices } from './item-language-module';

/**
 * Map AST node types to validation checks.
 */
type ItemLanguageChecks = { [type in ItemLanguageAstType]?: ValidationCheck | ValidationCheck[] }

/**
 * Registry for validation checks.
 */
export class ItemLanguageValidationRegistry extends ValidationRegistry {
    constructor(services: ItemLanguageServices) {
        super(services);
        const validator = services.validation.ItemLanguageValidator;
        const checks: ItemLanguageChecks = {
            Package: validator.checkPackageStartsWithLowercase
        };
        this.register(checks, validator);
    }
}

/**
 * Implementation of custom validations.
 */
export class ItemLanguageValidator {

    checkPackageStartsWithLowercase(p: Package, accept: ValidationAcceptor): void {
        if (p.name) {
            const firstChar = p.name.substring(0, 1);
            if (firstChar.toLowerCase() !== firstChar) {
                accept('warning', 'Package name should start with a lowercase letter.', { node: p, property: 'name' });
            }
        }
    }

}
