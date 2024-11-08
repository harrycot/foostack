

exports.get_http_headers = (content_type) => {
    // https://github.com/helmetjs/helmet
    //'Content-Security-Policy': "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests"
    return {
        'Content-Type': content_type,
        'Content-Security-Policy': require('../server').is_production
            ? "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests"
            : "",
        'Cross-Origin-Opener-Policy': "same-origin",
        'Cross-Origin-Resource-Policy': "same-origin",
        'Origin-Agent-Cluster': "?1",
        'Referrer-Policy': "no-referrer",
        //'Strict-Transport-Security': "max-age=15552000; includeSubDomains",
        'X-Content-Type-Options': "nosniff",
        'X-DNS-Prefetch-Control': "off",
        'X-Download-Options': "noopen",
        'X-Frame-Options': "DENY",
        'X-Permitted-Cross-Domain-Policies': "none",
        'X-XSS-Protection': "0"
    }
}

exports.is_port_available = (port) => {
    return new Promise((resolve, reject) => {
        const server = require('node:net').createServer();
        server.on('error', reject);
        server.listen(port, () => {
            server.off('error', reject);
            server.close();
            resolve(true);
        });
    });
}

exports.get_port_to_use = async (callback) => {
    const { port_range, network } = require('../db/memory').config;
    while (!network.port && port_range.start <= port_range.end) {
        try {
            await this.is_port_available(port_range.start);
            callback(port_range.start);
        } catch (ex) {
            port_range.start++;
        }
    }
}
