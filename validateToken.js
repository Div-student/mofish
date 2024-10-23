const os = require('os');
const crypto = require('crypto');
const { machineIdSync, machineId } = require('node-machine-id');
const Store = require('electron-store');
const store = new Store();


function validateToken() {
  
  let machinToken = store.get("encodeToken")
  let validateInfo = {}
  if(!machinToken){
    validateInfo["error"] = 0; // 首次校验
  }else{
    validateInfo = { ...activeAppCert(machinToken) }
  }
  return validateInfo
}

function generateMachKey(){
  // 同步获取机器 ID
  const unniId = machineIdSync();
  console.log('同步获取的机器 ID:', unniId);
  return unniId
}

function getCurrentDateString() {
  const now = new Date(); // 获取当前时间

  // 获取年份、月份和日期
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从 0 开始，所以要加 1
  const day = String(now.getDate()).padStart(2, '0'); // 确保日期是两位数

  // 格式化为 "yyyy-mm-dd"
  return `${year}-${month}-${day}`;
}

// 激活软件使用时长
function activeAppCert(encodeToken){
  const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCbcElOjE96gBaf
gOmasQXB0JwPE3u6LIML7XMFsf3j2Ln+sJu7EqPk0od/tyzb5SlFsksAIn7jgAob
BcnbEIFVaLABtkY5eX4+d7QX6u1PZo3SZsFJfspOe1zue8JuajBBWn1K1g4ZzSHb
cjfcfQEv1n+oL3QemNt2paKktNBz/GmC0G9mBFh0EgPfBEbbWwOZQjgZd9EcfgOr
UsQT39wTt9fu95IRNsCz1GaiyTEdDxQipJMFEMOeubkeYfiEdsS/q6HvSmPFjWoW
k9XuYWWpTU0KPSS6bw+rqCNQ+I5hK0poGchkyr9NEvLWzUCFBsadJ37dkA6ZEO0r
0jjO9w4hAgMBAAECggEAFV1pthIzGnNgqKvfcBPE5s71pFzZNM3JdWo91RqR+y9e
4VMFFMGLJXiKh1N2JwNomNvY0zvqlPqUaQJyrFmobUTmbFXRcTTx1UQ+zMrNs4w1
EiZtitySkhcCvwTjxKlz2IfHkPG7HnDDppYcd4H3F8wz37omC86W28gIgvsXa9mf
Daz3CaWUkA97LCdP8if0tyFDyqjmZiHsQmbsqjm2qxjyjTLJ4tRjHSqn1PKjvsb/
1GqdVPNHgkJFLb3OLxPaWb+rrkujvCqiUAliU+tRkn+3XOfH+6NVqXYgrcsOLI25
NCOADXVyNtScvsew1d4dJ8WGHEuE9c8IUZ47zkFPwQKBgQDLnvx2P1JztN+1OK3M
Us3dC8IZCekwvVm63+PhS36TgzlXrQlJd1ITugvuY/dTz0NBm1OVhzXc6Qmg9ahV
B+7lWZwppkHEha4cDajFScfHDupk7l5SSbInj5VmnA3xtVoYKYiipx2yBGg+PCtA
semVpxLP1Q0EcSK9sBIaVWA86wKBgQDDbFpuu3rsxXKObsr+lYNoDnegUDgzuWRU
fn9IJlK1GkgAw9NBKooFJQsraUO/tSn8feznrZT6Gs9B/eXcadRzPyAjxIGEMy/U
x5AOcjHKUSRU4TzOtJ9QVB8uRaJtnr9MkIIF4lnZjZaYxT/LJeaKXwq9iDz6qH++
spVzJnWuIwKBgBaY0TmqM1NF6mGpJZh8Q/5Y9LRkpi1Thia3/AkfoK9sK6vwNwyh
IkmwJuzQyTzSzor0WuVIOREIB5qGSKUPGVL4i90PZ1MQ5s6UMXubgYE0xYxn663E
IfJD+/eEMAP39USjL1elpiUAWjU15jLqy5phDTRlV2l7yLg2Vvv3J5P7AoGBAJ9c
RaaVBhn8rX1PBgRzYjRBz/WQVTSA0zs/6IWqkrmSk/LjvesfSGwHmEMvVQsJLhLz
kXQgDiOiJy9WX9LNDm1opcnlHgTzROcMUgIlx0qHvsvk3RRnIJ996etu55Ti5ncG
RLGNst2A47Ty7SG5Z3WhKX4Dkk6Jh5q3wL2lOEPnAoGAK5c/PyjSN9FX6NZpqkkB
79T1kNF+TP4iHBtXyerZ05HhNR9oFJ5Fg06WXD+RDnYx+NBwbi4Q1BFEi0Y6Dh2v
VGThMvEdu8afAV545i7PxYODT0r2Iw+Zq9sPs0Tse+lx3aCEvM7xyw5OUykSILxZ
E73BPOwXueJ3wlVXEjzJbV0=
-----END PRIVATE KEY-----`
  let validateInfo = {}
  try {
    // 解码 Base64 字符串
    const decodedBuffer = Buffer.from(encodeToken, 'base64');
    // 使用私钥解密数据
    const decryptedData = crypto.privateDecrypt(privateKey, decodedBuffer);
    let decrypTemp = decryptedData.toString().split("_")

    // 将日期字符串转换为 Date 对象
    const date1 = new Date(decrypTemp[0]);
    const date2 = new Date(getCurrentDateString())
    
    // 判断是否是生效密钥对应的电脑
    if(decrypTemp[1] !== generateMachKey()){
      validateInfo["someMachinFlag"] = false
      validateInfo["error"] = 3; // 机器与验证码不匹配
    }else if(date1 < date2){
      validateInfo["error"] = 1; // 已过有效期
      validateInfo["validateDate"] = decrypTemp[0]
    }else{
      validateInfo["someMachinFlag"] = true
      validateInfo["validateDate"] = decrypTemp[0]
      store.set("encodeToken", encodeToken)
    }
    console.log('解密后的数据:', decrypTemp, validateInfo);
  } catch (error) {
    validateInfo["error"] = 2; // 验证码解析失败
    console.log('解析报错:', error);
  }
  return validateInfo
}

// 生成授权有效期token
function generateDateToken(expireDate, machId){

  const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm3BJToxPeoAWn4DpmrEF
wdCcDxN7uiyDC+1zBbH949i5/rCbuxKj5NKHf7cs2+UpRbJLACJ+44AKGwXJ2xCB
VWiwAbZGOXl+Pne0F+rtT2aN0mbBSX7KTntc7nvCbmowQVp9StYOGc0h23I33H0B
L9Z/qC90HpjbdqWipLTQc/xpgtBvZgRYdBID3wRG21sDmUI4GXfRHH4Dq1LEE9/c
E7fX7veSETbAs9RmoskxHQ8UIqSTBRDDnrm5HmH4hHbEv6uh70pjxY1qFpPV7mFl
qU1NCj0kum8Pq6gjUPiOYStKaBnIZMq/TRLy1s1AhQbGnSd+3ZAOmRDtK9I4zvcO
IQIDAQAB
-----END PUBLIC KEY-----`

  // const unniId = "2024-10-21_59695ba15d4bdcc6187994c2b242c231713da5b9ae9215d01fee1f817450c70d";
  let unniId = `${expireDate}_${machId}`;
  // 使用公钥加密数据 生成token
  let encryptedData = crypto.publicEncrypt(publicKey, Buffer.from(unniId));
  let encryptedDataBase64 = encryptedData.toString('base64')
  console.log('加密后的数据:', encryptedData.toString('base64'));
  return encryptedDataBase64
}


module.exports = { validateToken, generateMachKey, generateDateToken, activeAppCert }