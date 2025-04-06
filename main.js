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
let onlineStyle = store.get("onlineStyle") || `
  // 修改页面样式
  var styleElement = document.getElementById('custom-style');
  if (!styleElement) {
    var style = document.createElement('style');
    style.id = 'custom-style';
    // 定义要注入的 CSS 样式
    style.textContent = \`
      body {
        background: transparent!important;
        width: 100vw;
        height: 100vh;
      }
      body::-webkit-scrollbar {
        display: none;
      }
      html body.wr_whiteTheme{
        background: transparent!important;
      }
      .book, .listmain {
        border: none!important;
      }
      .readerBottomBar_content{
        display:none!important;
      }
      .readerContent .app_content  {
        background: transparent!important;
      }
      .wr_whiteTheme .readerContent .app_content {
        background: transparent!important;
      }
      .wr_whiteTheme .readerTopBar,.readerTopBar {
        display:none!important;
      }
      audio, canvas, video {
        background-color: transparent!important;
      }


      .questions-single-container,.header-container,.answer-card-content,.input-radio {
        background: transparent!important;
      }
      .choice-radio-label:hover,.ant-back-top-inner,.answer-btn,.answered,.chapter-container {
        background: transparent!important;
      }
      .main-bg,.arrow-bg,.title-right,.fill-1 {
        fill: transparent!important;
      }
    \`;
    document.head.appendChild(style);
  }
`
let cancalcustomStyle = `
var header = document.querySelector('head');
// 查找 <style> 标签
var styleElement = document.getElementById('custom-style');
// 检查 <style> 标签是否存在并且在 <header> 中
if (styleElement && header.contains(styleElement)) {
  // 移除 <style> 标签
  header.removeChild(styleElement);
  console.log('Style element removed');
} else {
  console.log('Style element not found or not in header');
}
`
let cumstomOnlineStyle = `
  if(typeof globleStyleDom == 'undefined'){
    // 创建一个新的 <style> 元素，添加全局需要的样式
    var globleStyleDom = document.createElement('style');
    globleStyleDom.id = 'globleStyle';
    globleStyleDom.textContent =\`
      .hiden{
        opacity: 0!important;
      }
    \`;
   document.head.appendChild(globleStyleDom);
  }
  var newDiv = document.getElementsByTagName("html")[0]
  var titlebar = document.getElementsByTagName("body")[0]
  titlebar.addEventListener("mouseenter", ()=>{
    console.log("鼠标移入")
    if(userProfileData?.showupWay == "鼠标移入"){
      newDiv.setAttribute("class", "")
    }
  })
  titlebar.addEventListener("click", ()=>{
    console.log("鼠标单击")
    if(userProfileData?.showupWay == "鼠标单击"){
      newDiv.setAttribute("class", "")
    }
  })
  titlebar.addEventListener("dblclick", ()=>{
    console.log("鼠标双击")
    if(userProfileData?.showupWay == "鼠标双击"){
      newDiv.setAttribute("class", "")
    }
  })
  titlebar.addEventListener("mouseleave", ()=>{
    console.log("鼠标离开")
    if(userProfileData?.showupWay && userProfileData.showupWay != "不隐藏"){
      newDiv.setAttribute("class", "hiden")
    }
  })
`
// 在网页上下文中执行自定义脚本
const customOnlineScript = `
  let userProfileData = window.electronAPI.loadData('userProfile') || {};
  // 获取缓存中的背景透明度
  var htmlDom = document.getElementsByTagName('html')[0];
  var bgTransparent = userProfileData.bgTransparent ?? 100;
  htmlDom.setAttribute("style","opacity:" + bgTransparent/100 + ";")
  // 获取缓存中的隐藏模式
  if(userProfileData.hideMode=="是"){
    ${ onlineStyle }
  }

  // 创建元素，监听鼠标事件，这样方便后续做隐藏操作
  ${cumstomOnlineStyle}

  // 监听设置弹窗的配置事件
  window.electronAPI.onMessageFromParent((message) => {
    userProfileData = window.electronAPI.loadData('userProfile') || {}
    if(message.bgTransparent==0 || message.bgTransparent){
      htmlDom.setAttribute("style","opacity:" + message.bgTransparent/100 + ";")
    }else if(message.hideMode){
      // 获取缓存中的隐藏模式
      let hideModes = userProfileData.hideMode
      if(hideModes=="是"){
        ${ onlineStyle }
      }else{
        ${ cancalcustomStyle }
      }
    }else if(message.showUpWay){
      console.log("message.showUpWay=====>11", message.showUpWay)
      if(message.showUpWay == "不隐藏"){
        newDiv.setAttribute("class", "")
      }
    }
  })

  // 监听右键点击事件
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // 阻止默认右键菜单
    window.electronAPI.showContextMenu(); // 显示自定义菜单
  });
  // 监听右键菜单‘设置’选项点击事件 rebackTolocal
  window.electronAPI.clickSetting(()=>{
    window.electronAPI.openNewWindow("fromOnlineWindow");
  })
  // 监听右键菜单‘返回本地模式’选项点击事件 
  window.electronAPI.rebackTolocal(()=>{
    window.electronAPI.openNewWindow("rebackTolocal");
  })
  // 监听鼠标事件，实现窗口拖动
  var titlebar = document.getElementsByTagName("body")[0]
  titlebar.addEventListener('mousedown', async (e) => {
    if (event.button === 0) { // 0 表示左键
      window.electronAPI.windowMove(true);
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (event.button === 0) { // 0 表示左键
      window.electronAPI.windowMove(false);
    }
  });
`

