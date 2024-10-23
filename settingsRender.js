
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

function ResetReadProcess(){
  console.log("storeData,fileName====>", storeData, fileName)
  storeData[fileName] = articals
  novalNameDom.innerText = fileName
  novalChartDom.innerText = "0"
  novalProcessDom.innerText = 0 + "%"

  window.electronAPI.saveData('currentProcess', { name:fileName, chapter:"0", readPercent:0, scrollTop:0 });
  window.electronAPI.saveData('mydata', storeData);
  window.electronAPI.sendMessageToParent({type:"importData"});
}

document.getElementById('readFileButton').addEventListener('click', async () => {
  const filePaths = await window.electronAPI.selectFile();
  storeData = window.electronAPI.loadData('mydata') || {}
  if (filePaths.length > 0) {
    const filePath = filePaths[0]; // 替换为你的文件路径
    try {
      let fileNamePath = filePath.match(/[^\\/]+$/);
      fileName = fileNamePath[0].split('.')[0]
      console.log("fileName===>", fileName[0].split('.')[0])
      const data = await window.electronAPI.readFile(filePath);
      let reg = /((正文){0,1}(第)([零〇一二三四五六七八九十百千万a-zA-Z0-9]{1,7})[章节卷集部篇回](( {1,}).)((?!\t{1,4}).){0,30})\r?\n/g
      
      let res = data.replace(reg,"@@@$1@@+").split("@@@")
     
      res.forEach((element,index) => {
        let chatContent = element.split("@@+")
        articals[index] = chatContent
      });
    
      if( storeData && storeData[fileName]){
        // 如果小说已经导入过，则弹窗确认是否覆盖
        $( "#dialog-confirm" ).dialog( "open" );
      }else{
        // 设置当前小说章节
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
  $( "#accordion" ).accordion({ collapsible: true, animate:false });

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
  let chapterTemp = storeData[currentProcess.name][currentProcess.chapter]
  novalChartDom.innerText = chapterTemp.length>1 ? chapterTemp[0]:"序章"
  novalProcessDom.innerText = Number(currentProcess?.readPercent).toFixed(1) + "%"
}

function getAllNovalName(){
  storeData = window.electronAPI.loadData('mydata') || {}
  let novalNames = Object.keys(storeData)
  console.log("novalNames===>", novalNames)
  let innerString = ""
  novalNames.forEach(item => {
    innerString += `<div class="articleItem"><span>《</span><button title=${item} onclick="changeNoval('${item}')">${item}</button><span>》</span></div>`
  })
  readingContentDom.innerHTML = innerString
}

function changeNoval(novalName){
  window.electronAPI.novalChangeEvent({"openWindow":novalName})
}

// 监听小说章节切换事件
window.electronAPI.onMessageFromParent1((message) => {
  let currentProcess = window.electronAPI.loadData('currentProcess')
  console.log("currentProcess===>111", currentProcess)
  if(message.changeNoval){ // 切换小说
    novalNameDom.innerText = message.changeNoval
    let chapterTemp = storeData[message.changeNoval][currentProcess.chapter]
    novalChartDom.innerText = chapterTemp.length>1 ? chapterTemp[0]:"序章"
    novalProcessDom.innerText = 0 + "%"
  }
});

// 初始化页面配置
function initPage(){
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


  // 非windows系统暂时不支持滚动速度设置
  if(platformType != "win32"){
    mouseWrapDom.style = "display: none;"
  }
}
initPage()


