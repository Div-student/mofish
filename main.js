const { app, BrowserWindow, ipcMain, dialog, Menu, screen, Tray, globalShortcut } = require('electron')
const path = require('path') ;
const Store = require('electron-store');
const { validateToken, generateMachKey, generateDateToken, activeAppCert } = require('./validateToken')
const pdf = require('pdf-parse');
const  fs = require('fs');

const getNovalUtils = require('./getNovalUtils.js')
const eventBus = require('./eventCenter');

const store = new Store();
let win = null
let tray = null
const createWindow = async() => {
  let windowSizeRes = store.get("windowSize")
  win = new BrowserWindow({
    width: windowSizeRes?.width || 460,
    height: windowSizeRes?.height || 240,
    frame:false,
    alwaysOnTop: true, // 设置窗口始终位于顶层
    transparent: true, // 透明窗口
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false,
      contextIsolation: true,
      nodeIntegration: true // 确保 nodeIntegration 为 true
    }
  })

  // 在 macOS 上设置更高的置顶级别
  if (process.platform === 'darwin') {
    win.setAlwaysOnTop(true, 'floating');
    // 设置窗口级别高于普通窗口
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    });
  }
  
  win.loadFile('index.html')

  // 记录软件运行的平台系统类型
  store.set("platform", process.platform)

  // 监听窗口大小变化事件
  win.on('resize', () => {
    const [width, height] = win.getSize();
    store.set("windowSize", {width,height})
  });
  windowMove(win)

  let validateRes = validateToken()
  if(validateRes.error == 0 || validateRes.error == 1){
    createTokenWindow()
  }
  
  // win.webContents.openDevTools();
}

// 创建设置弹窗
let newWindow = null
function createNewWindow() {
  newWindow = new BrowserWindow({
    width: 500,
    // width: 1000,
    height: 380,
    autoHideMenuBar:true,
    parent: win,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true // 确保 nodeIntegration 为 false
    }
  });

  newWindow.loadFile('settings.html');

  // 监听小说章节切换窗口事件
  ipcMain.on('message-from-child1', (event, message) => {
    console.log('Message from child1:', message);
    newWindow.webContents.send('message-to-parent1', message);
    novelWindow.close()
  });

  // newWindow.webContents.openDevTools();
}

// 创建激活窗口
let novelWindowtokenWindow = null 
function createTokenWindow() {
  tokenWindow = new BrowserWindow({
    width: 460,
    height: 240,
    parent: win,
    frame:false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true // 确保 nodeIntegration 为 false
    }
  });
  tokenWindow.loadFile('validateToken.html');
  // tokenWindow.webContents.openDevTools();
}

// 创建小说切换窗口
let novelWindow = null 
function changeNovelWindow(novalName) {
  novelWindow = new BrowserWindow({
    width: 460,
    height: 240,
    parent: newWindow,
    autoHideMenuBar:true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true, // 确保 nodeIntegration 为 false
    }
  });
  novelWindow.loadURL(`file://${__dirname}/novalChange.html?novalName=${novalName}`);
  // novelWindow.webContents.openDevTools();
}


// 创建线上小说导入窗口
let onlineNovelWindow = null 
let getNovalUtilsMap = null
function createOnlineNovelWindow(novalName) {
  onlineNovelWindow = new BrowserWindow({
    width: 700,
    height: 400,
    parent: newWindow,
    autoHideMenuBar:true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true, // 确保 nodeIntegration 为 false
    }
  });
  onlineNovelWindow.loadFile('onlineNovel.html');

  getNovalUtilsMap = new getNovalUtils({
    searchNovaUrl: "https://www.tadu.com/search",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body:"query=${novalName}"
  }, {
    chapterNovalUrl: "https://www.tadu.com/book/${novalId}/",
  })

  // onlineNovelWindow.webContents.openDevTools();
}

