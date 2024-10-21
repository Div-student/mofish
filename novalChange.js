let novalDom = document.getElementById("novalChapters")
let novalName = ''
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
  console.log("novalNames===>", novalNames)
  console.log("novalName===>", novalName)
  console.log("novalChapters===>", novalChapters)

  let domSpan = ''
  novalChapters.forEach((element, index) => {
    domSpan += `<span class="novalChapter" title="${element}" onclick="changeNovalChapter('${index}')">${element}</span>`
  });
  novalDom.innerHTML = domSpan
}

getAllNovalName()

function changeNovalChapter(chapter){

  window.electronAPI.saveData('currentProcess', { name:novalName, chapter:chapter, readPercent:0, scrollTop:0 });
  window.electronAPI.sendMessageToParent1({ changeNoval:novalName }); // 通知设置页面更新阅读小说阅读进度
  window.electronAPI.sendMessageToParent({ changeNoval:novalName }); // 通知阅读页面，切换显示到对应的小说章节
}