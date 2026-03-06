# 科目一科目二搜题站（GitHub Pages 静态版）

这是一个纯前端搜题网站，可直接部署到 GitHub Pages。

## 功能

- 关键词搜题（题干、选项、答案、题号）
- 按科目筛选（科目一 / 科目二）
- 按题型筛选（单选、多选、判断、填空）
- 关键词高亮与分页浏览
- 无后端，打开即用

## 本地预览

在项目根目录运行：

```powershell
python -m http.server 8000
```

浏览器访问：

- `http://localhost:8000/quiz_site/`

## GitHub Pages 部署

1. 将 `quiz_site` 目录内容推送到仓库根目录（或 `docs` 目录）。
2. 打开 GitHub 仓库：`Settings -> Pages`。
3. 选择分支和目录，保存后等待发布。

## 题库数据

默认题库文件：

- `quiz_site/data/questions.json`

题库格式示例：

```json
{
  "id": 1,
  "subject": "科目一",
  "qtype": "单选题",
  "stem": "题干内容",
  "options": [{ "key": "A", "text": "选项文本" }],
  "answer": "A",
  "source": "01_单选题.txt"
}
```

如果你更新了原始题库文本，可重新生成 JSON：

```powershell
python quiz_site/tools/build_questions_json.py
```