// 小说章节列表弹窗
let novelChapterWindow = null 
function creatNovelChapterWindow(charpterUrl) {
  novelChapterWindow = new BrowserWindow({
    width: 700,
    height: 400,
    parent: onlineNovelWindow,
    autoHideMenuBar:true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nativeWindowOpen: true,
      // contextIsolation: true,
      nodeIntegration: true, // 确保 nodeIntegration 为 false
    }
  });
  novelChapterWindow.loadURL('https://www.tadu.com' + charpterUrl);  
  novelChapterWindow.webContents.setWindowOpenHandler((details) => {
    console.log('导航到：details', details);
    novelChapterWindow.loadURL(details.url); // 在当前窗口加载新链接
    // 监听网页加载完成事件
    novelChapterWindow.webContents.on('did-finish-load', () => {
      // 在网页上下文中执行自定义脚本
      const customScript = `
      // 创建一个 div 元素
      let widget = document.createElement('div');
      widget.id = 'collectWidget';

      // 创建 CSS 样式
      const style = document.createElement('style');
      style.textContent = \`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading::before {
          content: '';
          position: absolute;
          width: 40px;
          height: 40px;
          border: 3px solid #ffffff;
          border-top: 3px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .loading {
          position: relative;
          color: transparent !important;
        }
      \`;
      document.head.appendChild(style);

      // 设置样式
      widget.style.position = 'fixed';
      widget.style.bottom = '50vh';
      widget.style.right = '20px';
      widget.style.width = '60px';
      widget.style.height = '60px';
      widget.style.backgroundColor = '#4caf50';
      widget.style.borderRadius = '50%';
      widget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      widget.style.cursor = 'pointer';
      widget.style.display = 'flex';
      widget.style.alignItems = 'center';
      widget.style.justifyContent = 'center';
      widget.style.color = '#fff';
      widget.style.fontSize = '12px';
      widget.style.zIndex = '1000';
      widget.style.transition = 'background-color 0.3s'; // 添加过渡效果

      // 添加内容
      widget.innerHTML = '点击采集';

      // 添加点击事件
      widget.onclick = function() {
        // 添加 loading 类
        widget.classList.add('loading');
        // 改变背景色
        widget.style.backgroundColor = '#45a049';

        let widgetSpan ="<span id='processDom' style='color:white'>采集中</span>" 
        widget.innerHTML = widgetSpan;

        // 发送请求
        window.electronAPI.sendMsgToWindow({
          windowName: 'onlineNovelWindow',
          action: 'downloadNovel',
          data: {
            cookie: document.cookie
          }
        });
      };

      // 添加鼠标悬停效果
      widget.addEventListener('mouseenter', () => {
        if (!widget.classList.contains('loading')) {
          widget.style.backgroundColor = '#45a049';
        }
      });

      widget.addEventListener('mouseleave', () => {
        if (!widget.classList.contains('loading')) {
          widget.style.backgroundColor = '#4caf50';
        }
      });

      // 监听采集进度事件
      window.electronAPI.onMsgFromWindow((msg)=>{
        console.log('msg1212===>',msg)
        if(msg.action === 'process'){
          let processDom = document.getElementById('processDom')
          if(processDom){
            processDom.innerHTML = msg.progress + '/' + msg.total
          }
        }
      })

      // 将小工具添加到 body 中
      document.body.appendChild(widget);


      // 创建一个返回 div 元素
      let widgetBack = document.createElement('div');
      widgetBack.id = 'widgetBack'; 
      // 设置样式
      widgetBack.style.position = 'fixed';
      widgetBack.style.bottom = '50vh';
      widgetBack.style.left = '20px';
      widgetBack.style.width = '60px';
      widgetBack.style.height = '60px';
      widgetBack.style.backgroundColor = '#4caf50';
      widgetBack.style.borderRadius = '50%';
      widgetBack.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      widgetBack.style.cursor = 'pointer';
      widgetBack.style.display = 'flex';
      widgetBack.style.alignItems = 'center';
      widgetBack.style.justifyContent = 'center';
      widgetBack.style.color = '#fff';
      widgetBack.style.fontSize = '12px';
      widgetBack.style.zIndex = '1000';
      widgetBack.style.transition = 'background-color 0.3s'; // 添加过渡效果

      // 添加内容
      widgetBack.innerHTML = '返回';

      // 添加点击事件
      widgetBack.onclick = function() {
        // 发送请求
        window.electronAPI.sendMsgToWindow({
          windowName: 'onlineNovelWindow',
          action: 'returnBack'
        });
      };

      // 添加鼠标悬停效果
      widgetBack.addEventListener('mouseenter', () => {
        if (!widgetBack.classList.contains('loading')) {
          widgetBack.style.backgroundColor = '#45a049';
        }
      });

      widgetBack.addEventListener('mouseleave', () => {
        if (!widgetBack.classList.contains('loading')) {
          widgetBack.style.backgroundColor = '#4caf50';
        }
      });

      // 将返回工具添加到 body 中
      document.body.appendChild(widgetBack);
      `;
      
      novelChapterWindow.webContents.executeJavaScript(customScript)
      .then(result => {
          console.log('脚本执行结果:', result);
      })
      .catch(error => {
          console.error('脚本执行错误:', error);
      });
    });
    return { action: 'deny' }
  })
  // novelChapterWindow.webContents.openDevTools();
}



