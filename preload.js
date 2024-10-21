const { contextBridge, ipcRenderer} = require('electron');
const  fs = require('fs');
const  path = require('path');
const Store = require('electron-store');

const store = new Store();

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  },
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  onMessage: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveData: (key, value) => store.set(key, value),
  loadData: (key) => store.get(key),
  openNewWindow: () => ipcRenderer.send('open-set-window'),
  sendMessageToParent: (message) => ipcRenderer.send('message-from-child', message),
  onMessageFromParent: (callback) => ipcRenderer.on('message-to-parent', (event, message) => {
    console.log(2222)
    callback(message)}),
  clickSetting: (callback) => ipcRenderer.on('clickSetting', (event, message) => callback(message)),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  windowMove: (canMove) => ipcRenderer.send("window-move-open", canMove),
  getMachinID: () => ipcRenderer.invoke('getMachinID'), // 激活码页面发送的获取机器ID消息 
  activeAppToken: (message) => ipcRenderer.invoke('activeAppToken', message), // 激活验证码
  closeChildWindow: () => ipcRenderer.send('closeChildWindow'), // 关闭授权弹窗 
  novalChangeEvent: (message) => ipcRenderer.send('novalChangeEvent',message), // 小说切换窗口事件
  sendMessageToParent1: (message) => ipcRenderer.send('message-from-child1', message),
  onMessageFromParent1: (callback) => ipcRenderer.on('message-to-parent1', (event, message) => {
    console.log(11111)
    callback(message)}),
});
