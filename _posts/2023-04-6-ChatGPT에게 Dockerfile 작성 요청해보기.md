---
date: 2023-04-6
title: "ChatGPT에게 Dockerfile 작성 요청해보기"
category :
  - Java & Spring
permalink: /java-spring/ChatGPT에게 Dockerfile 작성 요청해보기/

toc: true
toc_sticky: true
---<h2 id="들어가기">들어가기</h2>
<p>ChatGPT가 나오면서 사람들은 다양한 분야에서 ChatGPT를 사용하기 시작했다.
나도 장난삼아 몇 번 써본적은 있지만 <del>(SSD 잘만드는 회사 추천해줘)</del>, 주변에서 코딩을 시켰더니 해주더라! 라는 이야기를 들었다.</p>
<p>어려운 백준 문제의 정답도 구글링을 하면 대부분 찾을 수 있었고, 그렇다고 내가 하고있는 프로젝트 코드를 다 던져주고 어떤 부분을 작성해달라고 하는 것도 나의 학습에 도움이 되지않고 상세하게 요청하기 귀찮아서(?) 코딩을 시켜본 적이 없었다.</p>
<p>그러던 중, 기존에 한 개의 노드만 운영하던 redis를 replica로 운영하자는 이야기가 나오면서 Dockerfile을 만들어달라고 해봐도 괜찮을 것 같다는 생각에 시도해봤다.</p>
<p><strong>절대 공부하기 귀찮아서가 아니고 경험삼아 시도해본 것이다.</strong></p>
<h3 id="내가-하고-싶은-것">내가 하고 싶은 것</h3>
<p>Redis를 Docker image로 가져와 운영하는데 1개의 master와 1개의 slave를 두고 master의 내용을 slave가 백업으로 가지고 있도록 하는 docker-compose.yml을 작성하고 싶다.</p>
<h2 id="일해라-chatgpt">일해라 ChatGPT</h2>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/3a9058e4-e4b0-4ea2-8b67-85e366e5f1f7/image.png" /></p>
<h3 id="초기-요청">초기 요청</h3>
<p>master node 1개와 slave node 1개로 구성되로 비밀번호를 설정 할 수 있도록 요청한다.
이전에 비밀번호 설정을 안해서 털렸기 때문에 꼭 해야한다.</p>
<blockquote>
<p>I want to write docker-compose redis. As replication nodes which has one master node, one slave node. Also, about setting, password is "****" and use host.docker.internal</p>
</blockquote>
<p>좀 생각해보더니, 설정파일과 함께 옵션 설명, docker-compose 파일 실행하는 법까지 알려준다.
<em>꽤 친절 한거같기도..</em></p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/394a66d7-ac68-4e66-91a1-47e8eed68ae8/image.png" /></p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/7322f0e3-0d61-48af-8fea-76f8aaa6905b/image.png" /></p>
<p>위의 내용을 보면 내가 요구한 사항은 만족하도록 작성을 해준걸 알 수 있다.</p>
<h3 id="backup-option-설정하기">Backup option 설정하기</h3>
<p>services, image, port, volumes 등은 이전에 docker-compose를 몇 번 작성해봤기 때문에 알고있지만, command의 appendonly가 어떤 설정인지 몰라서 설명을 해달라고 했다.</p>
<blockquote>
<p>About that replication, why are you use appendonly option?</p>
</blockquote>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/9aa9d75d-6f25-483f-8e7c-a11cd9072fa7/image.png" /></p>
<p>아 영어 하기 힘들다.. chatGPT 너 한국말 가능하지?</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/d8d1a07d-d4f2-4304-9a80-25ccc5ae316f/image.png" /></p>
<p>Redis data를 복제하기 위한 옵션으로 사용하는거라고 알려준다.
내가 이전에 Persistence 방식을 학습하면서 AOF와 RDB 방식이 있다는 것을 알게되었다. 
<em>자세한 내용은 따로 작성했으니 참고</em>
<a href="https://jinsungone.notion.site/Redis-5f1df17a8a01486799385e499908be83">Redis 운영에 대해 공부하며 정리한 내용</a></p>
<p>chatGPT도 AOF와 RDB를 알고있는지 확인해봤다.</p>
<blockquote>
<p>In replication system, which is better between AOP and RDB? could you explain again in KOREAN?</p>
</blockquote>
<p>내 프로젝트의 정확한 사용사례를 이야기 해주지 않아서 각각의 장단점 비교와 함께 어떤 상황에서 사용하면 좋을지를 이야기해줬다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/06a402de-e58d-43e7-9ff8-0212c831bf02/image.png" /></p>
<p><del>차이점 이야기 잘 하는걸 보니 면접 질문 검색용도로도 좋을 것 같다.</del></p>
<p>나는 RDB 방식을 원했기 때문에 RDB 방식으로 설정해서 다시 docker-compose.yml을 작성해달라고 했다.</p>
<blockquote>
<p>Could you write again docker-compose.yml about redis replication using RDB backup.</p>
</blockquote>
<pre><code class="language-yaml">version: '3'

