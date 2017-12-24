import Crawler from 'crawler';
import xml2js from "xml2js";
import axios from "axios";
import util from "util";
import utf8 from "utf8";
import dateFormat from "dateformat";

class Stocker {
  constructor() {
    this._stocks = {
      date: Date.now(),
      companies: []
    }
    this._parser = new xml2js.Parser();
    this._clawler = this.initCrawler()
  }

  initCrawler() {
    this._stocks = {
      date: Date.now(),
      companies: []
    };

    let fetched = 0;

    const c = new Crawler({
      maxConnection: 10,
      callback: (err, res, done) => {
        if(err) console.log(err);
        else{
          this.getNaverStockInfos(res)
            .then(stockInfos => {
              fetched++;
              if(fetched % 4 == 0){
                return this.getRelatedNewses(stockInfos);
              }else{
                return undefined;
              }
            })
            .then(d => {
              return d;
            })
            .catch(err => console.log(err));
        }
      }
    });
    c.queue([
      'http://finance.naver.com/sise/sise_rise.nhn?sosok=0', 
      'http://finance.naver.com/sise/sise_rise.nhn?sosok=1',
      'http://finance.naver.com/sise/sise_fall.nhn?sosok=0', 
      'http://finance.naver.com/sise/sise_fall.nhn?sosok=1',
    ]);
  }

  getNaverStockInfos(res) {
    return new Promise((resolve, reject) => {
      const type = res.request.uri.pathname.slice(11, 15); // rise or fall
      const $ = res.$;
          const tr = $('table.type_2 tr').filter((i, elem) => {
            return Number($(elem).find('td').eq(4).text().trim().slice(1, -1)) >= 10;
          });
          tr.each((i, elem) => {
            const td = $(elem).find('td');
            const company = {
              name: td.eq(1).text().trim(),
              rate: Number(td.eq(4).text().trim().slice(1, -1)),
              code: td.eq(1).find('a').attr('href').slice(-6),
              type: type,
            }
            this._stocks.companies.push(company);
          });
          resolve(this._stocks);
    });
  }

  getRelatedNewses (stocks) {
    return Promise.all(
      stocks.companies.map((item, i) => {
        return this.getFilteredNews(item, i);
      })
    );
  }

  getFilteredNews (company, i) {
    return new Promise((resolve, reject) => {
      const name = utf8.encode(company.name);
      const type = company.type;
      const href = `http://newssearch.naver.com/search.naver?where=rss&query=${name}`;
      axios(href, {headers:{
        charset: 'utf-8'
      }})
        .then(res => res.data)
        .then(data => {
          this._parser.parseString(data, (err, result) => {
            const newsList = result.rss.channel[0].item;
            const filteredList = 
              newsList
                .filter(this.newsFilter)
                .filter(item => {
                  item.pubDate[0] = dateFormat(item.pubDate[0], "yyyy-mm-dd HH:MM:ss")
                  return item.description[0].includes(company.name);
                });
            
            this._stocks.companies[i].news = filteredList;
            
            resolve(filteredList)
          });
        });
    });
  }

  newsFilter (item) {
    const title = item.title[0];
    const author = item.author[0];
    const desc = item.description[0];
    const category = item.category[0];

    //로봇 기사 제외
      return author !== '전자신문'
        && !author.includes('서울경제')
        && !author.includes('디스이즈게임')
        && !title.includes('fnRASSI')
        && !title.includes('ET투자뉴스')
        && !title.includes('시황_장마감')
        && !title.includes('스탁리포트')
        && !title.includes('마감 시황')
        && !title.includes('정오 시황')
        && !title.includes('시황_정오')
        && !title.includes('데일리 업데이트')
        && !title.includes('개장 시황')
        && !title.includes('이시각 상한가')
        && !title.includes('테마동향')
        && !/(오후|오전) (\d\d?:\d\d) 현재 /g.test(title)
        && category !== '스포츠' && category !== '연예'
  }

  getStocks () {
    return this._stocks;
  }
}

export default new Stocker();