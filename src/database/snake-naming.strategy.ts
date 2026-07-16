import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName: string): string {
    return customName ? customName : this.snakeCase(className);
  }

  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return (
      (embeddedPrefixes.length ? embeddedPrefixes.join('_') + '_' : '') +
      (customName ? customName : this.snakeCase(propertyName))
    );
  }

  relationName(propertyName: string): string {
    return this.snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return this.snakeCase(relationName + '_' + referencedColumnName);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
    secondPropertyName: string,
  ): string {
    return this.snakeCase(
      firstTableName + '_' + firstPropertyName.replace(/\./gi, '_') + '_' + secondTableName,
    );
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return this.snakeCase(tableName + '_' + (columnName ? columnName : propertyName));
  }

  classTableInheritanceParentColumnName(
    parentTableName: any,
    parentTableIdColumnName: any,
  ): string {
    return this.snakeCase(parentTableName + '_' + parentTableIdColumnName);
  }

  eagerJoinRelationAlias(alias: string, propertyPath: string): string {
    return alias + '__' + propertyPath.replace(/\./gi, '_');
  }

  private snakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      .toLowerCase();
  }
}
