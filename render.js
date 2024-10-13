
// 获取页面dom元素
let textarea = document.getElementById('fileContent')
let nextChart = document.getElementById('nextChart') 
let preChart = document.getElementById('preChart') 
let titlebar = document.getElementById('contentWrap'); // 实现拖拽逻辑

// 页面数据加载
let data = window.electronAPI.loadData('mydata') || {};
let currentProcess = window.electronAPI.loadData('currentProcess') || {};
let userProfileData = window.electronAPI.loadData('userProfile') || {};


// 监听设置弹窗的配置事件
window.electronAPI.onMessageFromParent((message) => {
  userProfileData = window.electronAPI.loadData('userProfile') // 刷新个人配置数据
  if(message.type == "importData"){ // 导入小说
    data = window.electronAPI.loadData('mydata')
    currentProcess = window.electronAPI.loadData('currentProcess')
    textarea.scrollTop = 0 // 重置阅读进度
    // textarea.value = data[currentProcess.name][currentProcess.chapter];
    textarea.innerHTML = data[currentProcess.name][currentProcess.chapter];
  }else if(message.wordColor){
    nextChart.setAttribute("style",`color:${message.wordColor}`)
    preChart.setAttribute("style",`color:${message.wordColor}`)
    textarea.setAttribute("style",`color:${message.wordColor};font-size:${userProfileData.wordSize}px`)
  }else if(message.wordSize){
    textarea.setAttribute("style",`color:${userProfileData.wordColor};font-size:${message.wordSize}px`)
  }else if(message.showUpWay){
    if(message.showUpWay == "不隐藏"){
      textarea.setAttribute("class", "")
      nextChartInner.setAttribute("class", "")
      preChartInner.setAttribute("class", "")
    }
    userProfileData = window.electronAPI.loadData('userProfile') // 重新获取一下缓存数据
  }else if(message.bgTransparent==0 || message.bgTransparent){
    titlebar.setAttribute("style",`background-color: rgba(0, 0, 0, ${message.bgTransparent/100});`)
  }else if(message.changeNoval){ // 切换小说
    currentProcess = window.electronAPI.loadData('currentProcess') //刷新缓存数据
    console.log("刷新缓存数据=====>", currentProcess)
    data = window.electronAPI.loadData('mydata')
    textarea.innerHTML = data[message.changeNoval][0];
    textarea.scrollTop = 0 // 重置阅读进度
  }
  
});


titlebar.addEventListener("mouseenter", ()=>{
  if(userProfileData?.showupWay == "鼠标移入"){
    textarea.setAttribute("class", "")
    nextChartInner.setAttribute("class", "")
    preChartInner.setAttribute("class", "")
  }
})
titlebar.addEventListener("click", ()=>{
  if(userProfileData?.showupWay == "鼠标单击"){
    textarea.setAttribute("class", "")
    nextChartInner.setAttribute("class", "")
    preChartInner.setAttribute("class", "")
  }
})
titlebar.addEventListener("dblclick", ()=>{
  if(userProfileData?.showupWay == "鼠标双击"){
    textarea.setAttribute("class", "")
    nextChartInner.setAttribute("class", "")
    preChartInner.setAttribute("class", "")
  }
})
titlebar.addEventListener("mouseleave", ()=>{
  if(userProfileData?.showupWay && userProfileData.showupWay != "不隐藏"){
    textarea.setAttribute("class", "hiden")
    nextChartInner.setAttribute("class", "hiden")
    preChartInner.setAttribute("class", "hiden")
  }
})

// 实时记录阅读进度
textarea.addEventListener('scroll', () => {
  const scrollTop = textarea.scrollTop;
  // 获取滚动条的高度
  const scrollHeight = textarea.scrollHeight;
  const clientHeight = textarea.clientHeight;
  let readPercent = ((scrollTop+clientHeight)/scrollHeight).toFixed(2)*100
  console.log("实时记录阅读进度=====>", currentProcess)
  currentProcess.readPercent = readPercent
  currentProcess.scrollTop = scrollTop
  window.electronAPI.saveData('currentProcess', currentProcess);
});

// 点击下一章节
nextChart.addEventListener("click", ()=>{
  // 切换主页正在阅读的小说章节
  if(!currentProcess.name){alert("请先导入小说！")}else{
    // textarea.value = data[currentProcess.name][ Number(currentProcess.chapter) + 1];
    textarea.innerHTML = data[currentProcess.name][ Number(currentProcess.chapter) + 1];
    textarea.scrollTop = 0
    // 修改当前小说阅读进度
    currentProcess.chapter = Number(currentProcess.chapter) + 1
  }
}) 

// 点击上一章节
preChart.addEventListener("click", ()=>{
  // 切换主页正在阅读的小说章节
  if(!currentProcess.name){alert("请先导入小说！")}else{
    if(Number(currentProcess.chapter)>0){
      textarea.innerHTML = data[currentProcess.name][ Number(currentProcess.chapter) - 1];
      textarea.scrollTop = 0
      currentProcess.chapter = Number(currentProcess.chapter) - 1
    }else{
      alert("当前章节已是最开始章节！")
    }
  }
}) 

// 初始化页面配置
function initPage(){
  // 获取缓存中的小说
  if(data[currentProcess.name]?.[currentProcess.chapter]){
    // textarea.value = data[currentProcess.name]?.[currentProcess.chapter];
    textarea.innerHTML = data[currentProcess.name]?.[currentProcess.chapter];
  }else{
    textarea.innerHTML = "\n \n \n \n欢迎使用「波波阅(mo)读(yu)神器器」\n\n 您还没有导入小说哦！请按照如下操作步骤开启您的阅(mo)读(yu)之旅 \n 请点击【鼠标右键】-》【设置】-》【导入小说】\n\n如有问题可联系：wx:bobokeji521";
    // textarea.value = "\n \n \n \n欢迎使用「波波摸鱼阅读器」\n\n 您还没有导入小说哦！请按照如下操作步骤开启您的阅(mo)读(yu)之旅 \n 请点击【鼠标右键】-》【设置】-》【导入小说】\n\n如有问题可联系：wx:bobokeji521";
  }

  // 获取缓存中的背景透明度
  console.log("userProfileData.bgTransparent=====>", userProfileData.bgTransparent)
  let bgTransparent = userProfileData.bgTransparent ?? 100;
  titlebar.setAttribute("style",`background-color: rgba(0, 0, 0, ${bgTransparent/100});`)
  console.log("userProfileData.bgTransparent=====>", bgTransparent)
  // 获取缓存中的文字颜色
  let wordColor = userProfileData.wordColor || "#fff"
  nextChart.setAttribute("style",`color:${wordColor}`)
  preChart.setAttribute("style",`color:${wordColor}`)

  // 获取缓存中的字体大小
  let wordSize = userProfileData.wordSize || 14
  textarea.setAttribute("style",`color:${wordColor};font-size:${wordSize}px`)

  // 获取缓存中的阅读进度
  textarea.scrollTop = currentProcess.scrollTop || 0

  // 获取缓存中状态栏图标显示状态
  window.electronAPI.sendMessageToParent({
    statusBarIcon: userProfileData.statusBarIcon || "否"
  });
}
initPage()

// 监听右键点击事件
window.addEventListener('contextmenu', (event) => {
  event.preventDefault(); // 阻止默认右键菜单
  window.electronAPI.showContextMenu(); // 显示自定义菜单
});
// 监听右键菜单‘设置’选项点击事件
window.electronAPI.clickSetting(()=>{
  window.electronAPI.openNewWindow();
})

function dragfun(){
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
}

dragfun()