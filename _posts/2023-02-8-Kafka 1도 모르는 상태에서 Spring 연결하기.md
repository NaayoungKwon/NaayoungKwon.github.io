---
date: 2023-02-8
title: "Kafka 1도 모르는 상태에서 Spring 연결하기"
category :
  - Wealth Marble
permalink: /wealth-marble/Kafka 1도 모르는 상태에서 Spring 연결하기/

toc: true
toc_sticky: true
---
<h2 id="들어가기">들어가기</h2>
<p>정보의 바다 속에서 내가 원하는 정보만 찾기가 어렵다.
어쩔 땐 제대로 된 강의나 책을 읽는 것이 더 나을 때가 있다..!</p>
<p>이 글은 java spring 프로젝트에서 kafka를 사용해 분산 처리 기능을 구현하기 위해 찾아본 사혼의 조각을 정리한 것이다.</p>
<blockquote>
<p>kafka가 무엇인지와 나오는 용어들의 존재만 간단하게 보고, 일단 구현한 다음에 다시 하나 씩 알아간다.</p>
</blockquote>
<p>전체 코드는 진행 중인 spring 프로젝트 <a href="https://github.com/Eagle2gle/wealth-marble-backend">github</a>에 있다.</p>
<h1 id="요구사항을-위한-기본-개념">요구사항을 위한 기본 개념</h1>
<h2 id="kafka">Kafka</h2>
<p>데이터 피드의 분산 스트리밍, 파이프 라이닝 및 재생을 위한 실시간 스트리밍 데이터를 처리하기 위한 목적으로 설계된 오픈 소스 분산형 게시-구독 메시징 플랫폼이다.</p>
<p>Producer가 Data를 생산하는 주체로, STOMP의 requester에게 받은 data를 처리해서 Cosumenr쪽으로 던진다.
Consumer가 Data를 꺼내쓰는 주체로, STOMP의 구독자에게 전달하는 주체 개념을 알고 넘어간다.</p>
<p>저장되는 데이터 : Topic > Partition > Record로 구성되어 있다.
Topic이 하나의 DB Table이고 Record가 실제 한 column 이라고 생각한 뒤, 코드 돌려보며 흐름을 파악하고 다시 개념을 잡으면 이해가 더 와닿았던 것 같다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/3d2f81a7-ec4b-4325-891e-3fca4229a41a/image.png" /></p>
<h1 id="코드에-적용하기">코드에 적용하기</h1>
<h2 id="step-1-kafka-설치하기">Step 1. Kafka 설치하기</h2>
<h3 id="docker-compose">docker-compose</h3>
<p>로컬 환경에서 실험을 위해 주키퍼 1개, 카프카 브로커 1개를 docker-compose를 사용해 설치한다.</p>
<pre><code class="language-yml"># docker-compose.yml
version: '2'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_SERVER_ID: 1
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
      ZOOKEEPER_INIT_LIMIT: 5
      ZOOKEEPER_SYNC_LIMIT: 2
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "29092:29092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
</code></pre>
<p>위의 docker-compose를 사용해 container를 구동시킨다.</p>
<pre><code class="language-shell">$ docker-compose -f docker-compose.yml up -d</code></pre>
<p>kafka의 topic을 생성해 줘야한다. (내 topic : kafka-market)
docker 내부에서 커맨드를 실행할거면 kafka-topics 부터 입력하면된다.</p>
<pre><code class="language-shell"># topic 생성
$ docker-compose exec kafka kafka-topics --create --topic kafka-market --bootstrap-server kafka:9092 --replication-factor 1 --partitions 1

