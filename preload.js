const { contextBridge, ipcRenderer} = require('electron');
const  fs = require('fs');
const  path = require('path');
const Store = require('electron-store');
const EPub = require("epub")
const store = new Store();
function getChapterAsync(chapterId, epub){
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (error, text) => {
      // 在这里把每一章的文本存到 txt 文件里面
      let articleArray = []
      // 获取每一章节的标题
      let chapterName = ''
      const regex = /<h1>.*?<span.*?>(.*?)<\/span>.*?<\/h1>/s;
      const match = text.match(regex);
      if (match && match[1]) {
        // 提取 span 标签内的文字
        chapterName = match[1].replace(/<b>|<\/b>/g, ''); // 去掉 <b> 标签
        console.log("chapterName====>", chapterName);
        articleArray.push(chapterName)
      } else {
        console.log('未找到匹配的内容');
      }
  
      // 获取每一章节��正文内容
      // 1. 删除 aside 和 sup 标签
      const cleanedString = text.replace(/<aside[^>]*>.*?<\/aside>/g, '').replace(/<sup[^>]*>.*?<\/sup>/g, '');
      // console.log("cleanedString===>", cleanedString)
      // 2. 提取 p 标签下的 span 标签内容
      const spanMatches = cleanedString.match(/<p><span[^>]*>(.*?)<\/span><\/p>/gs);
      // console.log("spanMatches===>", spanMatches)
      // 3. 提取文本内容
      const extractedTexts = spanMatches ? spanMatches.map(match => {
        const textMatch = match.match(/<span[^>]*>(.*?)<\/span>/gs);
        return textMatch ? textMatch[0].replace(/<[^>]+>/g, '').trim() : '';
      }) : [];
      console.log("chapterContent====>", extractedTexts.join(""));
      articleArray.push('\r' + extractedTexts.join("\r"))
      resolve(articleArray)
    });
  })
}

// 读取epub文件
function getEpubFile(filePath){
  let articals = {}
  return new Promise((resolve, reject)=>{
    const epub = new EPub(filePath)
    epub.on("end", async ()=>{
      let aysncArray = []
      epub.flow.forEach( async (chapter, index) => {
        aysncArray.push(getChapterAsync(chapter.id, epub))
      })
      let results = await Promise.all(aysncArray)
      let reduceIndex = 0
      results.forEach((itm, indx) => {
        if(itm[0] != ""){
          console.log('indx', indx)
          articals[indx-1] = itm
        }else{
          reduceIndex += 1
        }
      })
      console.log('articals1111===>', articals)
      resolve(articals)
    })
    epub.parse();
    
  })
}

// 读取txt文件
function getTxtFile(data){
  let articals = {}
  let reg = /((正文){0,1}(第)([零〇一二三四五六七八九十百千万a-zA-Z0-9]{1,7})[章节卷集部篇回](( {1,}).)((?!\t{1,4}).){0,30})\r?\n/g
  let res = data.replace(reg,"@@@$1@@+").split("@@@")
  let plainRow = /([\n\r])([\n\r]+)/g
  res.forEach((element,index) => {
    let chatContent = element.split("@@+")
    let tempArray = []
    if(chatContent[0]){
      tempArray.push(chatContent[0].replace(plainRow, "$1"))
    }
    if(chatContent[1]){
      tempArray.push(chatContent[1].replace(plainRow, "$1"))
    }
    articals[index] = tempArray
  });
  return articals
}

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath, fileType) => {
    return new Promise( async (resolve, reject) => {
      if(fileType == "epub"){
        getEpubFile(filePath).then(res => {
          resolve(res);
        })
      }else if(fileType == "txt"){
        fs.readFile(filePath, 'utf-8', (err, data) => {
          if (err) {
            reject(err);
          } else {
            let result = getTxtFile(data)
            resolve(result);
          }
        });
      }else if(fileType == "pdf"){
        ipcRenderer.send('prefix-convert-pdf', filePath);
        resolve({})
      }
    });
  },
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  onMessage: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveData: (key, value) => store.set(key, value),
  loadData: (key) => store.get(key),
  openNewWindow: () => ipcRenderer.send('open-set-window'),
  sendMessageToParent: (message) => ipcRenderer.send('message-from-child', message),
  onMessageFromParent: (callback) => ipcRenderer.on('message-to-parent', (event, message) => {
    callback(message)}),
  clickSetting: (callback) => ipcRenderer.on('clickSetting', (event, message) => callback(message)),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  windowMove: (canMove) => ipcRenderer.send("window-move-open", canMove),
  getMachinID: () => ipcRenderer.invoke('getMachinID'), // 激活码页面发送的获取机器ID消息 
  activeAppToken: (message) => ipcRenderer.invoke('activeAppToken', message), // 激活验证码
  closeChildWindow: () => ipcRenderer.send('closeChildWindow'), // 关闭授权弹窗 
  novalChangeEvent: (message) => ipcRenderer.send('novalChangeEvent',message), // 小说切换窗口事件
  onlineNovalImport: (message) => ipcRenderer.send('onlineNovalImport',message), // 线上小说导入事件
  sendMessageToParent1: (message) => ipcRenderer.send('message-from-child1', message),
  onMessageFromParent1: (callback) => ipcRenderer.on('message-to-parent1', (event, message) => {
    callback(message)}),
  onMessagePdf: (callback) => ipcRenderer.on('onMessagePdf', (event, message) => {
    callback(message)}),
  sendMsgToWindow: (message) => ipcRenderer.send('message-from-win', message), // 发送消息给窗口
  onMsgFromWindow: (callback) => ipcRenderer.on('message-to-win', (event, message) => {
    callback(message)}), // 接收窗口消息
});