// 监听小说切换窗口事件
ipcMain.on('novalChangeEvent', (event, message) => {
  console.log('novalChangeEvent----:',message);
  changeNovelWindow(message.openWindow)
});

// 监听线上小说导入窗口事件
ipcMain.on('onlineNovalImport', (event, message) => {
  createOnlineNovelWindow()
});

// 监听关闭激活窗口的请求
ipcMain.on('closeChildWindow', () => {
  console.log('关闭弹窗请求----:',tokenWindow);
  if (tokenWindow) {
    tokenWindow.close();
  }
});

// 读取txt文件信息
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'epub', 'pdf'] }
    ]
  });
  return result.filePaths;
});

app.whenReady().then(() => {
  createWindow()
  const ret = globalShortcut.register('CommandOrControl+Shift+O', () => {
    createNewWindow();
  });

  if (!ret) {
    console.log('注册快捷键失败');
  }

  // 检查当前注册的快捷键
  console.log(globalShortcut.isRegistered('CommandOrControl+Shift+O'));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0)  createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// 退出时注销快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('open-set-window', () => {
  createNewWindow();
});

// 监听【设置】子窗口发送的消息
ipcMain.on('message-from-child', (event, message) => {
  console.log('Message from child:', message);
  if(process.platform == "darwin"){ // 判断是否为macOS系统
    if(message.statusBarIcon == "是"){
      app.dock.hide()
    }else if(message.statusBarIcon == "否"){
      app.dock.show()
    }
  }else if(process.platform == "win32"){ // 判断是否为windows系统
    if(message.statusBarIcon == "是"){
      win.setSkipTaskbar(true)
    }else if(message.statusBarIcon == "否"){
      win.setSkipTaskbar(false)
    }
  }
  win.webContents.send('message-to-parent', message);
});

