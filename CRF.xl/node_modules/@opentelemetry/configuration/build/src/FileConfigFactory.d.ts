import type { ConfigFactory } from './IConfigFactory';
import type { ConfigurationModel } from './generated/types';
export declare class FileConfigFactory implements ConfigFactory {
    private _config;
    constructor();
    getConfigModel(): ConfigurationModel;
}
export declare function parseConfigFile(): ConfigurationModel;
//# sourceMappingURL=FileConfigFactory.d.ts.map