# topic 생성 확인
$ docker-compose exec kafka kafka-topics --describe --topic kafka-market --bootstrap-server kafka:9092</code></pre>
<p>이렇게 하면 나는 kafka broker 한대를 만들었고, <code>kafka-market</code> 이라는 topic을 생성했다.</p>
<h3 id="spring-server와-연결하기">Spring server와 연결하기</h3>
<p>kafka를 application에서 처리하는데에 Producer/Consumer가 있다.
5개의 파일이 필요하다.</p>
<ul>
<li>topic 명과 kafka broker를 명시하는 상수 파일</li>
<li>Producer를 정의하는 설정파일</li>
<li>kafka partition을 생성하는 (consumer가 사용할 데이터) 파일 : 방금 만든 OrderController</li>
<li>Consumer를 정의하는 설정파일</li>
<li>consumer가 partition을 받아 처리할 로직 파일</li>
</ul>
<h3 id="상수-파일">상수 파일</h3>
<pre><code class="language-java">public final class KafkaConstants {
    public static final String KAFKA_TOPIC = "kafka-market";
    public static final String GROUP_ID = "group1";
    public static final String BROKER = "localhost:29092";
}
</code></pre>
<p>여기서 브로커는 제일 위에서 docker-compose로 broker 설정 시 
KAFKA_ADVERTISED_LISTENERS 에서 app이 통신할 kafka broker를 알려줬다.</p>
<h2 id="step-2-producer-생성">Step 2. Producer 생성</h2>
<p>나는 stomp 프로토콜로 받은 정보를 가지고 kafka record를 생성해 전달하는 것을 만들었다.
비지니스 로직은 실제로 작성한 것과 조금 다르지만 producer부분만 유의해서 보자.</p>
<ul>
<li>producer (controller) : client -> server 로 요청이 올 때 path에 따라 처리할 로직</li>
</ul>
<p>build.gradle 추가할 의존성</p>
<pre><code class="language-gradle">implementation 'org.springframework.kafka:spring-kafka'</code></pre>
<h3 id="producer-config">Producer Config</h3>
<pre><code class="language-java">
@Configuration
@EnableKafka
public class KafkaProducerConfig {

    @Bean
    public ProducerFactory<String, MessageDto> producerFactory() {
        return new DefaultKafkaProducerFactory<>(kafkaProducerConfiguration());
    }

    @Bean
    public Map<String, Object> kafkaProducerConfiguration() {
        return ImmutableMap.<String, Object>builder()
                .put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, KafkaConstants.BROKER)
                .put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class)
                .put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class)
                .build();
    }

    @Bean
    public KafkaTemplate<String, MessageDto> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}</code></pre>
<ul>
<li><p>immutableMap은 추가적인 의존성 주입이 필요
<code>implementation "com.google.guava:guava:31.1-jre"</code></p>
</li>
<li><p>BOOTSTRAP_SERVERS_CONFIG : 브로커를 알려줌</p>
</li>
<li><p>KEY_SERIALIZER_CLASS_CONFIG : key 설정</p>
</li>
<li><p>VALUE_SERIALIZER_CLASS_CONFIG : value 설정</p>
</li>
</ul>
<h3 id="producer의-topic-생성-파일">producer의 topic 생성 파일</h3>
<p><code>/order/purchase</code> 로 client가 요청이 오면 지정한 topic에 대한 record를 생성하여 전달한다.</p>
<pre><code class="language-java">@RestController
@RequiredArgsConstructor
@Slf4j
public class OrderController {
    private final KafkaTemplate<String, MessageDto> kafkaTemplate;

    @MessageMapping("/purchase") //   url : "order/purchase" 로 들어오는 정보 처리
    public void purchase(MessageDto message){
        log.debug("I am producer..");
        kafkaTemplate.send(KafkaConstants.KAFKA_TOPIC, message);
    }

}
</code></pre>
<h2 id="step-3-consumer-생성">Step 3. Consumer 생성</h2>
<h3 id="consumer-config">Consumer Config</h3>
<pre><code class="language-java">
@Configuration
@EnableKafka
public class KafkaConsumerConfig {

