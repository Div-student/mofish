// const axios = require('axios');
const cheerio = require('cheerio');
const eventBus = require('./eventCenter');

module.exports = class getNovalUtils {
  arr = [];
  searchNovalObj = {
    searchNovaUrl: "",
    headers:{},
    method: "POST",
    body:"query=${novalName}"
  }
  chapterNovalObj = {
    chapterNovalUrl: "https://www.tadu.com/book/${novalId}/",
  }

  novalArr = [];

  novalChapterList = []
  constructor(searchNovalObj, chapterNovalObj) {
    this.searchNovalObj = searchNovalObj
    this.chapterNovalObj = chapterNovalObj
  }
  async searchNoval(novalName) {
    console.log("novalName=====>", novalName)
    this.novalArr = [];
    return new Promise((resolve, reject) => {
      fetch(this.searchNovalObj.searchNovaUrl, {
        "headers": this.searchNovalObj.headers,
        "body": this.searchNovalObj.body.replace("${novalName}", novalName),
        "method": this.searchNovalObj.method
      }).then(response => response.text()).then(data => {
        const $ = cheerio.load(data);
        let novalObj = {};
        $(".bookList .lastLine").each((index, elementList) => {
          novalObj = {
            bookSource:"塔读网"
          };
          $(".bookNm", elementList).each((index, element) => {
            novalObj.name = $(element).text();
          })
          $(".bot_list a:nth-child(2)", elementList).each((index, element) => {
            novalObj.bookUrl = $(element).attr("href");
          })
          $(".authorNm", elementList).each((index, element) => {
            novalObj.bookAuthor = $(element).text();
          })
          $(".condition span:nth-child(2)", elementList).each((index, element) => {
            novalObj.bookCatagory = $(element).text();
          })
          $(".condition span:nth-child(4)", elementList).each((index, element) => {
            novalObj.bookStatus = $(element).text();
          })
          $(".rtList .bookIntro", elementList).each((index, element) => {
            novalObj.bookDesc = $(element).text();
          })
          $(".bookImg img", elementList).each((index, element1) => {
            novalObj.imgUrl = $(element1).attr("data-src");
          })
          $(".bookrackBtn", elementList).each((index, element) => {
            novalObj.bookId = $(element).attr("data-bookid");
          })
          this.novalArr.push(novalObj);
          resolve(this.novalArr);
        });
      });
    })
  }

  /**
 * 获取小说章节列表
 * @param {string} novalId - 小说的 ID
 * @returns {Promise} - 解析后的小说章节列表
 */
  async getNovalChapterList(novalId, cookie) {
    return new Promise((resolve, reject) => {
      // 根据小说 ID 生成小说详情页的 URL
      const detailUrl = this.chapterNovalObj.chapterNovalUrl.replace("${novalId}", novalId);
      console.log("detailUrl=====>", detailUrl) 
      // 发送 GET 请求获取小说详情页的 HTML 内容
      fetch(detailUrl, {
        "headers": {
          "cookie": cookie,
        },
        "body": null,
        "method": "GET"
      }).then(response => response.text()).then(data => {
        // 使用 cheerio 加载 HTML 内容
        const $ = cheerio.load(data);
        // 遍历章节列表中的每个章节元素
        $(".lfT li").each((index, elementCharpts) => {
          // 遍历每个章节元素中的链接元素
          $("div a", elementCharpts).each((index, element) => {
            // 将章节名称和链接添加到小说章节列表中
            this.novalChapterList.push({
              name: $(element).text(),
              url: $(element).attr("href")
            })
          })
        })
        // 解析完成后，返回小说章节列表
        resolve(this.novalChapterList);
      });
    })
  }
  
  
  async getNovalContent(cookie, novalId, novalName) {
    // 获取小说一共多少章
    let chapterList = await this.getNovalChapterList(novalId, cookie)
    console.log("chapterList.lenght====>", chapterList.length)

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
                  let regx = /<p[^>]*>(.*?)<\/p>/g;
                  let contentStrings = [];
                  data.match(regx).forEach((item) => {
                    let tempItem = item.replace(regx, "$1")
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
    // console.log("chapterListRes====>", chapterListRes)
    return chapterListRes
  }
}
