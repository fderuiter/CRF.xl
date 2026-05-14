/// <reference types="node" />
/// <reference types="node" />
import type { ContextManager, TextMapPropagator } from '@opentelemetry/api';
import type { Resource, ResourceDetector } from '@opentelemetry/resources';
import type { Sampler, SpanExporter, SpanLimits, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import type { ConfigurationModel, LogRecordExporterConfigModel, InstrumentTypeConfigModel, AggregationConfigModel, PeriodicMetricReaderConfigModel, SpanExporterConfigModel, SamplerConfigModel, NameStringValuePairConfigModel, HttpTlsConfigModel } from '@opentelemetry/configuration';
import type { AggregationOption, IMetricReader, PushMetricExporter, ViewOptions } from '@opentelemetry/sdk-metrics';
import { InstrumentType } from '@opentelemetry/sdk-metrics';
import type { BufferConfig, LogRecordExporter, LoggerProviderConfig, LogRecordProcessor } from '@opentelemetry/sdk-logs';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
export declare function getResourceFromConfiguration(config: ConfigurationModel): Resource | undefined;
export declare function getResourceDetectorsFromEnv(): Array<ResourceDetector>;
export declare function getResourceDetectorsFromConfiguration(config: ConfigurationModel): Array<ResourceDetector>;
export declare function getOtlpProtocolFromEnv(): string;
export declare function getSpanProcessorsFromEnv(): SpanProcessor[];
/**
 * Get a propagator as defined by environment variables
 */
export declare function getPropagatorFromEnv(): TextMapPropagator | null | undefined;
/**
 * Get a propagator as defined by configuration model from configuration
 */
export declare function getPropagatorFromConfiguration(config: ConfigurationModel): TextMapPropagator | null | undefined;
export declare function setupContextManager(contextManager: ContextManager | null | undefined): void;
export declare function setupPropagator(propagator: TextMapPropagator | null | undefined): void;
export declare function getKeyListFromObjectArray(obj: object[] | undefined): string[] | undefined;
export declare function getNonNegativeNumberFromEnv(envVarName: string): number | undefined;
export declare function getPeriodicExportingMetricReaderFromEnv(exporter: PushMetricExporter): IMetricReader;
export declare function getOtlpMetricExporterFromEnv(): PushMetricExporter;
export declare function getPeriodicMetricReaderFromConfiguration(periodic: PeriodicMetricReaderConfigModel): IMetricReader | undefined;
/**
 * Get LoggerProviderConfig from environment variables.
 */
export declare function getLoggerProviderConfigFromEnv(): LoggerProviderConfig;
/**
 * Get configuration for BatchLogRecordProcessor from environment variables.
 */
export declare function getBatchLogRecordProcessorConfigFromEnv(): BufferConfig;
export declare function getBatchLogRecordProcessorFromEnv(exporter: LogRecordExporter): BatchLogRecordProcessor;
export declare function getLogRecordExporter(exporter: LogRecordExporterConfigModel): LogRecordExporter | undefined;
export declare function getLogRecordProcessorsFromConfiguration(config: ConfigurationModel): LogRecordProcessor[] | undefined;
export declare function getHeadersFromConfiguration(headers: NameStringValuePairConfigModel[] | undefined): Record<string, string> | undefined;
export declare function getHttpAgentOptionsFromTls(tls: HttpTlsConfigModel | undefined): {
    ca?: Buffer;
    cert?: Buffer;
    key?: Buffer;
} | undefined;
export declare function getSpanExporter(exporter: SpanExporterConfigModel): SpanExporter | undefined;
export declare function getSpanProcessorsFromConfiguration(config: ConfigurationModel): SpanProcessor[] | undefined;
export declare function getSpanLimitsFromConfiguration(config: ConfigurationModel): SpanLimits | undefined;
export declare function getMeterReadersFromConfiguration(config: ConfigurationModel): IMetricReader[] | undefined;
export declare function getInstrumentType(instrument: InstrumentTypeConfigModel): InstrumentType | undefined;
export declare function getAggregationType(aggregation: AggregationConfigModel): AggregationOption | undefined;
export declare function getMeterViewsFromConfiguration(config: ConfigurationModel): ViewOptions[] | undefined;
export declare function getInstanceID(config: ConfigurationModel): string | undefined;
/**
 * Builds a {@link Sampler} from a {@link SamplerConfigModel} data model.
 * This allows sampler construction from declarative configuration.
 */
export declare function buildSamplerFromConfig(config: SamplerConfigModel): Sampler;
//# sourceMappingURL=utils.d.ts.map