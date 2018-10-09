/**
 * DEVELOPMENT WEBPACK CONFIGURATION
 */

const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const argv = require('minimist')(process.argv.slice(2));
const { __APP_PATH__, __IS_ADMIN__, __NPM_START_EVENT__, __PORT__,  __PWD__ } = require('./configs/globals');

const postcssPlugins = require('./configs/postcssOptions');
const { DEV_ALIAS } = require('./configs/alias');
// PostCSS plugins
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');

const appPath = (() => {
  if (__APP_PATH__) {
    return __APP_PATH__;
  }

  return __IS_ADMIN__ ? path.resolve(__PWD__, '..') : path.resolve(__PWD__, '..', '..');
})();

// Load plugins into the same build in development mode.
const plugins = {
  exist: false,
  src: [],
  folders: {},
};

if (__NPM_START_EVENT__) {
  try {
    fs.accessSync(path.resolve(appPath, 'plugins'), fs.constants.R_OK);
  } catch (e) {
    // Allow app without plugins.
    plugins.exist = true;
  }

  plugins.src =
    __IS_ADMIN__  && !plugins.exist
      ? fs.readdirSync(path.resolve(appPath, 'plugins')).filter(x => {
        let hasAdminFolder;

        // Don't inject the plugins that don't have an admin into the app
        try {
          fs.accessSync(path.resolve(appPath, 'plugins', x, 'admin', 'src', 'containers', 'App'));
          hasAdminFolder = true;
        } catch (err) {
          hasAdminFolder = false;
        }

        return x[0] !== '.' && hasAdminFolder;
      })
      : [];

  plugins.folders = plugins.src.reduce((acc, current) => {
    acc[current] = path.resolve(
      appPath,
      'plugins',
      current,
      'node_modules',
      'strapi-helper-plugin',
      'lib',
      'src',
    );

    return acc;
  }, {});
}

const port = argv.port || __PORT__ || 3000;

module.exports = require('./webpack.base.babel')({
  // Add hot reloading in development
  entry: Object.assign(
    {
      main: [
        `webpack-hot-middleware/client?path=http://localhost:${port}/__webpack_hmr`,
        path.join(appPath, 'admin', 'admin', 'src', 'app.js'),
      ],
    },
    plugins.src.reduce((acc, current) => {
      acc[current] = path.resolve(plugins.folders[current], 'app.js');
      
      return acc;
    }, {}),
  ),
      
  // Don't use hashes in dev mode for better performance
  output: {
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
    publicPath: `http://127.0.0.1:${port}/`,
  },
    
    // Add development plugins
  plugins: [
    new webpack.HotModuleReplacementPlugin(), // Tell webpack we want hot reloading
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minChunks: 2,
    }),
    new LodashModuleReplacementPlugin(),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new HtmlWebpackPlugin({
      favicon: 'admin/src/favicon.ico',
      inject: true, // Inject all files that are generated by webpack, e.g. bundle.js
      templateContent: templateContent(), // eslint-disable-line no-use-before-define
      chunksSortMode: 'auto',
    }),
      // new BundleAnalyzerPlugin(),
  ], // eslint-disable-line no-use-before-define,
  postcssPlugins,
  // Tell babel that we want presets and to hot-reload
  babelPresets: [
    [
      require.resolve('babel-preset-env'),
      {
        es2015: {
          modules: false,
        },
      },
    ],
    require.resolve('babel-preset-react'),
    require.resolve('babel-preset-stage-0'),
    require.resolve('babel-preset-react-hmre'),
  ],
  alias: DEV_ALIAS,
  
    // Emit a source map for easier debugging
  devtool: 'cheap-module-source-map',
}
);

/**
 * We dynamically generate the HTML content in development so that the different
 * DLL Javascript files are loaded in script tags and available to our application.
 */
function templateContent() {
  const html = fs.readFileSync(path.resolve(appPath, 'admin', 'admin', 'src', 'index.html')).toString();

  return html;
}
