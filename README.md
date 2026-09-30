# skin-care

美容丙級（10000）學科準備用的靜態頁面，部署在 <https://sudosu.tw/skin-care/>。

| 頁面 | 路徑 | 說明 |
| --- | --- | --- |
| 講義 | `/skin-care/` | 依題庫整理的重點與圖解（皮膚構造、表皮五層、pH、按摩方向…） |
| 測驗 | `/skin-care/quiz/` | 每次從不重複題庫隨機抽 25 題，送出後對答案 |
| 我的疑問 | `/skin-care/notes/` | 讀題庫時的疑問與解答，附各層細胞放大圖 |

## 結構

```
data/questions.json   不重複題庫（236 題，原 262 題刪去 26 題重複／同考點題目）
src/handout.html      講義模板，{{SKIN}} 等佔位會換成 tools/svgs.py 產生的圖
src/quiz.html         測驗模板，{{DATA}} 會換成題庫
src/notes.html        我的疑問頁，細胞圖由 tools/cells.py 產生
tools/build.py        產生 index.html 與 quiz/index.html
tools/deploy.sh       把產出複製到 susutw.github.io/skin-care/
```

題號 `id` 前綴：`皮`＝工作項目 01 皮膚認識、`護`＝工作項目 02 護膚、`化`＝共同科目 90012 化粧品認識。

## 使用

```bash
python3 tools/build.py
tools/deploy.sh   # 預設部署到 ../susutw.github.io，可用第一個參數指定路徑
```