services:
  redis-master:
    image: redis
    command: redis-server --requirepass **** --appendonly yes --appendfsync everysec --aof-rewrite-incremental-fsync yes --aof-use-rdb-preamble yes
    volumes:
      - ./redis-master:/data
    ports:
      - "6379:6379"
    networks:
      - redis-network
  redis-slave:
    image: redis
    command: redis-server --requirepass **** --slaveof redis-master 6379 --slave-read-only yes --appendonly yes --appendfsync everysec --aof-rewrite-incremental-fsync yes --aof-use-rdb-preamble yes
    volumes:
      - ./redis-slave:/data
    ports:
      - "6380:6379"
    networks:
      - redis-network

networks:
  redis-network:
</code></pre>
<pre><code class="language-text">In this example, we have two Redis instances: a master and a slave. 
The redis-master service runs the Redis server as the master node, while the redis-slave service runs the Redis server as the slave node.

Both Redis instances are configured to use the RDB backup option (--aof-use-rdb-preamble yes) in addition to the AOF log. 
This means that Redis will write an RDB snapshot to disk periodically (as specified by the save configuration option in the Redis configuration file). 
If Redis needs to recover from a failure or restart, it can use the RDB snapshot to quickly restore the state of the database before replaying the AOF log.

Note that we've also specified the password for Redis (using the --requirepass option) and set the network to use (redis-network) for both services.

By using both the RDB backup and AOF log, we can ensure that our Redis replication system is more resilient to failures and data loss.</code></pre>
<p>command에 옵션이 너무 많아져서 설명을 읽어봤더니 AOF log과 RDB backup을 같이 썼단다.</p>
<p>나는 이번에 RDB backup만 할거니까 AOF 지워줘...</p>
<blockquote>
<p>please delete AOF log and write about volumn option that external directory is "/home/ubuntu/redis_data"</p>
</blockquote>
<h3 id="실행해보기">실행해보기</h3>
<p>이후에 password를 environment로 빼서 설정을 하는 등, 다른 부가적인 설정들을 개별로 요청해보고 docker-compose의 container가 구동되도록 했다.
하지만, 실행이 제대로 되지 않아서 log에 뜨는 내용을 어떻게 해야할지 물어봤다.</p>
<blockquote>
<p>when I try docker-compose, "master does not understand replconf listening-port" message came out</p>
</blockquote>
<p>결론은 alpine image라서 따로 config를 수정해줘야했다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/a483e8c7-73f8-4cd0-9801-75e91f798190/image.png" /></p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/2c66cc38-b7c8-4bc9-b31e-f2cd94823f30/image.png" /></p>
<h2 id="느낀-점">느낀 점</h2>
<p>중간에 사소한 우여 곡절은 따로 쓰지 않았지만 설정을 하는 부분에 있어서는 사람마다 원하는 사항이 다르기 때문에 처음 쓰는 입장에서 어디에서 부터 검색을 시작해야할지 참고하는 용도로 쓰기 좋은 것 같다.
왜냐면 다른 방식으로 ChatGPT를 쓰면서 100% 신뢰할 수 없다는 것을 알게되었고, 
떠먹여 주는 것을 그대로 복사 붙여넣기를 하기 보다는 시야를 한번 넓힌 다음, 더 궁금하거나 모호한 것들을 검색해가는 식으로 활용하면 좋을 것 같다.</p>