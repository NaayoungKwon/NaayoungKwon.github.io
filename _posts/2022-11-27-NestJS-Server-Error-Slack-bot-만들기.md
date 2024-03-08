---
date: 2022-11-27
title: "NestJS Server Error Slack bot 만들기"
categories:
  - undefined

permalink: /asnity/NestJS-Server-Error-Slack-bot-만들기/

toc: true
toc_sticky: true
---


## Summary

- 상황
	- dev-be의 코드를 nCloud에 임시 배포를 한 상태에서, Frontend에서 서버에 보낸 요청으로 unknown 에러를 마주쳤을 때 Backend 담당자에게 말하면 확인하는 방식이었다.
- 불편함 감지
	- Backend에서 Error handling 처리한 문제는 Frontend에서 message를 통해 바로 알 수 있었으나
	- 그 외 bug나 DB 문제의 경우 Backend engineer가 직접 ncloud에 접속하여 로그 확인을 해야했다.
- 개선 방향
	- Error 발생 시, Log를 Slack 에 자동으로 전송해주면 ncloud에 일일히 접속안해도 되겠다! 에서 시작
	- nest interceptor를 통해 error 전달 시 sentry로 error report 및 slack message send

		![0](/assets/img/2022-11-27-NestJS-Server-Error-Slack-bot-만들기.md/0.png)

- 더 생각해볼 것
	- 요청한 사용자의 IP도 볼 수 있으면 누가 ~~범인~~인지 찾을 수 있을 것 같다.
	- status code 별로 분류해서 error를 전송하는 것도 좋을 것 같다.

## 1. 기술 조사 전에 어떻게 만들지 상상해보자

- 이전에 github action을 통해 slack bot을 만들어서 알림을 보낼 수 있듯이, slack에 message를 보낼 수 있는 npm 라이브러리가 있을 것 같다.
- 현재 API Server에서 controller layer에서 try ~ catch로 error handling을 하고 있으니, logger로 error print를 하면서 그 때 slack bot도 message를 보내면 될 것 같다.
{% raw %}
	```typescript
	@Get('followers')
	  async getFollowers() {
	    try {
	      const _id = '~~~~';
	      const result = await this.userService.getRelatedUsers(_id, 'followers');
	      return responseForm(200, { followers: result });
	    } catch (error) {
	      this.logger.error(JSON.stringify(error.response));
				// 여기에서 보내면 되지 않을까?
	      return error.response ?? error;
	    }
	  }
	```
{% endraw %}


## 2. 조사 과정


### 일단 nest Error slack bot, notification 의 키워드로 검색을 해본다.

- express용도 나오는데 난 가급적 nest와 결합된 것을 더 검색해서 사용할 것이다.
- nest slack module이 검색된다.
- sentry와 raven을 통한 인터셉터로 slack에 알리는 포스팅이 나온다. 역시 다른 사람들도 다 해봤다.

### sentry가 뭔지 모르겠으니 알아본다.

- 어플리케이션에서 오류가 발생하면 알려주는 에러 트래킹 서비스이다.
- 클라이언트의 오류 발생 시 정보 파악을 가능하게 해주는 이점으로 많이 사용하는 것 같다.
- 무료로 5k개까지 에러 확인 가능하다.

### Interceptor도 알아보자


❓ 요청 주기에서 Interceptor는 비즈니스 로직이 구성되어 있는 서비스와 컨트롤러 코드가 실행되기 이전, 그리고 비즈니스 로직 코드가 실행된 이후 총 두번 거쳐가게 됩니다. 요청과 응답의 중간에 위치하므로 Interceptor 내부에서는 요청 정보와 응답 정보 모두 액세스 가능하며, 이를 활용해 캐싱(Caching), 로깅(Logging), 직렬화(Serialization), 응답 변환(Transforming) 등 여러 작업을 처리할 수 있습니다.

- NestInterceptor 인터페이스를 구현해서 만들 수 있다.

	![1](/assets/img/2022-11-27-NestJS-Server-Error-Slack-bot-만들기.md/1.png)

- NestInterceptor 구현하기 → intercept 메서드 구현
	- parameter : ExecutionContext, Callhandler
	- Callhandler
		- 클라이언트 요청 경로로 라우팅하는 역할로 Interceptor 다음 생명 주기로 넘어갈 때 사용된다.
		- Nest의 Request Lifecycle : Interceptors → pipes → controller

			![2](/assets/img/2022-11-27-NestJS-Server-Error-Slack-bot-만들기.md/2.png)