// 监听所有从子窗口发送的消息
let mofish_bookId = null
let mofish_bookName = null
let mofish_chapterUrl = null
ipcMain.on('message-from-win', async (event, message) => {
  console.log('Message from win:', message);
  if(message.windowName == "onlineNovelWindow"){
   if(message.action == "searchNovel"){
    let novalList = await getNovalUtilsMap.searchNoval(message.data.novelName)
    message.data.novelList = novalList
   }else if(message.action == "getChapterList"){
    creatNovelChapterWindow(message.data.bookUrl)
    mofish_bookId = message.data.bookId
    mofish_bookName = message.data.title
    mofish_chapterUrl = message.data.bookUrl
   }else if(message.action == "downloadNovel"){
    let subscibeEvent = eventBus.on('progress', (progress) => {
      console.log('progress===>', progress);
      progress.action = 'process'
      novelChapterWindow.webContents.send('message-to-win', progress);
    });
    console.log("message.data.cookie====>", message.data.cookie)
    let novalContentRes = await getNovalUtilsMap.getNovalContent(message.data.cookie, mofish_bookId)
    console.log("novalContentRes==>", novalContentRes)
    // 将小说存入本地
    let tempMap = {}
    novalContentRes.forEach((element, index) => {
      tempMap[index] = element
    });
    let storeData = store.get('mydata') || {}
    storeData[mofish_bookName] = tempMap
    store.set("mydata", storeData)

    // 通知设置窗口下载成功，更新小说列表
    let downLoadMsg = {
      downloadMsg:"success"
    }
    newWindow.webContents.send('message-to-parent1', downLoadMsg);
    // 关闭采集按钮的loading效果
    let loadingScript = `
      let collectWidget = document.getElementById('collectWidget');
      collectWidget.classList.remove('loading');
      collectWidget.style.backgroundColor = '#4caf50';

      let processDom = document.getElementById('processDom')
      if(processDom){
        processDom.innerHTML = '点击采集'
      }
    `
    novelChapterWindow.webContents.executeJavaScript(loadingScript)
    subscibeEvent() // 取消订阅下载进度事件
    message.data = { msg:"success", chapterLength:novalContentRes.length }
   }else if(message.action == "returnBack"){
    // 返回到上一级页面
    novelChapterWindow.close()
    creatNovelChapterWindow(mofish_chapterUrl)
   }
   
   onlineNovelWindow.webContents.send('message-to-win', message);
  }
})

// 监听pdf文件转换请求
ipcMain.on( 'prefix-convert-pdf', ( event, file_base_path ) => {
  let dataBuffer = fs.readFileSync(file_base_path);
  pdf(dataBuffer).then(function(data) {
    newWindow.webContents.send('onMessagePdf', data.text);
  });
});

// 获取机器唯一编码
ipcMain.handle('getMachinID',  () => {
  let machinKey = generateMachKey()
  return machinKey;
});

// 激活验证码
ipcMain.handle('activeAppToken',  (event, message) => {
  console.log('验证消息:', message);
  let activeAppToken = activeAppCert(message)
  console.log('验证结果:', activeAppToken);
  return activeAppToken;
});

// 自定义右键菜单
const contextMenu = Menu.buildFromTemplate([
  {
    label: `设置(${process.platform == "darwin"?"command":"ctrl"}+shift+O)`,
    click: () => {
      win.webContents.send('clickSetting', null);
    },
  },
  {
    label: '退出应用',
    click: () => {
      app.quit()
    },
  }
]);
// 监听右键菜单请求
ipcMain.on('show-context-menu', (event) => {
  const winRightClick = BrowserWindow.fromWebContents(event.sender);
  contextMenu.popup(winRightClick);
});

/**
 * 窗口移动 参考文章：https://zhuanlan.zhihu.com/p/112564936
 * @param win 
 */
function windowMove(win) {

  let winStartPosition = {x: 0, y: 0};
  let mouseStartPosition = {x: 0, y: 0};
  let movingInterval = null;

  /**
   * 窗口移动事件
   */
  ipcMain.on("window-move-open", (events, canMoving) => {
    if (canMoving) {
      // 读取原位置
      const winPosition = win.getPosition();
      winStartPosition = { x: winPosition[0], y: winPosition[1] };
      mouseStartPosition = screen.getCursorScreenPoint();
      // 清除
      if (movingInterval) {
        clearInterval(movingInterval);
      }
      // 新开
      movingInterval = setInterval(() => {
        // 实时更新位置
        const cursorPosition = screen.getCursorScreenPoint();
        const x = winStartPosition.x + cursorPosition.x - mouseStartPosition.x;
        const y = winStartPosition.y + cursorPosition.y - mouseStartPosition.y;
        win.setPosition(x, y, true);
      }, 20);
    } else {
      clearInterval(movingInterval);
      movingInterval = null;
    }
  });
}

