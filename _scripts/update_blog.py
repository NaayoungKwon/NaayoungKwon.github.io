import feedparser
import git
import os

# 벨로그 RSS 피드 URL
rss_url = 'https://api.velog.io/rss/@kny8092'

# 깃허브 레포지토리 경로
repo_path = '.'

# 'velog-posts' 폴더 경로
posts_dir = os.path.join(repo_path, '_posts')

# 'velog-posts' 폴더가 없다면 생성
if not os.path.exists(posts_dir):
    os.makedirs(posts_dir)

# 레포지토리 로드
repo = git.Repo(repo_path)

# RSS 피드 파싱
feed = feedparser.parse(rss_url)

# 각 글을 파일로 저장하고 커밋
for entry in feed.entries:
    # 파일 이름에서 유효하지 않은 문자 제거 또는 대체
    file_name = entry.title
    file_name = file_name.replace('/', '-')  # 슬래시를 대시로 대체
    file_name = file_name.replace('\\', '-')  # 백슬래시를 대시로 대체
    # 필요에 따라 추가 문자 대체
    pub_date = entry.published_parsed
    month = str(pub_date[1]) if int(pub_date[1]) >= 10 else '0' + str(pub_date[1])
    date = str(pub_date[0]) + '-' + month + '-' + str(pub_date[2])
    
    file_name = date + '-' + file_name +'.md'
    file_path = os.path.join(posts_dir, file_name)
    print(file_name,entry.published, date )

    header = '''---
date: {}
title: "{}"
category :
  - Java & Spring
permalink: /java-spring/{}/

toc: true
toc_sticky: true
---
''';

    # 파일이 이미 존재하지 않으면 생성
    if not os.path.exists(file_path):
        with open(file_path, 'w', encoding='utf-8') as file:
            content = header.format(date, entry.title, entry.title ) + entry.description
            file.write(content)  # 글 내용을 파일에 작성

        # 깃허브 커밋
        repo.git.add(file_path)
        repo.git.commit('-m', f'Add post: {entry.title}', date={entry.published})

# 변경 사항을 깃허브에 푸시
repo.git.push()
