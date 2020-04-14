{
    'use strict';

    const localhostName = 'localhost:80';
    const executeArg = process.argv[2];
    const puppeteer = require('puppeteer');
    const devices   = require('puppeteer/DeviceDescriptors');
    const resemble  = require('resemblejs');
    const fs        = require('fs-extra');
    const path      = require('path');
    const device = devices['iPhone 8'];
    const fileName = 'origin';
    const parentDir = 'screenshot/';
    const exclusionDir = /(\/node_modules\/|\/_dev\/|\/includ(e|es)\/|^\.)/g;
    const replaceText = /(file:|D:|http:\/\/).*(docs|localhost:80)\//;
    const dirPath = path.resolve(__dirname, '../../');
    const selectPaths = [
        `http://${localhostName}/visual_regression/docs/index.html`
    ];

    /**
     * 現在時刻をフォーマットした値を返す
     * @returns {string} format - フォーマット済みの時間データ
     */
    const formatDate = () => {
        const date = new Date();
        let format = 'YYYY_MM_DD_HHmmss';

        format = format.replace(/YYYY/g, date.getFullYear());
        format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
        format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
        format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2));
        format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
        format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));

        return format;
    };
    const latestDir = `${parentDir}${formatDate()}/`;
    const fileType = {
        file: 'file',
        directory: 'directory'
    };

    /**
     * ファイルかディレクトリかを取得
     * @param {string} path - 変数 `dirPath` 配下のパス情報
     * @return {void}
     */
    const getFileType = (path) => {
        try {
            const stat = fs.statSync(path);

            switch (true) {
                case stat.isFile():
                    return fileType.file;

                case stat.isDirectory():
                    return fileType.directory;

                default:
                    return fileType.Unknown;
            }

        } catch(e) {
            return fileType.Unknown;
        }
    };

    /**
     * ファイルかディレクトリかを取得
     * @param {string} dirPath - 変数 `dirPath`、検索したい箇所のパス情報
     * @return {object} listArray - 指定箇所以下にある全てのファイル情報
     */
    const listFiles = (dirPath) => {
        const listArray = [];
        const paths = fs.readdirSync(dirPath);

        paths.forEach((a) => {
            const path = `${dirPath}/${a}`;

            switch (getFileType(path)) {
                case fileType.file:
                    listArray.push(path);
                    break;

                case fileType.directory:
                    listArray.push(...listFiles(path));
                    break;
            }
        });

        return listArray;
    };

    /**
     * スクリーンショットを撮るパスの情報
     * @param {string} executeArg - node 実行時に渡ってくる引数
     * @return {object} - 指定箇所配下のファイル情報から `.html` に合致して 変数 `exclusionDir` に合致しないパス情報
     * @return {object} selectPaths - 配列に記述したパス情報
     */
    const paths = ((executeArg) => {
        switch (executeArg) {
            case '--all':
            case '-a':
                return listFiles(dirPath).filter((value) => {
                    return value.match(/.html$/) && !value.match(exclusionDir);
                });

            default:
                return selectPaths;
        }
    })(executeArg);

    /**
     * スクリーンショットを撮り、前回撮ったものと比較する
     * @param {object} browser - puppeteer が作成したブラウザ情報
     * @param {string} url - 変数 `paths` に格納されているパス情報
     * @param {number} num - 変数 `paths` の length
     */
    class ImageComparison {
        constructor(browser, url, num) {
            this.browser = browser;
            this.url = url;
            this.num = num;
        }

        async takeScreenshot() {
            const urlFileName = paths[this.num].replace(replaceText, '').replace(/\//g, '--');
            const page = await this.browser.newPage();

            /* 実行時の時間を名称にしてディレクトリを作成 */
            const storageDestination = `${latestDir}${urlFileName}`;
            fs.mkdirsSync(storageDestination); /* mkdirsSync -> 指定したディレクトリがない場合でも、階層ごとすべてディレクトリを作成する */
            const list = fs.readdirSync(parentDir);  /* readdirSync -> フォルダ直下にあるファイルリストを取得 */

            /* 時系列に1つ前のパスを取得 */
            const previousDir = `${parentDir}${list[list.length-2]}/${urlFileName}`;
            const previousFile = `${previousDir}/${fileName}_${(this.num+1)}.png`;

            /* 撮影したいデバイスに指定 */
            await page.emulate(device);

            /* localhost に書き換え */
            const replaceUrl = this.url.replace(/D:.*?docs/, 'http://' + localhostName);
            await page.goto(replaceUrl, {waitUntil: 'domcontentloaded'});

            /* 最新のスクリーンショットを作成 */
            const latestFile = `${storageDestination}/${fileName}_${(this.num+1)}.png`;
            await page.screenshot({ path: latestFile, fullPage: true });

            /* 導入時は比較対象がない場合は、スクリーンショットを撮って動作を終了させる */
            if (!fs.existsSync(previousDir)) {
                console.log(`比較対象が存在しないため、${urlFileName} の撮影のみを行いました。`);
                await page.close();
                return;
            }

            /* 時系列の最新と1つ前のファイルの中身を取得 */
            const imageBefore = fs.readFileSync(previousFile);
            const imageAfter  = fs.readFileSync(latestFile);
            const imageDiff = `${latestDir}/${urlFileName}/diff_${this.num+1}.png`;

            /* 前回と最新のスクショの差分を比較 */
            resemble(imageAfter).compareTo(imageBefore)
                .ignoreColors()
                .onComplete(function(data) {
                    /* 画像を比較して、差異があるかどうかの判定 */
                    if (data.rawMisMatchPercentage !== 0) {
                        fs.writeFileSync(imageDiff , data.getBuffer());
                        console.log(`${urlFileName} の比較を実行しました。`);
                    } else {
                        fs.removeSync(`${storageDestination}`);
                        console.log(`${urlFileName} に差分はありませんでした。`);
                    }
                });

            await page.close();
        }
    }

    (async () => {
        const browser = await puppeteer.launch();
        const length = paths.length;
        let i = 0;

        for (i; i < length; i++) {
            /* 変数 parentDir と同一のディレクトリが存在しない場合は、ディレクトリを作成 */
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir);
            }
            const imageComparison = new ImageComparison(browser, paths[i], i);
            await imageComparison.takeScreenshot();
        }

        browser.close();
    })();
}
