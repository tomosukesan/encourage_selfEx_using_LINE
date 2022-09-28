'use strict';

//APIを叩ける
const axios = require('axios');
//DeeplのAPI
const translate = require("deepl");
// Steinを利用
const SteinStore = require('stein-js-client');
const store = new SteinStore('');

const express = require('express');
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 3000;

const config = {
    channelSecret: '',
    channelAccessToken: ''
};

const app = express();

app.post('/webhook', line.middleware(config), (req, res) => {
    console.log(req.body.events);

    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result));
});

const client = new line.Client(config);

async function handleEvent(event) {
    let message = {
        type: 'text',
        text: null
    };
    let output = '';
    //利用者IDを取得する準備
    const profile = await client.getProfile(event.source.userId);

    if (event.message.text === '今日の格言' || event.message.text === 'やる気なし') {
        let text_ja = '';
        const res = await axios.get('https://api.adviceslip.com/advice');
        const gif = await axios.get('https://yesno.wtf/api');
        const text_en = res.data.slip.advice;
        console.log(text_en);
        translate({
            free_api: true,
            text: text_en,
            target_lang: 'JA',
            auth_key: '',
        })
            .then(result => {
                text_ja = result.data.translations[0].text;
                console.log(text_ja);
                client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: '【今日の格言】\n' + text_en + '\n' + text_ja + '\n' + gif.data.image //実際に返信の言葉を入れる箇所
                });
            });
            return 0;
    } else if (event.message.text === '設定') {
        // 週に何日やるか
        // 好きなものは？
        message = {
            "type": "template",
            "altText": "this is a buttons template",
            "template": {
              "type": "buttons",
              "title": "あなたの好きなものを教えてください",
              "text": "この設定はいつでも変更可能です。",
              "actions": [
                { "type": "message", "label": "柴犬", "text": "柴犬" },
                { "type": "message", "label": "猫", "text": "猫" },
                { "type": "message", "label": "キツネ", "text": "キツネ" },
                // { "type": "message", "label": "その他", "text": "その他" }
              ]
            }
        }
        return client.replyMessage(event.replyToken, message);
    //userIdと好きなものをスプレッドシートに格納
    } else if (event.message.text === '柴犬') {
        output = '「柴犬」で設定しました。';
        store.append("Sheet1", [{ name: profile.displayName, userId: profile.userId, favorite: "柴犬"}]);
    } else if (event.message.text === '猫') {
         output = '「猫」で設定しました。';
        store.append("Sheet1", [{ name: profile.displayName, userId: profile.userId, favorite: "猫"}]);
    } else if (event.message.text === 'キツネ')  {
        output = '「キツネ」で設定しました。';
        store.append("Sheet1", [{ name: profile.displayName, userId: profile.userId, favorite: "キツネ"}]);
    } /* else if (event.message.text === 'その他')  {
        output = '「その他」で設定しました。';
        store.append("Sheet1", [{ name: profile.displayName, userId: profile.userId, favorite: "その他"}]);
    } */
      else if (event.message.text === 'はい' || event.message.text === 'これからやる') {
        //回数に応じて分岐処理
        store.read("Sheet1", { search: { userId: profile.userId }}).then(data => {
            console.log(data);
            let count = data[0].count;
            let favorite = data[0].favorite;
            if(count == 0){
                count = 1;
                message ={ type: 'text', text: '素晴らしいです。\nこの調子で頑張ってください。'};
            }
            else if(count == 1){
                count = 2;
                message ={ type: 'text', text: '次やるといいことがあるかも。'};
            }
            else if(count == 2){
                //嗜好に合わせたAPIを出力_画像
                if(favorite === '柴犬'){
                    async function getRequest() {
                        let response, result;
                        try {
                            response = await axios.get('http://shibe.online/api/shibes?count=3&urls=true&httpsUrls=true');
                            function getRandomInt(min, max) {
                                min = Math.ceil(min);
                                max = Math.floor(max);
                                return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
                            }
                            result = response.data[getRandomInt(0,2)];
                            console.log(result);
                            message = { type: 'text', text: 'お疲れ様でした。\n好きなことで癒されてください。\n' + result + '\n今後も頑張りましょう！' };
                            client.replyMessage(event.replyToken, message);
                        } catch (error) {
                            console.error(error);
                        }
                    }
                    getRequest();
                } else if(favorite === '猫'){
                    async function getRequest() {
                        let response;
                        try {
                            response = await axios.get('https://aws.random.cat/meow');
                            console.log(response.data);
                            message = { type: 'text', text: 'お疲れ様でした。\n好きなことで癒されてください。\n' + response.data.file + '\n今後も頑張りましょう！' };
                            client.replyMessage(event.replyToken, message);
                        } catch (error) {
                            console.error(error);
                        }
                    }
                    getRequest();
                } else if(favorite ==='キツネ'){
                    async function getRequest() {
                        let response;
                        try {
                            response = await axios.get('https://randomfox.ca/floof/');
                            console.log(response.data);
                            message = { type: 'text', text: 'お疲れ様でした。\n好きなことで癒されてください。\n' + response.data.image + '\n今後も頑張りましょう！' };
                            client.replyMessage(event.replyToken, message);
                        } catch (error) {
                            console.error(error);
                        }
                    }
                    getRequest();
                }/* else if(favorite ==='その他'){
                    // url = 'https://opentdb.com/api.php?amount=10';
                    getRequest(url);
                }*/
                count = 0;
            }
            store.edit("Sheet1", {
                search: { userId: profile.userId},
                set: { count: count },
                limit: 1
            });
            return client.replyMessage(event.replyToken, message);
        });

    } else if (event.message.text === 'いいえ') {
        message = {
            "type": "template",
            "altText": "this is a buttons template",
            "template": {
                "type": "buttons",
                "thumbnailImageUrl": "https://soco-st.com/wp-content/themes/socost/upload/7642_color.svg",
                "imageSize": "contain",
                "title": "少しでもできるといいのですが...",
                "text": "やらない理由は？？",
                "actions": [
                    { "type": "message", "label": "これからやる",  "text": "これからやる" },
                    { "type": "message", "label": "やる気なし", "text": "やる気なし" },
                    { "type": "message", "label": "方法不明", "text": "方法不明" },
                    { "type": "message", "label": "痛い", "text": "痛い" }
                ]
            }
        }
        return client.replyMessage(event.replyToken, message);
    } else if (event.message.text === '方法不明') output = '先生にきこう';
      else if (event.message.text === '痛い')    output = 'やらないというのもいい判断です。\nいつ、どのくらい、どのように痛いか、先生に伝えてみてください';
      else  output = '申し訳ありません。個別メッセージには対応しておりません。';
      message ={
        type: 'text',
        text: output
      };
    return client.replyMessage(event.replyToken, message);
}

//テスト用：

app.listen(PORT);
console.log(`Server running at ${PORT}`);

/* エラーが原因か...vercelでは反応せず。
//デプロイ用：https://mylinebot-orpin.vercel.app/webhook
(process.env.NOW_REGION) ? module.exports = app : app.listen(PORT);
console.log(`Server running at ${PORT}`);
*/