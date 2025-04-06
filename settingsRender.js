
let fileName = ''
let articals = {}
let currentProcess = window.electronAPI.loadData('currentProcess') || {}; //获取当前小说阅读进度
let storeData = window.electronAPI.loadData('mydata') || {}// 缓存小说章节内容数据
let userProfile = window.electronAPI.loadData('userProfile') || {}; // 获取缓存个人设置数据
let platformType = window.electronAPI.loadData('platform')

// 获取页面dom元素
let novalNameDom = document.getElementById('novalName')
let novalChartDom = document.getElementById('novalChart')
let novalProcessDom = document.getElementById('novalProcess')
let readingContentDom = document.getElementById('readingContent')
let mouseWrapDom = document.getElementById('mouseWrap')
let novalSetDom = document.getElementById('novalSet')
let fontSetDom = document.getElementById('fontSet')
let fontsliderWrap = document.getElementById('fontsliderWrap')
let onlineInputDom = document.getElementById('onlineInput')
// 获取页面参数
let params = decodeURI(window.location.search)
let isOnlineMode = params.split('=')[1]

function ResetReadProcess(){
  storeData[fileName] = articals
  novalNameDom.innerText = fileName
  novalChartDom.innerText = "0"
  novalProcessDom.innerText = 0 + "%"

  window.electronAPI.saveData('currentProcess', { name:fileName, chapter:"0", readPercent:0, scrollTop:0 });
  window.electronAPI.saveData('mydata', storeData);
  window.electronAPI.sendMessageToParent({type:"importData"});
}

// 读取txt文件
function getTxtFile(data){
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
}

window.electronAPI.onMessagePdf((message)=>{
  // console.log("pdf message ===>", message)
  getTxtFile(message)
  if( storeData && storeData[fileName]){
    // 如果小说已经导入过，则弹窗确认是否覆盖
    $( "#dialog-confirm" ).dialog( "open" );
  }else{
    ResetReadProcess()
    getAllNovalName() // 更新可切换小说列表
  }
})

document.getElementById('readFileButton').addEventListener('click', async () => {
  const filePaths = await window.electronAPI.selectFile();
  storeData = window.electronAPI.loadData('mydata') || {}
  console.log("filePaths===>", filePaths)
  const typeObj = {
    "pdf": "pdf",
    "txt": "txt",
    "epub": "epub"
  }
  if (filePaths.length > 0) {
    const filePath = filePaths[0]; // 替换为你的文件路径
    try {
      let fileNamePath = filePath.match(/[^\\/]+$/);
      fileName = fileNamePath[0].split('.')[0]
      fileType = fileNamePath[0].split('.')[1]
      console.log("fileType===>", fileType)
      if(!typeObj[fileType]){
        alert("文件名有误，请修改后导入!")
        return
      }
      const data = await window.electronAPI.readFile(filePath, fileType);
      console.log("data===>1111", data)
      if(!data){
        alert("导入失败!txt文件只支持utf-8编码,请联系mofish作者或者网上搜索转换方法。")
        return
      }
      articals = { ...data }
      console.log("storeData===>", storeData[fileName])
      // 设置当前小说章节
      if(fileType === "pdf") return
      if( storeData && storeData[fileName]){
        // 如果小说已经导入过，则弹窗确认是否覆盖
        $( "#dialog-confirm" ).dialog( "open" );
      }else{
        ResetReadProcess()
        getAllNovalName() // 更新可切换小说列表
      }
    } catch (err) {
      console.error('读取文件失败', err);
    }
  } else {
    console.error("您未选择文件")
  }
});


// 加载jq组件
$( function() {
  var handle = $( "#custom-handle" );
  var fontHandle = $( "#font-handle" );
  let activeIndex = isOnlineMode == "YES" ? 1 : 0
  $( "#accordion" ).accordion({ collapsible: true, animate:false, active: activeIndex });

  $( "#slider" ).slider({
    value: userProfile?.bgTransparent ?? 100,
    create: function() {
      let slideValue = userProfile?.bgTransparent ?? 100
      handle.text( slideValue );
    },
    slide: function( event, ui ) {
      handle.text( ui.value );
      userProfile.bgTransparent = ui.value
      window.electronAPI.saveData('userProfile', userProfile);
      window.electronAPI.sendMessageToParent({
        bgTransparent: ui.value
      });
    }
  });

  $( "#fontslider" ).slider({
    value: userProfile?.fontPercent ?? 100,
    create: function() {
      let slideValue = userProfile?.fontPercent ?? 100
      fontHandle.text( slideValue );
    },
    slide: function( event, ui ) {
      fontHandle.text( ui.value );
      userProfile.fontPercent = ui.value
      window.electronAPI.saveData('userProfile', userProfile);
      window.electronAPI.sendMessageToParent({
        fontPercent: ui.value
      });
    }
  });

  $('#colorPicker').on('input', function() {
    var value = $(this).val();
    userProfile.wordColor = value
    window.electronAPI.saveData('userProfile', userProfile);
    window.electronAPI.sendMessageToParent({ wordColor:value });
  });

  $( "#dialog-confirm" ).dialog({
    autoOpen: false,
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      "确认替换": function() {
        ResetReadProcess() // 重置当前阅读进度
        $( this ).dialog( "close" );
      },
      "取消": function() {
        $( this ).dialog( "close" );
      }
    }
  });

  $( 'input[type="radio"]' ).checkboxradio();
});

