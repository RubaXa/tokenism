import { tokens } from './';
import { createDict, createToken, composeTokens } from './token';
import agTokenTuple from './lib/agToken';

describe('tokens', () => {
	const token = tokens.agToken;

	it('typeof token', () => {
		expect(typeof token).toBe('function');
	});

	describe('default (required)', () => {
		it('key', () => {
			expect(token.key()).toBe('agToken');
		});

		it('param', () => {
			expect(token.param()).toBe('ag_token');
		});

		it('comment', () => {
			expect(token.comment()).toBe(agTokenTuple[0]);
		});

		it('value', () => {
			expect(token.value().substr(0, 3)).toBe('AG_');
		});

		it('isOptional()', () => {
			expect(token.isOptional()).toBe(false);
		});

		it('as "token"', () => {
			const tok = token.as('token');

			expect(tok.param()).toBe('token');
			expect(tok.comment()).toBe(agTokenTuple[0]);
			expect(tok.toAPIDOCJSON()).toEqual({
				token__comment: `${agTokenTuple[0]}. String.`,
				token: tok.lastValue(),
			});
		});

		it('as "regToken"', () => {
			const reg = token.as('regToken', 'Reg-токен');

			expect(reg.param()).toBe('reg_token');
			expect(reg.comment()).toBe('Reg-токен');
			expect(reg.toAPIDOCJSON()).toEqual({
				reg_token__comment: 'Reg-токен. String.',
				reg_token: reg.lastValue(),
			});
		});

		it('toAPIDOCJSON', () => {
			expect(token.toAPIDOCJSON()).toEqual({
				ag_token__comment: `${agTokenTuple[0]}. String.`,
				ag_token: token.lastValue(),
			});
		});
	});

	describe('optional', () => {
		it('isOptional', () => {
			expect(token.optional().isOptional()).toBe(true);
		});

		it('toAPIDOCJSON', () => {
			const opt = token.optional();

			expect(opt.toAPIDOCJSON()).toEqual({
				'ag_token?__comment': `${agTokenTuple[0]}. String.`,
				'ag_token?': opt.lastValue(),
			});
		});
	});

	describe('invoke', () => {
		it('without args', () => {
			expect(token()).toBe(token);
		});

		it('with comment', () => {
			const sess = token('Сессия');

			expect(sess).not.toBe(token);
			expect(sess.comment()).toBe('Сессия');
			expect(sess.toAPIDOCJSON()).toEqual({
				ag_token__comment: 'Сессия. String.',
				ag_token: sess.lastValue(),
			});
		});

		it('with value', () => {
			const tok = token(null, 'tok');

			expect(tok).not.toBe(token);
			expect(tok.comment()).toBe(agTokenTuple[0]);
			expect(tok.value()).toBe('tok');
			expect(tok.toAPIDOCJSON()).toEqual({
				ag_token__comment: `${agTokenTuple[0]}. String.`,
				ag_token: 'tok',
			});
		});

		it('with comment & value', () => {
			const reg = token('reg', 'tok');

			expect(reg).not.toBe(token);
			expect(reg.comment()).toBe('reg');
			expect(reg.value()).toBe('tok');
			expect(reg.toAPIDOCJSON()).toEqual({
				ag_token__comment: 'reg. String.',
				ag_token: 'tok',
			});
		});
	});

	it('factory as value', () => {
		let cid = 0;
		let gen = () => `${++cid}`;
		expect(token(null, gen).value()).toBe('1');
		expect(token(null, gen).value()).toBe('2');
	});

	describe('composite (parts)', () => {
		const { thread } = createDict({
			thread: ['Тред', <const>{
				id: ['Идентификатор', '123'],
				flags: ['Флаги', {
					unread: ['Прочитанность', false],
					pinned: ['Прикреплённость', true],
				}],
			}],
		});

		it('value', () => {
			expect(thread.value()).toEqual({
				id: '123',
				flags: {
					unread: false,
					pinned: true,
				},
			});
		});

		it('toAPIDOCJSON', () => {
			expect(thread.toAPIDOCJSON()).toEqual({
				'thread__comment': 'Тред. Object.',
				'thread': {
					id__comment: 'Идентификатор. String.',
					id: '123',

					flags__comment: 'Флаги. Object.',
					flags: {
						unread__comment: 'Прочитанность. Boolean.',
						unread: false,

						pinned__comment: 'Прикреплённость. Boolean.',
						pinned: true,
					},
				},
			});
		});

		it('part.id.value', () => {
			expect(thread.part.id.value()).toEqual('123');
			expect(thread.part.id.toAPIDOCJSON()).toEqual({
				id: '123',
				id__comment: 'Идентификатор. String.',
			});
		});

		it('thread.part.flags.part.value', () => {
			expect(thread.part.flags.part.unread.value()).toEqual(false);
		});
	});

	describe('compose', () => {
		const auth = createToken('auth', ['Auth-token', composeTokens(
			tokens.agToken.as('token', null, () => 'AG'),
		)]);

		it('value', () => {
			expect(auth.value()).toEqual({token: 'AG'});
			expect(auth.toAPIDOCJSON()).toEqual({
				auth__comment: 'Auth-token. Object.',
				auth: {
					token__comment: 'Autogen-токен. String.',
					token: 'AG',
				},
			});
		});
	});

	describe('functional (describe)', () => {
		const func = createToken('func', ['Func', (state?: string) => state || 'yes']);

		it('without args', () => {
			expect(func.value()).toEqual('yes');
		});

		it('with args', () => {
			expect(func(null, 'no').value()).toEqual('no');
		});
	});

	describe('compose functional', () => {
		const func = createToken('x', ['x', (tok?: boolean) => composeTokens(
			tok && tokens.agToken(null, () => 'AG'),
			!tok && tokens.random(null, () => 123),
		)]);

		it('without args', () => {
			expect(func.value()).toEqual({random: 123});
		});

		it('with args', () => {
			expect(func(null, true).value()).toEqual({ag_token: 'AG'});
		});
	});
});