
const identityIDDom = document.getElementById("identityID")
const copyBtnDom = document.getElementById("copyBtn")
const identityBtnDom = document.getElementById("identityBtn")
const identityContentDom = document.getElementById("identityContent")

 
let MachinIDres = ""
copyBtnDom.addEventListener("click", ()=>{
  // 使用 Clipboard API 复制内容
  navigator.clipboard.writeText(MachinIDres).then(() => {
    console.log('内容已复制到剪贴板:', MachinIDres);
    alert('内容已复制到剪贴板！');
  }).catch(err => {
    console.error('复制到剪贴板失败:', err);
  });
})

function closePage(chapter){
  window.electronAPI.sendMsgToWindow({ // 通知主进程关闭窗口
    windowName: 'novelWindowtokenWindow',
    action:'closePage',
  })
}

const getMachinIdFn = async() => {
  MachinIDres = await window.electronAPI.getMachinID();
  identityIDDom.innerText = MachinIDres
}
getMachinIdFn()

identityBtnDom.addEventListener("click", async()=>{
  // 使用 验证并且激活
  let valideToken = identityContentDom.value
  if(!valideToken.trim()){
    alert("请输入您的验证码！")
  }else{
    let activeRes = await window.electronAPI.activeAppToken(identityContentDom.value)
    console.log('activeRes====>:', activeRes);
    if(activeRes.error == 1){
      alert(`激活失败！已过有效期，有效期至:${activeRes.validateDate}`)
    }else if(activeRes.error == 2){
      alert("激活失败：激活码有误")
    }else if(activeRes.error == 3){
      alert("激活失败：激活码和本机器不匹配")
    }else{
      alert(`您已成功激活，有效期至:${activeRes.validateDate}`)
      await window.electronAPI.closeChildWindow()
    }
  }
})