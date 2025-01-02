const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const path = require("path");

module.exports = {
  mode: "production",
  watch: true,
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
      patterns: [{ from: "manifest.json", to: "manifest.json" }],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "icon.png", to: "icon.png" }],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "popup.html", to: "popup.html" }],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "view", to: "view" }],
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
};
