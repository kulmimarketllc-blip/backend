import { MigrationInterface, QueryRunner } from "typeorm";
export declare class InitialSchema1779530475956 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
