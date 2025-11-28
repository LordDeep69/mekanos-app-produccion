/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = function(options, webpack) {
  return {
    ...options,
    entry: ['./src/main.ts'],
    target: 'node',
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100', /^@mekanos\//],
        // Incluir express y nodemailer para que sean resueltos correctamente
        modulesFromFile: true,
      }),
    ],
    mode: 'development',
    watch: false,
    cache: false,
    module: {
      rules: [
        {
          test: /.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                getCustomTransformers: (program) => ({
                  before: [
                    require('@nestjs/swagger/plugin').before(
                      {
                        classValidatorShim: true,
                        introspectComments: true,
                      },
                      program
                    ),
                  ],
                }),
              },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@mekanos/database': path.resolve(__dirname, '../../packages/database/src'),
        '@mekanos/shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@mekanos/core': path.resolve(__dirname, '../../packages/core/src'),
      },
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'main.js',
    },
  };
};
