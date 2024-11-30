const path = require('node:path');
const webpack = require('webpack');

const TerserPlugin = require("terser-webpack-plugin");
const WebpackObfuscator = require('webpack-obfuscator');

const _is_production = process.env.NODE_ENV == 'production' ? true : false;

// 
const _obfuscate_node = false;
const _obfuscate_web = false;
const _plugins_node = [];
const _plugins_web = [];

_plugins_web.push(
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    })
);
if (_obfuscate_web) {
    _plugins_web.push(
        new WebpackObfuscator({ // https://github.com/javascript-obfuscator/javascript-obfuscator?tab=readme-ov-file#javascript-obfuscator-options
            rotateStringArray: true,
            target: 'browser-no-eval'
        }, [''])
    );
}
if (_obfuscate_node) {
    _plugins_node.push(
        new WebpackObfuscator({ // https://github.com/javascript-obfuscator/javascript-obfuscator?tab=readme-ov-file#javascript-obfuscator-options
            rotateStringArray: true,
            target: 'node'
        }, [''])
    );
}


const _terser_options = { // https://github.com/terser/terser/tree/v5.3.8?tab=readme-ov-file#minify-options
    compress: {
        drop_console: true,
        keep_infinity: true
    },
    format: {
        comments: false,
    }
}
module.exports = [
    {
        name: 'web',
        target: 'web',
        mode: process.env.NODE_ENV,
        devtool: _is_production ? false : process.env.DEV == 'yes' ? 'eval-source-map' : false,
        entry: ['./src/web/js/body.js', './src/web/css/styles.scss'],
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
                        filename: 'src/web/css/styles.bundle.css',
                    },
                    use: [
                        {
                            loader: 'sass-loader',
                            options: {
                                sassOptions: {
                                    outputStyle: 'compressed'
                                }
                            }
                        }
                    ],
                }
            ]
        },
        resolve: {
            fallback: {
                buffer: require.resolve('buffer/'),
            },
        },
        optimization: {
            minimize: _is_production ? true : false,
            minimizer: [
                new TerserPlugin({
                    terserOptions: _terser_options,
                    extractComments: false
                })
            ]
        },
        plugins: _plugins_web
    },
    {
        name: 'server',
        target: 'node',
        mode: process.env.NODE_ENV,
        devtool: _is_production ? false : process.env.DEV == 'yes' ? 'eval-source-map' : false,
        entry: './src/server.js',
        output: {
            path: path.resolve(path.join(__dirname, 'src')),
            filename: "server.bundle.js"
        },
        node: {
            __dirname: false,   // if you don't put this, __dirname
            __filename: false,  // and __filename return blank or /   (don't remember, maybe related to pkg)
        },
        optimization: {
            minimize: _is_production ? true : false,
            minimizer: [
                new TerserPlugin({
                    terserOptions: _terser_options,
                    extractComments: false
                })
            ]
        },
        plugins: _plugins_node
    }
];