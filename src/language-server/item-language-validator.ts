import { ValidationAcceptor, ValidationCheck, ValidationRegistry } from 'langium';
import { ItemLanguageAstType, Person } from './generated/ast';
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
            Person: validator.checkPersonStartsWithCapital
        };
        this.register(checks, validator);
    }
}

/**
 * Implementation of custom validations.
 */
export class ItemLanguageValidator {

    checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    }

}
