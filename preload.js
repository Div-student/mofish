const { contextBridge, ipcRenderer} = require('electron');
const  fs = require('fs');
const  path = require('path');
const { Writable } = require('stream');
const jschardet = require('jschardet');
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
      // const regex = /<h1>.*?[<span.*?>(.*?)<\/span>.*?]?<\/h1>/s;

      const regex = /\<h1[^>]*\>(.*?)\<\/h1\>/gis // 匹配 h1 标签及其内容
      const match = text.match(regex);
      // console.log("text====>", text); 
      if (match && match[0]) {
        // 提取 span 标签内的文字
        chapterName = match[0].replace(/<[^>]+>/g, ''); // 去除所有 HTML 标签，提取纯文本内容
        // console.log("chapterName====>", chapterName);
        articleArray.push(chapterName)

        // 获取每一章节��正文内容
        const removeH1 = text.replace(/\<h1[^>]*\>(.*?)\<\/h1\>/gis, '') // 去除所有 H1 标题标签，提取纯文本内容
        const replaceP = removeH1.replace(/<\/p>/gi, '\r') // 将所有 </p> 标签替换为 \r。g 表示全局替换，i 表示不区分大小写。
        const replaceH = replaceP.replace(/<\/h1>/gi, '\r') // 将所有 </h1> 标签替换为 \r
        const removeHtml = replaceH.replace(/<[^>]+>/g, '') // 去除所有 HTML 标签。<[^>]+> 匹配任意 HTML 标签。
        articleArray.push(removeHtml)
        // console.log("removeHtml====>", removeHtml);
      } else {
        console.log('未找到匹配的内容');
      }
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
      // console.log('results===>', results)
      results.forEach((itm, indx) => {
        // console.log('itm===>', itm)
        if(itm.length >=2 && itm[0] != ""){
          // console.log('indx', indx)
          articals[indx-reduceIndex] = itm
        }else{
          reduceIndex += 1
        }
      })
      // console.log('articals1111===>', articals)
      resolve(articals)
    })
    epub.parse();
    
  })
}

// 读取txt文件
function getTxtFile(data){
  if(!data) return null
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

// 判断文件是否为utf-8编码
async function isUtf8ByStream(filePath) {
  return new Promise((resolve) => {
    const detector = new jschardet.UniversalDetector();
    let isUtf8 = false;
    const readableStream = fs.createReadStream(filePath);
    const writableStream = new Writable({
      write: (chunk, encoding, callback) => {
        detector.handle(chunk);
        if (detector.result) {
          isUtf8 = detector.result.encoding.toLowerCase() === 'utf-8';
          readableStream.close(); // 提前结束流
        }
        callback();
      }
    });

    readableStream.on('data', (chunk) => {
      writableStream.write(chunk);
    });

    readableStream.on('close', () => {
      detector.close();
      resolve(isUtf8 || detector.result?.encoding?.toLowerCase() === 'utf-8');
    });

    readableStream.on('error', () => {
      resolve(false);
    });
  });
}

async function detectEncoding(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = jschardet.detect(buffer);
  return result.encoding.toLowerCase() === 'utf-8';
}

function detectFileEncodingAndRead(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, {
      highWaterMark: 1024 * 1024 // 1MB
    });

    let chunks = [];
    let totalLength = 0;
    const maxBytes = 1024 * 1024 * 50; // 50MB 用于编码检测
    let isEncodingDetected = false;
    let detectedEncoding = null;

    stream.on('data', (chunk) => {
      chunks.push(chunk);
      totalLength += chunk.length;

      // 只在未检测编码时进行检测
      if (!isEncodingDetected && totalLength >= maxBytes) {
        isEncodingDetected = true;
        // 使用已收集的数据进行编码检测
        const buffer = Buffer.concat(chunks);
        const result = jschardet.detect(buffer);
        detectedEncoding = result.encoding;

        // 如果不是 UTF-8，立即停止读取
        if (detectedEncoding !== 'UTF-8') {
          stream.destroy();
          resolve({
            isUTF8: false,
            encoding: detectedEncoding,
            content: null
          });
        }
      }
    });

    stream.on('end', () => {
      // 如果还没检测过编码（文件小于 maxBytes），现在检测
      if (!isEncodingDetected) {
        const buffer = Buffer.concat(chunks);
        const result = jschardet.detect(buffer);
        detectedEncoding = result.encoding;
      }

      const isUTF8 = detectedEncoding === 'UTF-8' || detectedEncoding === 'ascii';

      if (isUTF8) {
        // 如果是 UTF-8，将所有数据块转换为字符串
        const content = Buffer.concat(chunks).toString('utf8');
        resolve({
          isUTF8: true,
          encoding: detectedEncoding,
          content: content
        });
      } else {
        resolve({
          isUTF8: false,
          encoding: detectedEncoding,
          content: null
        });
      }
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath, fileType) => {
    return new Promise( async (resolve, reject) => {
      if(fileType == "epub"){
        getEpubFile(filePath).then(res => {
          resolve(res);
        })
      }else if(fileType == "txt"){
        try {
          let isUtf8Res = await detectFileEncodingAndRead(filePath)
          let result = getTxtFile(isUtf8Res.content)
          resolve(result)
        }catch (error) {
          reject(err);
        }
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
  openNewWindow: (message) => ipcRenderer.send('open-set-window',message),
  sendMessageToParent: (message) => ipcRenderer.send('message-from-child', message),
  onMessageFromParent: (callback) => ipcRenderer.on('message-to-parent', (event, message) => {
    callback(message)}),
  clickSetting: (callback) => ipcRenderer.on('clickSetting', (event, message) => callback(message)),
  rebackTolocal: (callback) => ipcRenderer.on('rebackTolocal', (event, message) => callback(message)),
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