// 监听单选项变化：小说显示方式
$('input[name="radio-1"]').on('change', () => {
  const selectedRadio = $('input[name="radio-1"]:checked').val();
  userProfile.showupWay = selectedRadio
  window.electronAPI.saveData('userProfile', userProfile);
  window.electronAPI.sendMessageToParent({"showUpWay":selectedRadio});
});

 // 获取状态栏图标设置下拉框元素
 const selectElement = document.getElementById('speed');
 selectElement.addEventListener('change', function() {
  const selectedValue = this.value; // 获取选中的值
  userProfile.statusBarIcon = selectedValue
  window.electronAPI.saveData('userProfile', userProfile);
  window.electronAPI.sendMessageToParent({
    statusBarIcon: selectedValue
  });
 });

 // 获取是否开启隐藏模式的下拉框元素
 const selectElement1 = document.getElementById('speeds');
 selectElement1.addEventListener('change', function() {
  const selectedValue1 = this.value; // 获取选中的值
  userProfile.hideMode = selectedValue1
  window.electronAPI.saveData('userProfile', userProfile);
  window.electronAPI.sendMessageToParent({
    hideMode: selectedValue1
  });
 });

// 监听字体设置输入框变化
$('#wordSize').on('input', function() {
  let values = $(this).val();
  userProfile.wordSize = values
  window.electronAPI.saveData('userProfile', userProfile);
  window.electronAPI.sendMessageToParent({ wordSize:values });
});

// 监听鼠标速度设置输入框变化
$('#mouseSpeed').on('input', function() {
  let values = $(this).val();
  userProfile.mouseSpeed = values
  window.electronAPI.saveData('userProfile', userProfile);
  window.electronAPI.sendMessageToParent({ mouseSpeed:values });
});

function setReadProcess(){
  if(!currentProcess.name) return;
  console.log("currentProcess===>", currentProcess)
  novalNameDom.innerText = currentProcess.name
  let chapterTemp = storeData?.[currentProcess.name]?.[currentProcess.chapter]
  novalChartDom.innerText = chapterTemp?.length>1 ? chapterTemp?.[0]:"序章"
  novalProcessDom.innerText = Number(currentProcess?.readPercent).toFixed(1) + "%"
}

function getAllNovalName(){
  storeData = window.electronAPI.loadData('mydata') || {}
  let novalNames = Object.keys(storeData)
  console.log("novalNames===>", novalNames)
  let innerString = ""
  if(novalNames.length <= 0){
    innerString = `<div class="nodata">暂无小说，请先导入!</div>`
  }
  novalNames.forEach((item,index)=> {
    innerString += `<div class="articleItem" onmouseenter="articleEnter('${index}')" onmouseleave="articleLeave('${index}')"><span>《</span><button title=${item} onclick="changeNoval('${item}')">${item}</button><span>》</span>
    <span class="deleteNoval" id="deleteNoval${index}" onclick="deleteNoval('${item}')">✖️</span>
    </div>`
  })
  readingContentDom.innerHTML = innerString
}

function deleteNoval(novalName){
  // 从缓存中删除小说
  delete storeData[novalName]
  window.electronAPI.saveData('mydata', storeData);
  getAllNovalName() // 更新可切换小说列表
  currentProcess = window.electronAPI.loadData('currentProcess') || {};

  // 从缓存中删除记录的小说章节阅读进度
  let chapterReadProcess = window.electronAPI.loadData('chapterReadProcess') || {}
  delete chapterReadProcess[novalName]
  window.electronAPI.saveData('chapterReadProcess', chapterReadProcess);

  // 从当前阅读进度中删除小说
  console.log("currentProcess.name == novalName===>", currentProcess.name == novalName)
  if(currentProcess.name == novalName){
    window.electronAPI.saveData('currentProcess', {});
    window.electronAPI.sendMessageToParent({type:"importData"});
    // 重置阅读进度
    novalNameDom.innerText = "无"
    novalChartDom.innerText = "无"
    novalProcessDom.innerText = 0 + "%"
  }
}

function articleEnter(index){
  let deleteNovalDom = document.getElementById('deleteNoval'+index)
  deleteNovalDom.style = "display: block;"
}

function articleLeave(index){
  let deleteNovalDom = document.getElementById('deleteNoval'+index)
  deleteNovalDom.style = "display: none;"
}

