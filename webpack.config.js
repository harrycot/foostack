const path = require('node:path');
const webpack = require('webpack');

const TerserPlugin = require("terser-webpack-plugin");
const WebpackObfuscator = require('webpack-obfuscator');

const _is_production = process.env.NODE_ENV == 'production' ? true : false;

module.exports = [
    {
        name: 'web',
        target: 'web',
        mode: process.env.NODE_ENV,
        devtool: _is_production ? false : 'eval-source-map',
        entry: ['./src/server/web/js/body.js', './src/server/web/css/styles.scss'],
        output: {
            path: path.resolve(__dirname),
            filename: 'src/server/web/js/body.bundle.js'
        },
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    type: "asset/resource",
                    generator: {
                        filename: 'src/server/web/css/styles.bundle.css',
                    },
                    use: ["sass-loader"],
                }
            ]
        },
        resolve: {
            fallback: {
                buffer: require.resolve('buffer/'),
            },
        },
        optimization: _is_production ? {
            minimize: false,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        format: {
                            comments: false,
                        }
                    },
                    extractComments: false,
                })
            ]
        } : {
            // dev only
        },
        plugins: _is_production ? [
            new WebpackObfuscator({ // https://github.com/javascript-obfuscator/javascript-obfuscator?tab=readme-ov-file#javascript-obfuscator-options
                rotateStringArray: true,
                target: 'browser-no-eval'
            }, ['']),
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
            })
        ] : [
            // dev only
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
            })
        ]
    },
    {
        name: 'server',
        target: 'node',
        mode: process.env.NODE_ENV,
        devtool: _is_production ? false : 'eval-source-map',
        entry: './src/server/server.js',
        output: {
            path: path.resolve(path.join(__dirname, 'src/server')),
            filename: "server.bundle.js"
        },
        node: {
            // Need this when working with express, otherwise the build fails
            __dirname: false,   // if you don't put this, __dirname
            __filename: false,  // and __filename return blank or /
        },
        optimization: _is_production ? {
            minimize: false,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        format: {
                            comments: false,
                        }
                    },
                    extractComments: false,
                })
            ]
        } : {
            // dev only
        },
        plugins: _is_production ? [
            // prod only
            new WebpackObfuscator({ // https://github.com/javascript-obfuscator/javascript-obfuscator?tab=readme-ov-file#javascript-obfuscator-options
                rotateStringArray: true,
                target: 'node'
            }, [''])
        ] : [
            // dev only
        ]
    }
];