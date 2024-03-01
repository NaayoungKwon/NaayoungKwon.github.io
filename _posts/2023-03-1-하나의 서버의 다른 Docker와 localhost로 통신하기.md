---
date: 2023-03-1
title: "하나의 서버의 다른 Docker와 localhost로 통신하기"
category :
  - ETC
permalink: /etc/하나의 서버의 다른 Docker와 localhost로 통신하기/

toc: true
toc_sticky: true
---
<h3 id="문제점">문제점</h3>
<p>EC2에서 kafka와 spring socket server간의 통신을 설정하면서
로컬에서 localhost:29092로 broker 주소를 설정해 잘 동작했으나, server를 docker로 이미지화 하여 배포 시, localhost가 docker 내부에만 갇혀 통신을 하지 못하는 상황이 발생했다.</p>
<h3 id="시도했으나-안된-것">시도했으나 안된 것</h3>
<p>docker network bridge 설정했는데, warning으로 계속 아래 로그가 반복적으로 발생했다.</p>
<pre><code class="language-log">Bootstrap broker localhost:29092 (ID: -1 RACK: NULL) DISCONNECTED-DOCKER</code></pre>
<h3 id="해결책">해결책</h3>
<p>host.docker.internal:host-gateway를 사용했다.</p>
<ul>
<li><p>docker-compose.yml : kafka, zookeeper에서 localhost로 설정된 부분을 전부 <code>host.docker.internal</code>로 변경한다.</p>
<pre><code class="language-yaml">service:
  kafka:
      ~~~
      environment:
            KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://host.docker.internal:29092
      extra_hosts:
            - "host.docker.internal:host-gateway"</code></pre>
</li>
<li><p>docker : 컨테이너 구동 시 <code>--add-host host.docker.internal:host-gateway</code>를 추가한다.</p>
<pre><code class="language-shell">$ docker run -d -p 7070:8080 --name {컨테이너이름} --add-host host.docker.internal:host-gateway {이미지이름}</code></pre>
</li>
</ul>
<p>-network=host를 하는 방법도 가능할 것 같은데, 그러면 API server도 docker 내부에서 8080으로 구동되어 port가 중복이 일어나 이 상황은 사용하지 않았다.</p>
<hr />
<p>참고
<a href="https://www.devkuma.com/docs/docker/host-localhost-connection/">https://www.devkuma.com/docs/docker/host-localhost-connection/</a>
<a href="https://sonnson.tistory.com/20">https://sonnson.tistory.com/20</a>
<a href="https://velog.io/@kshired/Docker-%EC%BB%A8%ED%85%8C%EC%9D%B4%EB%84%88%EC%97%90%EC%84%9C-localhost%EC%99%80-%ED%86%B5%EC%8B%A0%ED%95%98%EA%B8%B0">https://velog.io/@kshired/Docker-%EC%BB%A8%ED%85%8C%EC%9D%B4%EB%84%88%EC%97%90%EC%84%9C-localhost%EC%99%80-%ED%86%B5%EC%8B%A0%ED%95%98%EA%B8%B0</a>
<a href="https://taaewoo.tistory.com/59">https://taaewoo.tistory.com/59</a>
<a href="https://this-programmer.tistory.com/494">https://this-programmer.tistory.com/494</a>
<a href="https://zgundam.tistory.com/182">https://zgundam.tistory.com/182</a>
<a href="https://www.daleseo.com/docker-networks/">https://www.daleseo.com/docker-networks/</a>
<a href="https://www.confluent.io/blog/kafka-client-cannot-connect-to-broker-on-aws-on-docker-etc/">https://www.confluent.io/blog/kafka-client-cannot-connect-to-broker-on-aws-on-docker-etc/</a>
<a href="https://www.howtogeek.com/devops/how-to-connect-to-localhost-within-a-docker-container/">https://www.howtogeek.com/devops/how-to-connect-to-localhost-within-a-docker-container/</a>
<a href="https://okky.kr/articles/762929?note=2062525">https://okky.kr/articles/762929?note=2062525</a></p>