function changeNoval(novalName){
  window.electronAPI.novalChangeEvent({"openWindow":novalName})
}
// 在线小说导入事件
function onlineNoval(flag){
  let objMap = {
    "weRead":"https://weread.qq.com/",
    "fenbi":"https://www.fenbi.com/spa/tiku/guide/home/xingce/xingce?labelId=1"
  }
  window.electronAPI.onlineNovalImport(objMap[flag])
}
function getInputValue(flag="") {
  let inputField = document.getElementById('inputField'+flag);
  let inputValue = inputField.value;
  let res = isValidURL(inputValue)
  if(!res){
    alert("请输入正确的网址!")
    return
  }
  // 检查是否以 http:// 或 https:// 开头, 如果没有协议，默认添加 https://
  if (!/^https?:\/\//i.test(inputValue)) {
    inputValue = 'https://' + inputValue;
  }
  window.electronAPI.onlineNovalImport(inputValue)
}
// 判断是否为网址
function isValidURL(url) {
  const pattern = new RegExp('^(https?:\\/\\/)?' + // 协议
      '((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+[a-zA-Z]{2,}|' + // 域名
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // 或者 IP 地址
      '(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*' + // 端口和路径
      '(\\?[;&a-zA-Z\\d%_.~+=-]*)?' + // 查询字符串
      '(\\#[-a-zA-Z\\d_]*)?$', 'i'); // 片段标识符
  return pattern.test(url);
}

var isExpand = false;
function openOnline(){
  const element = document.getElementById('animatedElement');
  isExpand = !isExpand;
  const inputContainer = document.getElementById('inputContainer');
  inputContainer.classList.toggle('active');
  if (isExpand) {
    element.classList.remove('hidden');
    element.classList.add('visible');
  }else{
    element.classList.remove('visible');
    element.classList.add('hidden');
  }
}

var isExpands = true;
function openOnline1(){
  const element = document.getElementById('animatedElement1');
  isExpands = !isExpands;
  const inputContainer1 = document.getElementById('inputContainer1');
  inputContainer1.classList.toggle('active');
  if (isExpands) {
    element.classList.remove('hidden');
    element.classList.add('visible');
  }else{
    element.classList.remove('visible');
    element.classList.add('hidden');
  }
}

// 监听小说章节切换事件
window.electronAPI.onMessageFromParent1((message) => {
  let currentProcess = window.electronAPI.loadData('currentProcess')
  console.log("currentProcess===>111", currentProcess)
  if(message.changeNoval){ // 切换小说
    novalNameDom.innerText = message.changeNoval
    let chapterTemp = storeData[message.changeNoval][currentProcess.chapter]
    novalChartDom.innerText = chapterTemp.length>1 ? chapterTemp[0]:"序章"
    novalProcessDom.innerText = currentProcess.readPercent + "%"
  }else if(message.downloadMsg == "success"){
    getAllNovalName() // 更新可切换小说列表
  }
});

// 获取是否是线上阅读模式并且展示不同的功能配置项
function getIsOnlineMode(){
  if(isOnlineMode == "YES"){
    novalSetDom.style = "display: none;"
    fontSetDom.style = "display: none;"
  }else{
    fontsliderWrap.style = "display: none;"
    onlineInputDom.style = "display: none;"
  }
}

// 初始化页面配置
function initPage(){
  // 获取是否是线上阅读模式
  getIsOnlineMode()

  // 获取缓存中的文字颜色
  let wordColor = userProfile?.wordColor || "#ffffff";
  document.getElementById('colorPicker').setAttribute("style",`color:${wordColor}`)
  $('#colorPicker').val(wordColor);

  // 获取缓存中的字体大小
  let wordSize = userProfile?.wordSize || 14;
  $('#wordSize').val(wordSize);

  // 获取缓存中鼠标滚动速度
  let mouseSpeed = userProfile?.mouseSpeed || 0;
  $('#mouseSpeed').val(mouseSpeed);
  
  // 获取缓存中小说的隐藏方式
  let radioMap = { "鼠标单击":"radio-1", "鼠标双击":"radio-2", "鼠标移入":"radio-3", "不隐藏":"radio-4" }
  console.log("userProfile?.showupWay===>", radioMap[userProfile?.showupWay], userProfile?.showupWay)
  let radioOption = radioMap[userProfile?.showupWay] || "radio-4"
  $(`#${radioOption}`).prop("checked", true);

  // 获取当前正在阅读小说进度
  setReadProcess()

  // 获取历史导入的所有小说
  getAllNovalName()

  // 获取缓存中icon图标显示状态
  selectElement.value = userProfile?.statusBarIcon || "否"

  // 获取缓存中隐藏模式
  selectElement1.value = userProfile?.hideMode || "否"

  // 非windows系统暂时不支持滚动速度设置
  if(platformType != "win32"){
    mouseWrapDom.style = "display: none;"
  }
}
initPage()


