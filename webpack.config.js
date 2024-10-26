const path = require('node:path');
const TerserPlugin = require("terser-webpack-plugin");
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
    target: "node",
    mode: 'production',
    devtool: false,
    entry: './src/server.js',
    output: {
        path: path.resolve(path.join(__dirname, 'dist')),
        filename: "bundle.js"
    },
    node: {
        // Need this when working with express, otherwise the build fails
        __dirname: false,   // if you don't put this, __dirname
        __filename: false,  // and __filename return blank or /
    },
    optimization: {
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
    },
    plugins: [
        new WebpackObfuscator({
            rotateStringArray: true,
            target: 'node'
        }, [''])
    ]
};