const createWindow = async(flag) => {
  let windowSizeRes = store.get("windowSize")
  let tempWidth = windowSizeRes?.width || 500
  let tempHeight = windowSizeRes?.height || 240
  if(flag){
    tempWidth = 375
    tempHeight = 667
  }
  win = new BrowserWindow({
    width: tempWidth,
    height: tempHeight,
    frame:false,
    alwaysOnTop: true, // 设置窗口始终位于顶层
    transparent: true, // 透明窗口
    hasShadow: false,
    paintWhenInitiallyHidden: true,
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
  if(flag){
    win.loadURL(flag);
    win.webContents.on('did-finish-load', () => {
      win.webContents.executeJavaScript(customOnlineScript)
      .then(result => {
        console.log('脚本执行结果:', result);
      }).catch(error => {
        console.error('脚本执行错误:', error);
      });
    });
    win.webContents.setWindowOpenHandler((details) => {
      console.log('导航到：details', details);
      win.loadURL(details.url); // 在当前窗口加载新链接
      return { action: 'deny' }
    })
    // 监听页面加载失败事件
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('页面加载失败:', validatedURL);
      console.error('错误代码:', errorCode);
      console.error('错误描述:', errorDescription);
      win.close() // 关闭首页窗口
      win = null
      createWindow()
    });
    cumstomRightMenu(["setting","toLocalModle", "exit"])
  }else{
    win.loadFile('index.html')
    cumstomRightMenu()
  }
  // 记录软件运行的平台系统类型
  store.set("platform", process.platform)

  // 监听窗口大小变化事件
  win.on('resize', () => {
    const [width, height] = win.getSize();
    store.set("windowSize", {width,height})
  });
  windowMove()
  validateTokenAndCreatWindow()
  // win.webContents.openDevTools();
}

function validateTokenAndCreatWindow(){
  let validateRes = validateToken()
  if(validateRes.error == 0 || validateRes.error == 1){
    createTokenWindow()
  }
}

// 创建设置弹窗
let newWindow = null
function createNewWindow(isOnlineMode="NO") {
  newWindow = new BrowserWindow({
    width: 500,
    // width: 1000,
    height: 360,
    autoHideMenuBar:true,
    parent: win,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true // 确保 nodeIntegration 为 false
    }
  });

  // newWindow.loadFile('settings.html');
  console.log('isOnlineMode:====>', isOnlineMode);
  newWindow.loadURL(`file://${__dirname}/settings.html?isOnlineMode=${isOnlineMode}`);

  // 完全移除菜单
  newWindow.removeMenu();

  // 监听小说章节切换窗口事件
  ipcMain.on('message-from-child1', (event, message) => {
    console.log('Message from child1:', message);
    newWindow.webContents.send('message-to-parent1', message);
    novelWindow.close()
  });
  // validateTokenAndCreatWindow()
  // newWindow.webContents.openDevTools();
}

