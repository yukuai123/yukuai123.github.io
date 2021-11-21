---
title: Hello World
---

# 简单搭建

npm i hexo -g

npx hexo init `(必须要空文件夹)`

theme: 找一个心仪的主题

把这个主题的 git repo , 在 init 出来的 theme 文件夹 clone 下来

执行 hexo clean && hexo g && hexo s

## 部署

工具 npm i -S hexo-deployer-git

- 命令: hexo clean && hexo deploy
