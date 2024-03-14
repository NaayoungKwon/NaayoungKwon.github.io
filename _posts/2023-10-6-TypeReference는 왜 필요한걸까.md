---
date: 2023-10-6
title: "TypeReference는 왜 필요한걸까"
category :
  - Java & Spring
permalink: /java-spring/TypeReference는 왜 필요한걸까/

toc: true
toc_sticky: true
---

> TypeReference 관련해서 찾아보다가 Generic 부터 제대로 알지 못하고 있다는 느낌을 받게 되었고, 기본적인 것 부터 다시 학습해보고 정리한다.

### 내가 알고있는 Generic
솔직히 면접 질문에 간단히 답변할 수 있는 수준으로만 알고있었다.

- Generic 이란?
  - 데이터 타입을 하나로 지정하지 않고 범용적으로 지정한다는 의미. 
  - 클래스 내부에서 지정하는 것이 아닌 외부에서 사용자에 의해 지정되는 것
- 장점은?
  - 내부코드는 동일한데 들어가는 클래스 타입만 다를 경우 재사용성을 높이기 위해 사용한다. 
  - 잘못된 타입이 들어오는 것을 컴파일 단계에서 방지, 따로 타입을 변환하거나 체크할 필요가 없다.
  
  
## Generic 형태


### 매개변수화 타입(Parameterized type)
> 제네릭 타입에서는 매개변수화 타입(Parameterized type)들을 정의한다.

- Type parameter (타입 매개 변수) : `<>`  꺽쇠 괄호 내부에 있는 타입
  - `List<String>` 의 String은 실 타입 매개 변수
- Raw Type : 제네릭 타입에서 타입 매개변수를 전혀 사용하지 않았을 때
  - 안정성이 보장되지 않기 때문에 사용하지 말자
  ```java
  public class Example<T>  {
  	private T member;
    	
    public void main(){
    	 Example<Integer> parameterType = new Example<>(1);
       Example rawType = new Example(1);
    }
  }
  ```
- Type eraser (타입 소거자) : 컴파일 타임에만 타입에 대한 제약 조건을 적용하고, 런타임에는 타입에 대한 정보를 소거한다. ~~자세한 내용은 다음에~~

- Reifiable Type (실체화 타입) : 컴파일 단계에서 타입소거에 의해 지워지지 않는 타입 정보
  - int, double, float, byte 등 원시 타입
  - Number, Integer 등 일반 클래스와 인터페이스 타입
  - List, ArrayList, Map 등 자체 Raw type 
  - `List<?>, ArrayList<?>` 등 비한정 와일드카드가 포함된 매개변수화 타입
- Non-Reifiable Type (비 실체화 타입) : 타입소거에 의해서 타입 정보가 제거된 타입으로, 제네릭 타입 파라미터는 모두 제거 된다.
  - `List<T>, List<Number>, ArrayList<String>, List<? extends Number>`

### Bounded wildcard type
- 특정 타입으로 제한한다
- 무공변(invariant) : 오로지 자기 타입만 허용하는 것 `<T>`
- 공변 (covariant, Upper bounded wildcard): 구체적인 방향으로 타입 변환을 허용하는 것 (자기 자신과 자식 객체만 허용) `<? extends T>`
- 반공변 (contravariant, Lower bounded wildcard) : 추상적인 방향으로의 타입 변환을 허용하는 것(자기 자신과 부모 객체만 허용) `<? super T>`

### Recursive type bound
- 타입 매개 변수가 자신을 포함하는 수식에 의해 한정될 수 있다.
- 다음 코드에서 첫 번째 함수는 T가 비교 가능한지 모르기 때문에 컴파일 에러가 발생한다.

```java
public static <T> int countGreaterThan(T[] anArray, T elem) {
    int count = 0;
    for (T e : anArray)
        if (e > elem)  // compiler error
            ++count;
    return count;
}

public static <T extends Comparable<T>> int countGreaterThan(T[] anArray, T elem) {
    int count = 0;
    for (T e : anArray)
        if (e.compareTo(elem) > 0)
            ++count;
    return count;
}
```

### Subtyping in generics

- 매개변수화 타입은 무공변이기 때문에 `Price<Integer>` IS A `Price<Number>` 가 성립하지 않는다.
  - 이와 같은 문제를 해결하기 위해 wildard type을 사용한다.

  
```java
public void addPrice(Price<Number> price) { }
addPrice(new Price<Integer>(3));
  
public void addPrice(Price< ? extends Number> price) { }
addPrice(new Price<Integer>(3)); // O
```

## Reflection 
> super type token 내용을 읽다가 `Class<T>`에 대해 정확히 알지 못해 Reflection에 대한 내용도 추가로 공부했다.

- 런타임 단계에서 클래스, 인터페이스, 필드, 메서드를 검사하거나 수정할 수 있다.
- 객체를 인스턴스화하고 메소드를 호출하고 필드 값을 가져오거나 설정할 수 있다.
- 단점 : 런타임 시점에 인스턴스를 생성해서 컴파일 시점에 해당 타입을 체크하기 어렵다.

### Class 클래스

```java
// Class 객체를 얻는 방법
Class<Price> clazz = Price.class; //class property를 사용한 방법

Price price = new Price();
Class<? extends Price> priceClass = price.getClass(); // 인스턴스의 getClass() 메소드 사용

// 모든 public 요소를 가져옴
price.getFields();
clazz.getMethods();
clazz.getAnnotations();

// 상속받은 클래스와 인터페이스를 제외하고 해당 클래스에 직접 정의된 모든 요소에 접근
clazz.getDeclaredFields();
clazz.getDeclaredMethods();
clazz.getDeclaredAnnotations();

// 동적 타입 변환
Price newPrice = clazz.cast(object);
```