    @Bean
    ConcurrentKafkaListenerContainerFactory<String, MessageDto> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, MessageDto> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        return factory;
    }

    @Bean
    public ConsumerFactory<String, MessageDto> consumerFactory() {
        return new DefaultKafkaConsumerFactory<>(consumerConfigurations(), new StringDeserializer(), new JsonDeserializer<>(MessageDto.class));
    }

    @Bean
    public Map<String, Object> consumerConfigurations() 

        return ImmutableMap.<String, Object>builder()
                .put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KafkaConstants.BROKER)
                .put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringSerializer.class)
                .put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, deserializer)
                .put(ConsumerConfig.GROUP_ID_CONFIG, KafkaConstants.GROUP_ID)
                .put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG,"latest")
                .build();
    }
}
</code></pre>
<ul>
<li>BOOTSTRAP_SERVERS_CONFIG : 브로커를 알려줌</li>
<li>KEY_DESERIALIZER_CLASS_CONFIG : key 설정</li>
<li>VALUE_DESERIALIZER_CLASS_CONFIG : value 설정</li>
<li>GROUP_ID_CONFIG : consumer group 설정</li>
<li>AUTO_OFFSET_RESET_CONFIG : consumer가 연결되고 나서 broker가 가진 partion에서 어떤 offset 부터 확인할지 (latest : 연결 이후 들어온 값만 소비. earliest : 무조건 partition의 제일 앞부터 확인해서 소비) -> 옵션은 카프카를 사용하는 목적에 따라 설정을 맞게 하면된다.</li>
</ul>
<h3 id="consumer의-topic-처리-파일">Consumer의 topic 처리 파일</h3>
<pre><code class="language-java">@Component
@RequiredArgsConstructor
public class OrderConsumer {

    private final SimpMessagingTemplate template;

    @KafkaListener( topics = KafkaConstants.KAFKA_TOPIC, groupId = KafkaConstants.GROUP_ID )
    public void listen(MessageDto message){ // kafka listener에서 듣고있음
        System.out.println("kafka consumer.. ");
        System.out.println(message);
        template.convertAndSend("/topic/market/" + message.getMarketId(), message); // topic/market/{마켓아이디}를 듣고있는 client에 전송
    }
}
</code></pre>
<p>내가 설정한 topic의 데이터가 producer에서 생산되면 해당 consumer가 확인하고, <code>/topic/market/{marketId}</code> (예시 /topic/market/1) 을 listen (구독) 하고 있는 클라이언트들에게 전부 전달한다.</p>
<h1 id="kafka-다시-들여다보기">Kafka 다시 들여다보기</h1>
<h2 id="구조">구조</h2>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/40120add-2d09-43a1-825b-cf41aab730b5/image.png" /></p>
<h3 id="topic">Topic</h3>
<p>데이터베이스 테이블과 유사
브로커가 지우기 전까지는 삭제되지않음
파티션 최소 한개를 가지고있음
토픽의 저장된 데이터는 개별 삭제 불가능</p>
<h3 id="partition">Partition</h3>
<p>파티션 개수가 많을 수록 병렬 처리량을 늘릴 수 있다(consumer group)
파티션을 복제해서 여러 서버에 분산하여 저장
데이터를 안정적으로 분산 저장하기 위해 여러 대의 바로커(개별 서버)를 운영하고 Leader, Follower partition으로 구분되어 브로커에 저장됨
Leader partition : procuder와 직접 통신하는 브로커에 존재
Follower partition : leader partition의 내용을 지속적으로 복제해감 브로터가 한대면 follower 없음
partition 별로 라운드로빈 방식으로 leader의 위치가 다르도록 구성
   파티션 0은 브로커0이 리더로, 파티션1은 브로커 1이 리더로
