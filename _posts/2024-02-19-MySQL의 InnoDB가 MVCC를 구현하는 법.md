---
date: 2024-02-19
title: "MySQL의 InnoDB가 MVCC를 구현하는 법"
category :
  - Java & Spring
permalink: /java-spring/MySQL의 InnoDB가 MVCC를 구현하는 법/

toc: true
toc_sticky: true
---<h3 id="들어가기-전에">들어가기 전에</h3>
<p>DBMS의 격리성 수준은 알고있었으나 내부적으로 어떻게 동작하는지는 알지 못했다.
데드락 문제를 마주하면서 기본은 알고있어야 나중에 트러블 슈팅하기 수월할 것 같아서 MySQL 책을 구매했다.</p>
<p>우선 MySQL이 어떤 구조로 되어있는지 간략하게 알아보고, 어디서 트랜잭션과 격리 수준을 보장하는 메커니즘이 돌아가는지 설명한다.
트랜잭션 격리 수준은 기본적으로 안다는 전제로 설명한다.
다음 내용은 Real MySQL 8.0을 학습하며 정리한 글이다.</p>
<h2 id="mysql-아키텍처">MySQL 아키텍처</h2>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/bb6509f6-635a-413b-aa4f-2cdc7403a3db/image.png" /></p>
<ul>
<li>MySQL 서버는 MySQL 엔진과 스토리지 엔진으로 구분할 수 있다.</li>
<li>MySQL 엔진<ul>
<li>요청된 SQL 문장을 분석하거나 최적화하는 등 DBMS의 두뇌에 해당하는 처리를 수행</li>
<li>클라이언트로부터의 접속 및 쿼리 요청을 처리하는 커넥션 핸들러와 SQL 파서 및 전처리기, 쿼리의 최적화된 실행을 위한 옵티마이저가 주를 이룬다. (각각은 나중에 다시 정리 하려고한다.)</li>
</ul>
</li>
<li>스토리지 엔진<ul>
<li>실제 데이터를 디스크 스토리지에 저장하거나 데이터를 읽어오는 부분을 전담</li>
</ul>
</li>
<li>핸들러 API<ul>
<li>MySQL 엔진이 쿼리 실행기에서 데이터를 쓰거나 읽어야할 때 스토리지 엔진에 요청을 핸들러 API를 이용해 주고받는다.</li>
</ul>
</li>
</ul>
<h3 id="innodb-스토리지-엔진-아키텍처">InnoDB 스토리지 엔진 아키텍처</h3>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/bbc6075a-762b-4df6-a0bf-8e8a7fdce617/image.png" /></p>
<ul>
<li>InnoDB는 MySQL에서 사용할 수 있는 스토리지 엔진 중 거의 유일하게 레코드 기반의 잠금을 제공하며, 그 때문에 높은 동시성 처리가 가능하고 안정적이며 성능이 뛰어나다.</li>
<li>InnoDB의 모든 테이블은 기본적으로 PK를 기준으로 클러스터링되어 저장된다.</li>
</ul>
<h4 id="언두로그">언두로그</h4>
<ul>
<li>언두 로그를 통해 잠금없이 일관된 읽기 제공<ul>
<li>잠금 없는 일관된 읽기 : 특정 사용자가 레코드를 변경하고 아직 커밋을 수행하지 않았더라도 변경이 다른 사용자의 SELECT 작업을 방해하지 않는다.</li>
</ul>
</li>
<li>오랜시간 활성 상태인 트랜잭션으로 인해 MySQL 서버가 느려지거나 문제가 발생할 때, 일관된 읽기를 위해 언두 로그를 삭제하지못하고 계속 유지해야해서 생기는 문제다. -&gt; 빠른 롤백이나 커밋으로 트랜젝션을 빨리 완료하자.</li>
</ul>
<h4 id="버퍼풀">버퍼풀</h4>
<ul>
<li>캐시 : 디스크의 데이터 파일이나 인덱스 정보를 메모리에 캐시해 두는 공간</li>
<li>버퍼 : 쓰기 작업을 지연시켜 일괄 작업으로 처리할 수 있게함</li>
<li>버퍼 풀의 변경 내용은 InnoDB의 백그라운드 스레드에 의해서 기록되기 때문에 실제 디스크 데이터 파일에 기록됐는지 여부는 시점에 따라 다를 수 있다.</li>
</ul>
<h4 id="자동-데드락-감지">자동 데드락 감지</h4>
<ul>
<li>InnoDB 스토리지 엔진은 내부적으로 잠금이 교착 상태에 빠지지 않았는지를 체크하기 위해 잠금 대기 목록을 그래프(Wait for List) 형태로 관리한다.</li>
<li>InnoDB 스토리지 엔진은 데드락 감지 스레드를 가지고 있어서 데드락 감지 스레드가 주기적으로 잠금 대기 그래프를 검사해 교착 상태에 빠진 트랜잭션들을 찾아서 그중 하나를 강제 종료한다.</li>
<li>언두 로그 레코드를 적게 가진 (롤백 해도 undo 처리할 내용이 적은) 트랜잭션이 일반적으로 롤백의 대상이 된다.</li>
<li>일반적으로 데드락을 찾아내는 작업은 크게 부담이 되지 않지만 동시 처리 스레드가 매우 많아지거나 트랜잭션이 가진 잠금의 수가 많아지면 데드락 감지 스레드가 느려진다.</li>
</ul>
<h2 id="잠금">잠금</h2>
<p>락이 MVCC와도 연결되기 때문에 짧게 정리하고 넘어간다.
MySQL에서 사용되는 잠금은 MySQL 엔진 레벨과 스토리지 엔진 레벨로 나눌 수 있다.</p>
<h3 id="mysql-엔진의-잠금">MySQL 엔진의 잠금</h3>
<ul>
<li>글로벌 락 : MySQL 서버 전체에 락이 걸리며, 다른 세션은 락이 해제될 때 까지 대기 상태로 남는다.</li>
<li>테이블 락 : 개별 테이블 단위로 설정되는 잠금이며, 명시적 또는 묵시적으로 특정 테이블의 락을 획득할 수 있다.</li>
<li>네임드 락 : GET_LOCK() 함수를 통해 사용자가 지정한 문자열에 대해 잠금을 획득하고 반납한다.<ul>
<li>자주 사용되지는 않지만, 복잡한 요건으로 레코드를 변경하는 트랜잭션에 유용하다. </li>
<li>배치 프로그램처럼 한버넹 많은 레코드를 변경하는 쿼리는 자주 데드락의 원인이 되는데, 동일 데이터를 변경하거나 참조하는 프로그램끼리 분류해서 네임드 락을 걸고 쿼리를 실행하면 간단히 해결할 수 있다.</li>
</ul>
</li>
<li>메타 데이터 락 : 테이블, 뷰의 이름이나 구조를 변경할 경우에 획득하는 잠금</li>
</ul>
<h3 id="innodb-스토리지-엔진의-잠금">InnoDB 스토리지 엔진의 잠금</h3>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/58e6c6e0-b23f-4371-a08f-29fd923dd448/image.png" /></p>
<h4 id="record-lock">Record lock</h4>
<ul>
<li>레코드 자체만을 잠그는 것</li>
<li>인덱스의 레코드를 잠근다<ul>
<li>인덱스를 사용할 수 있는 칼럼에 대해서 해당 조건을 만족하는 레코드에 잠긴다.</li>
<li>ex. index(first_name)이 있을 때, <code>update employees set hire_date = now() where first_name = "chloe" and last_name = "kwon"</code> 에서 first_name = "chloe"에 해당하는 레코드들은 전부 락이 걸린다.</li>
<li>인덱스가 하나도 없다면 풀스캔하면서 모든 레코드를 잠근다.</li>
</ul>
</li>
<li>PK, unique index에 의한 변경 작업에서는 Gap에 대해서 잠그지 않고 레코드 자체에 대해서만 락을 건다.</li>
</ul>
<h4 id="gap-lock">Gap lock</h4>
<ul>
<li>레코드와 바로 인접한 레코드 사이의 <strong>간격</strong>만을 잠그는 것을 의미한다.</li>
<li>레코드와 레코드 사이의 간격에 새로운 레코드가 생성되는 것을 제어한다.<ul>
<li>검색대상을 제외하고 그 사이에 있는 것을 잠그는 것</li>
</ul>
</li>
<li>Next key lock의 일부로 사용된다.</li>
</ul>
<h4 id="next-key-lock">Next key lock</h4>
<ul>
<li>Record lock과 Gap lock을 합쳐놓은 형태의 잠금</li>
<li>바이너리 로그에 기록되는 쿼리가 Replica 서버에서 실행될 때 소스 서버에서 만들어 낸 결과와 동일한 결과를 만들어내도록 보장하는 것이 주목적<h4 id="auto-increment-lock">Auto increment lock</h4>
</li>
<li>자동 증가하는 숫자 값을 추출하기 위해 사용하는 락</li>
<li>트랜잭션과 관계없이 INSERT, REPLACE 에서 AUTO_INCREMENT 값을 가져오는 순간 락이 걸렸다가 즉시 해제된다.</li>
<li>락을 명시적으로 획득할 수 없고 아주 짧은 시간 걸렸다가 해제된다.</li>
</ul>
<h2 id="undo-log를-활용한-mvcc-구현">Undo log를 활용한 MVCC 구현</h2>
<ul>
<li>MVCC : Multi Version Concurrency Control</li>
<li>레코드 레벨의 트랜잭션을 지원하는 DBMS가 제공하는 기능.</li>
<li><strong>잠금을 사용하지 않는</strong> 일관된 읽기를 제공</li>
<li>InnoDB는 Undo log를 이용해 이 기능을 구현한다.</li>
</ul>
<h3 id="언두로그-1">언두로그</h3>
<ul>
<li>InnoDB는 트랜잭션과 격리 수준을 보장하기 위해 DML로 변경되기 이전 버전의 데이터를 별도로 백업한다.</li>
<li>트랜잭션 롤백 대비 : 트랜잭션이 롤백되면 트랜잭션 도중 변경된 데이터를 변경 전 데이터로 복구할 때 언두 로그에 백업해준 이전 버전 데이터를 이용해 복구한다.</li>
<li>격리 수준 유지 : 트랜잭션 격리 수준에 맞게 변경중인 레코드를 읽지 않고 언두 로그에 백업해둔 데이터를 읽어서 반환</li>
<li>트랜젝션 시작 후, UPDATE를 하면 다음과 같이 Table에는 변경된 값과 변경시킨 Transaction id가 남고, 원래 데이터는 언두 로그에 기록된다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/3ee9211f-93e3-4165-8e38-ad408b897e19/image.png" /></li>
<li><strong>언두로그에는 잠금을 걸 수 없다.</strong></li>
</ul>
<h3 id="잠금-없는-일관된-읽기">잠금 없는 일관된 읽기</h3>
<ul>
<li>앞서 InnoDB는 MVCC 기술을 이용해 잠금을 걸지않고 읽기를 수행한다고 했다.</li>
<li>그림에서 수빈의 주소를 UPDATE 하기 전후에 격리 수준에 따라 어떻게 처리되는지를 살펴보면 다음과 같다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/96f77a8e-742c-4f4c-9db1-8a4b0620cbac/image.png" /></li>
</ul>
<h4 id="read-uncommitted">READ UNCOMMITTED</h4>
<ul>
<li>트랜젝션 중간에 데이터가 변경되어도 Table만 확인한다.<h4 id="read_committed-repeatable_read">READ_COMMITTED, REPEATABLE_READ</h4>
</li>
<li>transaction id가 자신보다 작은 번호의 내용만 확인한다.</li>
<li>tx_id 502는 tx_id 510이 수정한 데이터 대신 undo log의 자신의 id보다 작은 400의 데이터를 읽게된다.</li>
<li>자신의 transaction id보다 작은 것만 읽기 때문에 일반적인 REPEATABLE_READ가 가지고 있는 Phantom read가 발생하지 않는다.</li>
</ul>
<h4 id="serializable">SERIALIZABLE</h4>
<ul>
<li>읽기 작업도 공유 잠금을 획득해야만 하며, 동시에 다른 트랜잭션에서는 절대 접근할 수 없다</li>
<li><strong>하지만 InnoDB에서는 갭락과 넥스트락 덕에 REPEATABLE_READ에서도 Phantom read가 발생하지 않는다.</strong></li>
</ul>
<h3 id="repeatable_read와-phantom-read">REPEATABLE_READ와 Phantom read</h3>
<p>일반적인 격리 수준과 다르게 InnoDB가 REPEATABLE_READ가 가지고 있는 Phantom read가 거의 발생하지 않는 이유와 발견하는 경우를 알아보자.</p>
<ul>
<li>아래 그림.. 으로 그렸는데 경우를</li>
<li>B의 경우 계속 lock 없이 MVCC로 인해 Phantom Read가 방어된다.</li>
<li>SELECT FOR UPDATE의 경우 X lock을 걸기 때문에 잠금이 있는 상태다.<ul>
<li>잠금있는 읽기는 데이터 조회가 언두 로그가 아닌 테이블에서 수행된다. (C, D의 경우)</li>
<li>언두 로그가 append only 형태이므로 잠금 장치가 없다.</li>
</ul>
</li>
<li>D의 경우 x lock이 발생 해서 언두로그는 보지 못하지만 Gap lock으로 인해 A가 commit을 하지 못하고 대기하면서 D의 입장에서는 Phantom read가 발생하지 않는다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/2138a04a-47f7-41e5-a78b-238b7a788e3b/image.jpeg" /></li>
</ul>
<table>
<thead>
<tr>
<th>첫 번째 SELECT</th>
<th>두 번째 SELECT</th>
<th>결과</th>
</tr>
</thead>
<tbody><tr>
<td>SELECT</td>
<td>SELECT</td>
<td>MVCC로 인해 Phantom Read 없음</td>
</tr>
<tr>
<td>SELECT</td>
<td>SELECT FOR UPDATE</td>
<td>Phantom Read O, 해당 경우는 거의 없음</td>
</tr>
<tr>
<td>SELECT FOR UPDATE</td>
<td>SELECT FOR UPDATE</td>
<td>Gap Lock으로 인해 Phantom Read 없음</td>
</tr>
</tbody></table>
<hr />
<p>참고
Real MySQL 8.0 1권
<a href="https://mangkyu.tistory.com/299">https://mangkyu.tistory.com/299</a></p>