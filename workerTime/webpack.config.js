const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const path = require("path");

module.exports = {
  mode: "production",
  watch: true,
  entry: {
    app: "./app.js",
  },
  output: {
    clean: true,
    filename: "[name].js",
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
    ],
  },
  devServer: {
    static: "./dist",
    hot: true,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "manifest.json", to: "manifest.json" }],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "icon.png", to: "icon.png" }],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "js", to: "js" }],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "popup.html", to: "popup.html" }],
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
};