리더 파티션이 고르게 분배되도록하는 command 따로 있음</p>
<h3 id="record">Record</h3>
<p>실제 저장되는데이터
구성요소</p>
<ul>
<li>timestamp : broker에 들어가는 시간</li>
<li>key : 데이터를 구분하여 파티션을 정하거나 순서를 정할때 사용</li>
<li>value : 실제로 사용할 data</li>
<li>offset : partition에 저장될 때 레코드 별 지정되는 번호로 하나의 partition에서 중복될 수 없음</li>
</ul>
<blockquote>
</blockquote>
<p>데이터의삭제
consumer가 처리를 해도 삭제되는 것이 아니라 broker가 지우기전까지 삭제되지 않는다.
시간에 따라 축척된 data에 따라 삭제처리 설정가능</p>
<h2 id="구성요소">구성요소</h2>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/38fb7b66-cdc7-4ab8-b396-922e2e3c3d01/image.png" /></p>
<h3 id="zookeeper">ZooKeeper</h3>
<p>카프카에서 사용되는 메타데이터 저장
한개의 주키퍼에 여러 클러스터를 붙여 운영</p>
<blockquote>
<p>metadata
producer, consumer가 topic을 cluster와 통신하는데 쓰임
topic의 partition 위치, consumer group 이름, controller 정보, broker id, topic 정보</p>
</blockquote>
<h3 id="broker">Broker</h3>
<p>Producer가 보낸 데이터가 broker가 있는 서버의 파일시스템에 저장
파일로 저장하여 broker가 중단되도라도 다시 실행시켜 데이터 사용가능
데이터를 안정적으로 준산저장하기위해 여러대의 broker를 여러 서버에 운영
controller 역할 : consumer group 상태 체크 파티션 변경 상태 체크
여러대의 broker중 한대는 컨트롤러 역할을 하며 리더 파티션을 선출</p>
<h3 id="cluster">Cluster</h3>
<p>여러대의 broker를 묶어서 클러스터를 이룬다
producer와 consumer는 리더 파티션과 직접 통신하기때문에 각 broker에 부하가 분산된다</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/4fa34ed6-4058-454f-9303-30212df7df6c/image.png" /></p>
<h3 id="producer">Producer</h3>
<p>리더 파티션이 있는 위치를 미리 파악하여 해당 브로커와 통신을 한다
key값이 없이 record를 저장하면 파티션을 Round Robin으로 돌아가면서 데이터가 저장된다.
key가 있는 경우 Hash형태로 변경해 특정 파티션에 저장 (동일 키는 할상 동일 파티션에 저장되는 것을 보장)
Data를 바로 보내지않고 batch로 묶어서 accumulator에 모았다가 보낸다 (uniform sticky partitioner)
key를 넣어야하는 경우</p>
<ul>
<li>처리해야하는 data가 consuemr에 분산되면 안되는 경우 (stateful 처리)</li>
<li>처리해야하는 data가 순서를 만족해야한 걍우 (은행 data , 결제 data)</li>
</ul>
<p>key를 넣으면 안되는 경우</p>
<ul>
<li>충분히 분산될만한 메시지 키가 아닌 경우 </li>
<li>partition의 개수가 빈번히 변할 경우</li>
</ul>
<h3 id="consumer">Consumer</h3>
<p>Consumer group : Consumer 역할에 따라 묵은것. 최소 하나의 Consumer가 있어야함. 특정 토픽에 대해 병렬처리할 수 있다
Consumer group 하나가 장애가 나도 다른 Consumer group은 영향이 가지 않는다
offset commit : 데이터를 어디까지 처리햇는지를 저장함</p>
<ul>
<li><code>auto.offset.reset=earliest</code> 각 파티션의 가장 낮은 offset부터 가져감. 토픽에 있는 모든 래코드를 가져가야할때</li>
<li><code>auto.offset.reset=latest</code> 가장 최신 offset의 레코드부터 가져감. consumer가 할당되는 즉시 가장 최신부터 가져감</li>
</ul>
<hr />
<p>참고
<a href="https://dev.to/subhransu/realtime-chat-app-using-kafka-springboot-reactjs-and-websockets-lc">https://dev.to/subhransu/realtime-chat-app-using-kafka-springboot-reactjs-and-websockets-lc</a>
<a href="https://devocean.sk.com/blog/techBoardDetail.do?ID=164007">https://devocean.sk.com/blog/techBoardDetail.do?ID=164007</a>
<a href="https://velog.io/@sossont/Spring-WebSocket-with-Kafka">https://velog.io/@sossont/Spring-WebSocket-with-Kafka</a>
<a href="https://github.com/AndersonChoi/mysuni-apache-kafka">https://github.com/AndersonChoi/mysuni-apache-kafka</a></p>