### Constructor
- Class 클래스를 사용해서 Constructor 타입으로 가져올 수 있고, 해당 Constructor로 객체를 생성할 수 있다.
- 생성자의 파라미터가 여러 개라면 getConstructor() 에서 파라미터에 대응하는 타입을 전달한다.

```java
Constructor<?> constructor = clazz.getDeclaredConstructor();
Object o = constructor.newInstance();
Price price = (Price) constructor.newInstance();
// clazz.newInstance()는 deprecated

Constructor<?> withArgConstructor = clazz.getDeclaredConstructor(Integer.class);
```

### Method
- Method 타입의 invoke() 를 사용해서 메소드를 직접 호출할 수 있다.

```java
Class<Price> clazz = Price.class;
Price price = new Price(12000);

Method exchange = clazz.getDeclaredMethod("exchange");
exchange.invoke(price);

```

### Type interface
- java의 타입 시스템을 나타내는 인터페이스로, Class.class와 ParameterizedType.interface 는 Type의 하위에 있다.
- 제일 첫 번째로 학습했던 ParameterizedType은 `List<String>` 과 같은 타입


## Super Type token

- type token : 타입 정보를 값으로 넘기겠다.
- Class 타입은 Generic type이 가지고 있는 type parameter에 대한 정보를 알 수 없다. 

```java
public get (Class<T> clazz){ }

public static void main() {
	get(List<String>.class); //-> 불가능
}
```

- type eraser 때문에 reflection을 통해서도 type parameter를 알 수 없다.

```java
// version 1
public class Sup<T>{
	T value;
}

public static void main() {
	Sup<String> s = new Sup<>();
    s.getClass().getDeclaredField("value").getType(); // -> Object로 반환되며 String으로 나오지 않는다.
}
```
- super type toekn은 상속과 reflection을 조합해서 `List<String>.class` 처럼 써먹기 위해나왔다.

```java
// version 2
public class Sup<T>{
	T value;
}

public class Sub extends Sup<String>{
}

public static void main() {
	Sub s = new Sub();
    Type t = s.getClass().getGenericSuperclass();
    ParameterizedType ptype = (ParameterizedType)t; //여기서는 안전해서 강제 type casting 함
	Type actualTypeArgument = ptype.getActualTypeArguments()[0]; // Sup<String, Integer> 인 경우에 [1]은 Integer
    // actualTypeArgument를 출력하면 String이 나온다.
    
}
```
- version 1과 2의 차이는 클래스의 인스턴스를 만들면서 타입을 준건지 처음부터 타입을 명시하는 클래스를 새로 정의했는지다.
- 새로 타입을 명시한 클래스를 정의한 클래스는 reflection을 통해 런타임 시 접근이 가능하도록 바이트 코드에 남아있다.
	- `Sup<String> s = new Sup<>()` vs `Sub s = new Sub()`
- `Sub extends Sup<String>` 로 명시하면서 ParameterizedTyped으로 값이 넘어온다.
- ParameterizedType으로 꺼내고 어쩌고 저쩌고의 과정을 통해 type parameter를 알아내기 위한 class를 이미 만들어뒀다. (ParameterizedTypeReference, TypeReference)

### 익명 Class
- 익명 클래스는 클래스 정의와 동시에 객체를 생성한다.

```java
class Price<T extends Number> {
	T value;
	public T exchange(){ return value * 1300 }
}

public static void main() {
	Price<Integer> jpnPrice = new Price<Integer>(){
    	@Override
        public Integer exchange(){ return value * 900 } 
    };
```

### ParameterizedTypeReference.class

- org.springframework.core.ParameterizedTypeReference
- 익명 클래스로 만들어 쓰는 이유 : 익명 클래스 인스턴스를 만들어서 익명 클래스가 상속하고 있는 super class의 generic의 type parameter 정보를 갖다가 전달하기 위한 용도
- 사용하는 경우 : Spring Framework에서 RESTful API 응답 처리에서 응답이 Generic type일 때, 타입을 명시할 수 있어 JSON -> String -> deserialize 하는 번거로움을 피하 수 있다.
- `new ParameterizedTypeReference<List<Price>>(){}` 가 매번 만들어야하니 캐싱해두고 저장해두는 방법도 있을 것이다. 

### TypeReference.class
- com.fasterxml.jackson.core.type.TypeReference
- Jackson JSON 라이브러리와 연관되어, Jackson 라이브러리를 사용하여 JSON을 역직렬화할 때 제네릭 타입 정보를 보존하기 위해 사용한다.

---
참고
https://jyami.tistory.com/99
https://medium.com/@joongwon/java-java%EC%9D%98-generics-604b562530b3
[타입 소거 관련](https://inpa.tistory.com/entry/JAVA-%E2%98%95-%EC%A0%9C%EB%84%A4%EB%A6%AD-%ED%83%80%EC%9E%85-%EC%86%8C%EA%B1%B0-%EC%BB%B4%ED%8C%8C%EC%9D%BC-%EA%B3%BC%EC%A0%95-%EC%95%8C%EC%95%84%EB%B3%B4%EA%B8%B0)
[토비의 봄 슈퍼타입 토큰](https://www.youtube.com/watch?v=01sdXvZSjcI)
[Reflection 참고](https://hudi.blog/java-reflection/)