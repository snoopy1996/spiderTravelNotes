const url = require('url'),
  axios = require('axios'),
  cheerio = require('cheerio'),
  eventproxy = require('eventproxy'),
  fs = require('fs'),
  mongoose = require('mongoose');
var rp = require('request-promise');
(async () => {
  mongoose.connect('mongodb://127.0.0.1/travleNotes');
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', () => {
    console.log('成功连接到数据库');
  });
  // await db.once('open');
  // 游记schema
  const travelNoteSchema = mongoose.Schema({
    title: { type: String, unique: true },
    time: String,
    author: String,
    viewCount: String,
    tripTxt: String,
    imgsDesc: String,
    content: String,
    img: String,
    tag: String,
    catalog: Array,
    type: String
  });
  const travleNoteModel = mongoose.model('travelNote', travelNoteSchema);
  // 景点
  const scenicSchema = mongoose.Schema({
    name: String,
    favourable: String,
    img: String
  });
  const scenicModel = mongoose.model('scenic', scenicSchema);
  const citydata = fs.readFileSync('./static/cityUtf8.txt');
  const cityArray = citydata
    .toString()
    .replace(/市/g, '')
    .split(' ');
  const baseUrl = 'http://www.lvmama.com/lvyou/search/?t=yule&q=';
  const urlList = cityArray.map(v => {
    return baseUrl + encodeURI(v);
  });
  //
  const getHtmlForScenic = async url => {
    console.log(url);
    const htmlContent = await axios.get(url);
    const $ = cheerio.load(htmlContent.data);
    if ($ && $ !== null) {
      const list = $('.wy_des-res-li.bd.white-bg.mt20.clearfix > ul > li');
      console.log('list.length', list.length);
      for (let i = 0; i <= list.length; i++) {
        const img = list
          .eq(i)
          .children('p')
          .children('a')
          .children('img')
          .attr('src');
        const name = list
          .eq(i)
          .children('p')
          .children('span')
          .children('a')
          .text();
        const favourable = Math.ceil(Math.random() * 100 + 900) / 10 + '%';
        // console.log(name);
        const scenic = new scenicModel({
          name,
          favourable,
          img
        });
        scenic.save((err, res) => {
          if (err) {
            return console.error(err);
          }
          console.log('已存储', res);
        });
      }
    }
  };
  const getTravelNote = async page => {
    // console.log('获取游记内容');
    var request = require('request');
    const options = {
      method: 'POST',
      url: 'http://www.lvmama.com/trip/home/ajaxGetTrip',
      headers: {
        'Postman-Token': '66502c6c-9830-4b8f-4a2e-a08662286826',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form: { page }
    };
    try {
      const htmlContent = await rp(options);
      const $ = cheerio.load(htmlContent);
      if ($ && $ !== null) {
        const list = $('.country-box-one li');
        console.log('page', page, 'list', list.length);
        (async () => {
          for (let i = 0, max = list.length; i < max; i++) {
            const li = list.eq(i);
            const img = li.find('dl dt a img').attr('src');
            const dd = li.find('dl dd');
            const title = dd.find('.title a').text();
            const contentSrc = dd.find('.title a').attr('href');
            const ptext = dd.find('.uploadInfo').text();
            const pTextList = ptext.split('|');
            const author = pTextList[0];
            const time = pTextList[1];
            const tag = pTextList[2];
            const imgsDesc = pTextList[3];
            let catalog = [];
            const catalogHt = dd.find('.tripInfo a');
            for (let ai = 0; ai < catalogHt.length; ai++) {
              catalog.push(catalogHt.eq(ai).text());
            }
            const tripTxt = dd.find('.tripTxt').text();
            const viewCount = dd
              .find('.tripViews.active a')
              .eq(0)
              .text();
            const content = await getContentOfNote(contentSrc);
            const travleNote = new travleNoteModel({
              title,
              img,
              author,
              viewCount,
              time,
              imgsDesc,
              tripTxt,
              content,
              catalog,
              tag,
              type: '游记'
            });
            travleNote.save((err, res) => {
              if (err) {
                return console.log('err', err);
              }
              console.log('已存储', title);
            });
          }
        })();
      }
    } catch (err) {
      console.error('err', err);
    }
    return true;
  };
  const getContentOfNote = async url => {
    const contentHtml = await axios.get(url);
    const $ = cheerio.load(contentHtml.data);
    if ($ && $ !== null) {
      const mainContent = $('.eb-main');
      return mainContent.find('.ebm-post.ebm-article').html();
    }
  };
  const ep = new eventproxy();
  (async () => {
    for (let i = 20; i < 300; i++) {
      await (async i => {
        console.log(i);
        await getTravelNote(i);
      })(i);
    }
  })();
})();
