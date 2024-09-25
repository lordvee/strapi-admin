const path = require('path');
const webpack = require('webpack');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const DuplicatePckgChecker = require('duplicate-package-checker-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackBar = require('webpackbar');
const isWsl = require('is-wsl');
const alias = require('./webpack.alias.js');
const { log } = require('console');

module.exports = ({
  useEE,
  entry,
  dest,
  env,
  optimize,
  options = {
    backend: 'http://localhost:1337',
    publicPath: '/admin/',
    features: [],
  },
}) => {
  const isProduction = env === 'production';
  console.log(`The env is ${env}`);
  

  const webpackPlugins = isProduction
    ? [
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /moment$/,
        }),
        new MiniCssExtractPlugin({
          filename: '[name].[chunkhash].css',
          chunkFilename: '[name].[chunkhash].chunkhash.css',
          ignoreOrder: true,
        }),
        new WebpackBar(),
      ]
    : [
        new DuplicatePckgChecker({
          verbose: true,
        }),
        new FriendlyErrorsWebpackPlugin({
          clearConsole: false,
        }),
      ];

  return {
    mode: isProduction ? 'production' : 'development',
    bail: isProduction ? true : false,
    devtool: isProduction ? false : 'eval-source-map', // Use eval-source-map for better dev debugging
    entry,
    output: {
      path: dest,
      publicPath: options.publicPath,
      filename: isProduction ? '[name].[contenthash:8].js' : 'bundle.js',
      chunkFilename: isProduction ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
    },
    optimization: {
      minimize: isProduction, // Only minimize in production
      minimizer: isProduction ? [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: isProduction ? {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
            } : false, // Disable compression in development
            mangle: isProduction ? {
              safari10: true,
            } : false, // Disable mangling in development to preserve variable names
            output: isProduction ? {
              ecma: 5,
              comments: false,
              ascii_only: true,
            } : {
              beautify: true, // Beautify the output in development for readability
              comments: true, // Keep comments in development
            },
          },
          parallel: !isWsl,
          cache: true,
          sourceMap: !isProduction, // Keep source maps in development for better debugging
        }),
      ] : [],
      runtimeChunk: true,
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              cacheDirectory: true,
              cacheCompression: isProduction,
              compact: isProduction,
              presets: [
                require.resolve('@babel/preset-env'),
                require.resolve('@babel/preset-react'),
              ],
              plugins: [
                require.resolve('@babel/plugin-proposal-class-properties'),
                require.resolve('@babel/plugin-syntax-dynamic-import'),
                require.resolve('@babel/plugin-transform-modules-commonjs'),
                require.resolve('@babel/plugin-proposal-async-generator-functions'),
                [
                  require.resolve('@babel/plugin-transform-runtime'),
                  {
                    helpers: true,
                    regenerator: true,
                  },
                ],
              ],
            },
          },
        },
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.css$/,
          include: /node_modules/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(svg|eot|otf|ttf|woff|woff2)$/,
          use: 'file-loader',
        },
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.ico$/],
          loader: require.resolve('url-loader'),
          options: {
            limit: 1000,
          },
        },
        {
          test: /\.html$/,
          include: [path.join(__dirname, 'src')],
          use: require.resolve('html-loader'),
        },
        {
          test: /\.(mp4|webm)$/,
          loader: require.resolve('url-loader'),
          options: {
            limit: 10000,
          },
        },
      ],
    },
    resolve: {
      alias,
      symlinks: false,
      extensions: ['.js', '.jsx', '.react.js'],
      mainFields: ['browser', 'jsnext:main', 'main'],
    },
    plugins: [
      new HtmlWebpackPlugin({
        inject: true,
        template: path.resolve(__dirname, 'index.html'),
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        NODE_ENV: JSON.stringify(isProduction ? 'production' : 'development'),
        REMOTE_URL: JSON.stringify(options.publicPath),
        BACKEND_URL: JSON.stringify(options.backend),
        MODE: JSON.stringify(URLs.mode),
        PUBLIC_PATH: JSON.stringify(options.publicPath),
        PROJECT_TYPE: JSON.stringify(useEE ? 'Enterprise' : 'Community'),
        ENABLED_EE_FEATURES: JSON.stringify(options.features),
      }),
      new webpack.NormalModuleReplacementPlugin(/ee_else_ce(\.*)/, function(resource) {
        let wantedPath = path.join(
          resource.context.substr(0, resource.context.lastIndexOf(`${path.sep}src${path.sep}`)),
          'src'
        );

        if (useEE) {
          resource.request = resource.request.replace(
            /ee_else_ce/,
            path.join(wantedPath, '../..', 'ee/admin')
          );
        } else {
          resource.request = resource.request.replace(/ee_else_ce/, path.join(wantedPath));
        }
      }),
      ...webpackPlugins,
    ],
  };
};
