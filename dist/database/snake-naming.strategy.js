"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnakeNamingStrategy = void 0;
const typeorm_1 = require("typeorm");
class SnakeNamingStrategy extends typeorm_1.DefaultNamingStrategy {
    tableName(className, customName) {
        return customName ? customName : this.snakeCase(className);
    }
    columnName(propertyName, customName, embeddedPrefixes) {
        return ((embeddedPrefixes.length ? embeddedPrefixes.join('_') + '_' : '') +
            (customName ? customName : this.snakeCase(propertyName)));
    }
    relationName(propertyName) {
        return this.snakeCase(propertyName);
    }
    joinColumnName(relationName, referencedColumnName) {
        return this.snakeCase(relationName + '_' + referencedColumnName);
    }
    joinTableName(firstTableName, secondTableName, firstPropertyName, secondPropertyName) {
        return this.snakeCase(firstTableName + '_' + firstPropertyName.replace(/\./gi, '_') + '_' + secondTableName);
    }
    joinTableColumnName(tableName, propertyName, columnName) {
        return this.snakeCase(tableName + '_' + (columnName ? columnName : propertyName));
    }
    classTableInheritanceParentColumnName(parentTableName, parentTableIdColumnName) {
        return this.snakeCase(parentTableName + '_' + parentTableIdColumnName);
    }
    eagerJoinRelationAlias(alias, propertyPath) {
        return alias + '__' + propertyPath.replace(/\./gi, '_');
    }
    snakeCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
            .toLowerCase();
    }
}
exports.SnakeNamingStrategy = SnakeNamingStrategy;
//# sourceMappingURL=snake-naming.strategy.js.map