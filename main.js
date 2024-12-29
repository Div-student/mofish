const { app, BrowserWindow, ipcMain, dialog, Menu, screen, Tray, globalShortcut } = require('electron')
const path = require('path') ;
const Store = require('electron-store');
const { validateToken, generateMachKey, generateDateToken, activeAppCert } = require('./validateToken')
const pdf = require('pdf-parse');
const  fs = require('fs');

const getNovalUtils = require('./getNovalUtils.js')

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

  
  

  // let novalList = await getNovalUtilsMap.searchNoval("东莞往事")
  // console.log("novalList====>", novalList)
  // getNovalUtilsMap.getNovalContent("https://www.tadu.com/getPartContentByCodeTable/1003880/1")
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

  onlineNovelWindow.webContents.openDevTools();
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
ipcMain.on('message-from-win', async (event, message) => {
  console.log('Message from win:', message);
  if(message.windowName == "onlineNovelWindow"){
    // console.log("message.data.novelName====>", message.data.novelName)
   if(message.action == "searchNovel"){
    let novalList = await getNovalUtilsMap.searchNoval(message.data.novelName)
    message.data.novelList = novalList
   }else if(message.action == "getChapterList"){
    let chapterList = await getNovalUtilsMap.getNovalChapterList(message.data.bookId)
    // console.log("chapterList====>", chapterList)
    getNovalUtilsMap.getNovalContent("https://www.tadu.com/getPartContentByCodeTable/1003880/600")
    message.data.chapterList = chapterList
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

