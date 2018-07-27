const url = require('url'),
  axios = require('axios'),
  cheerio = require('cheerio'),
  eventproxy = require('eventproxy'),
  FormData = require('FormData'),
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
  const getTravelNote = async page => {
    const params = {
      offset: (page - 1) * 40,
      format: 'json',
      keyword: '旅游攻略',
      autoload: true,
      count: 40,
      cur_tab: 1,
      from: 'search_tab'
    };
    try {
      const res = await axios.get('https://www.toutiao.com/search_content/', {
        params
      });
      console.log('res.data.has_more', res.data.has_more);
      if (res.data.data) {
        const data = res.data.data;
        for (let article of data) {
          if (article.title) {
            const title = article.title;
            const tripTxt = article.abstract;
            const viewCount = article.comments_count;
            const author = article.source;
            const time = article.datetime;
            const img = 'http:' + article.image_url;
            const contentSrc = article.article_url;
            const mainContent = await getContentOfNote(contentSrc);
            const travleNote = new travleNoteModel({
              title,
              img,
              author,
              viewCount,
              time,
              tripTxt,
              content: mainContent,
              type: '攻略'
            });
            travleNote.save((err, res) => {
              if (err) {
                return console.log('err', err);
              }
              console.log('已存储', title);
            });
          }
        }
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
      const mainContent = $('.article-content').html();
      return mainContent;
    }
  };
  const ep = new eventproxy();
  // for (let url of urlList) {
  //   getHtmlForScenic(url);
  // }
  async function delay() {
    setTimeout(() => {
      return true;
    }, 500);
  }
  (async () => {
    for (let i = 2; i < 40; i++) {
      await delay();
      await (async i => {
        console.log(i);
        await getTravelNote(i);
      })(i);
    }
  })();
})();
