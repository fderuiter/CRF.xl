import type { ConfigurationModel, GrpcTls, HttpTls } from './generated/types';
export declare function envVariableSubstitution(value: string): string;
export declare function getGrpcTlsConfig(certificateFile?: string, clientKeyFile?: string, clientCertificateFile?: string, insecure?: boolean): GrpcTls | undefined;
export declare function initializeDefaultConfiguration(): ConfigurationModel;
export declare function initializeDefaultTracerProviderConfiguration(): NonNullable<ConfigurationModel['tracer_provider']>;
export declare function initializeDefaultMeterProviderConfiguration(): NonNullable<ConfigurationModel['meter_provider']>;
export declare function initializeDefaultLoggerProviderConfiguration(): NonNullable<ConfigurationModel['logger_provider']>;
export declare function getHttpTlsConfig(certificateFile?: string, clientKeyFile?: string, clientCertificateFile?: string): HttpTls | undefined;
//# sourceMappingURL=utils.d.ts.map