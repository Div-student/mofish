let novalDom = document.getElementById("novalChapters")
let novalName = ''
let chapterReadProcess = window.electronAPI.loadData('chapterReadProcess') || {}
let currentProcess = window.electronAPI.loadData('currentProcess')
function getAllNovalName(){
  let params = decodeURI(window.location.search)
  novalName = params.split('=')[1]
  storeData = window.electronAPI.loadData('mydata')[novalName]
  let novalNames = Object.keys(storeData)
  let novalChapters = []
  novalNames.forEach(element => {
    if(storeData[element].length == 2){
      novalChapters.push(storeData[element][0])
    }else{
      novalChapters.push("序章")
    }
  });
  savaReadProcess() // 保存当前进度
  chapterReadProcess = window.electronAPI.loadData('chapterReadProcess')
  let domSpan = ''
  let readProcessRes = chapterReadProcess?.[novalName]
  console.log("readProcessRes===>", readProcessRes)
  novalChapters.forEach((element, index) => {
    domSpan += `<span class="novalChapter" style="
    background: linear-gradient(to right, #95ffac ${readProcessRes?.[index]?.readPercent || 0}%, white ${readProcessRes?.[index]?.readPercent || 0}%);" title="${element}:${readProcessRes?.[index]?.readPercent || 0}%" onclick="changeNovalChapter('${index}')">${element}</span>`
  });
  novalDom.innerHTML = domSpan
}

getAllNovalName()

function savaReadProcess(){
  // 切换之前先将当前进度保存到对应的小说章节
  if(!currentProcess){ return } // 当没有当前阅读进度时，直接返回, 第一次安装软件时，currentProcess 为 undefined
  chapterReadProcess[currentProcess.name] = chapterReadProcess[currentProcess.name] || {} // 当小说不存在时，先创建一个空对象
  chapterReadProcess[currentProcess.name][currentProcess.chapter]= {
    readPercent: currentProcess.readPercent,
    scrollTop: currentProcess.scrollTop
  }
  window.electronAPI.saveData("chapterReadProcess", chapterReadProcess)
}

function changeNovalChapter(chapter){
  savaReadProcess()
  // 判断要切换的章节是否缓存了阅读进度，如果有则把当前进度更新为要切换章节的进度，否则重置当前进度
  let novalChapterReadProcess = chapterReadProcess?.[novalName]?.[chapter]
  if(!novalChapterReadProcess){
    window.electronAPI.saveData('currentProcess', { name:novalName, chapter:chapter, readPercent:0, scrollTop:0 });
  }else{
    window.electronAPI.saveData('currentProcess', { name:novalName, chapter:chapter, readPercent:novalChapterReadProcess.readPercent, scrollTop:novalChapterReadProcess.scrollTop });
  }
  window.electronAPI.sendMessageToParent1({ changeNoval:novalName }); // 通知设置页面更新阅读小说阅读进度
  window.electronAPI.sendMessageToParent({ changeNoval:novalName }); // 通知阅读页面，切换显示到对应的小说章节
}