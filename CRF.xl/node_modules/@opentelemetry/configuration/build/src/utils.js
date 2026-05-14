"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpTlsConfig = exports.initializeDefaultLoggerProviderConfiguration = exports.initializeDefaultMeterProviderConfiguration = exports.initializeDefaultTracerProviderConfiguration = exports.initializeDefaultConfiguration = exports.getGrpcTlsConfig = exports.envVariableSubstitution = void 0;
const core_1 = require("@opentelemetry/core");
function envVariableSubstitution(value) {
    const str = String(value);
    // Spec ABNF: $$ is a literal $; ${VAR}, ${VAR:-default}, ${env:VAR}, ${env:VAR:-default}
    const TOKEN_RE = /\$\$|\$\{(?:env:)?([a-zA-Z_][a-zA-Z0-9_]*)(?::-(.*?))?\}/g;
    let result = '';
    let lastIndex = 0;
    let match;
    while ((match = TOKEN_RE.exec(str)) !== null) {
        result += str.slice(lastIndex, match.index);
        if (match[0] === '$$') {
            result += '$';
        }
        else {
            const varName = match[1];
            const defaultValue = match[2] ?? '';
            result += (0, core_1.getStringFromEnv)(varName) || defaultValue;
        }
        lastIndex = TOKEN_RE.lastIndex;
    }
    result += str.slice(lastIndex);
    return result;
}
exports.envVariableSubstitution = envVariableSubstitution;
function getGrpcTlsConfig(certificateFile, clientKeyFile, clientCertificateFile, insecure) {
    if (certificateFile || clientKeyFile || clientCertificateFile) {
        const tls = {};
        if (certificateFile) {
            tls.ca_file = certificateFile;
        }
        if (clientKeyFile) {
            tls.key_file = clientKeyFile;
        }
        if (clientCertificateFile) {
            tls.cert_file = clientCertificateFile;
        }
        if (insecure !== undefined) {
            tls.insecure = insecure;
        }
        return tls;
    }
    return undefined;
}
exports.getGrpcTlsConfig = getGrpcTlsConfig;
function initializeDefaultConfiguration() {
    return {
        disabled: false,
        resource: {},
        attribute_limits: {
            attribute_count_limit: 128,
        },
    };
}
exports.initializeDefaultConfiguration = initializeDefaultConfiguration;
function initializeDefaultTracerProviderConfiguration() {
    return {
        processors: [],
        limits: {
            attribute_count_limit: 128,
            event_count_limit: 128,
            link_count_limit: 128,
            event_attribute_count_limit: 128,
            link_attribute_count_limit: 128,
        },
        sampler: {
            parent_based: {
                root: { always_on: undefined },
                remote_parent_sampled: { always_on: undefined },
                remote_parent_not_sampled: { always_off: undefined },
                local_parent_sampled: { always_on: undefined },
                local_parent_not_sampled: { always_off: undefined },
            },
        },
    };
}
exports.initializeDefaultTracerProviderConfiguration = initializeDefaultTracerProviderConfiguration;
function initializeDefaultMeterProviderConfiguration() {
    return {
        readers: [],
        views: [],
        exemplar_filter: 'trace_based',
    };
}
exports.initializeDefaultMeterProviderConfiguration = initializeDefaultMeterProviderConfiguration;
function initializeDefaultLoggerProviderConfiguration() {
    return {
        processors: [],
        limits: { attribute_count_limit: 128 },
        'logger_configurator/development': {},
    };
}
exports.initializeDefaultLoggerProviderConfiguration = initializeDefaultLoggerProviderConfiguration;
function getHttpTlsConfig(certificateFile, clientKeyFile, clientCertificateFile) {
    if (certificateFile || clientKeyFile || clientCertificateFile) {
        const tls = {};
        if (certificateFile) {
            tls.ca_file = certificateFile;
        }
        if (clientKeyFile) {
            tls.key_file = clientKeyFile;
        }
        if (clientCertificateFile) {
            tls.cert_file = clientCertificateFile;
        }
        return tls;
    }
    return undefined;
}
exports.getHttpTlsConfig = getHttpTlsConfig;
//# sourceMappingURL=utils.js.map