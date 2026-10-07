# skin-care

美容丙級（10000）學科準備用的靜態頁面，部署在 <https://sudosu.tw/skin-care/>。

| 頁面 | 路徑 | 說明 |
| --- | --- | --- |
| 講義 | `/skin-care/` | 依題庫整理的重點與圖解（皮膚構造、表皮五層、pH、按摩方向…） |
| 測驗 | `/skin-care/quiz/` | 每次從不重複題庫隨機抽 25 題，送出後對答案 |
| 我的疑問 | `/skin-care/notes/` | 讀題庫時的疑問與解答，附各層細胞放大圖 |
| 清粉刺小遊戲 | `/skin-care/game/` | 3D 美容師遊戲：依膚質蒸臉、清粉刺、轉介化膿痤瘡，提示附題號 |
| 近距離療癒 | `/skin-care/game/closeup/` | 放大鏡下一次擠一顆：黑頭、白頭、膿皰（示範）、紅腫丘疹（凝膠） |
| 課程表 | `/skin-care/schedule/` | 皮膚管理服務人才培訓班 115/10/07–11/24 課表：今天／下一堂、依老師篩選、各課目時數 |

## 結構

```
data/questions.json   不重複題庫（236 題，原 262 題刪去 26 題重複／同考點題目）
data/schedule.json    培訓班課表（36 天、240 節），連續同課目的節次合併成一段 from–to
src/handout.html      講義模板，{{SKIN}} 等佔位會換成 tools/svgs.py 產生的圖
src/quiz.html         測驗模板，{{DATA}} 會換成題庫
src/notes.html        我的疑問頁，細胞圖由 tools/cells.py 產生
src/schedule.html     課程表模板，{{DATA}} 會換成 data/schedule.json
schedule/scans/       課表原始掃描檔（10 月、11 月各一張）
tools/build.py        產生 index.html、quiz/、notes/、schedule/ 的 index.html
game/                 清粉刺小遊戲（Three.js + ES modules，不需 build，部署時整個資料夾複製過去）
  src/data.js         顧客、膚質、工具與科普文字；refs 對應 questions.json 的題號
  closeup/            近距離療癒模式頁面
  src/closeup/        可變形的皮膚區塊（patch.js）、四種痘痘的擠出過程（lesions.js）
```

題號 `id` 前綴：`皮`＝工作項目 01 皮膚認識、`護`＝工作項目 02 護膚、`化`＝共同科目 90012 化粧品認識。

## 遊戲規則與題庫的對應

| 情境 | 遊戲裡的正確做法 | 題號 |
| --- | --- | --- |
| 黑頭、白頭粉刺 | 粉刺棒清除；白頭要先蒸臉 | 皮53 |
| 蒸臉時間 | 油性多蒸；乾性、敏感、面皰皮膚縮短 | 護37、護38、護51–53 |
| 化膿性痤瘡（膿皰） | 開轉介單，請顧客看皮膚科；擠或塗藥都算錯 | 皮15 |
| 紅腫的青春痘 | 擦消炎凝膠，不擠 | 護14、護17 |

本機試玩遊戲要用 http 伺服器開（ES modules 不能用 `file://`）：`python3 -m http.server 8000`，再開 <http://localhost:8000/game/>。

## 使用

```bash
python3 tools/build.py   # 本機產生頁面
```

推到 `main` 後，`.github/workflows/pages.yml` 會自動 build 並部署到 GitHub Pages（本 repo 的 Pages，經由 `susutw.github.io` 的自訂網域 `sudosu.tw` 顯示在 `/skin-care/`）。
