const cheerio = require('cheerio');
const eventBus = require('./eventCenter');

module.exports = class getNovalUtils {
  sourceArr = [];
  searchNovalObj = {
    "塔读网":{
      website: "https://www.tadu.com",
      searchNovaUrl: "",
      headers:{},
      method: "POST",
      body:"query=${novalName}",
      bookRules: {
        bookeList: ".bookList .lastLine",
        bookName: {
          selecterName: ".bookNm",
        },
        bookUrl: {
          selecterName: ".bot_list a:nth-child(2)",
          attrName: "href",
          withHost: false,
        },
        bookAuthor: {
          selecterName: ".authorNm",
        },
        bookCatagory: {
          selecterName: ".condition span:nth-child(2)",
        },
        bookStatus: {
          selecterName: ".condition span:nth-child(4)",
        },
        bookDesc: {
          selecterName: ".rtList.bookIntro",
        },
        bookImg: {
          selecterName: ".bookImg img",
          attrName: "data-src",
          withHost: true,
        },
        bookId: {
          selecterName: ".bookrackBtn",
          attrName: "data-bookid",
        },
      }
    }
  }
  chapterNovalObj = {
    "塔读网":{
      chapterNovalUrl: "https://www.tadu.com/book/${novalId}/",
      chapterRules: {
        chapterList: ".lfT li",
        chapterName: {
          selecterName: "div a",
        },
        chapterUrl: {
          selecterName: "div a",
          attrName: "href",
          withHost: true,
        },
      }
    }
  }
  contentNovalObj = {
    "塔读网":{
      baseChapterList:"false",
      regx: "<\/?[^>]+>",
    },
    "何以笙箫默":{
      baseChapterList:"true",
      regx: "/&nbsp;[^<]*/g",
      subRegx: "[&nbsp;]*",
    }
  }

  novalArr = [];

  novalChapterList = []
  constructor(searchNovalObj, chapterNovalObj, contentNovalObj) {
    this.searchNovalObj = searchNovalObj || {}
    this.chapterNovalObj = chapterNovalObj || {}
    this.contentNovalObj = contentNovalObj || {}
    this.sourceArr = Object.keys(searchNovalObj)
  }
  async searchNoval(novalName, sourceValue) {
    this.novalArr = [];
    let promiseArr = []
    let diffSourceArr = sourceValue.filter(x => this.sourceArr.includes(x))
    console.log("diffSourceArr=====>", diffSourceArr)
    diffSourceArr.forEach(async (item) => {
      let baseUrl = this.searchNovalObj[item].searchNovaUrl
      console.log("baseUrl=====>", baseUrl)
      let reqOptions = {
        "headers": this.searchNovalObj[item].headers,
        "method": this.searchNovalObj[item].method
      }
      let requestUrl = ""
      if(this.searchNovalObj[item].method == "POST") {
        requestUrl = baseUrl
        reqOptions.body = this.searchNovalObj[item].body.replace("${novalName}", novalName)
      } else {
        requestUrl = baseUrl.replace("${novalName}", novalName)
      }
      console.log("requestUrl=====>", requestUrl)
      promiseArr.push(
        new Promise((resolve, reject) => {
          fetch(requestUrl, reqOptions).then(response => response.text()).then(data => {
            // console.log("data=====>", data)
            const $ = cheerio.load(data);
            let novalObj = {};
            let bookListSelector = this.searchNovalObj[item].bookRules.bookeList;
            let bookNameSelector = this.searchNovalObj[item].bookRules.bookName.selecterName;
            let bookUrlSelector = this.searchNovalObj[item].bookRules.bookUrl.selecterName;
            let bookAuthorSelector = this.searchNovalObj[item].bookRules.bookAuthor.selecterName;
            let bookCatagorySelector = this.searchNovalObj[item].bookRules.bookCatagory.selecterName;
            let bookStatusSelector = this.searchNovalObj[item].bookRules.bookStatus.selecterName;
            let bookDescSelector = this.searchNovalObj[item].bookRules.bookDesc.selecterName;
            let bookImgSelector = this.searchNovalObj[item].bookRules.bookImg.selecterName;
            let bookImgAttrName = this.searchNovalObj[item].bookRules.bookImg.attrName;
            let bookIdSelector = this.searchNovalObj[item].bookRules.bookId.selecterName;
            let bookIdAttrName = this.searchNovalObj[item].bookRules.bookId.attrName;

            // 遍历每个匹配的元素
            $(bookListSelector).each((index, elementList) => {
              novalObj = {
                bookSource: item
              };
              $(bookNameSelector, elementList).each((index, element) => {
                novalObj.name = $(element).text();
              })
              $(bookUrlSelector, elementList).each((index, element) => {
                if(this.searchNovalObj[item].bookRules.bookUrl.withHost) {
                  novalObj.bookUrl = $(element).attr("href");
                } else {
                  novalObj.bookUrl = this.searchNovalObj[item].website + $(element).attr("href");
                }
              })
              $(bookAuthorSelector, elementList).each((index, element) => {
                if(this.searchNovalObj[item].bookRules.bookAuthor.removeString) {
                  novalObj.bookAuthor = $(element).text().replace(this.searchNovalObj[item].bookRules.bookAuthor.removeString, "")
                } else {
                  novalObj.bookAuthor = $(element).text();
                }
              })
              $(bookCatagorySelector, elementList).each((index, element) => {
                novalObj.bookCatagory = $(element).text();
              })
              $(bookStatusSelector, elementList).each((index, element) => {
                novalObj.bookStatus = $(element).text();
              })
              $(bookDescSelector, elementList).each((index, element) => {
                novalObj.bookDesc = $(element).text();
              })
              $(bookImgSelector, elementList).each((index, element1) => {
                if(this.searchNovalObj[item].bookRules.bookImg.withHost) {
                  novalObj.imgUrl = $(element1).attr(bookImgAttrName);
                } else {
                  novalObj.imgUrl = this.searchNovalObj[item].website + $(element1).attr(bookImgAttrName);
                }
              })
              $(bookIdSelector, elementList).each((index, element) => {
                novalObj.bookId = $(element).attr(bookIdAttrName);
              })
              this.novalArr.push(novalObj);
              resolve(this.novalArr);
            });
          });
        })
      )
    })
    let novalList = await Promise.all(promiseArr)
    return novalList.flat()
  }

  /**
 * 获取小说章节列表
 * @param {string} novalId - 小说的 ID
 * @returns {Promise} - 解析后的小说章节列表
 */
  async getNovalChapterList(novalId, cookie, bookSource) {
    console.log("novalId, cookie, bookSource=====>", novalId, cookie, bookSource)
    let charpterListSelector = this.chapterNovalObj[bookSource].chapterRules.chapterList;
    let charpterNameSelector = this.chapterNovalObj[bookSource].chapterRules.chapterName.selecterName;
    let charpterUrlwithHost = this.chapterNovalObj[bookSource].chapterRules.chapterUrl.withHost;
    return new Promise((resolve, reject) => {
      // 根据小说 ID 生成小说详情页的 URL
      const detailUrl = this.chapterNovalObj[bookSource].chapterNovalUrl.replace("${novalId}", novalId);
      // console.log("detailUrl=====>", detailUrl) 
      // 发送 GET 请求获取小说详情页的 HTML 内容
      fetch(detailUrl, {
        "headers": {
          "cookie": cookie,
        },
        "body": null,
        "method": "GET"
      }).then(response => response.text()).then(data => {
        // console.log("data=====>", data)
        // 使用 cheerio 加载 HTML 内容
        const $ = cheerio.load(data);
        let novalMap = {} // 存储小说章节列表 方便后面做去重处理

        // 遍历章节列表中的每个章节元素
        console.log("charpterListSelector=====>", charpterListSelector)
        $(charpterListSelector).each((index, elementCharpts) => {
          // 遍历每个章节元素中的链接元素
          console.log("charpterNameSelector=====>", charpterNameSelector)
          $(charpterNameSelector, elementCharpts).each((index, element) => {
            let tempName = $(element).text()
            let tempUrl = charpterUrlwithHost?$(element).attr("href"):this.searchNovalObj[bookSource].website + $(element).attr("href")
            if(novalMap[tempName] == undefined) {
              novalMap[tempName] = index
            } else {
              console.log("重复章节====>", tempName)
              this.novalChapterList.splice(novalMap[tempName], 1)
            }
            // 将章节名称和链接添加到小说章节列表中
            this.novalChapterList.push({
              name: tempName,
              url: tempUrl
            })
          })
        })
        // 解析完成后，返回小说章节列表
        resolve(this.novalChapterList);
      });
    })
  }
  
  async getNovalContent(cookie, novalId, bookSource) {
    // 获取小说一共多少章
    let chapterList = await this.getNovalChapterList(novalId, cookie, bookSource)
    let baseChapterList = this.contentNovalObj[bookSource].baseChapterList
    let regx = new RegExp(this.contentNovalObj[bookSource].regx, "g") 
    let subRegx = new RegExp(this.contentNovalObj[bookSource].subRegx, "g")
    console.log("regx====>", regx)
    console.log("subRegx.lenght====>", subRegx)
    console.log("chapterList====>", chapterList)
    // 分批次获取小说的类容
    let chapterListRes = []
    if(chapterList.length <= 0)  return chapterListRes;
    const totalRequests = chapterList.length; // 总请求数
    // const totalRequests = 2; // 总请求数
    const concurrentRequests = 1; // 每次并发请求数
    for (let i = 0; i < totalRequests; i += concurrentRequests) {
      // 创建一个数组来存储当前批次的请求
      const requests = [];
      // 发送当前批次的请求
      let requestIndex = 0
      for (let j = 0; j < concurrentRequests; j++) {
        requestIndex = i + j;
        if (requestIndex < totalRequests) {
          if(!this.contentNovalObj[bookSource].baseChapterList){ // 基于章节列表中的chapterUrl获取每个章节的内容
            console.log(`requestIndex111====>https://www.tadu.com/getPartContentByCodeTable/${novalId}/${requestIndex + 1}`)
            requests.push(
              new Promise((resolve, reject) => {
                fetch(`https://www.tadu.com/getPartContentByCodeTable/${novalId}/${requestIndex + 1}`, {
                  "headers": {
                    "cookie": cookie,
                  },
                  "body": null,
                  "method": "GET"
                }).then(response => response.text()).then(data => {
                  try {
                    // let regx = /<p[^>]*>(.*?)<\/p>/g;
                    let contentStrings = [];
                    data.match(regx).forEach((item) => {
                      let tempItem = item.replace(subRegx, "$1")
                      contentStrings.push(tempItem)
                    })
                    // console.log("contentStrings====>", contentStrings.join("\r\n"))
                    resolve([chapterList[requestIndex].name, contentStrings.join("\r\n")])
                  } catch (error) {
                    console.log("error===>", error)
                    reject([])
                  }
                  
                });
              })
            )
          }else {
            requests.push(
              new Promise((resolve, reject) => {
                fetch(chapterList[requestIndex].url, {
                  "headers": {
                    "cookie": cookie,
                  },
                  "body": null,
                  "method": "GET"
                }).then(response => response.text()).then(data => {
                  // console.log("data=====>", data)
                  try {
                    // let regx = /&nbsp;[^<]*/g;
                    let contentStrings = [];
                    data.match(regx).forEach((item) => {
                      let tempItem = item.replace(subRegx, "")
                      contentStrings.push(tempItem)
                    })
                    resolve([chapterList[requestIndex].name, contentStrings.join("\r\n")])
                  } catch (error) {
                    console.log("error===>", error)
                    reject([])
                  }
                });
              })
            )
          }
        }
      }
      // 等待当前批次的所有请求完成
      let res = null
      try {
        res = await Promise.all(requests);
        //发送进度事件
        eventBus.emit('progress', {
          progress: requestIndex + 1,
          total: totalRequests,
        });
      } catch (error) {
        res = []
        console.error("error====>", error);
      }
      chapterListRes = [...chapterListRes, ...res]
    }
    console.log("chapterListRes====>", chapterListRes)
    return chapterListRes
  }
}