## 3. 만들어보자


해당 포스팅을 주로 참고하며 만들었고 코드에서 궁금한 점을 추가로 알아보았다.


[https://overcome-the-limits.tistory.com/716?category=1006727](https://overcome-the-limits.tistory.com/716?category=1006727)

- CallHandler의 handle method를 통해 response를 추가로 조작할 수 있다.
- rxjs의 catchError method를 사용하면 예외를 catch해서 조작이 가능하다.
- global interceptor 설정해서 프로젝트 전체에 적용할 수 있다.
	- **`app.useGlobalInterceptors(new MyInterceptor());`**
- 특정 컨트롤러에 적용하는 법
{% raw %}
	```typescript
	@Controller('board')
	//특정 Controller에 Interceoptor 적용
	@UseInterceptors(LoggingInterceptor)
	export class BoardController {
	  constructor(private readonly boardService: BoardService) {}
	}
	```
{% endraw %}

- sentry 무료버전은 개인만 사용가능해서 혼자 보는데 생각보다 좋은 것 같다.
	- 서버를 구동한 컴퓨터 사양 과 이름 부터 node 버전, 에러가 정확히 어떤 위치에서 났는지 까지 Report한다. 대단해..

## 4. 사용하고 개선해보자


다 만들고 패기롭게 에러가 발생하는 요청을 보냈는데.. 슬랙 메시지가 안온다..


여러 에러들을 다 보내보니, Controller layer에서 에러 핸들링을 해둔 에러는 메시지가 안오고 Validation pipe에서 발생한 에러만 메시지가 갔다.


원인은 인터셉터가 에러 자체만 캐치하고 내가 catch에서 error를 다시 가공해서 Client에 전달하기 때문에, Response는 Error라고 알지 못했다.
{% raw %}

```typescript
@Get('followers')
  async getFollowers() {
    try {
      const _id = '~~~~';
      const result = await this.userService.getRelatedUsers(_id, 'followers');
      return responseForm(200, { followers: result });
    } catch (error) {
      this.logger.error(JSON.stringify(error.response));
      return error.response ?? error; // 이부분!
    }
  }
```
{% endraw %}


해결 방법

1. 여기서 다시 Error Throw 한다. → catch 했지만 또 throw,,
2. Interceptor에서 StatusCode로 판별한다. → 지금 statusCode가 다 200으로 가고 응답객체에서 statusCode customize 하고있는데 res.status(400)도 해주고 interceptor도 또 statuscode 확인하도록 처리해야한다.

가장 간편한 1번 방식으로 일단 해두고 팀원들과 논의해서 align 하는게 좋을 것 같다.


![3](/assets/img/2022-11-27-NestJS-Server-Error-Slack-bot-만들기.md/3.png)


내 작고 귀여운 봇..


**개선사항**


지금은 내 로컬에서 Test를 했는데, Scale-out 관점에서 에러 발생 Server의 정보도 알려주면 좋을 것 같아, IP도 추가했다.


![4](/assets/img/2022-11-27-NestJS-Server-Error-Slack-bot-만들기.md/4.png)


## 5. 공유


팀원들에게 어떻게 적용했는지 공유를 해줬을 때 반응이 좋았고,


마침 금요일에 진행하는 기술 공유시간에 내가 발표자가 되어서 해당 내용을 공유했는데, 많은 분들이 관심을 많이 가져주셨다!


반응을 캡쳐해뒀어야했는데 아쉽다..


## 6. 느낀점


일을 하면서 불편함을 느끼고 이를 개선 했을 때 보람을 많이 느끼는 것 같다.


이런 점이 나를 다시 개발자로 회귀하게 했고 내가 추구하는 개발자의 모습이 아닐까 싶다. 🙃


참고


[Interceptors](https://jakekwak.gitbook.io/nestjs/overview/interceptors)


[NestJS sentry + slack error로그 수집](https://velog.io/@1yongs_/NestJS-sentry-slack-error%EB%A1%9C%EA%B7%B8-%EC%88%98%EC%A7%91)


[[Project] 프로젝트 삽질기24 (feat Sentry Slack 연동)](https://overcome-the-limits.tistory.com/716?category=1006727)


[프론트엔드 에러 로그 시스템 Sentry 적용기](https://urbanbase.github.io/dev/2021/03/04/Sentry.html)


[[Nest.js] 심화 - 인터셉터(Interceptors) 개념 및 사용법](https://any-ting.tistory.com/142)