// 创建激活窗口
let novelWindowtokenWindow = null 
function createTokenWindow() {
  tokenWindow = new BrowserWindow({
    width: 500,
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
  const encodedNovalName = encodeURIComponent(novalName); // 对小说名称进行编码
  novelWindow.loadURL(`file://${__dirname}/novalChange.html?novalName=${encodedNovalName}`);
  // 完全移除菜单
  novelWindow.removeMenu();
  // validateTokenAndCreatWindow()
  // novelWindow.webContents.openDevTools();
}


// 创建线上小说导入窗口
let onlineNovelWindow = null 
let getNovalUtilsMap = null
function createOnlineNovelWindow(novalName) {
  onlineNovelWindow = new BrowserWindow({
    width: 720,
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

  // 完全移除菜单
  onlineNovelWindow.removeMenu();

  // validateTokenAndCreatWindow()
  initOnlieSource()
  // onlineNovelWindow.webContents.openDevTools();
}

function initOnlieSource(){
  // let onlineSource = store.get('onlineSource') || {}
  let onlineSource = { // 在线书源规则
		"searchNovalObj":{ // 书源搜索规则
			"何以笙箫默":{
				website: "http://www.yetianlian.net",
				searchNovaUrl: "http://www.yetianlian.net/s.php?ie=utf-8&q=${novalName}",
				method: "GET",
				body: null,
				"headers": {
					"accept-language": "en-US,en;q=0.9",
					"cache-control": "max-age=0",
					"upgrade-insecure-requests": "1",
				},
				bookRules: {
					bookeList: ".type_show .bookbox",
					bookName: {
						selecterName: ".bookname",
					},
					bookUrl: {
						selecterName: ".bookimg a",
						attrName: "href",
						withHost: false,
					},
					bookAuthor: {
						selecterName: ".author",
						removeString: "作者："
					},
					bookCatagory: {
						selecterName: ".cat",
					},
					bookStatus: {
						selecterName: ".update",
					},
					bookDesc: {
						selecterName: ".update",
					},
					bookImg: {
						selecterName: ".bookimg img",
						attrName: "src",
						withHost: false,
					},
					bookId: {
						selecterName: ".bookimg a",
						attrName: "href",
					},
				}
			}
		},
		"chapterNovalObj":{ // 书源章节列表规则
			"何以笙箫默":{
				chapterNovalUrl: "http://www.yetianlian.net${novalId}",
				chapterRules: {
					chapterList: ".listmain dd",
					chapterName: {
						selecterName: "a",
					},
					chapterUrl: {
						selecterName: "a",
						attrName: "href",
						withHost: false,
					}
				}
			}
		},
		"contentNovalObj":{ // 书源章节内容规则
			"何以笙箫默":{
				baseChapterList: true,
				regx: "&nbsp;[^<]*",
				subRegx: "[&nbsp;]*",
			}
		}
	}
  console.log('onlineSource.searchNovalObj===>111111',onlineSource.searchNovalObj)
  if(!onlineSource.searchNovalObj || !onlineSource.chapterNovalObj || !onlineSource.contentNovalObj) return
  getNovalUtilsMap = new getNovalUtils(onlineSource.searchNovalObj,onlineSource.chapterNovalObj,onlineSource.contentNovalObj)
  console.log('22222222222===>',onlineSource.contentNovalObj)
}

function execJavaScript(novelChapterWindow){
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
  widget.style.zIndex = '100000000';
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
  widgetBack.style.zIndex = '100000000';
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
}

// 小说章节列表弹窗
let novelChapterWindow = null 
function creatNovelChapterWindow(charpterUrl) {
  novelChapterWindow = new BrowserWindow({
    width: 700,
    height: 400,
    parent: onlineNovelWindow,
    autoHideMenuBar:true,
    transparent: true, // 透明窗口
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nativeWindowOpen: true,
      // contextIsolation: true,
      nodeIntegration: true, // 确保 nodeIntegration 为 false
    }
  });
  novelChapterWindow.loadURL(charpterUrl);  
  // 完全移除菜单
  novelChapterWindow.removeMenu();

  novelChapterWindow.webContents.on('will-navigate', (event, url) => {
    console.log('URL 发生变化:', url);
    // 在这里处理 URL 变化后的逻辑
    execJavaScript(novelChapterWindow)
  });

  novelChapterWindow.webContents.setWindowOpenHandler((details) => {
    console.log('导航到：details', details);
    novelChapterWindow.loadURL(details.url); // 在当前窗口加载新链接
    // 监听网页加载完成事件
    novelChapterWindow.webContents.on('did-finish-load', () => {
      // 在网页上下文中执行自定义脚本
      execJavaScript(novelChapterWindow)
    });
    return { action: 'deny' }
  })
  // validateTokenAndCreatWindow()
  // novelChapterWindow.webContents.openDevTools();
}

// 监听小说切换窗口事件
ipcMain.on('novalChangeEvent', (event, message) => {
  console.log('novalChangeEvent----:',message);
  changeNovelWindow(message.openWindow)
});

// 监听线上小说导入窗口事件
ipcMain.on('onlineNovalImport', (event, message) => {
  console.log('onlineNovalImport----:',message);
  if(message){
    win.close() // 关闭首页窗口
    win = null
    newWindow.close() // 关闭设置窗口
    newWindow = null
    createWindow(message)
  }else{
    createOnlineNovelWindow()
  }
});

// 监听关闭激活窗口的请求
ipcMain.on('closeChildWindow', () => {
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

  // 禁用 Command+W 或 Ctrl+W 快捷键 防止激活码页面被快捷键跳过，这里注册一个全局的快捷键，可能会影响其他软件的使用，后续考虑优化
  globalShortcut.register('CommandOrControl+W', () => {
    app.quit()
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

ipcMain.on('open-set-window', (event, message) => {
  console.log('open-set-window----:',message);
  if(message == "rebackTolocal"){ 
    win.close() // 关闭首页窗口
    createWindow()
  }else if(message == "fromOnlineWindow"){
    createNewWindow("YES");
  }else{
    createNewWindow();
  }
});

// 监听【设置】子窗口发送的消息
ipcMain.on('message-from-child', (event, message) => {
  console.log('Message from child:', message);
  if(message.fontPercent){
    console.log('message.fontPercent/100', message.fontPercent/100);
    win.webContents.setZoomFactor(message.fontPercent/100);
  }
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
    let novalList = await getNovalUtilsMap.searchNoval(message.data.novelName, message.data.bookSource)
    message.data.novelList = novalList
   }else if(message.action == "getChapterList"){
    creatNovelChapterWindow(message.data.bookUrl)
    mofish_bookId = message.data.bookId
    mofish_bookName = message.data.title
    mofish_chapterUrl = message.data.bookUrl
    mofish_bookSource = message.data.bookSource
   }else if(message.action == "downloadNovel"){
    let subscibeEvent = eventBus.on('progress', (progress) => {
      console.log('progress===>', progress);
      progress.action = 'process'
      novelChapterWindow.webContents.send('message-to-win', progress);
    });
    console.log("message.data.cookie====>", message.data.cookie)
    let novalContentRes = await getNovalUtilsMap.getNovalContent(message.data.cookie, mofish_bookId, mofish_bookSource)
    // console.log("novalContentRes==>", novalContentRes)
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
   }else if(message.action == "importantSource"){
    console.log("主线程收到消息==>导入书源成功")
    initOnlieSource()
   }
   
   onlineNovelWindow.webContents.send('message-to-win', message);
  }else if(message.windowName =="novelWindowtokenWindow"){
    if(message.action == "closePage"){
      app.quit()
    }
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
let contextMenu = null
function cumstomRightMenu(menuItems=["setting", "exit"]) {
  let menuItemObj = {
    setting: {
      label: `设置(${process.platform == "darwin"?"command":"ctrl"}+shift+O)`,
      click: () => {
        win.webContents.send('clickSetting', null);
      },
    },
    exit: {
      label: '退出应用',
      click: () => {
        app.quit()
      },
    },
    toLocalModle: {
      label: '返回本地模式',
      click: () => {
        // win.webContents.send('clickSetting', null);
        win.webContents.send('rebackTolocal', null);
      },
    },
  }
  let menuItemArr = []
  menuItems.forEach((element, index) => {
    menuItemArr.push(menuItemObj[element])
  })
  console.log("menuItemArr===>", menuItemArr);
  contextMenu = Menu.buildFromTemplate(menuItemArr);
  // 监听右键菜单请求
  ipcMain.on('show-context-menu', (event) => {
    const winRightClick = BrowserWindow.fromWebContents(event.sender);
    contextMenu.popup(winRightClick);
  });  
}

// cumstomRightMenu()

/**
 * 窗口移动 参考文章：https://zhuanlan.zhihu.com/p/112564936
 */
function windowMove() {
  console.log("win===>222", win.isDestroyed());
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

