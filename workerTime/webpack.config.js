const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const path = require("path");

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === "development";

  return {
    mode: isDevelopment ? "development" : "production",
    watch: isDevelopment,
    entry: {
      popup: "./js/popup.js",
      content: "./js/content.js",
      background: "./js/background.js",
      autoViewTable: "./js/autoViewTable.js",
    },
    output: {
      clean: true,
      filename: "js/[name].js",
      path: path.resolve(__dirname, "dist"),
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
        },
        {
          test: /\.(png|svg|jpg|gif)$/,
          use: ["file-loader"],
        },
        {
          test: /\.(ttf)$/,
          type: "asset/resource",
          generator: {
            filename: "[name][ext]",
          },
        },
      ],
    },
    devServer: {
      hot: true,
      static: "./dist",
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: "manifest.json", to: "manifest.json" },
          { from: "icon.png", to: "icon.png" },
          { from: "太阳.svg", to: "太阳.svg" },
          { from: "月亮.svg", to: "月亮.svg" },
          { from: "popup.html", to: "popup.html" },
          { from: "view", to: "view" },
          { from: "utils/workday.js", to: "utils/workday.js" },
          { from: "utils/theme.js", to: "utils/theme.js" },
        ],
      }),
      ...(isDevelopment ? [new webpack.HotModuleReplacementPlugin()] : []),
    ],
  };
};
