'use strict';

const { resolve, join, dirname } = require('path');
const { readFileSync } = require('fs');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const JsDocPlugin = require('jsdoc-webpack-plugin');
const SymlinkWebpackPlugin = require('symlink-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const postcssPresetEnv = require('postcss-preset-env');
const postcssClean = require('postcss-clean');
const { version } = require('./package');

const jsFilename = `web/dropin/${version}/js/dropin.js`;
const cssFilename = `web/dropin/${version}/css/dropin.css`;

module.exports = {
  devServer: {
    allowedHosts: ['.bt.local'],
    contentBase: [join(__dirname, 'dist', 'gh-pages'), join(__dirname, 'dist')],
    liveReload: false,
    onListening: server => {
      console.info('Listening on port:', server.listeningApp.address().port);
    },
    port: 4567,
    writeToDisk: true
  },
  devtool: 'inline-source-map',
  entry: [
    './src/less/main.less',
    './src/index.js'
  ],
  mode: 'development',
  module: {
    rules: [
      {
        enforce: 'post',
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'eslint-loader'
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          { loader: 'css-loader' },
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: () => [
                postcssPresetEnv(),
                postcssClean()
              ]
            }
          },
          {
            loader: 'less-loader'
          }
        ]
      },
      {
        test: /\.html$/i,
        loader: 'html-loader'
      },
      {
        loader: 'string-replace-loader',
        options: {
          search: '__VERSION__',
          replace: version
        }
      }
    ]
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true
        }
      }
    }
  },
  output: {
    library: 'dropin',
    libraryTarget: 'umd',
    filename: jsFilename,
    path: resolve(__dirname, 'dist')
  },
  plugins: [
    new CleanWebpackPlugin(),
    new JsDocPlugin({
      conf: './jsdoc/jsdoc.conf.js',
      cwd: '.',
      recursive: true
    }),
    new MiniCssExtractPlugin({ moduleFilename: () => cssFilename }),
    new CopyPlugin([
      { from: './test/app', to: './gh-pages', globOptions: { dot: true }, transformPath: target => target.replace('test/app', '') },
      { from: './jsdoc/index.html', to: './gh-pages/docs', flatten: true },
      { from: './LICENSE', to: './npm' },
      {
        from: './package.json',
        to: './npm',
        transform: content => {
          const pkg = JSON.parse(content);

          delete pkg.browserify;
          delete pkg.private;
          pkg.main = 'index.js';
          pkg.browser = './dist/browser/dropin.js';

          return JSON.stringify(pkg);
        }
      },
      {
        from: './src/**/*.js',
        to: './npm',
        transform: (content, path) => {
          let htmlContent,
            filePath;
          let jsContent = content.toString('utf8').replace('__VERSION__', version);
          const htmlPaths = [...jsContent.matchAll(RegExp('require\\(\'(.+)\\.html\'\\)', 'g'))];

          if (htmlPaths.length > 0) {
            htmlPaths.forEach(foundPath => {
              filePath = resolve(dirname(path), `${foundPath[1]}.html`);
              htmlContent = readFileSync(filePath, 'utf8');
              htmlContent = htmlContent
                .replace(/\\([\s\S])|(")/g, '\\$1$2')
                .replace(/\n/g, '\\n')
                .replace(/ {2,}/g, ' ')
                .replace(/> +</g, '><');

              jsContent = jsContent.replace(foundPath[0], `"${htmlContent}"`);
            });
          }

          return jsContent;
        },
        transformPath: target => target.replace('src/', '')
      }
    ]),
    new FileManagerPlugin({
      onEnd: {
        copy: [
          { source: './CHANGELOG.md', destination: './dist/npm' },
          { source: './README.md', destination: './dist/npm' },
          { source: `./dist/${jsFilename}`, destination: './dist/npm/dist/browser' },
          { source: `./dist/${cssFilename}`, destination: './dist/npm' }
        ],
        'delete': [
          './dist/npm/**/__mocks__'
        ]
      }
    }),
    new SymlinkWebpackPlugin([
      { origin: `web/dropin/${version}`, symlink: 'web/dropin/dev' },
      { origin: `gh-pages/docs/${version}`, symlink: 'gh-pages/docs/current' }
    ])
  ]
};
