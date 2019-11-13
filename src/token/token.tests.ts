import { createToken, composeTokens } from './token';
import agToken from './lib/agToken';

const agTokenComment = 'Autogen-токен';

describe('tokens', () => {
	it('typeof token', () => {
		expect(typeof agToken).toBe('function');
	});

	describe('default (required)', () => {
		it('key', () => {
			expect(agToken.key()).toBe('agToken');
			expect(agToken().key()).toBe('agToken');
		});

		it('param', () => {
			expect(agToken.param()).toBe('ag_token');
			expect(agToken().param()).toBe('ag_token');
		});

		it('comment', () => {
			expect(agToken.comment()).toBe(agTokenComment);
			expect(agToken().comment()).toBe(agTokenComment);
		});

		it('value', () => {
			expect(agToken.value()).toBe(agToken.lastValue());
			expect(agToken().value().split('_')[0]).toBe('AG');
		});

	// 	it('isOptional()', () => {
	// 		expect(token.isOptional()).toBe(false);
	// 	});

		it('as "token"', () => {
			const tok = agToken.as('token');

			expect(tok.param()).toBe('token');
			expect(tok.comment()).toBe(agTokenComment);
			expect(tok.toJSON()).toEqual(raw('token', agTokenComment, 'String', tok.lastValue()));
		});

		it('as "regToken"', () => {
			const reg = agToken.as('regToken', 'Reg-токен');

			expect(reg.param()).toBe('reg_token');
			expect(reg.comment()).toBe('Reg-токен');
			expect(reg.toJSON()).toEqual(raw('reg_token', 'Reg-токен', 'String', reg.lastValue()));
		});

		it('toJSON', () => {
			expect(agToken.toJSON()).toEqual(raw('ag_token', agTokenComment, 'String', agToken.lastValue()));
		});
	});

	describe('optional', () => {
		it('toJSON', () => {
			const opt = agToken.optional();
			expect(opt.toJSON()).toEqual(raw('ag_token', agTokenComment, 'String', opt.lastValue(), true));
		});
	});

	describe('invoke', () => {
		it('without args', () => {
			const tok = agToken();

			expect(tok).not.toBe(agToken);
		});

		it('with comment', () => {
			const sess = agToken('Сессия');

			expect(sess.comment()).toBe('Сессия');
			expect(sess.toJSON()).toEqual(raw('ag_token', 'Сессия', 'String', sess.lastValue()));
		});

		it('with value', () => {
			const tok = agToken(null, 'tok');

			expect(tok.comment()).toBe(agTokenComment);
			expect(tok.value()).toBe('tok');
			expect(tok.toJSON()).toEqual(raw('ag_token', agTokenComment, 'String', 'tok'));
		});

		it('with comment & value', () => {
			const reg = agToken('reg', 'tok');

			expect(reg.comment()).toBe('reg');
			expect(reg.value()).toBe('tok');
			expect(reg.toJSON()).toEqual(raw('ag_token', 'reg', 'String', 'tok'));
		});
	});

	it('factory as value', () => {
		let cid = 0;
		let gen = () => `${++cid}`;
		expect(agToken(null, gen).value()).toBe('1');
		expect(agToken(null, gen).value()).toBe('2');
	});

	describe('composite', () => {
		const thread = createToken(
			'thread',
			'Тред',
			composeTokens(
				createToken('id', 'ID Треда', () => '0:123:4'),
				createToken('flags', 'Флаги Треда', composeTokens(
					createToken('unread', 'Прочитанность', false),
					createToken('pinned', 'Прикреплённость', true),
				)),
			),
		);

		it('value', () => {
			expect(thread.value()).toEqual({
				id: '0:123:4',
				flags: {
					unread: false,
					pinned: true,
				},
			});
		});

		it('toJSON', () => {
			expect(thread.toJSON()).toEqual(raw('thread', 'Тред', 'Object', {
				id: raw('id', 'ID Треда', 'String', '0:123:4'),
				flags: raw('flags', 'Флаги Треда', 'Object', {
					unread: raw('unread', 'Прочитанность', 'Boolean', false),
					pinned: raw('pinned', 'Прикреплённость', 'Boolean', true),
				}),
			}));
		});
	});
});


function raw(name: string, comment: string, type: string, value: any, optional: boolean = false) {
	return {
		comment,
		name,
		optional,
		type,
		value,
	};
}