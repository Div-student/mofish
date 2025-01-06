
// 获取页面dom元素
let textarea = document.getElementById('fileContent')
let nextChart = document.getElementById('nextChart') 
let preChart = document.getElementById('preChart') 
let titlebar = document.getElementById('contentWrap'); // 实现拖拽逻辑

// 页面数据加载
let data = window.electronAPI.loadData('mydata') || {};
let currentProcess = window.electronAPI.loadData('currentProcess') || {};
let userProfileData = window.electronAPI.loadData('userProfile') || {};
let platformType = window.electronAPI.loadData('platform')
let chapterReadProcess = window.electronAPI.loadData('chapterReadProcess') || {}


// 监听设置弹窗的配置事件
window.electronAPI.onMessageFromParent((message) => {
  userProfileData = window.electronAPI.loadData('userProfile') // 刷新个人配置数据
  if(message.type == "importData"){ // 导入小说
    data = window.electronAPI.loadData('mydata')
    currentProcess = window.electronAPI.loadData('currentProcess')
    // textarea.scrollTop = 0 // 重置阅读进度
    // textarea.innerHTML = data[currentProcess.name][currentProcess.chapter];


    // 获取缓存中的小说
    if(data?.[currentProcess.name]?.[currentProcess.chapter]){
      textarea.scrollTop = 0 // 重置阅读进度
      textarea.innerHTML = data[currentProcess.name]?.[currentProcess.chapter];
    }else{
      textarea.innerHTML = "\n \n \n \n欢迎使用「波波阅(mo)读(yu)神器」\n\n 您还没有导入/选择小说哦！请按照如下操作步骤开启您的阅(mo)读(yu)之旅 \n 请点击【鼠标右键】-》【设置】-》【导入/切换小说】\n\n如有问题可联系：微信:bobokeji521";
    }



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
    // titlebar.setAttribute("style",`background-color: rgba(0, 0, 0, ${message.bgTransparent/100});`)
    titlebar.style.backgroundColor = `rgba(0, 0, 0, ${message.bgTransparent/100})`
  }else if(message.changeNoval){ // 切换小说
    currentProcess = window.electronAPI.loadData('currentProcess') //刷新缓存数据
    console.log("刷新缓存数据=====>", currentProcess)
    data = window.electronAPI.loadData('mydata')
    textarea.innerHTML = data[message.changeNoval][currentProcess.chapter];
    textarea.scrollTop = currentProcess.scrollTop // 重置阅读进度
  }
});


titlebar.addEventListener("mouseenter", ()=>{
  if(userProfileData?.showupWay == "鼠标移入"){
    textarea.setAttribute("class", "")
  }
})
titlebar.addEventListener("click", ()=>{
  if(userProfileData?.showupWay == "鼠标单击"){
    textarea.setAttribute("class", "")
  }
})
titlebar.addEventListener("dblclick", ()=>{
  if(userProfileData?.showupWay == "鼠标双击"){
    textarea.setAttribute("class", "")
  }
})
titlebar.addEventListener("mouseleave", ()=>{
  if(userProfileData?.showupWay && userProfileData.showupWay != "不隐藏"){
    textarea.setAttribute("class", "hiden")
  }
})

nextChart.addEventListener("mouseleave", ()=>{
  nextChart.setAttribute("class", "hidens")
  preChart.setAttribute("class", "hidens")
})
preChart.addEventListener("mouseleave", ()=>{
  preChart.setAttribute("class", "hidens")
  nextChart.setAttribute("class", "hidens")
})
nextChart.addEventListener("mouseenter", ()=>{
  let classRes = textarea.getAttribute('class')
  if(!classRes){
    nextChart.setAttribute("class", "")
    nextChartInner.setAttribute("class", "")
    preChart.setAttribute("class", "")
    preChartInner.setAttribute("class", "")
  }
})
preChart.addEventListener("mouseenter", ()=>{
  let classRes = textarea.getAttribute('class')
  if(!classRes){
    preChart.setAttribute("class", "")
    preChartInner.setAttribute("class", "")
    nextChart.setAttribute("class", "")
    nextChartInner.setAttribute("class", "")
  }
})



