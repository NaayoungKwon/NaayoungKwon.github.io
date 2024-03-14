---
date: 2023-11-22
title: "Java Stream 알고 쓰기"
category :
  - Java & Spring
permalink: /java-spring/Java Stream 알고 쓰기/

toc: true
toc_sticky: true
---

<blockquote>
<p>Java8 부터 지원한 stream을 사용하면서 filter, map, flatMap, collect가 어떤 기능을 위해 쓰는지는 필요에 의해 검색해가며 알긴 했지만, stream에 대해 궁금증이 생겼을 때 일단 동작하니 넘겼던 지난날의 근본없음을 반성하는 마음으로 공부해보게 되었다.</p>
</blockquote>
<p>Modern JAVA In Action의 Chapter 4 ~ 6을 보며 새롭게 알게된 내용을 정리했다.</p>
<h3 id="stream-source의-순서와-최종-결과의-순서는-보장될까">Stream Source의 순서와 최종 결과의 순서는 보장될까?</h3>
<p>별도 sorted를 사용하지 않고, source가 순서가 있는 collection이라면 stream도 순서대로 소비된다.
즉, 순서가 유지된다.</p>
<blockquote>
<p>source : 처음에 제공된 collection, array, I/O resource</p>
</blockquote>
<h3 id="stream의-내부-동작은-언제-일어날까">Stream의 내부 동작은 언제 일어날까??</h3>
<p>collect가 호출되기 전까지 앞의 method들이 호출되고 chain이 queue에 쌓여있을거라 생각하지만,
collect(Terminal operation)가 호출되기 전까지는 결과 뿐만아니라 source의 요소도 선택되지 않는다.
중간 연산자(Intermediate operation)가 아예 수행되지 않고 기다린다.
-> <code>lazy evaluation</code></p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/877fba11-167e-4272-85e5-13b567efe402/image.png" /></p>
<h4 id="intermediate-operation">Intermediate operation</h4>
<ul>
<li>다른 stream을 return 한다.</li>
<li>filer</li>
<li>sorted</li>
</ul>
<h4 id="terminal-operation">Terminal operation</h4>
<ul>
<li>stream pipeline을 실행하고 result를 생성한다.</li>
<li>collect</li>
<li>count</li>
<li>forEach</li>
</ul>
<h3 id="anymatch-findfirst-등은-source를-전부-확인할까">anyMatch, findFirst 등은 source를 전부 확인할까?</h3>
<p>전체 stream을 처리하지 않고, source 하나 씩 중간 연산들을 모두 수행하고, 요소가 발견되자 마자 결과가 생성된다. (limit도 동일)
-> <code>short circuiting evaluation</code></p>
<pre><code class="language-java">List<String> names =
    menu.stream()
        .filter(dish -> {
              System.out.println("filtering:" + dish.getName());
              return dish.getCalories() > 300;
         })                                                  
        .map(dish -> {
              System.out.println("mapping:" + dish.getName());
              return dish.getName();
         })                                                   
        .limit(3)
        .collect(toList());
System.out.println(names);</code></pre>
<pre><code>filtering:pork
mapping:pork
filtering:beef
mapping:beef
filtering:chicken
mapping:chicken
[pork, beef, chicken]</code></pre><h3 id="findfirst와-findany는-같은게-아닌가">findFirst와 findAny는 같은게 아닌가?</h3>
<p>stream이 source collection 순서대로 처리하는데 stream API는 왜 findFirst와 findAny 비슷한 동작을 만들었을까?
parallel stream을 사용할 때, 어떤 요소가 반환되는지 신경쓰지 않으면 findAny를 사용한다.</p>
<h3 id="collection-collector-collect의-차이">Collection, Collector, collect의 차이</h3>
<pre><code class="language-java">Map<Currency, List<Transaction>> transactionsByCurrencies =
        transactions.stream()
        .collect(groupingBy(Transaction::getCurrency));</code></pre>
<ul>
<li>collect method에 전달되는 argument는 Collector interface의 구현체이다.<ul>
<li>toList : 각 요소 목록을 차례로 List를 만들어라</li>
<li>groupingBy : key가 bucket이고 value가 bucket에서 list의 요소들로 하는 Map을 만들어라</li>
</ul>
</li>
<li>Collector<ul>
<li>stream의 reduction 작업을 수행하는 방법을 정의한다.</li>
<li>element를 변환 과정인 Collector는 최종 output의 data structure에 최종 결과값을 누적시켜둔다.</li>
<li>Collectors utility class는 다양한 static factory method들을 제공한다. ex. Collectors.toList()</li>
<li><code>public interface Collector<T, A, R></code></li>
</ul>
</li>
</ul>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/44b54fbf-410b-4fd7-a524-7de65f47e9db/image.png" /></p>
<p>Classification of an item in the stream during the grouping process
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/1f3534de-6266-467d-8f12-1e491e220a1f/image.png" /></p>
<pre><code class="language-java">public interface Collector<T, A, R> {
    Supplier<A> supplier();
    BiConsumer<A, T> accumulator();
    Function<A, R> finisher();
    BinaryOperator<A> combiner();
    Set<Characteristics> characteristics();
}</code></pre>