// const axios = require('axios');
const cheerio = require('cheerio');

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
          novalObj = {};
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
            novalObj.imgUrl = $(element1).attr("src");
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
  async getNovalChapterList(novalId) {
    return new Promise((resolve, reject) => {
      // 根据小说 ID 生成小说详情页的 URL
      const detailUrl = this.chapterNovalObj.chapterNovalUrl.replace("${novalId}", novalId);
      console.log("detailUrl=====>", detailUrl) 
      // 发送 GET 请求获取小说详情页的 HTML 内容
      fetch(detailUrl, {
        "headers": {},
        "body": null,
        "method": "GET"
      }).then(response => response.text()).then(data => {
        // 使用 cheerio 加载 HTML 内容
        const $ = cheerio.load(data);
        // 遍历章节列表中的每个章节元素
        $(".boxT .lfT li").each((index, elementCharpts) => {
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
  
  
  async getNovalContent(contentUrl) {
    return new Promise((resolve, reject) => {
      fetch("https://www.tadu.com/getPartContentByCodeTable/1003880/600", {
        "headers": {
          "cookie": "__jsluid_s=2f539e00172829242beafdd1cfeb199e; _ebc81c6d435065d480cb865bdbc4fec2=7d4c08238a84c8d37d19dfcd9103c78cd43c691d258176a9c353b177aa4a7da420c4774c38a1f1e70fd6188df466d7ad; _ee965b7158f5ac6ba1d18e3e6bdf7644=0aa9abe0440dd2ac14d79db07dc26a6a; font_size=; screen_width=; __guid=203173143.2580927311756749000.1731138199278.6511; Hm_lvt_3b387970cdb803bd81d7f67e34d57668=1734250742,1734872976,1735397418; HMACCOUNT=C61EE7EAB881F4ED; _0614608b11a9a44a25bfd07cf887e9a9=5ff39eddc43ec20e056e185f21a03ea4f56a759237b4f80176c5c48db3306ac6e5b80e93f99d030866f310a0b7c537a3; count=4; Hm_lpvt_3b387970cdb803bd81d7f67e34d57668=1735398886; _c26e8178126688deb863604bef4b0cda=2665fac0ab696a59508bb5d13ce65554; _ecdcd22cb11e7f874bde71fc7a0c51d4=b28ea4325f3449aacc63025ab3e4b684",
        },
        "body": null,
        "method": "GET"
      }).then(response => response.text()).then(data => {
        let regx = /<p[^>]*>(.*?)<\/p>/g;
        let contentStrings = [];
        data.match(regx).forEach((item) => {
          let tempItem = item.replace(regx, "$1")
          contentStrings.push(tempItem)
        })
        console.log("contentStrings====>", contentStrings.join("\r\n"))
      });
    })
  }
}
