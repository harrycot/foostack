const path = require('node:path');
const webpack = require('webpack');

const TerserPlugin = require("terser-webpack-plugin");

const is_production = require('./src/server/server').is_production;

module.exports = [
    {
        name: 'web',
        target: 'web',
        mode: process.env.NODE_ENV,
        devtool: is_production ? false : 'eval-source-map',
        entry: ['./src/web/js/body.js', './src/web/scss/styles.scss'],
        output: {
            path: path.resolve(__dirname),
            filename: 'src/web/js/body.bundle.js'
        },
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    type: "asset/resource",
                    generator: {
                        filename: 'src/web/scss/styles.bundle.css',
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
        optimization: is_production ? {
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
        plugins: is_production ? [
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
        devtool: is_production ? false : 'eval-source-map',
        entry: './src/server/server.js',
        output: {
            path: path.resolve(path.join(__dirname, 'dist')),
            filename: "server.bundle.js"
        },
        node: {
            // Need this when working with express, otherwise the build fails
            __dirname: false,   // if you don't put this, __dirname
            __filename: false,  // and __filename return blank or /
        },
        optimization: is_production ? {
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
        plugins: is_production ? [
            // prod only
        ] : [
            // dev only
        ]
    }
];