// 设置滚动速度，可以根据需求调整
textarea.addEventListener('wheel', (event) => {
  let scrollSpeed = userProfileData?.mouseSpeed || "0"; 
  if(platformType != "win32" || !Number(scrollSpeed)) return // 设置为0或者非windows系统时不设置滚动速度
  
  event.preventDefault(); // 阻止默认滚动行为
  // 根据滚动方向调整滚动距离
  const delta = Math.sign(event.deltaY);
  const scrollDistance = delta * scrollSpeed;
  // 修改滚动位置
  textarea.scrollBy({
    top: scrollDistance,
    behavior: 'smooth'
  });
});


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

function savaReadProcess(){
  // 切换之前先将当前进度保存到对应的小说章节
  chapterReadProcess[currentProcess.name] = chapterReadProcess[currentProcess.name] || {} // 当小说不存在时，先创建一个空对象
  chapterReadProcess[currentProcess.name][currentProcess.chapter]= {
    readPercent: currentProcess.readPercent,
    scrollTop: currentProcess.scrollTop
  }
  window.electronAPI.saveData("chapterReadProcess", chapterReadProcess)
}

function changeNovalChapter(chapter){
  // 判断要切换的章节是否缓存了阅读进度，如果有责把当前进度更新为要切换章节的进度，否则重置当前进度
  let novalChapterReadProcess = chapterReadProcess[currentProcess.name]?.[chapter]
  textarea.innerHTML = data[currentProcess.name][chapter];
  if(!novalChapterReadProcess){
    textarea.scrollTop = 0
    currentProcess.scrollTop = 0
    currentProcess.readPercent = 0
  }else{
    textarea.scrollTop = novalChapterReadProcess.scrollTop
    currentProcess.scrollTop = novalChapterReadProcess.scrollTop
    currentProcess.readPercent = novalChapterReadProcess.readPercent
  }
  currentProcess.chapter = chapter
  window.electronAPI.saveData('currentProcess', currentProcess);
}

// 点击下一章节
nextChart.addEventListener("click", ()=>{
  // 切换主页正在阅读的小说章节
  let classRes = textarea.getAttribute('class')
  if(!classRes){
    if(!currentProcess.name){
      alert("请先导入小说！")
    }else{
      savaReadProcess()
      if(data[currentProcess.name][ Number(currentProcess.chapter) + 1]){
        // 判断要切换的章节是否缓存了阅读进度，如果有责把当前进度更新为要切换章节的进度，否则重置当前进度
        let chapter = Number(currentProcess.chapter) + 1
        changeNovalChapter(chapter)
        // let novalChapterReadProcess = chapterReadProcess[currentProcess.name]?.[chapter]
        // textarea.innerHTML = data[currentProcess.name][chapter];
        // if(!novalChapterReadProcess){
        //   textarea.scrollTop = 0
        //   currentProcess.scrollTop = 0
        //   currentProcess.readPercent = 0
        // }else{
        //   textarea.scrollTop = novalChapterReadProcess.scrollTop
        //   currentProcess.scrollTop = novalChapterReadProcess.scrollTop
        //   currentProcess.readPercent = novalChapterReadProcess.readPercent
        // }
        // currentProcess.chapter = chapter
        // window.electronAPI.saveData('currentProcess', currentProcess);
      }else{
        alert("当前章节已是最后章节！")
      }
    }
  }
}) 

// 点击上一章节
preChart.addEventListener("click", ()=>{
  // 切换主页正在阅读的小说章节
  let classRes = textarea.getAttribute('class')
  if(!classRes){
    if(!currentProcess.name){
      alert("请先导入小说！")
    }else{
      savaReadProcess()
      if(Number(currentProcess.chapter)>0){
        let chapter = Number(currentProcess.chapter) - 1
        changeNovalChapter(chapter)
        // textarea.innerHTML = data[currentProcess.name][ Number(currentProcess.chapter) - 1];
        // textarea.scrollTop = 0
        // currentProcess.chapter = Number(currentProcess.chapter) - 1
        // window.electronAPI.saveData('currentProcess', currentProcess);
      }else{
        alert("当前章节已是最开始章节！")
      }
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
    textarea.innerHTML = "\n \n \n \n欢迎使用「波波阅(mo)读(yu)神器」\n\n 您还没有导入/选择小说哦！请按照如下操作步骤开启您的阅(mo)读(yu)之旅 \n 请点击【鼠标右键】-》【设置】-》【导入/切换小说】\n\n如有问题可联系：微信:bobokeji521";
  }

  // 获取缓存中的背景透明度
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
