"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupResource = exports.startNodeSDK = exports.NOOP_SDK = void 0;
const configuration_1 = require("@opentelemetry/configuration");
const api_1 = require("@opentelemetry/api");
const utils_1 = require("./utils");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const api_logs_1 = require("@opentelemetry/api-logs");
const resources_1 = require("@opentelemetry/resources");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const semconv_1 = require("./semconv");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const diag_1 = require("./diag");
// Exported for testing.
exports.NOOP_SDK = {
    shutdown: async () => { },
};
/**
 * @experimental Function to start the OpenTelemetry Node SDK
 * @param sdkOptions
 */
function startNodeSDK(sdkOptions) {
    let config;
    try {
        const configFactory = (0, configuration_1.createConfigFactory)();
        config = configFactory.getConfigModel();
    }
    catch (configErr) {
        // Set the diag logger, otherwise the diag.error will typically not be shown.
        const logLevel = (0, diag_1.diagLogLevelFromSeverityNumberConfig)();
        api_1.diag.setLogger(new api_1.DiagConsoleLogger(), { logLevel });
        api_1.diag.error(`Could not load OpenTelemetry configuration, SDK will not be setup: ${configErr.message}`);
        return exports.NOOP_SDK;
    }
    if (config.disabled) {
        return exports.NOOP_SDK;
    }
    const logLevel = (0, diag_1.diagLogLevelFromSeverityNumberConfig)(config.log_level);
    api_1.diag.setLogger(new api_1.DiagConsoleLogger(), { logLevel });
    (0, instrumentation_1.registerInstrumentations)({
        instrumentations: sdkOptions?.instrumentations?.flat() ?? [],
    });
    const components = create(config, sdkOptions);
    api_1.context.setGlobalContextManager(components.contextManager);
    if (components.loggerProvider) {
        api_logs_1.logs.setGlobalLoggerProvider(components.loggerProvider);
    }
    if (components.meterProvider) {
        api_1.metrics.setGlobalMeterProvider(components.meterProvider);
    }
    if (components.tracerProvider) {
        api_1.trace.setGlobalTracerProvider(components.tracerProvider);
    }
    if (components.propagator) {
        api_1.propagation.setGlobalPropagator(components.propagator);
    }
    const shutdownFn = async () => {
        const promises = [];
        if (components.loggerProvider) {
            promises.push(components.loggerProvider.shutdown());
        }
        if (components.meterProvider) {
            promises.push(components.meterProvider.shutdown());
        }
        if (components.tracerProvider) {
            promises.push(components.tracerProvider.shutdown());
        }
        await Promise.all(promises);
    };
    return { shutdown: shutdownFn };
}
exports.startNodeSDK = startNodeSDK;
/**
 * Interpret configuration model and return SDK components.
 */
function create(config, sdkOptions) {
    const defaultContextManager = new context_async_hooks_1.AsyncLocalStorageContextManager();
    defaultContextManager.enable();
    const components = {
        contextManager: defaultContextManager,
    };
    const resource = setupResource(config, sdkOptions);
    const propagator = sdkOptions?.textMapPropagator === null
        ? null
        : (sdkOptions?.textMapPropagator ??
            (0, utils_1.getPropagatorFromConfiguration)(config));
    if (propagator) {
        components.propagator = propagator;
    }
    const logProcessors = (0, utils_1.getLogRecordProcessorsFromConfiguration)(config);
    if (logProcessors) {
        const loggerProvider = new sdk_logs_1.LoggerProvider({
            resource: resource,
            processors: logProcessors,
        });
        components.loggerProvider = loggerProvider;
    }
    const meterReaders = (0, utils_1.getMeterReadersFromConfiguration)(config);
    if (meterReaders) {
        const meterViews = (0, utils_1.getMeterViewsFromConfiguration)(config);
        const meterProvider = new sdk_metrics_1.MeterProvider({
            resource: resource,
            readers: meterReaders,
            views: meterViews ?? [],
        });
        components.meterProvider = meterProvider;
    }
    const spanProcessors = (0, utils_1.getSpanProcessorsFromConfiguration)(config);
    if (spanProcessors) {
        const spanLimits = (0, utils_1.getSpanLimitsFromConfiguration)(config);
        // TODO (6506): support sampler configuration from config
        const tracerProvider = new sdk_trace_base_1.BasicTracerProvider({
            resource,
            spanProcessors,
            spanLimits,
            generalLimits: {
                attributeValueLengthLimit: config.attribute_limits?.attribute_value_length_limit,
                attributeCountLimit: config.attribute_limits?.attribute_count_limit,
            },
            // TODO (6616): support idGenerator configuration from config
            // TODO (6624): support for `meterProvider: components.meterProvider`
        });
        components.tracerProvider = tracerProvider;
    }
    return components;
}
function setupResource(config, sdkOptions) {
    let resource = (0, utils_1.getResourceFromConfiguration)(config) ?? (0, resources_1.defaultResource)();
    let resourceDetectors = [];
    if (sdkOptions.resourceDetectors != null) {
        resourceDetectors = sdkOptions.resourceDetectors;
    }
    else if (config.resource?.['detection/development']?.detectors) {
        resourceDetectors = (0, utils_1.getResourceDetectorsFromConfiguration)(config);
    }
    if (resourceDetectors.length > 0) {
        const internalConfig = {
            detectors: resourceDetectors,
        };
        resource = resource.merge((0, resources_1.detectResources)(internalConfig));
    }
    const instanceId = (0, utils_1.getInstanceID)(config);
    resource =
        instanceId === undefined
            ? resource
            : resource.merge((0, resources_1.resourceFromAttributes)({
                [semconv_1.ATTR_SERVICE_INSTANCE_ID]: instanceId,
            }));
    return resource;
}
exports.setupResource = setupResource;
//# sourceMappingURL=start.js.map