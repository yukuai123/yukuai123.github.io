const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

// 文件夹路径
const folderPath = "./dist";
// 压缩文件名
const zipFileName = "workerTime.zip";

// 创建 JSZip 实例
const zip = new JSZip();

// 递归读取文件夹内所有文件
const addFolderToZip = (folder, zipInstance) => {
  fs.readdirSync(folder).forEach((itemName) => {
    const itemPath = path.join(folder, itemName);
    const stats = fs.lstatSync(itemPath);

    if (stats.isDirectory()) {
      addFolderToZip(itemPath, zipInstance.folder(itemName));
    } else {
      // 读取文件内容并添加到 zip 实例中
      const data = fs.readFileSync(itemPath);
      zipInstance.file(itemName, data);
    }
  });
};

const cleanOldSource = () => {
  return new Promise((resolve) => {
    // 文件路径
    const filePath = zipFileName;
    // 判断文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        resolve(true);
        return;
      }
      // 文件存在，删除文件
      fs.unlink(filePath, (err) => {
        if (err) {
          resolve(true);
          return;
        }
        resolve(true);
        console.log(`${filePath} was deleted successfully.`);
      });
    });
  });
};

cleanOldSource().then(() => {
  // 将文件夹添加到 JSZip 实例中
  addFolderToZip(folderPath, zip);
  // 将压缩后的内容保存到本地文件
  zip
    .generateAsync({ type: "nodebuffer" })
    .then((data) => fs.writeFileSync(zipFileName, data));
});
