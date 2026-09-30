"""Build the static pages: index.html (講義) and quiz/index.html (隨機測驗)."""
import json, os, runpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEAD = ('<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n')

def page(body):
    # Everything before the first <div> is head material (title, fonts, style).
    i = body.index('\n<div')
    return HEAD + body[:i] + '\n</head>\n<body>' + body[i:] + '\n</body>\n</html>\n'

def main():
    svgs = runpy.run_path(os.path.join(ROOT, 'tools', 'svgs.py'))['out']
    handout = open(os.path.join(ROOT, 'src', 'handout.html'), encoding='utf-8').read()
    for k, v in svgs.items():
        handout = handout.replace('{{%s}}' % k, v)
    assert '{{' not in handout
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page(handout))

    bank = json.load(open(os.path.join(ROOT, 'data', 'questions.json'), encoding='utf-8'))
    quiz = open(os.path.join(ROOT, 'src', 'quiz.html'), encoding='utf-8').read()
    quiz = quiz.replace('{{DATA}}', json.dumps(bank, ensure_ascii=False, separators=(',', ':')))
    os.makedirs(os.path.join(ROOT, 'quiz'), exist_ok=True)
    with open(os.path.join(ROOT, 'quiz', 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page(quiz))
    print(f'built index.html and quiz/index.html ({len(bank)} questions)')

if __name__ == '__main__':
    main()
