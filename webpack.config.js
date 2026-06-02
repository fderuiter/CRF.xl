/* eslint-disable no-undef */

const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

const urlDev = "https://localhost:3000/";
const urlProd = "https://www.contoso.com/"; // CHANGE THIS TO YOUR PRODUCTION DEPLOYMENT LOCATION

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
}

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const config = {
    devtool: "source-map",
    entry: {
      polyfill: ["core-js/stable", "regenerator-runtime/runtime"],
      react: ["react", "react-dom"],
      taskpane: {
        import: ["./src/taskpane/index.tsx", "./src/taskpane/taskpane.html"],
        dependOn: "react",
      },
      commands: "./src/commands/commands.ts",
    },
    output: {
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".html", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: ["ts-loader"],
        },
        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: "html-loader",
        },
        {
          test: /\.(png|jpg|jpeg|ttf|woff|woff2|gif|ico)$/,
          type: "asset/resource",
          generator: {
            filename: "assets/[name][ext][query]",
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["polyfill", "taskpane", "react"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "assets/*",
            to: "assets/[name][ext][query]",
          },
          {
            from: "manifest*.xml",
            to: "[name]" + "[ext]",
            transform(content) {
              let str = content.toString();

              const replacements = {
                "REPLACE_WITH_STAGING_HOST": process.env.STAGING_HOST_URL || "REPLACE_WITH_STAGING_HOST",
                "REPLACE_WITH_UAT_HOST": process.env.UAT_HOST_URL || "REPLACE_WITH_UAT_HOST",
                "REPLACE_WITH_PRODUCTION_HOST": process.env.PRODUCTION_HOST_URL || "REPLACE_WITH_PRODUCTION_HOST",
                "REPLACE_WITH_DEV_CLIENT_ID": process.env.DEV_CLIENT_ID || "REPLACE_WITH_DEV_CLIENT_ID",
                "REPLACE_WITH_STAGING_CLIENT_ID": process.env.STAGING_CLIENT_ID || "REPLACE_WITH_STAGING_CLIENT_ID",
                "REPLACE_WITH_UAT_CLIENT_ID": process.env.UAT_CLIENT_ID || "REPLACE_WITH_UAT_CLIENT_ID",
                "REPLACE_WITH_PRODUCTION_CLIENT_ID": process.env.PRODUCTION_CLIENT_ID || "REPLACE_WITH_PRODUCTION_CLIENT_ID",
              };

              for (const [placeholder, value] of Object.entries(replacements)) {
                str = str.replace(new RegExp(placeholder, "g"), value);
              }
              
              // Fallback for any old localhost mappings if necessary, though manifests should use placeholders
              if (!dev) {
                str = str.replace(new RegExp(urlDev, "g"), urlProd);
              }

              return str;
            },
          },
        ],
      }),
      new HtmlWebpackPlugin({
        filename: "commands.html",
        template: "./src/commands/commands.html",
        chunks: ["polyfill", "commands"],
      }),
      new webpack.ProvidePlugin({
        Promise: ["es6-promise", "Promise"],
      }),
    ],
    devServer: {
      hot: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      server: {
        type: "https",
        options: env.WEBPACK_BUILD || options.https !== undefined ? options.https : await getHttpsOptions(),
      },
      port: process.env.npm_package_config_dev_server_port || 3000,
    },
  };

  return config;
};
